import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCube,
  faSearch,
  faClock,
  faDatabase,
  faCoins,
  faChartLine,
  faArrowUp,
  faArrowDown,
  faFilter,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import config from '../../config/explorer';
import moment from 'moment';
import { useBlocks } from '../../context/BlockContext';
import type { BlockData } from '../../context/BlockContext';

interface BlockStats {
  totalBlocks: number;
  totalTransactions: number;
  totalSize: number;
  avgDifficulty: number;
  latestBlock: BlockData | null;
}

const Blocks: React.FC = () => {
  const { blocks, loading, error, fetchBlocks, getCurrentHeight } = useBlocks();
  const blocksRef = useRef(blocks);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [blocksPerPage] = useState<number>(12);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'height' | 'timestamp' | 'difficulty' | 'tx_count'>('height');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [totalBlockchainHeight, setTotalBlockchainHeight] = useState<number>(0);

  // Keep ref in sync with blocks
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Fetch initial blockchain height
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

  // Fetch blocks when page changes
  const loadBlocksForPage = useCallback(async () => {
    // Use the actual highest block we have, not the theoretical blockchain height
    const highestAvailableBlock = blocksRef.current.length > 0 ? blocksRef.current[0].height : 0;

    // Calculate the range of blocks we need for this page
    const startHeight = highestAvailableBlock - (currentPage * blocksPerPage);
    const endHeight = Math.max(0, startHeight - blocksPerPage + 1);

    // Find which blocks in this range are missing from cache
    const missingBlocks: number[] = [];
    for (let h = startHeight; h >= endHeight; h--) {
      if (!blocksRef.current.find(b => b.height === h)) {
        missingBlocks.push(h);
      }
    }

    // Only fetch if we're missing blocks
    if (missingBlocks.length > 0) {
      // Fetch from the highest missing block down
      const highestMissing = Math.max(...missingBlocks);
      const count = missingBlocks.length;
      await fetchBlocks(highestMissing, count);
    }
  }, [currentPage, blocksPerPage, fetchBlocks]);

  useEffect(() => {
    if (totalBlockchainHeight > 0) {
      loadBlocksForPage();
    }
  }, [loadBlocksForPage, totalBlockchainHeight]);

  // Memoize filtered and sorted blocks - use directly without intermediate state
  const filteredBlocks = useMemo(() => {
    let result = blocks;

    // Filter blocks based on search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(block =>
        block.height.toString().includes(term) ||
        block.hash.toLowerCase().includes(term)
      );
    }

    // Sort blocks
    result = [...result].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [searchTerm, blocks, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo<BlockStats>(() => {
    const totalBlocks = filteredBlocks.length;
    const totalTransactions = filteredBlocks.reduce((sum, block) => sum + (block.tx_count || block.num_txes || 0), 0);
    const totalSize = filteredBlocks.reduce((sum, block) => sum + (block.block_size || block.blockSize || block.size || 0), 0);
    const avgDifficulty = filteredBlocks.length > 0
      ? filteredBlocks.reduce((sum, block) => sum + block.difficulty, 0) / filteredBlocks.length
      : 0;
    const latestBlock = filteredBlocks.length > 0 ? filteredBlocks[0] : null;

    return { totalBlocks, totalTransactions, totalSize, avgDifficulty, latestBlock };
  }, [filteredBlocks]);

  const formatDifficulty = (difficulty: number): string => {
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

  const formatSize = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return '0 bytes';
    const units = ['bytes', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    // Show decimals only if needed, otherwise show whole number
    const formattedSize = Number.isInteger(size) ? size.toString() : size.toFixed(2);
    return `${formattedSize} ${units[unitIndex]}`;
  };

  const truncateHash = (hash: string, startLength: number = 8, endLength: number = 8): string => {
    if (!hash) return '';
    if (hash.length <= startLength + endLength) return hash;
    return `${hash.substring(0, startLength)}...${hash.substring(hash.length - endLength)}`;
  };

  const getTimeAgo = (timestamp: number): string => {
    const now = moment();
    const blockTime = moment.unix(timestamp);
    const diff = now.diff(blockTime, 'minutes');

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Calculate which block heights to show on this page
  // Use the actual highest block we have, not the theoretical blockchain height
  const highestAvailableBlock = filteredBlocks.length > 0 ? filteredBlocks[0].height : 0;
  const startHeight = highestAvailableBlock - (currentPage * blocksPerPage);
  const endHeight = Math.max(0, startHeight - blocksPerPage + 1);

  // Get the actual blocks for this page from the filtered list
  // Take exactly blocksPerPage blocks, or fewer if we're at the end
  const currentBlocks = filteredBlocks
    .filter(b => b.height <= startHeight && b.height >= endHeight)
    .sort((a, b) => b.height - a.height)
    .slice(0, blocksPerPage);

  // Recalculate total pages based on actual available blocks
  const totalPages = Math.ceil(highestAvailableBlock / blocksPerPage);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(0);
  };

  // Show loading state if we don't have enough blocks for the current page yet
  const needsMoreBlocks = currentPage === 0 && blocks.length < Math.min(blocksPerPage, totalBlockchainHeight) && !loading;

  if (loading || needsMoreBlocks) {
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
          {needsMoreBlocks ? `Loading blocks... (${blocks.length}/${blocksPerPage} loaded)` : 'Loading blocks...'}
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px 60px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', letterSpacing: '1px' }}>
              BLOCKCHAIN EXPLORER
            </div>
            <h1 style={{ fontSize: '2rem', color: '#ffffff', fontWeight: 700, margin: 0, marginBottom: '8px' }}>
              Blocks
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
              Browse and search through {config.ticker} blockchain blocks
            </p>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '10px 20px',
              background: autoRefresh ? 'rgba(255, 192, 251, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: autoRefresh ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!autoRefresh) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              if (!autoRefresh) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <FontAwesomeIcon icon={faSync} style={{ fontSize: '0.875rem', animation: autoRefresh ? 'spin 1s linear infinite' : 'none' }} />
            Auto-refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 192, 251, 0.1) 0%, rgba(255, 192, 251, 0.05) 100%)',
          border: '1px solid rgba(255, 192, 251, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <FontAwesomeIcon icon={faCube} style={{ fontSize: '80px', color: 'rgb(255 192 251)' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: 600 }}>
            TOTAL BLOCKS
          </div>
          <div style={{ fontSize: '1.75rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
            {stats.totalBlocks.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 192, 251)', fontWeight: 500 }}>
            Showing latest blocks
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <FontAwesomeIcon icon={faCoins} style={{ fontSize: '80px', color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: 600 }}>
            TOTAL TRANSACTIONS
          </div>
          <div style={{ fontSize: '1.75rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
            {stats.totalTransactions.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
            Across all blocks
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <FontAwesomeIcon icon={faDatabase} style={{ fontSize: '80px', color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: 600 }}>
            TOTAL SIZE
          </div>
          <div style={{ fontSize: '1.75rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
            {formatSize(stats.totalSize)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>
            Combined block size
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '80px', color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: 600 }}>
            AVG DIFFICULTY
          </div>
          <div style={{ fontSize: '1.75rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
            {formatDifficulty(stats.avgDifficulty)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 500 }}>
            Network difficulty
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        marginBottom: '24px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="text"
                placeholder="Search by block height or hash..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 192, 251, 0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
          </div>

          {/* Sort Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }} />
            <button
              onClick={() => toggleSort('height')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'height' ? 'rgba(255, 192, 251, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'height' ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: sortBy === 'height' ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: sortBy === 'height' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Height
              {sortBy === 'height' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowUp : faArrowDown} style={{ fontSize: '0.75rem' }} />
              )}
            </button>
            <button
              onClick={() => toggleSort('timestamp')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'timestamp' ? 'rgba(255, 192, 251, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'timestamp' ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: sortBy === 'timestamp' ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: sortBy === 'timestamp' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Time
              {sortBy === 'timestamp' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowUp : faArrowDown} style={{ fontSize: '0.75rem' }} />
              )}
            </button>
            <button
              onClick={() => toggleSort('difficulty')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'difficulty' ? 'rgba(255, 192, 251, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'difficulty' ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: sortBy === 'difficulty' ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: sortBy === 'difficulty' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Difficulty
              {sortBy === 'difficulty' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowUp : faArrowDown} style={{ fontSize: '0.75rem' }} />
              )}
            </button>
            <button
              onClick={() => toggleSort('tx_count')}
              style={{
                padding: '8px 16px',
                background: sortBy === 'tx_count' ? 'rgba(255, 192, 251, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${sortBy === 'tx_count' ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: sortBy === 'tx_count' ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: sortBy === 'tx_count' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Transactions
              {sortBy === 'tx_count' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowUp : faArrowDown} style={{ fontSize: '0.75rem' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Blocks Grid */}
      {currentBlocks.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {currentBlocks.map((block, _index) => (
            <Link
              key={block.hash}
              to={`/block/${block.height}`}
              style={{
                textDecoration: 'none',
                background: '#282729',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                display: 'block',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 192, 251, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 192, 251, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Block Number Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 192, 251, 0.15)',
                border: '1px solid rgba(255, 192, 251, 0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                color: 'rgb(255 192 251)',
                fontWeight: 600
              }}>
                #{block.height.toLocaleString()}
              </div>

              {/* Block Hash */}
              <div style={{ marginBottom: '16px', paddingRight: '80px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <FontAwesomeIcon icon={faCube} style={{ fontSize: '1rem', color: 'rgb(255 192 251)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                    BLOCK HASH
                  </span>
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {truncateHash(block.hash)}
                </div>
              </div>

              {/* Time */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px'
                }}>
                  <FontAwesomeIcon icon={faClock} style={{ fontSize: '0.875rem', color: 'rgb(255 192 251)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                    TIMESTAMP
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  {moment.unix(block.timestamp).format('MMM D, YYYY HH:mm:ss')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  {getTimeAgo(block.timestamp)}
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <FontAwesomeIcon icon={faCoins} style={{ fontSize: '0.75rem', color: 'rgb(255 192 251)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                      TRANSACTIONS
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                    {(block.tx_count || block.num_txes || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <FontAwesomeIcon icon={faDatabase} style={{ fontSize: '0.75rem', color: 'rgb(255 192 251)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                      SIZE
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                    {(block.block_size || block.blockSize || block.size) ? formatSize(block.block_size || block.blockSize || block.size) : 'N/A'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '0.75rem', color: 'rgb(255 192 251)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                      DIFFICULTY
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 600 }}>
                    {formatDifficulty(block.difficulty)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{
          background: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <FontAwesomeIcon icon={faCube} style={{ fontSize: '3rem', color: 'rgba(255, 255, 255, 0.2)', marginBottom: '16px' }} />
          <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
            No blocks found
          </div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '8px' }}>
            Try adjusting your search or filter criteria
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '32px'
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            style={{
              padding: '10px 20px',
              background: currentPage === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: currentPage === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Previous
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[...Array(totalPages)].slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3)).map((_, idx) => {
              const pageNum = Math.max(0, currentPage - 2) + idx;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '10px 16px',
                    background: currentPage === pageNum ? 'rgba(255, 192, 251, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${currentPage === pageNum ? 'rgba(255, 192, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    color: currentPage === pageNum ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: currentPage === pageNum ? 600 : 400,
                    transition: 'all 0.2s',
                    minWidth: '44px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== pageNum) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== pageNum) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              padding: '10px 20px',
              background: currentPage === totalPages - 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: currentPage === totalPages - 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
              cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages - 1) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages - 1) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Results Info */}
      <div style={{
        textAlign: 'center',
        marginTop: '24px',
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        Blocks {currentBlocks.length > 0 ? currentBlocks[currentBlocks.length - 1].height : 'N/A'}-{currentBlocks.length > 0 ? currentBlocks[0].height : 'N/A'} of {highestAvailableBlock}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Blocks;
