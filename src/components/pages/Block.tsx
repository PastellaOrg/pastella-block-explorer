import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../../services/api';
import config from '../../config/explorer';
import { timeConvert } from '../../utils/helpers';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faCoins,
  faExchangeAlt,
  faDatabase,
  faChartLine,
  faCheckCircle,
  faClock,
  faHashtag,
  faCube
} from '@fortawesome/free-solid-svg-icons';
import type { Block } from '../../types';

const BlockPage: React.FC = () => {
  const { hashOrHeight } = useParams<{ hashOrHeight: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [block, setBlock] = useState<Block | null>(null);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [nextBlockHash, setNextBlockHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockData = async () => {
      try {
        setLoading(true);

        // Determine if hashOrHeight is a hash or height
        const isHash = /^[a-f0-9]{64}$/i.test(hashOrHeight || '');

        let blockData;
        if (isHash) {
          // Get block by hash
          blockData = await apiService.getFullBlockByHash(hashOrHeight!);
        } else {
          // Get block by height - first get the hash, then get the full block
          const height = parseInt(hashOrHeight || '0');
          if (isNaN(height)) {
            throw new Error('Invalid block identifier');
          }
          const blockHash = await apiService.getBlockHash(height);
          blockData = await apiService.getFullBlockByHash(blockHash);
        }

        // Get current blockchain info
        const info = await apiService.getInfo();

        // Fetch next block hash if not at the tip
        const blockHeight = typeof blockData.block.height === 'number'
          ? blockData.block.height
          : parseInt(blockData.block.height as string);

        if (blockHeight < info.height) {
          try {
            const nextHash = await apiService.getBlockHash(blockHeight + 1);
            setNextBlockHash(nextHash);
          } catch {
            // Silently fail - the forward button will be disabled
            setNextBlockHash(null);
          }
        } else {
          setNextBlockHash(null);
        }

        // Get price
        try {
          const priceInfo = await apiService.getPrice();
          setPrice(priceInfo.usd);
        } catch {
          setPrice(0);
        }

        setBlock(blockData.block as Block);
        setConfirmations(info.height - (blockData.block.height as number));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching block:', error);
        setLoading(false);
      }
    };

    fetchBlockData();
  }, [hashOrHeight]);

  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    const formatted = dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
    return formatted;
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

  if (!block) {
    return (
      <div className="text-center py-5" style={{ marginTop: '100px' }}>
        <h5 style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Block not found</h5>
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Compact Header */}
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
              BLOCK #{(block.height as number).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              {moment.unix(block.timestamp as number).fromNow()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to={`/block/${(block as unknown as Record<string, unknown>).prev_hash as string}`}
              style={{
                padding: '8px 12px',
                background: (block.height as number) <= 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: (block.height as number) <= 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                cursor: (block.height as number) <= 0 ? 'not-allowed' : 'pointer',
                pointerEvents: (block.height as number) <= 0 ? 'none' : 'auto',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if ((block.height as number) > 0) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = (block.height as number) <= 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <Link
              to={`/block/${nextBlockHash || '#'}`}
              style={{
                padding: '8px 12px',
                background: !nextBlockHash ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: !nextBlockHash ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                cursor: !nextBlockHash ? 'not-allowed' : 'pointer',
                pointerEvents: !nextBlockHash ? 'none' : 'auto',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (nextBlockHash) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = !nextBlockHash ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
        </div>

      {/* Stats and Details in one card */}
      <div className="row mb-4">
        <div className="col-12">
          <div style={{
            background: '#282729',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div className="row g-3">
              {/* REWARD */}
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
                  <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      REWARD
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 600, wordBreak: 'break-word' }}>
                        {formatAmount((block.reward as number) || 0)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {price > 0 ? `$${(price * ((block.reward as number) || 0) / Math.pow(10, config.decimals)).toFixed(2)}` : config.ticker}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TRANSACTIONS */}
              <div className="col-md-6">
                <div style={{
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  position: 'relative'
                }}>
                  <FontAwesomeIcon icon={faExchangeAlt} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      TRANSACTIONS
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, wordBreak: 'break-word' }}>
                      {(block.transactions as unknown[] | undefined)?.length || 0}
                    </div>
                  </div>
                  <span style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    color: '#06b6d4',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    {((block as unknown as Record<string, unknown>).transactionsCumulativeSize as number | undefined)?.toLocaleString() || '0'} bytes
                  </span>
                </div>
              </div>

              {/* SIZE */}
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
                      SIZE
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, wordBreak: 'break-word' }}>
                      {((block as unknown as Record<string, unknown>).blockSize as number | undefined)?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DIFFICULTY */}
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
                  <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      DIFFICULTY
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, wordBreak: 'break-word' }}>
                      {(block.difficulty as number | undefined)?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* CONFIRMATIONS */}
              <div className="col-md-6">
                <div style={{
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  position: 'relative'
                }}>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      CONFIRMATIONS
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, wordBreak: 'break-word' }}>
                      {confirmations.toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: confirmations >= config.requiredConfirmations ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    color: confirmations >= config.requiredConfirmations ? '#10b981' : '#ef4444',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    {confirmations >= config.requiredConfirmations ? 'confirmed' : 'unconfirmed'}
                  </span>
                </div>
              </div>

              {/* FEES */}
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
                  <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      FEES
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 600, wordBreak: 'break-word' }}>
                        {formatAmount(((block as unknown as Record<string, unknown>).totalFeeAmount as number) || 0)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {config.ticker}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMESTAMP */}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      TIMESTAMP
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f2f3', wordBreak: 'break-word' }}>
                      {timeConvert(block.timestamp as number).date} {timeConvert(block.timestamp as number).time}
                    </div>
                  </div>
                </div>
              </div>

              {/* NONCE */}
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
                  <FontAwesomeIcon icon={faHashtag} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      NONCE
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f2f3', wordBreak: 'break-word' }}>
                      {(block.nonce as number | undefined)?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOCK HASH */}
              <div className="col-12">
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      BLOCK HASH
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}>
                      {block.hash as string}
                    </div>
                  </div>
                </div>
              </div>

              {/* PREVIOUS BLOCK */}
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
                  <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      PREVIOUS BLOCK
                    </div>
                    <Link
                      to={`/block/${(block as unknown as Record<string, unknown>).prev_hash as string}`}
                      style={{ color: '#FF8AFB', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}
                    >
                      {(block as unknown as Record<string, unknown>).prev_hash as string}
                    </Link>
                  </div>
                </div>
              </div>

              {/* GENERATED COINS */}
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
                  <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                      GENERATED COINS
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f2f3', wordBreak: 'break-word' }}>
                      {formatAmount(parseFloat(((block as unknown as Record<string, unknown>).alreadyGeneratedCoins as string) || '0'))} {config.ticker}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="row mb-4">
        <div className="col-12">
          <div style={{
            background: '#282729',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600 }}>
                  Transactions
                </h6>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {(block.transactions as unknown[] | undefined)?.length || 0}
                </span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', marginBottom: 0 }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Hash</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>USD</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Fee</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!block.transactions || (block.transactions as unknown[]).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          No transactions in this block
                        </td>
                      </tr>
                    ) : (
                      ((block as unknown as Record<string, unknown>).transactions as Array<{ [key: string]: unknown }> || []).map((tx, index: number) => {
                        const txAmount = (tx.amount_out || tx.amount || 0) as number;
                        const txFee = (tx.fee || 0) as number;
                        const txSize = (tx.size || 0) as number;
                        const txTypeRaw = (tx.type || 'Transfer') as string;
                        const txTypeLower = txTypeRaw.toLowerCase();
                        const isCoinbase = txTypeLower === 'miner' || txTypeLower === 'mining' || txTypeLower === 'coinbase';
                        const isRegular = txTypeLower === 'regular';
                        const displayType = isCoinbase ? 'Coinbase' : isRegular ? 'Transfer' : txTypeRaw.charAt(0).toUpperCase() + txTypeRaw.slice(1).toLowerCase();

                        return (
                          <tr key={index} style={{
                            borderBottom: index === (block.transactions as unknown[]).length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                          }}>
                            <td style={{ padding: '16px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              <Link
                                to={`/transaction/${tx.hash as string}`}
                                style={{ color: '#FF8AFB', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                              >
                                {(tx.hash as string).substring(0, 15)}...{(tx.hash as string).substring((tx.hash as string).length - 15)}
                              </Link>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                background: isCoinbase ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                color: isCoinbase ? '#f59e0b' : '#10b981',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {displayType}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                                {formatAmount(txAmount)}
                              </span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                                {config.ticker}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                              ${(price * (txAmount / Math.pow(10, config.decimals))).toFixed(2)}
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                                {formatAmount(txFee)}
                              </span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                                {config.ticker}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                              {txSize.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlockPage;
