import config from '../config/explorer';
import { fetchWithTimeout } from '../utils/helpers';
import type {
  BlockHeader,
  Block,
  Transaction,
  BlockchainInfo,
  WalletInfo,
  PoolInfo,
  NodeInfo,
  SearchResult,
  PriceInfo
} from '../types';

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.api;
  }

  // Generic JSON-RPC call
  private async jsonRPC(method: string, params: Record<string, unknown> | unknown[] = [], silent: boolean = false): Promise<unknown> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/json_rpc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method,
            params
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Some API methods return data directly, others wrap in 'result'
      return data.result !== undefined ? data.result : data;
    } catch (error) {
      if (!silent) {
        console.error(`JSON-RPC ${method} error:`, error);
      }
      throw error;
    }
  }

  // Get blockchain info
  async getInfo(): Promise<BlockchainInfo> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/info`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data;
    } catch (error) {
      console.error('Get info error:', error);
      throw error;
    }
  }

  // Get current block height
  async getHeight(): Promise<{ count: number; status: string }> {
    return this.jsonRPC('getblockcount') as unknown as { count: number; status: string };
  }

  // Get block by height
  async getBlockByHeight(height: number): Promise<BlockHeader> {
    return this.jsonRPC('getblockheaderbyheight', { height }) as unknown as BlockHeader;
  }

  // Get block by hash
  async getBlockByHash(hash: string): Promise<BlockHeader> {
    return this.jsonRPC('getblockheaderbyhash', { hash }) as unknown as BlockHeader;
  }

  // Get last block header
  async getLastBlockHeader(): Promise<{ block_header: BlockHeader }> {
    return this.jsonRPC('getlastblockheader', {}) as unknown as { block_header: BlockHeader };
  }

  // Get full block details by hash (includes transactions)
  async getFullBlockByHash(hash: string): Promise<{ block: Block }> {
    const response = await this.jsonRPC('f_block_json', { hash }) as unknown as { status: string; block: Block };
    return { block: response.block };
  }

  // Get transaction details by hash
  async getTransactionDetails(hash: string): Promise<{ transaction: Transaction }> {
    return this.jsonRPC('f_transaction_json', { hash }) as unknown as { transaction: Transaction };
  }

  // Get transaction pool (memory pool)
  async getTransactionPool(): Promise<{ addedTxs: Transaction[] } | { transactions: Transaction[] }> {
    return this.jsonRPC('f_on_transactions_pool_json', {}) as unknown as { addedTxs: Transaction[] } | { transactions: Transaction[] };
  }

  // Get transaction by hash
  async getTransaction(hash: string): Promise<{ transaction: Transaction; status: string }> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/gettransaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ hash })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      // If REST endpoint fails, try JSON-RPC
      try {
        const result = await this.jsonRPC('f_transaction_json', { hash }, true) as { transaction: Transaction; status: string };
        return result;
      } catch {
        throw error;
      }
    }
  }

  // Get transactions from block
  async getTransactions(blockHash: string): Promise<{ transactions: Transaction[]; status: string }> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/gettransactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ blockHash })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  }

  // Get block hash by height
  async getBlockHash(height: number): Promise<string> {
    const response = await this.jsonRPC('getblockheaderbyheight', { height }, true) as { block_header: { hash: string } | null };
    if (response?.block_header?.hash) {
      return response.block_header.hash;
    }
    throw new Error('Block hash not found');
  }

  // Get wallet details using JSON-RPC
  async getWalletDetails(
    address: string,
    page: number = 0,
    limit: number = 25
  ): Promise<WalletInfo> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/json_rpc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getwalletdetails',
            params: {
              address,
              limit,
              page
            }
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Return data directly if no result wrapper, or unwrap result if present
      return data.result !== undefined ? data.result : data;
    } catch (error) {
      console.error('Get wallet details error:', error);
      throw error;
    }
  }

  // Get blocks using JSON-RPC
  async getBlocks(startHeight: number, endHeight: number): Promise<Block[]> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/json_rpc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getblocks',
            params: {
              startHeight,
              endHeight
            }
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('Get blocks error:', error);
      throw error;
    }
  }

  // Get pools using JSON-RPC
  async getPools(): Promise<PoolInfo[]> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/json_rpc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getpools'
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('Get pools error:', error);
      throw error;
    }
  }

  // Get nodes using JSON-RPC
  async getNodes(): Promise<NodeInfo[]> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/json_rpc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getnodes'
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('Get nodes error:', error);
      throw error;
    }
  }

  // Search functionality
  async search(term: string): Promise<SearchResult> {
    try {
      // Try as block height first (only digits)
      if (/^\d+$/.test(term)) {
        const height = parseInt(term);
        const info = await this.getInfo();
        if (height >= 0 && height <= info.height) {
          return { type: 'block', value: height };
        }
        return { type: 'not_found', value: term };
      }

      // Try as wallet address (starts with addressPrefix from config)
      if (term.startsWith(config.addressPrefix) && term.length > 50) {
        return { type: 'wallet', value: term };
      }

      // Try as block/transaction hash (64 hex characters)
      if (/^[a-f0-9]{64}$/i.test(term)) {
        // Try as block hash first
        try {
          await this.getBlockByHash(term);
          return { type: 'block', value: term };
        } catch {
          // Not a block hash, try as transaction
          try {
            await this.getTransaction(term);
            return { type: 'transaction', value: term };
          } catch {
            // Not found
          }
        }
      }

      return { type: 'not_found', value: term };
    } catch (error: unknown) {
      console.error('Search error:', error);
      return { type: 'error', value: term, error: (error as Error).message };
    }
  }

  // Get price from Coinpaprika API (external API)
  async getPrice(): Promise<PriceInfo> {
    try {
      const response = await fetchWithTimeout(
        'https://api.coinpaprika.com/v1/tickers/xkr-kryptokrona'
      );
      const data = await response.json();
      if (data && data.data && data.data.quotes) {
        return {
          usd: parseFloat(data.data.quotes.USD?.price || '0'),
          btc: parseFloat(data.data.quotes.BTC?.price || '0')
        };
      }
      return { usd: 0, btc: 0 };
    } catch {
      // Silently fail - price is not critical
      return { usd: 0, btc: 0 };
    }
  }

  // Get all stakes
  async getAllStakes(page: number = 1, limit: number = 50): Promise<unknown> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseURL}/getallstakes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page,
            limit
          })
        }
      );

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      console.error('Error fetching all stakes:', error);
      throw error;
    }
  }
}

export default new APIService();
