import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import config from '../config/explorer';

export interface BlockData {
  major_version: number;
  minor_version: number;
  timestamp: number;
  prev_hash: string;
  nonce: number;
  orphan_status: boolean;
  height: number;
  hash: string;
  difficulty: number;
  reward: number;
  block_size?: number;
  blockSize?: number;
  size?: number;
  tx_count?: number;
  num_txes?: number;
}

interface FullBlockData extends BlockData {
  transactions?: Array<{ [key: string]: unknown }>;
}

// Permanent cache for blocks - blocks are immutable and never change
const permanentBlockCache = new Map<number, BlockData>();

interface BlockContextType {
  blocks: BlockData[];
  loading: boolean;
  error: string | null;
  fetchBlocks: (startHeight: number, count: number) => Promise<void>;
  getCurrentHeight: () => Promise<number>;
  refreshCache: () => Promise<void>;
  getBlockByHash: (hash: string) => Promise<FullBlockData | null>;
  getBlockByHeight: (height: number) => Promise<BlockData | null>;
}

const BlockContext = createContext<BlockContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useBlocks = () => {
  const context = useContext(BlockContext);
  if (!context) {
    throw new Error('useBlocks must be used within BlockProvider');
  }
  return context;
};

interface BlockProviderProps {
  children: ReactNode;
}

export const BlockProvider: React.FC<BlockProviderProps> = ({ children }) => {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch a single block by height
  const fetchBlock = async (height: number): Promise<BlockData | null> => {
    // Check permanent cache first - blocks never change
    if (permanentBlockCache.has(height)) {
      return permanentBlockCache.get(height)!;
    }

    try {
      const response = await fetch(`${config.api}/json_rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getblockheaderbyheight',
          params: { height }
        })
      });

      const data = await response.json();
      if (data.error) {
        // If block is too new, silently skip it rather than logging an error
        if (data.error.message && data.error.message.includes('higher than the current blockchain height')) {
          return null;
        }
        console.error(`Error fetching block ${height}:`, data.error);
        return null;
      }

      const block = data.result?.block_header || null;
      if (block) {
        // Store in permanent cache
        permanentBlockCache.set(height, block);
      }
      return block;
    } catch (err) {
      console.error(`Error fetching block ${height}:`, err);
      return null;
    }
  };

  // Fetch multiple blocks in parallel
  const fetchMultipleBlocks = useCallback(async (heights: number[]): Promise<BlockData[]> => {
    const promises = heights.map(h => fetchBlock(h));
    const results = await Promise.all(promises);
    return results.filter((b): b is BlockData => b !== null);
  }, []);

  // Main fetch function with caching
  const fetchBlocks = useCallback(async (startHeight: number, count: number) => {
    try {
      setLoading(true);
      setError(null);

      // Get current height to ensure we don't request non-existent blocks
      const actualHeight = await getCurrentHeight();
      const safeStartHeight = Math.min(startHeight, actualHeight);

      const endHeight = Math.max(0, safeStartHeight - count + 1);
      const heightsToFetch: number[] = [];

      // Fetch missing blocks
      for (let h = safeStartHeight; h >= endHeight; h--) {
        heightsToFetch.push(h);
      }

      if (heightsToFetch.length > 0) {
        const newBlocks = await fetchMultipleBlocks(heightsToFetch);

        // Merge with existing cache, removing duplicates
        setBlocks(prev => {
          const existingMap = new Map(prev.map(b => [b.height, b]));

          // Only add blocks that aren't already in cache
          newBlocks.forEach(b => {
            existingMap.set(b.height, b);
            // Also update permanent cache
            permanentBlockCache.set(b.height, b);
          });

          // Convert map back to array and sort by height (descending)
          const merged = Array.from(existingMap.values()).sort((a, b) => b.height - a.height);

          return merged;
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blocks');
      setLoading(false);
    }
  }, [fetchMultipleBlocks]);

  // Removed refreshCache - blocks are immutable and never change
  const refreshCache = useCallback(async () => {
    // No-op - blocks never change, so no need to refresh
    return;
  }, []);

  // Removed auto-refresh - blocks are immutable
  useEffect(() => {
    // No auto-refresh needed for immutable blocks
    return () => {};
  }, []);

  // Get full block details by hash (using f_block_json)
  const getBlockByHash = async (hash: string): Promise<FullBlockData | null> => {
    try {
      const response = await fetch(`${config.api}/json_rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'f_block_json',
          params: { hash }
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const block = data.result?.block as FullBlockData | undefined;
      if (block) {
        // Also add to cache if it's a block header
        setBlocks(prev => {
          const existingMap = new Map(prev.map(b => [b.hash, b]));
          existingMap.set(block.hash, block as BlockData);
          return Array.from(existingMap.values()).sort((a, b) => b.height - a.height);
        });
      }

      return block || null;
    } catch (err) {
      console.error(`Error fetching block by hash ${hash}:`, err);
      throw err;
    }
  };

  // Get block by height (checks cache first)
  const getBlockByHeight = async (height: number): Promise<BlockData | null> => {
    // Check cache first
    const cached = blocks.find(b => b.height === height);
    if (cached) {
      return cached;
    }

    // Not in cache, fetch it
    return await fetchBlock(height);
  };

  // Initial fetch - get latest 100 blocks
  useEffect(() => {
    const initialFetch = async () => {
      try {
        setLoading(true);
        const height = await getCurrentHeight();
        await fetchBlocks(height, 100);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blocks');
        setLoading(false);
      }
    };

    initialFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BlockContext.Provider
      value={{
        blocks,
        loading,
        error,
        fetchBlocks,
        getCurrentHeight,
        refreshCache,
        getBlockByHash,
        getBlockByHeight
      }}
    >
      {children}
    </BlockContext.Provider>
  );
};
