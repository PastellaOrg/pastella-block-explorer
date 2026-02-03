import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faClock, faSearch, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useTransactions } from '../../context/TransactionContext';
import { useBlocks } from '../../context/BlockContext';
import config from '../../config/explorer';
import moment from 'moment';

// Define the type locally to avoid import issues
type TransactionData = {
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

type SortField = 'timestamp' | 'height' | 'fee' | 'amount';

const Transactions: React.FC = () => {
  const { transactions, loading: txLoading, fetchTransactions, totalTransactions } = useTransactions();
  const { getCurrentHeight } = useBlocks();

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalBlockchainHeight, setTotalBlockchainHeight] = useState<number>(0);

  const transactionsPerPage = config.pagination.transactions;
  const transactionsRef = useRef(transactions);
  const _loadedPagesRef = useRef<Set<number>>(new Set());

  // Update ref when transactions change
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Get initial blockchain height
  useEffect(() => {
    const fetchHeight = async () => {
      try {
        const height = await getCurrentHeight();
        setTotalBlockchainHeight(height);
      } catch (err) {
        console.error('Error fetching height:', err);
      }
    };

    fetchHeight();
  }, [getCurrentHeight]);

  // Load transactions for a specific page (lazy loading)
  const loadTransactionsForPage = useCallback(async () => {
    // Skip if this page has already been loaded
    if (_loadedPagesRef.current.has(currentPage)) {
      return;
    }

    const startHeight = totalBlockchainHeight - (currentPage * transactionsPerPage);
    const endHeight = Math.max(0, startHeight - transactionsPerPage + 1);

    // Find which transactions in this range are missing from cache
    const missingBlocks: number[] = [];
    for (let h = startHeight; h >= endHeight; h--) {
      const hasTxFromBlock = transactionsRef.current.some(t => t.blockHeight === h);
      if (!hasTxFromBlock) {
        missingBlocks.push(h);
      }
    }

    // Only fetch if we're missing transactions from blocks
    if (missingBlocks.length > 0) {
      const highestMissing = Math.max(...missingBlocks);
      const lowestMissing = Math.min(...missingBlocks);
      await fetchTransactions(highestMissing, lowestMissing);
    }

    // Mark this page as loaded
    _loadedPagesRef.current.add(currentPage);
  }, [currentPage, totalBlockchainHeight, transactionsPerPage, fetchTransactions]);

  // Trigger loading when page changes
  useEffect(() => {
    loadTransactionsForPage();
  }, [currentPage, loadTransactionsForPage]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(term) ||
        tx.blockHash.toLowerCase().includes(term) ||
        tx.blockHeight.toString().includes(term)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'height':
          comparison = a.blockHeight - b.blockHeight;
          break;
        case 'fee':
          comparison = a.fee - b.fee;
          break;
        case 'amount':
          comparison = (a.amount_out || 0) - (b.amount_out || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, searchTerm, sortBy, sortOrder]);

  // Pagination using height-based filtering (similar to Blocks page)
  const totalPages = Math.ceil(totalBlockchainHeight / transactionsPerPage);
  const startHeight = totalBlockchainHeight - (currentPage * transactionsPerPage);
  const endHeight = Math.max(0, startHeight - transactionsPerPage + 1);

  const currentTransactions = filteredTransactions.filter(
    tx => tx.blockHeight <= startHeight && tx.blockHeight >= endHeight
  ).sort((a, b) => b.timestamp - a.timestamp);

  // Sort toggle handler
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(0);
    // Reset loaded pages cache when sorting changes
    _loadedPagesRef.current.clear();
  };

  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    const formatted = dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
    return formatted;
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <FontAwesomeIcon icon={faSort} style={{ color: 'rgba(255, 255, 255, 0.3)', marginLeft: '6px' }} />;
    }
    return sortOrder === 'asc'
      ? <FontAwesomeIcon icon={faSortUp} style={{ color: 'rgb(255, 192, 251)', marginLeft: '6px' }} />
      : <FontAwesomeIcon icon={faSortDown} style={{ color: 'rgb(255, 192, 251)', marginLeft: '6px' }} />;
  };

  const getTxTypeBadge = (tx: TransactionData) => {
    const type = (tx.tx_types?.[0] || '').toLowerCase();

    if (type === 'miner' || type === 'mining') {
      return {
        label: 'Coinbase',
        background: 'rgba(245, 158, 11, 0.1)',
        color: '#f59e0b'
      };
    }

    if (type === 'staking') {
      return {
        label: 'Staking Deposit',
        background: 'rgba(129, 140, 248, 0.1)',
        color: 'rgb(129, 140, 248)'
      };
    }

    if (type === 'staking_reward') {
      return {
        label: 'Staking Reward',
        background: 'rgba(129, 140, 248, 0.1)',
        color: 'rgb(129, 140, 248)'
      };
    }

    return {
      label: 'Transfer',
      background: 'rgba(16, 185, 129, 0.1)',
      color: '#10b981'
    };
  };

  if (txLoading && transactions.length === 0) {
    return (
      <div className="text-center py-5" style={{ marginTop: '100px' }}>
        <div className="spinner-border" role="status" style={{
          color: 'rgb(255 192 251)',
          width: '3rem',
          height: '3rem'
        }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            TRANSACTIONS
          </div>
          <div style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 700 }}>
            {totalTransactions.toLocaleString()}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <FontAwesomeIcon
            icon={faSearch}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.875rem',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Search by hash, block hash, or height..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
              // Don't reset cache on search - we're just filtering existing data
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.875rem',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', marginBottom: 0 }}>
            <thead>
              <tr style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <th
                  onClick={() => toggleSort('timestamp')}
                  style={{
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Timestamp {getSortIcon('timestamp')}
                </th>
                <th
                  onClick={() => toggleSort('height')}
                  style={{
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Block {getSortIcon('height')}
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Hash
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  style={{
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    textAlign: 'right'
                  }}
                >
                  Amount {getSortIcon('amount')}
                </th>
                <th
                  onClick={() => toggleSort('fee')}
                  style={{
                    padding: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    textAlign: 'right'
                  }}
                >
                  Fee {getSortIcon('fee')}
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {currentTransactions.length > 0 ? (
                currentTransactions.map((tx, index) => {
                  const txType = getTxTypeBadge(tx);
                  return (
                    <tr
                      key={tx.hash}
                      style={{
                        borderBottom: index === currentTransactions.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FontAwesomeIcon icon={faClock} style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }} />
                          {moment.unix(tx.timestamp).fromNow()}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                        <Link
                          to={`/block/${tx.blockHash}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#FF8AFB',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted'
                          }}
                        >
                          <FontAwesomeIcon icon={faCube} style={{ fontSize: '0.75rem' }} />
                          {tx.blockHeight}
                        </Link>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Link
                          to={`/transaction/${tx.hash}`}
                          style={{
                            color: '#FF8AFB',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            wordBreak: 'break-all'
                          }}
                        >
                          {tx.hash}
                        </Link>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                          {tx.amount_out ? formatAmount(tx.amount_out) : 'N/A'}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                          {config.ticker}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                            {formatAmount(tx.fee)}
                          </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                            {config.ticker}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: txType.background,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: txType.color,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-block',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {txType.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {searchTerm ? 'No transactions found matching your search.' : 'No transactions available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            style={{
              padding: '8px 12px',
              background: currentPage === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: currentPage === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            First
          </button>

          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            style={{
              padding: '8px 12px',
              background: currentPage === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: currentPage === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Previous
          </button>

          <span style={{
            padding: '8px 16px',
            background: 'rgba(255, 192, 251, 0.1)',
            border: '1px solid rgba(255, 192, 251, 0.3)',
            borderRadius: '6px',
            color: 'rgb(255, 192, 251)',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            style={{
              padding: '8px 12px',
              background: currentPage >= totalPages - 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: currentPage >= totalPages - 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Next
          </button>

          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            style={{
              padding: '8px 12px',
              background: currentPage >= totalPages - 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: currentPage >= totalPages - 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Last
          </button>

          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', marginLeft: '12px' }}>
            (Blocks {startHeight} - {endHeight})
          </span>
        </div>
      )}
    </div>
  );
};

export default Transactions;
