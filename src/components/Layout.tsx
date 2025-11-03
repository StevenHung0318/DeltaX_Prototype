import React from 'react';
import { useProtocol } from '../context/ProtocolContext';
import { formatAddress } from '../utils/format';
import { Wallet } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'markets';
  onNavigate: (page: 'dashboard' | 'markets') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { connectedAddress, connectWallet, disconnectWallet } = useProtocol();

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <nav className="border-b border-gray-800 bg-[#161921]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-white">Borpho</div>
              <div className="flex space-x-6">
                <button
                  onClick={() => onNavigate('markets')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'markets'
                      ? 'text-[#0052FF]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Borrow
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'text-[#0052FF]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            </div>
            <div>
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};
