import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Gallery, 
  TrendingUp, 
  Settings, 
  User,
  Home,
  Menu,
  X
} from 'lucide-react';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import Dashboard from './components/Dashboard';
import Gallery from './components/Gallery';
import CreateArt from './components/CreateArt';
import UserProfile from './components/UserProfile';
import WalletConnectionModal from './components/WalletConnectionModal';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/ui/Loading';
import { useWalletStore } from './store/walletStore';
import { useMuseStore } from './store/museStore';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');

  const { address, isConnected, connectWallet, disconnectWallet } = useWalletStore();
  const { isLoading } = useMuseStore();

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'gallery', name: 'Gallery', icon: Gallery },
    { id: 'create', name: 'Create', icon: Palette },
    { id: 'profile', name: 'Profile', icon: User },
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Command/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsWalletModalOpen(false);
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'gallery':
        return <Gallery />;
      case 'create':
        return <CreateArt currentPrompt={currentPrompt} setCurrentPrompt={setCurrentPrompt} />;
      case 'profile':
        return <UserProfile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          onDisconnectWallet={disconnectWallet}
          address={address}
          isConnected={isConnected}
          onOpenPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Main Layout */}
        <div className="flex pt-16 sm:pt-20">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block">
            <Sidebar
              navigation={navigation}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 md:ml-64">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {isLoading && activeTab !== 'create' ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loading size="lg" />
                </div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderMainContent()}
                </motion.div>
              )}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          navigation={navigation}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 md:hidden"
              >
                <Sidebar
                  navigation={navigation}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Wallet Connection Modal */}
        <WalletConnectionModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={connectWallet}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          navigation={navigation}
          onNavigate={handleTabChange}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;