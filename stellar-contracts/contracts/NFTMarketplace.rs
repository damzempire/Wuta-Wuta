use soroban_sdk::contract::{contract, contractimpl, Address, Env, Symbol};
use soroban_sdk::token::Token;
use soroban_sdk::crypto::sha256;
use soroban_sdk::vec::Vec;

#[contract]
pub struct NFTMarketplace {
    admin: Address,
    nft_token: Symbol,
    marketplace_fee: u32, // basis points (100 = 1%)
    treasury: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct Listing {
    seller: Address,
    token_id: u64,
    price: i128,
    expires: u64,
    active: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct Offer {
    buyer: Address,
    token_id: u64,
    amount: i128,
    expires: u64,
    active: bool,
}

#[contractimpl]
impl NFTMarketplace {
    pub fn initialize(env: Env, admin: Address, nft_token: Symbol, marketplace_fee: u32, treasury: Address) {
        env.storage().instance().set(&admin);
        env.storage().instance().set(&nft_token);
        env.storage().instance().set(&marketplace_fee);
        env.storage().instance().set(&treasury);
    }

    pub fn list_nft(env: Env, seller: Address, token_id: u64, price: i128, duration: u64) {
        let marketplace_fee = Self::get_marketplace_fee(env);
        let treasury = Self::get_treasury(env);
        
        // Transfer NFT to marketplace (escrow)
        // This would require calling the NFT contract
        // For now, we'll create a listing
        
        let listing = Listing {
            seller: seller.clone(),
            token_id,
            price,
            expires: env.ledger().timestamp() + duration,
            active: true,
        };

        let mut listings = Self::get_listings(env);
        listings.push(listing);

        env.storage().instance().set(&listings);
        
        // Listing event
        env.events().publish(
            (Symbol::new(&env, "list"),),
            (seller, token_id, price, duration)
        );
    }

    pub fn buy_nft(env: Env, buyer: Address, token_id: u64, amount: i128) {
        let mut listings = Self::get_listings(env.clone());
        let mut listing_index = None;
        
        // Find active listing
        for (i, listing) in listings.iter().enumerate() {
            if listing.token_id == token_id && listing.active && 
               env.ledger().timestamp() < listing.expires {
                if amount < listing.price {
                    panic!("Insufficient payment");
                }
                listing_index = Some(i as u32);
                break;
            }
        }

        if listing_index.is_none() {
            panic!("Listing not found or expired");
        }
        
        let mut listing = listings.get(listing_index.unwrap()).unwrap();
        let marketplace_fee = Self::get_marketplace_fee(env.clone());
        let _treasury = Self::get_treasury(env.clone());
        
        // Calculate fees
        let fee_amount = (listing.price * marketplace_fee as i128) / 10000;
        let _seller_amount = listing.price - fee_amount;
        
        // Process payment (in real implementation, this would handle token transfers)
        
        // Mark listing as inactive
        listing.active = false;
        listings.set(listing_index.unwrap(), listing.clone());
        env.storage().instance().set(&Symbol::new(&env, "listings"), &listings);
        
        // Transfer fee to treasury
        // In real implementation, transfer tokens to treasury
        
        // Sale event
        env.events().publish(
            (Symbol::new(&env, "sale"),),
            (buyer, listing.seller, token_id, listing.price, fee_amount)
        );
    }

    pub fn make_offer(env: Env, buyer: Address, token_id: u64, amount: i128, duration: u64) {
        let offer = Offer {
            buyer: buyer.clone(),
            token_id,
            amount,
            expires: env.ledger().timestamp() + duration,
            active: true,
        };

        let mut offers = Self::get_offers(env.clone());
        offers.push_back(offer);

        env.storage().instance().set(&Symbol::new(&env, "offers"), &offers);
        
        // Offer event
        env.events().publish(
            (Symbol::new(&env, "offer"),),
            (buyer, token_id, amount, duration)
        );
    }

    pub fn accept_offer(env: Env, seller: Address, token_id: u64, offer_index: u32) {
        let mut offers = Self::get_offers(env.clone());
        if offer_index >= offers.len() {
            panic!("Invalid offer index");
        }
        
        let offer = offers.get(offer_index).unwrap();
        if !offer.active || offer.token_id != token_id {
            panic!("Offer not valid");
        }
        if env.ledger().timestamp() >= offer.expires {
            panic!("Offer expired");
        }
        
        let marketplace_fee = Self::get_marketplace_fee(env.clone());
        let _treasury = Self::get_treasury(env.clone());
        
        // Calculate fees
        let fee_amount = (offer.amount * marketplace_fee as i128) / 10000;
        let _seller_amount = offer.amount - fee_amount;
        
        // Process transaction
        // Transfer NFT to buyer
        // Transfer payment to seller
        // Transfer fee to treasury
        
        // Mark offers as inactive
        let mut updated_offers = offers;
        for i in 0..updated_offers.len() {
            let mut off = updated_offers.get(i).unwrap();
            if off.token_id == token_id {
                off.active = false;
                updated_offers.set(i, off);
            }
        }
        env.storage().instance().set(&Symbol::new(&env, "offers"), &updated_offers);
        
        // Sale event
        env.events().publish(
            (Symbol::new(&env, "offer_accepted"),),
            (offer.buyer, seller, token_id, offer.amount, fee_amount)
        );
    }

    pub fn cancel_listing(env: Env, seller: Address, token_id: u64) {
        let mut listings = Self::get_listings(env.clone());
        
        for i in 0..listings.len() {
            let mut listing = listings.get(i).unwrap();
            if listing.seller == seller && listing.token_id == token_id {
                listing.active = false;
                listings.set(i, listing);
                break;
            }
        }
        
        env.storage().instance().set(&Symbol::new(&env, "listings"), &listings);
        
        // Cancel event
        env.events().publish(
            (Symbol::new(&env, "listing_cancelled"),),
            (seller, token_id)
        );
    }

    pub fn update_marketplace_fee(env: Env, new_fee: u32) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();
        if new_fee > 1000 {
            panic!("Fee too high"); // Max 10%
        }
        env.storage().instance().set(&Symbol::new(&env, "marketplace_fee"), &new_fee);
    }

    // Helper functions
    fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&Address::default()).unwrap()
    }

    fn get_nft_token(env: Env) -> Symbol {
        env.storage().instance().get(&Symbol::default()).unwrap()
    }

    fn get_marketplace_fee(env: Env) -> u32 {
        env.storage().instance().get(&0u32).unwrap_or(250) // Default 2.5%
    }

    fn get_treasury(env: Env) -> Address {
        env.storage().instance().get(&Address::default()).unwrap()
    }

    fn get_listings(env: Env) -> Vec<Listing> {
        env.storage().instance().get(&Vec::default()).unwrap_or_default()
    }

    fn get_offers(env: Env) -> Vec<Offer> {
        env.storage().instance().get(&Vec::default()).unwrap_or_default()
    }

    pub fn get_active_listings(env: Env) -> Vec<Listing> {
        let listings = Self::get_listings(env);
        let mut active_listings = Vec::new(&env);
        
        for listing in listings.iter() {
            if listing.active && env.ledger().timestamp() < listing.expires {
                active_listings.push_back(listing.clone());
            }
        }
        
        active_listings
    }

    pub fn get_active_offers(env: Env) -> Vec<Offer> {
        let offers = Self::get_offers(env);
        let mut active_offers = Vec::new(&env);
        
        for offer in offers.iter() {
            if offer.active && env.ledger().timestamp() < offer.expires {
                active_offers.push_back(offer.clone());
            }
        }
        
        active_offers
    }
}
