// Type definitions for the blockchain explorer

export interface BlockHeader {
  majorVersion: number;
  minorVersion: number;
  timestamp: number;
  nonce: number;
  hash: string;
  prevHash: string;
  size: number;
  depth: number;
  height: number;
  difficulty: number;
  reward: number;
  transactionHashes?: string[];
}

export interface Block extends BlockHeader {
  transactions?: Transaction[];
}

export interface TransactionInput {
  amount: number;
  keyImage: string;
  type: string;
}

export interface TransactionOutput {
  amount: number;
  keyImage: string;
  type: string;
}

export interface Transaction {
  hash: string;
  blockHash: string;
  blockHeight: number;
  timestamp: number;
  size: number;
  fee: number;
  mixin: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  paymentId?: string;
  unlockTime: number;
  extra?: string;
  confirmations?: number;
  type?: 'INCOMING' | 'OUTGOING' | 'MINING' | 'STAKING';
}

export interface WalletInfo {
  address: string;
  balance: number;
  incoming: number;
  outgoing: number;
  incomingStaking: number;
  outgoingStakes: number;
  transactionCount: number;
  firstTxDate?: string;
  lastTxDate?: string;
  transactions: Transaction[];
  totalPages: number;
  currentPage: number;
}

export interface PoolInfo {
  name: string;
  url: string;
  height: number;
  hashrate: number;
  miners: number;
  fee: number;
  minPayment: number;
  percentage?: number;
}

export interface NodeInfo {
  name: string;
  host: string;
  port: number;
  fee: number;
  version: string;
  height: number;
  connections: number;
  status: 'online' | 'offline' | 'syncing';
  lastSeen?: number;
}

export interface TransactionPoolInfo {
  transactionHash: string;
  size: number;
  fee: number;
  timestamp: number;
  blobSize?: number;
  mixer?: number;
}

export interface BlockchainInfo {
  height: number;
  difficulty: number;
  txCount: number;
  txPoolSize: number;
  altBlocksCount: number;
  outgoingConnectionsCount: number;
  incomingConnectionsCount: number;
  whitePeerlistSize: number;
  greyPeerlistSize: number;
  lastKnownBlock?: Block;
}

export interface PriceInfo {
  usd: number;
  btc: number;
}

export interface SearchResult {
  type: 'block' | 'transaction' | 'wallet' | 'not_found' | 'error';
  value: string | number;
  error?: string;
}

export interface ChartData {
  timestamp: number;
  value: number;
}

export interface PoolStats {
  name: string;
  hashrate: number;
  height: number;
  miners: number;
  blocks: number;
  percentage: number;
}

export interface SearchHistoryItem {
  term: string;
  timestamp: number;
  type: string;
}

export default {
  BlockHeader,
  Block,
  TransactionInput,
  TransactionOutput,
  Transaction,
  WalletInfo,
  PoolInfo,
  NodeInfo,
  TransactionPoolInfo,
  BlockchainInfo,
  PriceInfo,
  SearchResult,
  ChartData,
  PoolStats,
  SearchHistoryItem
};
