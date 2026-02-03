import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCoins } from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/api';
import config from '../../config/explorer';
import {
  formatAmount,
  timeConvert,
  shortTime,
  formatTransactionType,
  truncateHash,
  copyToClipboard
} from '../../utils/helpers';
import type { WalletInfo } from '../../types';

const Wallet: React.FC = () => {
  const { address } = useParams<{ address: string }>();

  const [walletData, setWalletData] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const isFetching = useRef<boolean>(false);

  const fetchWalletData = useCallback(async (addr: string, page: number) => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) {
      return;
    }

    isFetching.current = true;

    let errorMessage = '';

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getWalletDetails(addr, page, config.pagination.walletTransactions);

      // Check if data is valid
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        throw new Error('No data returned from API. The wallet address may not exist or the API endpoint may not be implemented yet.');
      }

      // Map API response to our WalletInfo interface
      const walletInfo: WalletInfo = {
        address: data.address || addr,
        balance: data.total_balance || 0,
        incoming: data.total_incoming || 0,
        outgoing: data.total_outgoing || 0,
        incomingStaking: data.total_incoming_staking_rewards || 0,
        outgoingStakes: data.total_outgoing_stakes || 0,
        transactionCount: data.total_transactions || 0,
        firstTxDate: data.first_tx_timestamp ? data.first_tx_timestamp.toString() : undefined,
        lastTxDate: data.last_tx_timestamp ? data.last_tx_timestamp.toString() : undefined,
        transactions: data.transactions || [],
        totalPages: data.pagination?.total_pages || 1,
        currentPage: data.pagination?.page || page
      };

      setWalletData(walletInfo);
    } catch (err: unknown) {
      // Handle different error types
      errorMessage = 'Failed to load wallet data';

      console.error('Error caught in fetchWalletData:', err);
      console.error('Error name:', (err as Error)?.name);
      console.error('Error message:', (err as Error)?.message);

      if ((err as Error)?.name === 'AbortError') {
        errorMessage = 'Request timed out. API server is not responding.';
      } else if ((err as Error)?.message) {
        errorMessage = (err as Error).message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchWalletData(address, currentPage);
    }
  }, [address, currentPage, fetchWalletData]);

  const handleCopyAddress = async () => {
    if (walletData?.address) {
      const success = await copyToClipboard(walletData.address);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && walletData && newPage < walletData.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Show error if there's an error and no data
  if (error && !walletData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="card card-dark">
            <div className="card-body">
              <div className="alert alert-danger" role="alert">
                <strong>Error:</strong> {error}
                <hr />
                <small className="text-muted">
                  Make sure the API server at <code>{config.api}</code> is running.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading only if still loading and no error
  if (loading && !walletData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="card card-dark">
            <div className="card-body text-center py-5">
              <div className="spinner-border" role="status" style={{
                color: 'rgb(255 192 251)',
                width: '3rem',
                height: '3rem'
              }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading wallet data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data and not loading
  if (!walletData) {
    return null;
  }

  return (
    <>
      {/* Wallet Overview - Modern Design */}
      <div className="row mb-4">
        <div className="col-12">
          {/* Balance Card - Hero Section */}
          <div className="card card-dark mb-4" style={{
            background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="card-body p-4">
              <div>
                <h6 className="text-white-50 mb-2" style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Available Balance
                </h6>
                <h2 className="text-white mb-0" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {formatAmount(walletData.balance)}
                </h2>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="row g-4">
            {/* Incoming Card */}
            <div className="col-md-4">
              <div className="card card-dark h-100" style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                background: '#282729',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <div className="card-body p-4">
                  <div className="mb-3">
                    <div className="text-white-50 small" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      Total Received
                    </div>
                  </div>
                  <h4 className="text-white mb-0" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {formatAmount(walletData.incoming)}
                  </h4>
                </div>
              </div>
            </div>

            {/* Outgoing Card */}
            <div className="col-md-4">
              <div className="card card-dark h-100" style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                background: '#282729',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <div className="card-body p-4">
                  <div className="mb-3">
                    <div className="text-white-50 small" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      Total Sent
                    </div>
                  </div>
                  <h4 className="text-white mb-0" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {formatAmount(walletData.outgoing)}
                  </h4>
                </div>
              </div>
            </div>

            {/* Transactions Card */}
            <div className="col-md-4">
              <div className="card card-dark h-100" style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                background: '#282729',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <div className="card-body p-4">
                  <div className="mb-3">
                    <div className="text-white-50 small" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      Transactions
                    </div>
                  </div>
                  <h4 className="text-white mb-0" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {walletData.transactionCount.toLocaleString()}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Address & Activity */}
          <div className="row g-4 mt-2">
            {/* Wallet Address */}
            <div className="col-md-6">
              <div className="card card-dark h-100" style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                background: '#282729',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <div className="card-body p-4">
                  <h6 className="text-white-50 mb-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Wallet Address
                  </h6>
                  <div className="d-flex align-items-center justify-content-between">
                    <code style={{
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      color: '#e2e8f0',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      flex: 1,
                      marginRight: '12px'
                    }}>
                      {walletData.address}
                    </code>
                    <button
                      className="btn btn-sm"
                      onClick={handleCopyAddress}
                      title={copied ? 'Copied!' : 'Copy address'}
                      style={{
                        background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: copied ? '#10b981' : '#fff',
                        borderRadius: '8px',
                        padding: '8px 16px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)'}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="col-md-6">
              <div className="card card-dark h-100" style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                background: '#282729',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <div className="card-body p-4">
                  <h6 className="text-white-50 mb-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Activity
                  </h6>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="text-white-50 small">First Seen</div>
                      <div className="text-white" style={{ fontWeight: 500 }}>
                        {walletData.firstTxDate ? shortTime(parseInt(walletData.firstTxDate)) : '-'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-white-50 small">Last Activity</div>
                      <div className="text-white" style={{ fontWeight: 500 }}>
                        {walletData.lastTxDate ? shortTime(parseInt(walletData.lastTxDate)) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staking Rewards Section (if any) */}
      {(walletData.incomingStaking > 0 || walletData.outgoingStakes > 0) && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card card-dark">
              <div className="card-header card-header-dark h6">
                <FontAwesomeIcon icon={faCoins} className="me-2" />
                Staking Rewards
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Total Staking Rewards Received</label>
                    <div id="totalIncomingStaking" className="fw-bold text-warning">
                      {formatAmount(walletData.incomingStaking)}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Total Stakes Sent</label>
                    <div id="totalOutgoingStakes" className="fw-bold text-info">
                      {formatAmount(walletData.outgoingStakes)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Card */}
      <div className="row">
        <div className="col-12">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}>
            <div className="card-header" style={{
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px 12px 0 0',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '0.5rem'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Transaction History</h6>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', fontWeight: 500 }}>
                    {walletData.transactionCount.toLocaleString()} transactions
                  </span>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {/* Transactions Table */}
              <div className="table-responsive">
                <table className="table mb-0" id="transactionsTable" style={{
                  margin: 0
                }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <th scope="col" style={{
                        width: '120px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Type</th>
                      <th scope="col" style={{
                        width: '180px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Date</th>
                      <th scope="col" style={{
                        width: '280px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Transaction Hash</th>
                      <th scope="col" style={{
                        width: '100px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Block</th>
                      <th scope="col" style={{
                        width: '150px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Amount</th>
                      <th scope="col" style={{
                        width: '120px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>Fee</th>
                      <th scope="col" style={{
                        width: '220px',
                        padding: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        border: 'none'
                      }}>From / To</th>
                    </tr>
                  </thead>
                  <tbody id="transactionsList">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center" data-label="" style={{
                          padding: '48px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.875rem'
                        }}>
                          Loading transactions...
                        </td>
                      </tr>
                    ) : walletData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center" data-label="" style={{
                          padding: '48px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.875rem'
                        }}>
                          No transactions found for this wallet
                        </td>
                      </tr>
                    ) : (
                      walletData.transactions.map((tx, index: number) => {
                        const txType = formatTransactionType(tx.type || 'TRANSFER');
                        return (
                          <tr
                            key={tx.tx_hash}
                            style={{
                              borderBottom: index === walletData.transactions.length - 1
                                ? 'none'
                                : '1px solid rgba(255, 255, 255, 0.03)',
                              background: 'transparent'
                            }}
                          >
                            <td data-label="Type" style={{ padding: '16px', verticalAlign: 'middle' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: txType.class === 'text-success'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : txType.class === 'text-danger'
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : txType.class === 'text-warning'
                                  ? 'rgba(245, 158, 11, 0.1)'
                                  : 'rgba(129, 140, 248, 0.1)',
                                color: txType.class === 'text-success'
                                  ? '#10b981'
                                  : txType.class === 'text-danger'
                                  ? '#ef4444'
                                  : txType.class === 'text-warning'
                                  ? '#f59e0b'
                                  : 'rgb(129, 140, 248)',
                                display: 'inline-block',
                                textAlign: 'center'
                              }}>
                                {txType.text.includes('\n') ? (
                                  txType.text.split('\n').map((part, i, arr) => (
                                    <React.Fragment key={i}>
                                      {part}
                                      {i < arr.length - 1 && <br />}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  txType.text
                                )}
                              </span>
                            </td>
                            <td data-label="Date" style={{
                              padding: '16px',
                              verticalAlign: 'middle',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.75rem'
                            }}>
                              <div style={{ whiteSpace: 'nowrap' }}>
                                {tx.timestamp ? timeConvert(tx.timestamp).date : '-'}
                              </div>
                              <div style={{ whiteSpace: 'nowrap' }}>
                                {tx.timestamp ? timeConvert(tx.timestamp).time : '-'}
                              </div>
                            </td>
                            <td data-label="Transaction Hash" style={{
                              padding: '16px',
                              verticalAlign: 'middle',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace'
                            }}>
                              <Link
                                to={`/transaction/${tx.tx_hash}`}
                                style={{
                                  color: '#FF8AFB',
                                  textDecoration: 'underline',
                                  textDecorationStyle: 'dotted'
                                }}
                              >
                                {truncateHash(tx.tx_hash, 15, 15)}
                              </Link>
                            </td>
                            <td data-label="Block" style={{
                              padding: '16px',
                              verticalAlign: 'middle',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              <Link
                                to={`/block/${tx.block_number}`}
                                style={{
                                  color: '#FF8AFB',
                                  textDecoration: 'underline',
                                  textDecorationStyle: 'dotted'
                                }}
                              >
                                #{tx.block_number}
                              </Link>
                            </td>
                            <td data-label="Amount" style={{
                              padding: '16px',
                              verticalAlign: 'middle',
                              color: txType.class === 'text-danger' ? '#ef4444' :
                                     txType.class === 'text-info' ? 'rgb(129, 140, 248)' :
                                     '#10b981',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {(txType.class === 'text-danger' || txType.text.includes('Stake\nDeposit')) ? '' : '+'}{formatAmount(tx.amount || 0)}
                            </td>
                            <td data-label="Fee" style={{
                              padding: '16px',
                              verticalAlign: 'middle',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap'
                            }}>
                              {formatAmount(tx.fee || 0)}
                            </td>
                            <td data-label="From / To" style={{
                              padding: '16px',
                              verticalAlign: 'middle'
                            }}>
                              <div className="small">
                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', marginBottom: '2px', whiteSpace: 'nowrap' }}>
                                  From: {tx.from?.[0] ? (
                                    tx.from[0].startsWith(config.addressPrefix) ? (
                                      <Link
                                        to={`/wallet/${tx.from[0]}`}
                                        style={{
                                          color: '#FF8AFB',
                                          textDecoration: 'underline',
                                          textDecorationStyle: 'dotted'
                                        }}
                                      >
                                        {truncateHash(tx.from[0], 8, 8)}
                                      </Link>
                                    ) : (
                                      <span>{truncateHash(tx.from[0], 8, 8)}</span>
                                    )
                                  ) : '-'}
                                </div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                  To: {tx.to?.[0] ? (
                                    tx.to[0].startsWith(config.addressPrefix) ? (
                                      <Link
                                        to={`/wallet/${tx.to[0]}`}
                                        style={{
                                          color: '#FF8AFB',
                                          textDecoration: 'underline',
                                          textDecorationStyle: 'dotted'
                                        }}
                                      >
                                        {truncateHash(tx.to[0], 8, 8)}
                                      </Link>
                                    ) : (
                                      <span>{truncateHash(tx.to[0], 8, 8)}</span>
                                    )
                                  ) : '-'}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {walletData.totalPages > 1 && (
                <nav aria-label="Transaction pagination" style={{ padding: '20px' }}>
                  <ul className="pagination justify-content-center mb-0" style={{ gap: '4px' }}>
                    <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 0}
                        style={{
                          background: currentPage === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          color: currentPage === 0 ? 'rgba(255, 255, 255, 0.3)' : '#6366f1',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.875rem'
                        }}
                      >
                        Previous
                      </button>
                    </li>
                    {(() => {
                      const pages = [];
                      const totalPages = walletData.totalPages;
                      const current = currentPage;

                      // Always show first page
                      pages.push(0);

                      // Show ellipsis if current page is far from first page
                      if (current > 3) {
                        pages.push('...');
                      }

                      // Show pages around current page
                      for (let i = Math.max(1, current - 1); i <= Math.min(totalPages - 2, current + 1); i++) {
                        if (!pages.includes(i)) {
                          pages.push(i);
                        }
                      }

                      // Show ellipsis if current page is far from last page
                      if (current < totalPages - 4) {
                        pages.push('...');
                      }

                      // Always show last page
                      if (totalPages > 1) {
                        pages.push(totalPages - 1);
                      }

                      return pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <li key={`ellipsis-${index}`} className="page-item disabled">
                              <span
                                className="page-link"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(255, 255, 255, 0.05)',
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  cursor: 'default'
                                }}
                              >
                                ...
                              </span>
                            </li>
                          );
                        }

                        const pageNum = page as number;
                        return (
                          <li
                            key={pageNum}
                            className={`page-item ${current === pageNum ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pageNum)}
                              style={{
                                background: current === pageNum
                                  ? 'rgba(99, 102, 241, 0.2)'
                                  : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                color: current === pageNum ? '#6366f1' : 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.875rem'
                              }}
                            >
                              {pageNum + 1}
                            </button>
                          </li>
                        );
                      });
                    })()}
                    <li className={`page-item ${currentPage >= walletData.totalPages - 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= walletData.totalPages - 1}
                        style={{
                          background: currentPage >= walletData.totalPages - 1 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          color: currentPage >= walletData.totalPages - 1 ? 'rgba(255, 255, 255, 0.3)' : '#6366f1',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.875rem'
                        }}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Wallet;
