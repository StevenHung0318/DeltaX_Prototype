import { useState } from 'react';
import { ProtocolProvider } from './context/ProtocolContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Markets } from './pages/Markets';
import { Swap } from './pages/Swap';
import { Perp } from './pages/Perp';
import { Clob } from './pages/Clob';
import { LiquidityPools, LiquidityPool } from './pages/LiquidityPools';
import { LiquidityPoolDetail } from './pages/LiquidityPoolDetail';

type Page = 'dashboard' | 'markets' | 'swap' | 'liquidity' | 'clob' | 'perp';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('markets');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedLiquidityPool, setSelectedLiquidityPool] = useState<LiquidityPool | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSelectedMarketId(null);
    if (page !== 'liquidity') {
      setSelectedLiquidityPool(null);
    }
  };

  const handleNavigateToMarket = (marketId: string) => {
    setSelectedMarketId(marketId);
    setCurrentPage('markets');
  };

  const handleSelectLiquidityPool = (pool: LiquidityPool) => {
    setSelectedLiquidityPool(pool);
    setCurrentPage('liquidity');
  };

  return (
    <ProtocolProvider>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToMarket={handleNavigateToMarket}
          />
        )}
        {currentPage === 'markets' && (
          <Markets
            selectedMarketId={selectedMarketId}
            onSelectMarket={setSelectedMarketId}
          />
        )}
        {currentPage === 'swap' && <Swap />}
        {currentPage === 'perp' && <Perp />}
        {currentPage === 'clob' && <Clob />}
        {currentPage === 'liquidity' && (
          selectedLiquidityPool ? (
            <LiquidityPoolDetail pool={selectedLiquidityPool} onBack={() => setSelectedLiquidityPool(null)} />
          ) : (
            <LiquidityPools onSelectPool={handleSelectLiquidityPool} />
          )
        )}
      </Layout>
    </ProtocolProvider>
  );
}

export default App;
