import moment from 'moment';
import config from '../config/explorer';
import bs58 from 'bs58';

// Number formatting with commas
export const numberWithCommas = (x: number | string): string => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Convert timestamp to readable date
export const timeConvert = (timestamp: number): { date: string; time: string } => {
  if (!timestamp) return { date: '-', time: '-' };
  const datePart = moment.unix(timestamp).format('MMMM Do YYYY,');
  const timePart = moment.unix(timestamp).format('h:mm:ss A');
  return { date: datePart, time: timePart };
};

// Short date format
export const shortTime = (timestamp: number): string => {
  if (!timestamp) return '-';
  return moment.unix(timestamp).format('MMM D, YYYY');
};

// Fetch with timeout
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Sleep/delay function
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Prettify hash rate
export const prettifyNumber = (value: number | string): string => {
  if (!value) return '0 H/s';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
  let unitIndex = 0;
  let number = numValue;

  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)} ${units[unitIndex]}`;
};

// Format hashrate for display
export const getReadableHashRateString = (hashRate: number | string): string => {
  if (!hashRate) return '0 H/s';

  const numValue = typeof hashRate === 'string' ? parseFloat(hashRate) : hashRate;
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
  let unitIndex = 0;
  let number = numValue;

  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)} ${units[unitIndex]}`;
};

// Format difficulty
export const getReadableDifficultyString = (difficulty: number | string): string => {
  if (!difficulty) return '0';

  const numValue = typeof difficulty === 'string' ? parseFloat(difficulty) : difficulty;
  const units = ['', 'K', 'M', 'B', 'T'];
  let unitIndex = 0;
  let number = numValue;

  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)} ${units[unitIndex]}`;
};

// Format amount with ticker
export const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return `0.00000000 ${config.ticker}`;

  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  const dividedValue = numValue / Math.pow(10, config.decimals);
  const parts = dividedValue.toFixed(config.decimals).split('.');
  const integerPart = numberWithCommas(parts[0]);
  const decimalPart = parts[1];
  return `${integerPart}.${decimalPart} ${config.ticker}`;
};

// Format amount without ticker
export const formatAmountWithoutTicker = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return `0.00000000`;

  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  const dividedValue = numValue / Math.pow(10, config.decimals);
  const parts = dividedValue.toFixed(config.decimals).split('.');
  const integerPart = numberWithCommas(parts[0]);
  const decimalPart = parts[1];
  return `${integerPart}.${decimalPart}`;
};

// Truncate hash/address for display
export const truncateHash = (
  hash: string,
  startLength: number = 10,
  endLength: number = 10
): string => {
  if (!hash) return '';
  if (hash.length <= startLength + endLength) return hash;

  return `${hash.substring(0, startLength)}...${hash.substring(hash.length - endLength)}`;
};

// Convert seconds to human readable time
export const secondsToHumanReadable = (seconds: number): string => {
  if (!seconds) return '0 seconds';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  return parts.join(', ');
};

export interface TransactionTypeInfo {
  text: string;
  class: string;
}

// Format transaction type for display
export const formatTransactionType = (type: string): TransactionTypeInfo => {
  const types: Record<string, TransactionTypeInfo> = {
    'INCOMING': { text: 'Incoming', class: 'text-success' },
    'OUTGOING': { text: 'Outgoing', class: 'text-danger' },
    'MINING': { text: 'Coinbase', class: 'text-warning' },
    'STAKE_REWARD': { text: 'Stake\nReward', class: 'text-info' },
    'STAKE_DEPOSIT': { text: 'Stake\nDeposit', class: 'text-info' }
  };

  return types[type] || { text: type, class: 'text-muted' };
};

// Validate wallet address with checksum verification
export const isValidWalletAddress = (address: string): boolean => {
  if (!address) return false;

  // Basic format check
  if (!address.startsWith('PAS')) return false;
  if (address.length < 50 || address.length > 100) return false;

  try {
    // Attempt to decode the address from Base58
    const decoded = bs58.decode(address);

    // Check minimum length (2 bytes prefix + 32 bytes public key + 4 bytes checksum = 38 bytes)
    if (decoded.length < 38) return false;

    // Extract components
    const prefix = decoded.slice(0, 2);
    const publicKey = decoded.slice(2, 34);
    const checksum = decoded.slice(34, 38);

    // Verify prefix is 0x198004 (little-endian: [0x19, 0x80, 0x04])
    if (prefix[0] !== 0x19 || prefix[1] !== 0x80 || prefix[2] !== 0x04) return false;

    // Verify checksum using cn_fast_hash
    const addressWithoutChecksum = new Uint8Array(34); // 2 bytes prefix + 32 bytes public key
    addressWithoutChecksum.set(prefix);
    addressWithoutChecksum.set(publicKey, 2);

    // Calculate expected checksum using CryptoNote's cn_fast_hash
    const hash = cn_fast_hash(addressWithoutChecksum);
    const expectedChecksum = hash.slice(0, 4);

    // Compare checksums
    for (let i = 0; i < 4; i++) {
      if (checksum[i] !== expectedChecksum[i]) return false;
    }

    return true;
  } catch (error) {
    console.error('Address validation error:', error);
    return false;
  }
};

// Validate block hash
export const isValidBlockHash = (hash: string): boolean => {
  if (!hash) return false;
  return /^[a-f0-9]{64}$/i.test(hash);
};

// Validate transaction hash
export const isValidTxHash = (hash: string): boolean => {
  if (!hash) return false;
  return /^[a-f0-9]{64}$/i.test(hash);
};

// Copy to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

export default {
  numberWithCommas,
  timeConvert,
  shortTime,
  fetchWithTimeout,
  sleep,
  prettifyNumber,
  getReadableHashRateString,
  getReadableDifficultyString,
  formatAmount,
  truncateHash,
  secondsToHumanReadable,
  formatTransactionType,
  isValidWalletAddress,
  isValidBlockHash,
  isValidTxHash,
  copyToClipboard
};
