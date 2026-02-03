import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faCoins, faClock, faDatabase, faHashtag, faCopy, faChartLine } from '@fortawesome/free-solid-svg-icons';
import config from '../../config/explorer';
import moment from 'moment';

interface TransactionInput {
  type: string;
  value: {
    amount: number;
    key_offsets: number[];
  };
  address: string;
}

interface TransactionOutput {
  amount: number;
  target: {
    data: {
      key: string;
    };
    type: string;
    address: string;
  };
  output_type?: string;
}

interface TransactionData {
  block: {
    cumul_size: number;
    difficulty: number;
    hash: string;
    height: number;
    timestamp: number;
    tx_count: number;
  };
  tx: {
    extra: string;
    unlock_time: number;
    version: number;
    vin: TransactionInput[];
    vout: TransactionOutput[];
  };
  txDetails: {
    hash: string;
    amount_out: number;
    fee: number;
    size: number;
    tx_types: string[];
  };
}

const TransactionDetails: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [txData, setTxData] = useState<TransactionData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!hash) return;

      try {
        setLoading(true);

        // Fetch transaction details
        const response = await fetch(`${config.api}/json_rpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'f_transaction_json',
            params: {
              hash
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        setTxData(data.result);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching transaction:', error);
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, [hash]);

  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    const formatted = dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
    return formatted;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
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

  if (!txData) {
    return (
      <div className="text-center py-5" style={{ marginTop: '100px' }}>
        <h5 style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Transaction not found</h5>
      </div>
    );
  }

  const { block, tx, txDetails } = txData;
  const totalInput = tx.vin.reduce((sum, input) => sum + (input.value?.amount || 0), 0);
  const isCoinbase = (txDetails.tx_types[0] || '').toLowerCase() === 'miner' || (txDetails.tx_types[0] || '').toLowerCase() === 'mining';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            TRANSACTION
          </div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            {moment.unix(block.timestamp).fromNow()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            to={`/block/${block.hash}`}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <FontAwesomeIcon icon={faCube} style={{ marginRight: '6px' }} /> View Block
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        {/* Transaction Overview */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600 }}>
            Transaction Overview
          </h6>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="row g-3">
          {/* Transaction Hash */}
          <div className="col-md-12">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faHashtag} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  TRANSACTION HASH
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <code style={{
                    fontSize: '0.75rem',
                    color: '#e2e8f0',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {txDetails.hash}
                  </code>
                <button
                  onClick={() => copyToClipboard(txDetails.hash, 'hash')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FontAwesomeIcon icon={faCopy} /> {copied === 'hash' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Unlock Time */}
          <div className="col-md-6">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faClock} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  UNLOCK TIME
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f2f3' }}>
                  {tx.unlock_time === 0 ? 'Immediate' : moment.unix(tx.unlock_time).format('MMMM Do YYYY, h:mm:ss A')}
                </div>
              </div>
            </div>
          </div>

          {/* Extra */}
          <div className="col-md-6">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faDatabase} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  EXTRA DATA
                </div>
                <code style={{ fontSize: '0.7rem', color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {tx.extra}
                </code>
              </div>
            </div>
          </div>

          {/* Confirmations */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faHashtag} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  CONFIRMATIONS
                </div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
                  {config.requiredConfirmations}+
                </div>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faDatabase} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  SIZE
                </div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
                  {txDetails.size.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Block */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faCube} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  BLOCK
                </div>
                <Link to={`/block/${block.hash}`} style={{ fontSize: '0.95rem', color: '#FF8AFB', textDecoration: 'underline', textDecorationStyle: 'dotted', fontWeight: 600 }}>
                  #{block.height}
                </Link>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faClock} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  TIMESTAMP
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f2f3' }}>
                  {moment.unix(block.timestamp).format('MMMM Do YYYY, h:mm:ss A')}
                </div>
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  TYPE
                </div>
                <span style={{
                  background: (() => {
                    const type = (txDetails.tx_types[0] || '').toLowerCase();
                    if (type === 'miner' || type === 'mining') return 'rgba(245, 158, 11, 0.1)';
                    if (type === 'staking' || type === 'staking_reward') return 'rgba(129, 140, 248, 0.1)';
                    return 'rgba(16, 185, 129, 0.1)';
                  })(),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  color: (() => {
                    const type = (txDetails.tx_types[0] || '').toLowerCase();
                    if (type === 'miner' || type === 'mining') return '#f59e0b';
                    if (type === 'staking' || type === 'staking_reward') return 'rgb(129, 140, 248)';
                    return '#10b981';
                  })(),
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {(() => {
                    const type = (txDetails.tx_types[0] || '').toLowerCase();
                    if (type === 'miner' || type === 'mining') return 'Coinbase';
                    if (type === 'staking') return 'Staking Deposit';
                    if (type === 'staking_reward') return 'Staking Reward';
                    if (type === 'regular') return 'Transfer';
                    return txDetails.tx_types[0] || 'Transfer';
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faHashtag} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  VERSION
                </div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
                  {tx.version}
                </div>
              </div>
            </div>
          </div>

          {/* Total Input */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  TOTAL INPUT
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    {formatAmount(totalInput)}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                    {config.ticker}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Output */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  TOTAL OUTPUT
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    {formatAmount(txDetails.amount_out)}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                    {config.ticker}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee */}
          <div className="col-md-4">
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  FEE
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    {formatAmount(txDetails.fee)}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                    {config.ticker}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600 }}>
              Inputs
            </h6>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '4px 10px',
              borderRadius: '12px',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {tx.vin.length}
            </span>
          </div>
        </div>

        {tx.vin.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', marginBottom: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    #
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Amount
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {tx.vin.map((input, index) => (
                  <tr key={index} style={{ borderBottom: index === tx.vin.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(input.value?.amount || 0)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {input.address ? (
                        <Link
                          to={`/wallet/${input.address}`}
                          style={{
                            fontSize: '0.75rem',
                            color: '#FF8AFB',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted'
                          }}
                        >
                          {input.address}
                        </Link>
                      ) : (
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          Generated from Coinbase
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No inputs (Coinbase transaction)
          </div>
        )}
      </div>

      {/* Outputs */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600 }}>
              Outputs
            </h6>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '4px 10px',
              borderRadius: '12px',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {tx.vout.length}
            </span>
          </div>
        </div>

        {tx.vout.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', marginBottom: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    #
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Amount
                  </th>
                  {isCoinbase && (
                    <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                      Type
                    </th>
                  )}
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {tx.vout.map((output, index) => (
                  <tr key={index} style={{ borderBottom: index === tx.vout.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(output.amount)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    {isCoinbase && (
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: output.output_type === 'staking_reward' ? 'rgba(129, 140, 248, 0.1)' :
                                     output.output_type === 'fee_reward' ? 'rgba(66, 177, 186, 0.1)' :
                                     'rgba(245, 158, 11, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          color: output.output_type === 'staking_reward' ? 'rgb(129, 140, 248)' :
                                 output.output_type === 'fee_reward' ? '#42B1BA' :
                                 '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {output.output_type === 'staking_reward' ? 'Staking Reward' :
                           output.output_type === 'fee_reward' ? 'Fee' :
                           'Miner'}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '16px' }}>
                      <Link
                        to={`/wallet/${output.target.address}`}
                        style={{
                          fontSize: '0.75rem',
                          color: '#FF8AFB',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted'
                        }}
                      >
                        {output.target.address}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No outputs
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDetails;
