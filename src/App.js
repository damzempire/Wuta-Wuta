import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Gallery from './components/Gallery';
import CreateArt from './components/CreateArt';
import UserProfile from './components/UserProfile';
import TransactionHistory from './components/TransactionHistory';
import { useWalletStore } from './store/walletStore';
import { useMuseStore } from './store/museStore';
import './index.css';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet 
  } = useWalletStore();
  
  const { 
    isLoading, 
    error: museError,
    initializeApp 
  } = useMuseStore();

  useEffect(() => {
    // Initialize the app when it mounts
    initializeApp();
  }, [initializeApp]);

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'gallery':
        return <Gallery />;
      case 'create':
        return <CreateArt />;
      case 'profile':
        return <UserProfile />;
      case 'transactions':
        return <TransactionHistory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <Header
          onMenuClick={handleMenuClick}
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
          address={address}
          isConnected={isConnected}
        />

        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />

        {/* Main Content */}
        <main className="pt-20 md:pt-24 transition-all duration-300">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 sm:px-6 lg:px-8 py-6"
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading Muse...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {museError && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800">{museError}</span>
                </div>
              </div>
            )}

            {/* Page Content */}
            {!isLoading && renderCurrentPage()}
          </motion.div>
        </main>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
