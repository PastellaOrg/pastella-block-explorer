import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import config from '../config/explorer';

type TransactionDataInternal = {
  hash: string;
  blockHash: string;
  blockHeight: number;
  timestamp: number;
  size: number;
  fee: number;
  amount_out?: number;
  mixin?: number;
  unlockTime?: number;
  extra?: string;
  paymentId?: string;
  confirmations?: number;
  tx_types?: string[];
  version?: number;
};

// Export as a separate statement
export { type TransactionDataInternal as TransactionData };

// Permanent cache for transactions - transactions are immutable and never change
const permanentTransactionCache = new Map<string, TransactionDataInternal>();
// Permanent cache for blocks to know which transactions we've already loaded
const permanentBlockHeightCache = new Set<number>();

interface TransactionContextType {
  transactions: TransactionDataInternal[];
  loading: boolean;
  error: string | null;
  totalTransactions: number;
  fetchTransactions: (startHeight: number, endHeight: number) => Promise<void>;
  refreshCache: () => Promise<void>;
  getTransactionByHash: (hash: string) => Promise<TransactionDataInternal | null>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionProvider');
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<TransactionDataInternal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [cacheRange, setCacheRange] = useState<{ min: number; max: number } | null>(null);

  // Fetch current blockchain height
  const getCurrentHeight = async (): Promise<number> => {
    try {
      const response = await fetch(`${config.api}/height`);
      const data = await response.json();
      if (data.status === 'OK') {
        return data.height;
      }
      throw new Error('Failed to fetch height');
    } catch (err) {
      console.error('Error fetching height:', err);
      throw err;
    }
  };

  // Fetch transactions from blocks within a height range
  const fetchTransactionsFromBlocks = useCallback(async (startHeight: number, endHeight: number): Promise<TransactionDataInternal[]> => {
    const transactions: TransactionDataInternal[] = [];

    // Fetch blocks in parallel (batches of 10 to avoid overwhelming the API)
    const batchSize = 10;
    const heightsToFetch: number[] = [];

    for (let h = startHeight; h >= endHeight; h--) {
      // Skip if we've already loaded transactions from this block
      if (!permanentBlockHeightCache.has(h)) {
        heightsToFetch.push(h);
      }
    }

    // If all blocks are already cached, return cached transactions
    if (heightsToFetch.length === 0) {
      // Return all cached transactions for this height range
      const cachedTxs: TransactionDataInternal[] = [];
      permanentTransactionCache.forEach(tx => {
        if (tx.blockHeight <= startHeight && tx.blockHeight >= endHeight) {
          cachedTxs.push(tx);
        }
      });
      return cachedTxs;
    }

    // Process in batches
    for (let i = 0; i < heightsToFetch.length; i += batchSize) {
      const batch = heightsToFetch.slice(i, i + batchSize);
      const promises = batch.map(async (height) => {
        try {
          // First, get block header to obtain the hash
          const headerResponse = await fetch(`${config.api}/json_rpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: '1',
              method: 'getblockheaderbyheight',
              params: { height }
            })
          });

          const headerData = await headerResponse.json();
          if (headerData.error) {
            // If block is too new, silently skip it
            if (headerData.error.message && headerData.error.message.includes('higher than the current blockchain height')) {
              return [];
            }
            console.error(`Error fetching block header ${height}:`, headerData.error);
            return [];
          }

          const blockHash = headerData.result?.block_header?.hash;
          if (!blockHash) {
            console.error(`No hash found for block ${height}`);
            return [];
          }

          // Now fetch full block with transactions using the hash
          const response = await fetch(`${config.api}/json_rpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: '1',
              method: 'f_block_json',
              params: { hash: blockHash }
            })
          });

          const data = await response.json();
          if (data.error) {
            console.error(`Error fetching block ${height}:`, data.error);
            return [];
          }

          const block = data.result?.block;
          if (!block) return [];

          // Extract transactions from block
          const blockTransactions: TransactionDataInternal[] = (block.transactions || []).map((tx: { [key: string]: unknown }) => {
            // Get transaction type from API response and normalize it
            const rawType = (tx.type as string)?.toLowerCase();
            let txTypes: string[] = [];

            if (rawType === 'coinbase') {
              txTypes = ['miner'];
            } else if (rawType === 'staking') {
              txTypes = ['staking'];
            } else if (rawType) {
              txTypes = [rawType];
            }

            return {
              hash: tx.hash as string,
              blockHash: block.hash as string,
              blockHeight: block.height as number,
              timestamp: block.timestamp as number,
              size: (tx.size as number) || 0,
              fee: (tx.fee as number) || 0,
              amount_out: (tx.amount_out as number) || 0,
              mixin: (tx.mixin as number) || 0,
              unlockTime: (tx.unlock_time as number) || 0,
              extra: tx.extra as string,
              paymentId: tx.paymentId as string,
              confirmations: 0,
              tx_types: txTypes,
              version: (tx.version as number) || 0
            };
          });

          // Store in permanent cache
          blockTransactions.forEach(tx => {
            permanentTransactionCache.set(tx.hash, tx);
          });
          // Mark this block height as loaded
          permanentBlockHeightCache.add(height);

          return blockTransactions;
        } catch (err) {
          console.error(`Error fetching block ${height}:`, err);
          return [];
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(batchTxs => {
        transactions.push(...batchTxs);
      });
    }

    return transactions;
  }, []);

  // Main fetch function with caching
  const fetchTransactions = useCallback(async (startHeight: number, endHeight: number) => {
    try {
      setLoading(true);
      setError(null);

      const newTransactions = await fetchTransactionsFromBlocks(startHeight, endHeight);

      // Merge with existing cache, removing duplicates
      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));

        // Only add transactions that aren't already in cache
        newTransactions.forEach(t => {
          existingMap.set(t.hash, t);
          // Also update permanent cache
          permanentTransactionCache.set(t.hash, t);
          // Mark block height as loaded
          permanentBlockHeightCache.add(t.blockHeight);
        });

        // Convert map back to array and sort by timestamp (descending)
        const merged = Array.from(existingMap.values()).sort((a, b) => b.timestamp - a.timestamp);

        // Update cache range
        if (merged.length > 0) {
          const heights = merged.map(t => t.blockHeight);
          setCacheRange({ min: Math.min(...heights), max: Math.max(...heights) });
        }

        return merged;
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      setLoading(false);
    }
  }, [fetchTransactionsFromBlocks]);

  // Refresh cached transactions
  const refreshCache = useCallback(async () => {
    if (!cacheRange || transactions.length === 0) return;

    try {
      const refreshedTransactions = await fetchTransactionsFromBlocks(cacheRange.max, cacheRange.min);

      // Update cache with refreshed data
      const existingMap = new Map(transactions.map(t => [t.hash, t]));
      refreshedTransactions.forEach(t => existingMap.set(t.hash, t));

      const merged = Array.from(existingMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(merged);
    } catch (err) {
      console.error('Error refreshing cache:', err);
    }
  }, [cacheRange, transactions, fetchTransactionsFromBlocks]);

  // Auto-refresh cache every 2 minutes (disabled for now to reduce API load)
  useEffect(() => {
    // Disabled auto-refresh to prevent excessive API calls
    return () => {};
  }, []);

  // Get full transaction details by hash
  const getTransactionByHash = async (hash: string): Promise<TransactionDataInternal | null> => {
    // Check cache first
    const cached = transactions.find(t => t.hash === hash);
    if (cached) {
      return cached;
    }

    // Not in cache, fetch it
    try {
      const response = await fetch(`${config.api}/json_rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'f_transaction_json',
          params: { hash }
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const txData = data.result;
      const block = txData?.block;
      const tx = txData?.tx;
      const txDetails = txData?.txDetails;

      if (!tx || !txDetails) return null;

      const transaction: TransactionDataInternal = {
        hash: txDetails.hash,
        blockHash: block?.hash || '',
        blockHeight: block?.height || 0,
        timestamp: block?.timestamp || 0,
        size: txDetails.size || 0,
        fee: txDetails.fee || 0,
        amount_out: txDetails.amount_out || 0,
        mixin: tx.mixin || 0,
        unlockTime: tx.unlock_time || 0,
        extra: tx.extra,
        paymentId: tx.paymentId,
        confirmations: 0,
        tx_types: txDetails.tx_types || [],
        version: tx.version || 0
      };

      // Add to cache
      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        existingMap.set(transaction.hash, transaction);
        return Array.from(existingMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      });

      return transaction;
    } catch (err) {
      console.error(`Error fetching transaction by hash ${hash}:`, err);
      throw err;
    }
  };

  // Initial fetch - get transactions from latest 50 blocks
  useEffect(() => {
    const initialFetch = async () => {
      try {
        setLoading(true);
        const height = await getCurrentHeight();

        // Fetch blockchain info to get total transaction count
        const infoResponse = await fetch(`${config.api}/info`);
        const infoData = await infoResponse.json();
        if (infoData.status === 'OK') {
          setTotalTransactions(infoData.tx_count || 0);
        }

        // Fetch transactions from last 50 blocks
        const endHeight = Math.max(0, height - 50 + 1);
        await fetchTransactions(height, endHeight);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
        setLoading(false);
      }
    };

    initialFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        error,
        totalTransactions,
        fetchTransactions,
        refreshCache,
        getTransactionByHash
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
