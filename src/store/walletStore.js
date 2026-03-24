import { create } from 'zustand';
import * as freighterApi from '@stellar/freighter-api';

// Helper to get functions regardless of import structure
const getFreighterMethod = (methodName) => {
  // Check main import
  if (freighterApi[methodName]) return freighterApi[methodName];
  // Check default export if exists
  if (freighterApi.default && freighterApi.default[methodName]) return freighterApi.default[methodName];
  // Check global object
  if (window.freighterApi && window.freighterApi[methodName]) return window.freighterApi[methodName];

  // Variation check: getPublicKey vs getAddress
  if (methodName === 'getPublicKey') {
    return getFreighterMethod('getAddress');
  }

  return null;
};

const useWalletStore = create((set, get) => ({
  // State
  isConnecting: false,
  isConnected: false,
  address: null,
  network: null,
  error: null,
  isLoading: false,

  // Actions
  checkConnection: async () => {
    try {
      const isConnected = getFreighterMethod('isConnected');
      const getPublicKey = getFreighterMethod('getPublicKey');
      const getNetwork = getFreighterMethod('getNetwork');

      if (isConnected && await isConnected()) {
        let publicKey = await getPublicKey();
        const networkValue = await getNetwork();

        // Handle object return from newer Freighter versions
        if (publicKey && typeof publicKey === 'object') {
          publicKey = publicKey.address || publicKey.publicKey || publicKey.id || '';
        }

        // Handle network object return
        let networkName = networkValue;
        if (networkValue && typeof networkValue === 'object') {
          networkName = networkValue.network || networkValue.networkPassphrase || 'Unknown';
        }

        if (publicKey) {
          set({
            address: String(publicKey),
            network: String(networkName),
            isConnected: true,
            error: null
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Check connection error:', error);
      return false;
    }
  },

  connectWallet: async () => {
    try {
      set({ isConnecting: true, error: null });

      const isConnected = getFreighterMethod('isConnected');
      const setAllowed = getFreighterMethod('setAllowed') || getFreighterMethod('requestAccess');
      const getPublicKey = getFreighterMethod('getPublicKey');
      const getNetwork = getFreighterMethod('getNetwork');

      if (!isConnected || !await isConnected()) {
        throw new Error('Freighter wallet not found. Please install the extension.');
      }

      // Explicitly request access/permission first
      if (setAllowed) {
        const result = await setAllowed();
        if (result && result.error) {
          throw new Error(result.error);
        }
      }

      let publicKey = await getPublicKey();
      const networkValue = await getNetwork();

      // Handle object return from newer Freighter versions
      if (publicKey && typeof publicKey === 'object') {
        publicKey = publicKey.address || publicKey.publicKey || publicKey.id || '';
      }

      // Handle network object return
      let networkName = networkValue;
      if (networkValue && typeof networkValue === 'object') {
        networkName = networkValue.network || networkValue.networkPassphrase || 'Unknown';
      }

      if (!publicKey) {
        throw new Error('Failed to retrieve public key from Freighter.');
      }

      set({
        isConnecting: false,
        isConnected: true,
        address: String(publicKey),
        network: String(networkName),
        error: null,
      });

      // Save connection preference
      localStorage.setItem('walletConnected', 'true');

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      set({
        isConnecting: false,
        error: error.message
      });
    }
  },

  disconnectWallet: () => {
    set({
      isConnecting: false,
      isConnected: false,
      address: null,
      network: null,
      error: null,
    });
    localStorage.removeItem('walletConnected');
  },

  updateAccount: (newAddress) => {
    set({ address: newAddress });
  },

  updateNetwork: (newNetwork) => {
    set({ network: newNetwork });
  },

  clearError: () => set({ error: null }),
}));

export { useWalletStore };
