import React, { useState } from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { formatAddress } from '../utils/format';
import { Wallet, ChevronDown } from 'lucide-react';

type Page = 'dashboard' | 'markets' | 'swap' | 'liquidity';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { connectedAddress, connectWallet, disconnectWallet } = useProtocol();
  const [lendOpen, setLendOpen] = useState(false);
  const [dexOpen, setDexOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    if (page !== 'markets' && page !== 'dashboard') {
      setLendOpen(false);
    }
    if (page !== 'swap' && page !== 'liquidity') {
      setDexOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <nav className="border-b border-gray-800 bg-[#161921]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between sm:justify-start sm:space-x-8">
              <div className="text-2xl font-bold text-white">Borpho</div>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <button
                    onClick={() => setLendOpen((prev) => !prev)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                      currentPage === 'markets' || currentPage === 'dashboard'
                        ? 'text-[#0052FF]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Lend</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${lendOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {lendOpen && (
                    <div className="absolute left-0 mt-2 w-40 rounded-lg border border-gray-800 bg-[#1C1F2A] shadow-lg z-20">
                      <button
                        onClick={() => handleNavigate('markets')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                          currentPage === 'markets'
                            ? 'text-[#0052FF]'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Markets
                      </button>
                      <button
                        onClick={() => handleNavigate('dashboard')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                          currentPage === 'dashboard'
                            ? 'text-[#0052FF]'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Dashboard
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDexOpen((prev) => !prev)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                      currentPage === 'swap' || currentPage === 'liquidity'
                        ? 'text-[#0052FF]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>DEX</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${dexOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {dexOpen && (
                    <div className="absolute left-0 mt-2 w-40 rounded-lg border border-gray-800 bg-[#1C1F2A] shadow-lg z-20">
                      <button
                        onClick={() => handleNavigate('swap')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                          currentPage === 'swap'
                            ? 'text-[#0052FF]'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => handleNavigate('liquidity')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                          currentPage === 'liquidity'
                            ? 'text-[#0052FF]'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Liquidity Pools
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={connectedAddress ? disconnectWallet : connectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors sm:hidden"
                >
                  <Wallet size={16} />
                  <span>{connectedAddress ? formatAddress(connectedAddress) : 'Connect Wallet'}</span>
                </button>
              </div>
            </div>
            <div className="hidden sm:flex">
              {connectedAddress ? (
                <button
                  onClick={disconnectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors font-mono text-sm"
                >
                  <Wallet size={16} />
                  <span>{formatAddress(connectedAddress)}</span>
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors"
                >
                  <Wallet size={16} />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
};
