use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, String, Vec, Map};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct ArtworkMetadata {
    pub creator: Address,
    pub metadata_url: String,
    pub content_hash: String,
}

#[contract]
pub struct ArtAssetToken;

#[contractimpl]
impl ArtAssetToken {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "counter"), &0u64);
    }

    pub fn mint(env: Env, to: Address, _amount: i128, metadata_url: String, content_hash: String) -> u64 {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap();
        admin.require_auth();

        let mut counter: u64 = env.storage().instance().get(&Symbol::new(&env, "counter")).unwrap_or(0);
        counter += 1;
        
        let metadata = ArtworkMetadata {
            creator: to.clone(),
            metadata_url: metadata_url.clone(),
            content_hash: content_hash.clone(),
        };

        let mut artworks: Map<u64, ArtworkMetadata> = env.storage().instance()
            .get(&Symbol::new(&env, "artworks"))
            .unwrap_or(Map::new(&env));
        
        artworks.set(counter, metadata);
        
        env.storage().instance().set(&Symbol::new(&env, "counter"), &counter);
        env.storage().instance().set(&Symbol::new(&env, "artworks"), &artworks);
        
        // Mint event
        env.events().publish(
            (Symbol::new(&env, "mint"), to, counter),
            metadata_url
        );
        
        counter
    }

    pub fn get_artwork(env: Env, token_id: u64) -> ArtworkMetadata {
        let artworks: Map<u64, ArtworkMetadata> = env.storage().instance()
            .get(&Symbol::new(&env, "artworks"))
            .expect("No artworks stored");
        
        artworks.get(token_id).expect("Artwork not found")
    }

    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&Symbol::new(&env, "counter")).unwrap_or(0)
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&Symbol::new(&env, "admin")).unwrap();
        admin.require_auth();
        env.storage().instance().set(&Symbol::new(&env, "admin"), &new_admin);
    }
}
