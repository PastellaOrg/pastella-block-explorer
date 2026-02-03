import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faHashtag } from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/api';
import config from '../../config/explorer';

interface Stake {
  staking_tx_hash: string;
  staker_address: string;
  amount: number;
  lock_duration_days: number;
  unlock_time: number;
  creation_height: number;
  is_active: boolean;
  blocks_staked: number;
  blocks_remaining: number;
  progress_percentage: number;
  accumulated_reward: number;
  accumulated_earnings: number;
  daily_reward_rate: number;
  est_daily_reward: number;
  est_weekly_reward: number;
  est_monthly_reward: number;
  est_yearly_reward: number;
  total_reward_at_maturity: number;
  total_payout_at_maturity: number;
  roi_daily: number;
  roi_yearly: number;
  status: string;
}

interface StakesResponse {
  status: string;
  pagination: {
    total_stakes: number;
    current_page: number;
    total_pages: number;
    limit: number;
    start_index: number;
    end_index: number;
  };
  current_height: number;
  total_staked: number;
  total_staked_formatted: string;
  total_earned: number;
  total_earned_formatted: string;
  stakes: Stake[];
  finished_stakes: Stake[];
}

const Staking: React.FC = () => {
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [finishedStakes, setFinishedStakes] = useState<Stake[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number>(0);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [pagination, setPagination] = useState({
    total_stakes: 0,
    current_page: 1,
    total_pages: 1,
    limit: 50,
    start_index: 0,
    end_index: 0
  });

  useEffect(() => {
    fetchStakes();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStakesSilently();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStakes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllStakes();
      const data: StakesResponse = response as unknown as StakesResponse;

      // Sort stakes: All Stakes by creation_height (descending = oldest to newest), Top 5 by unlock time (ascending)
      const sortedStakes = [...data.stakes].sort((a, b) => b.creation_height - a.creation_height);
      const sortedFinishedStakes = [...(data.finished_stakes || [])].sort((a, b) => b.creation_height - a.creation_height);

      setStakes(sortedStakes);
      setFinishedStakes(sortedFinishedStakes);
      setCurrentHeight(data.current_height);
      setTotalStaked(data.total_staked || 0);
      setTotalEarned(data.total_earned || 0);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching stakes:', err);
      setError('Failed to load stakes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStakesSilently = async () => {
    try {
      const response = await apiService.getAllStakes();
      const data: StakesResponse = response as unknown as StakesResponse;

      // Sort stakes: All Stakes by creation_height (descending = oldest to newest), Top 5 by unlock time (ascending)
      const sortedStakes = [...data.stakes].sort((a, b) => b.creation_height - a.creation_height);
      const sortedFinishedStakes = [...(data.finished_stakes || [])].sort((a, b) => b.creation_height - a.creation_height);

      setStakes(sortedStakes);
      setFinishedStakes(sortedFinishedStakes);
      setCurrentHeight(data.current_height);
      setTotalStaked(data.total_staked || 0);
      setTotalEarned(data.total_earned || 0);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching stakes (silent):', err);
    }
  };

  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    return dividedValue.toFixed(config.decimals);
  };

  const formatPercentage = (value: number): string => {
    return value.toFixed(4) + '%';
  };

  const formatPercentageWhole = (value: number): string => {
    return Math.round(value) + '%';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#f1f2f3',
          marginBottom: '8px',
          letterSpacing: '-0.025em'
        }}>
          Staking Overview
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
          View all active stakes and their rewards
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
            Current Height
          </div>
          <div style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 700 }}>
            {currentHeight.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
            Total Stakes
          </div>
          <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 700 }}>
            {stakes.length + finishedStakes.length}
          </div>
        </div>

        <div style={{
          background: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
            Total Staked
          </div>
          <div style={{ fontSize: '1.5rem', color: '#f472b6', fontWeight: 700 }}>
            {formatAmount(totalStaked)}
            <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '4px' }}>
              {config.ticker}
            </span>
          </div>
        </div>

        <div style={{
          background: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
            Total Earned
          </div>
          <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 700 }}>
            {formatAmount(totalEarned)}
            <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '4px' }}>
              {config.ticker}
            </span>
          </div>
        </div>
      </div>

      {/* Stakes Table */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'linear-gradient(135deg, #282729 0%, #222123 100%)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            All Stakes ({pagination.total_stakes})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '16px'
            }}>
              Loading stakes...
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '8px' }}>
              {error}
            </div>
          </div>
        ) : stakes.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              No stakes found
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                    Status
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                    Transaction
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Amount
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Earned
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Daily ROI
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                    Yearly ROI
                  </th>
                  <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...stakes, ...finishedStakes].map((stake, index) => (
                  <tr key={stake.staking_tx_hash} style={{
                    borderBottom: index === stakes.length + finishedStakes.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                  }}>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        background: stake.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        color: stake.is_active ? '#10b981' : '#f59e0b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {stake.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faHashtag} style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.65rem' }} />
                        <Link
                          to={`/transaction/${stake.staking_tx_hash}`}
                          style={{
                            color: '#f472b6',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {stake.staking_tx_hash.substring(0, 16)}...
                        </Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faWallet} style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.6rem' }} />
                        <Link
                          to={`/wallet/${stake.staker_address}`}
                          style={{
                            color: '#f472b6',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {stake.staker_address.substring(0, 16)}...
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#f472b6', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.amount)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.accumulated_earnings)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div>
                        <span style={{ color: '#f472b6', fontSize: '0.875rem', fontWeight: 600 }}>
                          {stake.roi_daily !== undefined ? formatPercentage(stake.roi_daily) : 'N/A'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                        {stake.lock_duration_days}d
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div>
                        <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                          {stake.roi_yearly !== undefined ? formatPercentageWhole(stake.roi_yearly) : 'N/A'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                        365d
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                          {stake.blocks_staked.toLocaleString()} / {(stake.blocks_staked + stake.blocks_remaining).toLocaleString()} blocks
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${stake.progress_percentage}%`,
                            height: '100%',
                            background: stake.is_active ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {stake.progress_percentage.toFixed(4)}% • {stake.blocks_remaining.toLocaleString()} blocks left
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 5 Upcoming Releases */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '32px'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'linear-gradient(135deg, #282729 0%, #222123 100%)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Top 5 Upcoming Releases
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                  Rank
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                  TX Hash
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                  Amount
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                  Current Rewards
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                  Unlock Reward
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                  Total Rewards
                </th>
                <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left' }}>
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {stakes
                .filter(s => s.is_active)
                .sort((a, b) => a.unlock_time - b.unlock_time)
                .slice(0, 5)
                .map((stake, index) => (
                  <tr key={stake.staking_tx_hash} style={{
                    borderBottom: index === 4 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                  }}>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.2)', fontWeight: 700 }}>
                        #{index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faHashtag} style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.65rem' }} />
                        <Link
                          to={`/transaction/${stake.staking_tx_hash}`}
                          style={{
                            color: '#f472b6',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {stake.staking_tx_hash.substring(0, 16)}...
                        </Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FontAwesomeIcon icon={faWallet} style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.6rem' }} />
                        <Link
                          to={`/wallet/${stake.staker_address}`}
                          style={{
                            color: '#f472b6',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {stake.staker_address.substring(0, 16)}...
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#f472b6', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.amount)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.accumulated_reward)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.total_payout_at_maturity)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                        {formatAmount(stake.total_reward_at_maturity)}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                        {config.ticker}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                          {stake.blocks_staked.toLocaleString()} / {(stake.blocks_staked + stake.blocks_remaining).toLocaleString()} blocks
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${stake.progress_percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {stake.progress_percentage.toFixed(4)}% • {stake.blocks_remaining.toLocaleString()} blocks left
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Staking;
