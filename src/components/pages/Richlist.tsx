import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHashtag } from '@fortawesome/free-solid-svg-icons';
import config from '../../config/explorer';

interface RichlistEntry {
  address: string;
  balance: number;
  balance_formatted: string;
  percentage: number;
  first_tx_timestamp: number;
  first_tx_date: string;
  last_tx_timestamp: number;
  last_tx_date: string;
}

interface RichlistResponse {
  status: string;
  count: number;
  richlist: RichlistEntry[];
  error?: {
    message: string;
  };
}

const Richlist: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [richlist, setRichlist] = useState<RichlistEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRichlist = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${config.api}/json_rpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'richlist'
          })
        });

        const data: RichlistResponse = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        setRichlist(data.richlist || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching richlist:', err);
        setError(err instanceof Error ? err.message : 'Failed to load richlist');
        setLoading(false);
      }
    };

    fetchRichlist();
  }, []);

  const truncateAddress = (address: string, startLength: number = 10, endLength: number = 10): string => {
    if (!address) return '';
    if (address.length <= startLength + endLength) return address;
    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
  };

  const formatBalance = (balanceStr: string): string => {
    // Split the balance into integer and decimal parts
    const parts = balanceStr.split('.');
    if (parts.length === 2) {
      // Format the integer part with commas and keep decimal part as is
      const integerPart = parseFloat(parts[0]).toLocaleString('en-US');
      return `${integerPart}.${parts[1]}`;
    }
    // If no decimal part, just format with commas
    return parseFloat(balanceStr).toLocaleString('en-US');
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
        <p className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading richlist...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5" style={{ marginTop: '100px' }}>
        <h5 style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{error}</h5>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            NETWORK
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
            Richlist
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            Top {config.ticker} holders by balance
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '24px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <FontAwesomeIcon icon={faHashtag} style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              About Richlist
            </h6>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6' }}>
              The richlist shows the top holders of {config.ticker} by balance. This data is updated periodically to reflect the current distribution of coins across the network.
            </p>
          </div>
        </div>
      </div>

      {/* Richlist Table */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600 }}>
              Top Holders
            </h6>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '4px 10px',
              borderRadius: '12px',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {richlist.length}
            </span>
          </div>
        </div>

        {richlist.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', marginBottom: 0 }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Rank
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Address
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Balance
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Percentage
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {richlist.map((entry, index) => (
                  <tr key={entry.address} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index < 3 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: index < 3 ? '#f59e0b' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}>
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Link
                        to={`/wallet/${entry.address}`}
                        style={{
                          fontSize: '0.875rem',
                          color: '#FF8AFB',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted'
                        }}
                      >
                        {truncateAddress(entry.address)}
                      </Link>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                          {formatBalance(entry.balance_formatted)}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                          {config.ticker}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{
                        color: entry.percentage > 50 ? '#f59e0b' : entry.percentage > 10 ? '#f97316' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {entry.percentage.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                      {entry.last_tx_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No richlist data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Richlist;
