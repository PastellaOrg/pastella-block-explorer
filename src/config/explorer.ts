// Explorer Configuration

export interface Config {
  api: string;
  name: string;
  ticker: string;
  decimals: number;
  difficultyTarget: number;
  maxSupply: number;
  addressPrefix: string;
  addressPrefixBytes: number[];
  requiredConfirmations: number;
  refreshIntervals: {
    dashboard: number;
    blocks: number;
    transactions: number;
    wallet: number;
    pools: number;
    nodes: number;
  };
  pagination: {
    blocks: number;
    transactions: number;
    walletTransactions: number;
  };
}

export const config: Config = {
  // Local API configuration
  api: 'https://seed.pastella.org',

  // Cryptocurrency details
  name: 'Pastella',
  ticker: 'PAS',
  decimals: 8,
  difficultyTarget: 30,
  maxSupply: 100000000000000,
  addressPrefix: 'PAS',
  addressPrefixBytes: [0x19, 0x80, 0x04], // 0x198004 in little-endian format
  requiredConfirmations: 10,

  // Refresh intervals (in milliseconds)
  refreshIntervals: {
    dashboard: 30000,      // 30 seconds
    blocks: 30000,         // 30 seconds
    transactions: 30000,   // 30 seconds
    wallet: 60000,         // 60 seconds
    pools: 60000,          // 60 seconds
    nodes: 60000           // 60 seconds
  },

  // Pagination settings
  pagination: {
    blocks: 50,
    transactions: 50,
    walletTransactions: 25
  }
};

export default config;
