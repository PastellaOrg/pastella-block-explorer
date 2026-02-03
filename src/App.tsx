import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/shared';
import Wallet from './components/pages/Wallet';
import Dashboard from './components/pages/Dashboard';
import Block from './components/pages/Block';
import Blocks from './components/pages/Blocks';
import Transactions from './components/pages/Transactions';
import TransactionDetails from './components/pages/TransactionDetails';
import SearchResults from './components/pages/SearchResults';
import Richlist from './components/pages/Richlist';
import Tools from './components/pages/Tools';
import Staking from './components/pages/Staking';
import { BlockProvider } from './context/BlockContext';
import { TransactionProvider } from './context/TransactionContext';


const Nodes: React.FC = () => (
  <div className="text-center py-5">
    <h1>Network Nodes</h1>
    <p className="text-muted">Coming soon...</p>
  </div>
);


const Info: React.FC = () => (
  <div className="text-center py-5">
    <h1>About</h1>
    <p className="text-muted">Kryptokrona Blockchain Explorer</p>
  </div>
);

const NotFound: React.FC = () => (
  <div className="text-center py-5">
    <h1>404</h1>
    <p className="text-muted">Page not found</p>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BlockProvider>
        <TransactionProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/blocks" element={<Blocks />} />
              <Route path="/block/:hashOrHeight" element={<Block />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transaction/:hash" element={<TransactionDetails />} />
              <Route path="/wallet/:address" element={<Wallet />} />
              <Route path="/richlist" element={<Richlist />} />
              <Route path="/staking" element={<Staking />} />
              <Route path="/nodes" element={<Nodes />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/info" element={<Info />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </TransactionProvider>
      </BlockProvider>
    </BrowserRouter>
  );
};

export default App;
