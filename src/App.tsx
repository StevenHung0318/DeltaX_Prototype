import { useState } from 'react';
import { ProtocolProvider } from './context/ProtocolContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Markets } from './pages/Markets';

type Page = 'dashboard' | 'markets';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSelectedMarketId(null);
  };

  const handleNavigateToMarket = (marketId: string) => {
    setSelectedMarketId(marketId);
    setCurrentPage('markets');
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
      </Layout>
    </ProtocolProvider>
  );
}

export default App;
