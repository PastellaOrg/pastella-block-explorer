import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import config from '../../config/explorer';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import moment from 'moment';
import { useBlocks } from '../../context/BlockContext';

interface BlockchainInfo {
  height: number;
  block_size?: number;
  hashrate?: number;
  difficulty?: number;
}

interface Transaction {
  tx_hash?: string;
  hash?: string;
  amount?: number | string;
  amount_out?: number | string;
  amount_out_formatted?: string;
  fee?: number | string;
  fee_formatted?: string;
  timestamp?: number;
  type?: string;
  size?: number;
  inputs?: Array<{ [key: string]: unknown }>;
  outputs?: Array<{ [key: string]: unknown }>;
}

interface Block {
  height: number;
  hash?: string;
  size?: number;
  tx_count?: number;
  timestamp?: number;
  difficulty?: number;
  amount_total?: number;
}

interface ChartDataPoint {
  x: string;
  y: number;
  timestamp?: number;
  difficulty?: number;
  height?: number;
}

interface BlockHeader {
  height: number;
  hash: string;
  block_size?: number;
  difficulty: number;
  timestamp?: number;
  amount_total?: number;
  totalAmount?: number;
}

const Dashboard: React.FC = () => {
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const { getBlockByHeight, getBlockByHash, blocks } = useBlocks();
  const [loading, setLoading] = useState<boolean>(true);
  const [transactionPool, setTransactionPool] = useState<Transaction[]>([]);
  const [visualizationBlocks, setVisualizationBlocks] = useState<Block[]>([]);
  const [hashrateData, setHashrateData] = useState<ChartDataPoint[]>([]);
  const [blockSizeData, setBlockSizeData] = useState<ChartDataPoint[]>([]);
  const [transactionsData, setTransactionsData] = useState<ChartDataPoint[]>([]);
  const [predictedBlocks, setPredictedBlocks] = useState<number[]>([0, 0, 0, 0]);
  const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null);
  const [latestBlocks, setLatestBlocks] = useState<Block[]>([]);
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([]);
  const [countdowns, setCountdowns] = useState<string[]>(['~6min', '~5min', '~3min', '~90sec']);

  const updateCountdowns = useCallback(() => {
    const now = moment();
    const newCountdowns = [0, 1, 2, 3].map((index) => {
      const targetTime = moment().add((4 - index) * 90, 'seconds');
      const diff = targetTime.diff(now, 'seconds');

      if (diff <= 0) return '0s';

      if (diff >= 60) {
        const mins = Math.floor(diff / 60);
        return `~${mins}min`;
      }
      return `~${diff}s`;
    });

    setCountdowns(newCountdowns);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      let currentHeight: number;
      let latestBlockHeader: BlockHeader;

      // Use cached blocks if available, otherwise fetch current height directly
      if (blocks.length === 0) {
        // Fetch current height directly from API
        const heightResponse = await fetch(`${config.api}/height`);
        const heightData = await heightResponse.json();
        if (heightData.status !== 'OK') {
          throw new Error('Failed to fetch current height');
        }
        currentHeight = heightData.height;

        // Fetch the latest block header directly from API (not through context to avoid race conditions)
        const blockResponse = await fetch(`${config.api}/json_rpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getblockheaderbyheight',
            params: { height: currentHeight }
          })
        });
        const blockData = await blockResponse.json();
        if (blockData.error || !blockData.result?.block_header) {
          throw new Error('Failed to fetch latest block header');
        }
        latestBlockHeader = blockData.result.block_header;
      } else {
        currentHeight = blocks[0].height; // Highest block is first
        latestBlockHeader = blocks[0];
      }

      // Fetch last 4 CONFIRMED mined blocks including current
      // Start from i=0 to get currentHeight (116), then 115, 114, 113
      const minedBlocks: Block[] = [];
      for (let i = 0; i < 4; i++) {
        const targetHeight = currentHeight - i;
        if (targetHeight < 0) break;

        try {
          const header = await getBlockByHeight(targetHeight);

          if (!header) {
            console.error(`Block ${targetHeight} not found`);
            continue;
          }

          const block = {
            height: header.height || targetHeight,
            hash: header.hash || '',
            size: header.block_size || header.blockSize || header.size || 0,
            tx_count: header.num_txes || header.tx_count || 0,
            timestamp: header.timestamp || 0
          };
          minedBlocks.push(block as Block);
        } catch (error) {
          console.error(`Error fetching block ${targetHeight}:`, error);
        }
      }
      // Reverse to show oldest to newest: 113, 114, 115, 116 (left to right)
      setVisualizationBlocks(minedBlocks.reverse());

      // Calculate predicted block heights
      const predicted = [
        currentHeight + 1,
        currentHeight + 2,
        currentHeight + 3,
        currentHeight + 4
      ];
      setPredictedBlocks(predicted);

      // Set blockchain info
      setBlockchainInfo({
        height: currentHeight,
        block_size: latestBlockHeader.block_size || 0,
        hashrate: latestBlockHeader.difficulty / 30, // difficulty_target = 30
        difficulty: latestBlockHeader.difficulty
      });

      // Fetch chart data - get blocks going back (every 5th block for performance)
      const chartBlocks: Block[] = [];
      const step = 5;
      for (let i = step; i < 500; i += step) {
        const targetHeight = currentHeight - i;
        if (targetHeight < 0) break;

        try {
          const header = await getBlockByHeight(targetHeight);

          if (!header) {
            console.error(`Chart block ${targetHeight} not found`);
            continue;
          }

          chartBlocks.push({
            height: header.height,
            size: header.block_size || header.blockSize || header.size || 0,
            tx_count: header.num_txes || header.tx_count || 0,
            timestamp: header.timestamp,
            difficulty: header.difficulty
          } as Block);
        } catch (error) {
          console.error(`Error fetching block ${targetHeight} for charts:`, error);
        }
      }

      // Process chart data
      const hashrate: ChartDataPoint[] = chartBlocks.map(block => ({
        x: moment.unix(block.timestamp || 0).format('HH:mm'),
        y: (block.difficulty || 0) / 30, // difficulty_target = 30
        timestamp: block.timestamp,
        difficulty: block.difficulty,
        height: block.height
      })).reverse();

      const blockSize: ChartDataPoint[] = chartBlocks.map(block => ({
        x: moment.unix(block.timestamp || 0).format('HH:mm'),
        y: block.size || 0,
        timestamp: block.timestamp,
        height: block.height
      })).reverse();

      const transactions: ChartDataPoint[] = chartBlocks.map(block => ({
        x: moment.unix(block.timestamp || 0).format('HH:mm'),
        y: block.tx_count || 0,
        timestamp: block.timestamp,
        height: block.height
      })).reverse();

      setHashrateData(hashrate);
      setBlockSizeData(blockSize);
      setTransactionsData(transactions);

      // Fetch latest 10 blocks for the table
      const latestBlocksTable: Block[] = [];
      for (let i = 0; i < 10; i++) {
        const targetHeight = currentHeight - i;
        if (targetHeight < 0) break;

        try {
          const header = await getBlockByHeight(targetHeight);

          if (!header) {
            console.error(`Table block ${targetHeight} not found`);
            continue;
          }

          // Fetch full block details to get transactions and calculate total amount
          let amountTotal = 0;
          try {
            const fullBlockResponse = await apiService.getFullBlockByHash(header.hash);
            const fullBlock = fullBlockResponse.block as unknown as {
              transactions?: Array<{ amount_out?: number }>;
            };

            // Debug: log full block to see structure
            console.log(`Full block ${targetHeight}:`, fullBlock);

            // Calculate total amount from transaction outputs (including coinbase)
            if (fullBlock.transactions && Array.isArray(fullBlock.transactions)) {
              amountTotal = fullBlock.transactions.reduce((sum, tx) => sum + (tx.amount_out || 0), 0);
            }
          } catch (fullBlockError) {
            console.warn(`Could not fetch full block for ${targetHeight}, amount_total will be 0`, fullBlockError);
          }

          // Debug: log the header data
          console.log(`Dashboard block ${targetHeight}:`, {
            block_size: header.block_size,
            num_txes: header.num_txes,
            tx_count: header.tx_count,
            blockSize: header.blockSize,
            size: header.size,
            amount_total: amountTotal
          });

          latestBlocksTable.push({
            height: header.height,
            hash: header.hash,
            size: header.block_size || header.blockSize || header.size || 0,
            tx_count: header.num_txes || header.tx_count || 0,
            timestamp: header.timestamp,
            amount_total: amountTotal
          } as Block);
        } catch (error) {
          console.error(`Error fetching block ${targetHeight} for table:`, error);
        }
      }

      // Set the 10 blocks for the table (this overwrites the 4 blocks from visualization)
      setLatestBlocks(latestBlocksTable);

      // Fetch latest 10 transactions by iterating through blocks
      const latestTxs: Transaction[] = [];
      let txCount = 0;
      let currentBlockHash = latestBlockHeader.hash;

      while (txCount < 10) {
        try {
          const block = await getBlockByHash(currentBlockHash);

          if (!block) {
            console.error(`Block ${currentBlockHash} not found`);
            break;
          }

          if (block.transactions && Array.isArray(block.transactions)) {
            for (const tx of block.transactions) {
              if (txCount >= 10) break;

              latestTxs.push(tx as Transaction);
              txCount++;
            }
          }

          currentBlockHash = block.prev_hash || '';
        } catch (error) {
          console.error('Error fetching transactions:', error);
          break;
        }
      }

      setLatestTransactions(latestTxs);

      // Fetch transaction pool
      try {
        const poolData = await apiService.getTransactionPool();
        // Handle different response formats
        if ('addedTxs' in poolData && poolData.addedTxs) {
          setTransactionPool(poolData.addedTxs as unknown as Transaction[]);
        } else if ('transactions' in poolData && poolData.transactions) {
          setTransactionPool(poolData.transactions as unknown as Transaction[]);
        } else {
          setTransactionPool([]);
        }
      } catch {
        setTransactionPool([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, [
    blocks,
    getBlockByHeight,
    getBlockByHash
  ]);

  // Initial fetch on mount
  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update countdowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll blocks container to center on mount and after loading
  useEffect(() => {
    if (!loading && blocksContainerRef.current) {
      const container = blocksContainerRef.current;
      // Scroll to center
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }
  }, [loading]);

  const formatAmountWithoutTicker = (amount: number | string): string => {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    const dividedValue = numValue / Math.pow(10, config.decimals);
    return dividedValue.toFixed(config.decimals);
  };

  // Custom tooltip for Hashrate chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const HashrateTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = data.timestamp
        ? moment.unix(data.timestamp).format('MMMM Do YYYY, h:mm:ss A')
        : 'Unknown date';

      return (
        <div style={{
          backgroundColor: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>
            {dateStr}
          </p>
          <p style={{ margin: '0 0 4px 0', color: '#10b981', fontWeight: 'bold' }}>
            Hashrate: {Math.round(data.y)} H/s
          </p>
          {data.difficulty && (
            <p style={{ margin: 0, color: '#06b6d4', fontWeight: '600' }}>
              Difficulty: {data.difficulty.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Block Size chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BlockSizeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = data.timestamp
        ? moment.unix(data.timestamp).format('MMMM Do YYYY, h:mm:ss A')
        : 'Unknown date';

      return (
        <div style={{
          backgroundColor: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>
            {dateStr}
          </p>
          <p style={{ margin: '0 0 4px 0', color: '#6366f1', fontWeight: 'bold' }}>
            Block Size: {data.y.toFixed(0)} bytes
          </p>
          {data.height !== undefined && (
            <p style={{ margin: 0, color: '#06b6d4', fontWeight: '600' }}>
              Height: #{data.height.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Transactions chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TransactionsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = data.timestamp
        ? moment.unix(data.timestamp).format('MMMM Do YYYY, h:mm:ss A')
        : 'Unknown date';

      return (
        <div style={{
          backgroundColor: '#282729',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>
            {dateStr}
          </p>
          <p style={{ margin: '0 0 4px 0', color: '#f59e0b', fontWeight: 'bold' }}>
            Transactions: {data.y.toFixed(0)}
          </p>
          {data.height !== undefined && (
            <p style={{ margin: 0, color: '#06b6d4', fontWeight: '600' }}>
              Height: #{data.height.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
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

  return (
    <div>
      {/* Block Visualization */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729'
          }}>
            <div className="card-body">
              <div
                ref={blocksContainerRef}
                className="d-flex align-items-center blocks-scroll-container"
                style={{
                  gap: '16px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  justifyContent: 'flex-start',
                  padding: '0 16px'
                }}
              >
                {/* Left side - 4 mined blocks */}
                <div className="d-flex" style={{ gap: '8px', flexShrink: 0 }}>
                  {visualizationBlocks.length === 0 ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading blocks...</div>
                  ) : (
                    visualizationBlocks.slice(0, 4).map((block, index) => (
                      <Link
                        key={block.height}
                        to={`/block/${block.hash || block.height}`}
                        className="p-3 block-click"
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          background: '#282729',
                          width: '140px',
                          height: '140px',
                          textDecoration: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: index === 0 ? 0.5 : index === 1 ? 0.7 : index === 2 ? 0.9 : 1
                        }}
                      >
                        <div style={{ fontSize: '23px', fontWeight: 'bold', color: '#f1f2f3', marginBottom: '8px' }}>
                          #{block.height}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                          {block.size ? block.size.toLocaleString() : '0'} bytes
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
                          {block.tx_count || 0} tx
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {block.timestamp ? moment.unix(block.timestamp).fromNow() : '-'}
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                {/* Vertical divider */}
                <div style={{
                  width: '1px',
                  height: '140px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  flexShrink: 0
                }}></div>

                {/* Right side - 4 predicted blocks */}
                <div className="d-flex" style={{ gap: '8px', flexShrink: 0 }}>
                  {predictedBlocks.map((blockHeight, index) => (
                    <div
                      key={index}
                      className="p-3"
                      style={{
                        border: '2px dashed rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        background: '#282729',
                        width: '140px',
                        height: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: index === 0 ? 1 : index === 1 ? 0.9 : index === 2 ? 0.7 : 0.5
                      }}
                    >
                      <div style={{ fontSize: '23px', fontWeight: 'bold', color: '#f1f2f3', marginBottom: '8px' }}>
                        #{blockHeight}
                      </div>
                      <div className="lds-grid" style={{ margin: '8px 0' }}>
                        {[...Array(9)].map((_item, i) => (
                          <div key={i}></div>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {countdowns[index]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - All 3 side by side */}
      <div className="row mb-4">
        <div className="col-12 col-md-4 mb-4">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729',
            height: '100%'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Hashrate
                </h6>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: '#10b981',
                  fontSize: '0.75rem'
                }}>
                  {hashrateData.length > 0 ? Math.round(hashrateData[hashrateData.length - 1].y) : 0} H/s
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '175px', minHeight: '175px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', overflow: 'hidden' }}>
                {hashrateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" style={{ margin: 0 }}>
                    <AreaChart data={hashrateData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorHashrate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <XAxis hide />
                      <YAxis hide />
                      <Tooltip content={<HashrateTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#colorHashrate)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255, 255, 255, 0.3)' }}>
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4 mb-4">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729',
            height: '100%'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Block Size
                </h6>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: '#6366f1',
                  fontSize: '0.75rem'
                }}>
                  {blockchainInfo?.block_size || 0} bytes
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '175px', minHeight: '175px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', overflow: 'hidden' }}>
                {blockSizeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" style={{ margin: 0 }}>
                    <AreaChart data={blockSizeData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorBlockSize" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <XAxis hide />
                      <YAxis hide />
                      <Tooltip content={<BlockSizeTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#colorBlockSize)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255, 255, 255, 0.3)' }}>
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4 mb-4">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729',
            height: '100%'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Transactions
                </h6>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: '#f59e0b',
                  fontSize: '0.75rem'
                }}>
                  {transactionsData.reduce((sum, item) => sum + item.y, 0)}
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '175px', minHeight: '175px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', overflow: 'hidden' }}>
                {transactionsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" style={{ margin: 0 }}>
                    <AreaChart data={transactionsData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <XAxis hide />
                      <YAxis hide />
                      <Tooltip content={<TransactionsTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        fill="url(#colorTransactions)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255, 255, 255, 0.3)' }}>
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Pool */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Transaction Pool
                </h6>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: '#6366f1',
                  fontSize: '0.75rem'
                }}>
                  {transactionPool.length}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table className="table mb-0">
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Hash</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Fee</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionPool.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          No transactions in pool
                        </td>
                      </tr>
                    ) : (
                      transactionPool.slice(0, 10).map((tx, index) => {
                        const txHash = tx.hash || tx.tx_hash || '';
                        const type = tx.type || 'TRANSFER';
                        const amount = tx.amount_out_formatted || formatAmountWithoutTicker(tx.amount_out || tx.amount || 0);
                        const fee = tx.fee_formatted || formatAmountWithoutTicker(tx.fee || 0);
                        const size = tx.size ? tx.size.toLocaleString() : '0';

                        return (
                          <tr key={index} style={{
                            borderBottom: index === transactionPool.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                          }}>
                            <td style={{ padding: '16px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              <Link
                                to={`/transaction/${txHash}`}
                                style={{ color: '#FF8AFB', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                              >
                                {txHash?.substring(0, 16)}...
                              </Link>
                            </td>
                            <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                color: '#10b981',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {type}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                              {amount}
                            </td>
                            <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                              {fee}
                            </td>
                            <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                              {size} bytes
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

      {/* Latest Blocks & Transactions */}
      <div className="row mb-4">
        <div className="col-12 col-md-6 mb-4">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Latest Blocks
              </h6>
            </div>
            <div className="card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table className="table mb-0">
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Height</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Mined</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>TXs</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Size</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestBlocks.slice(0, 10).map((block, index) => (
                      <tr key={block.height} style={{
                        borderBottom: index === Math.min(10, latestBlocks.length) - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                      }}>
                        <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                          <Link
                            to={`/block/${block.hash || block.height}`}
                            style={{ color: '#FF8AFB', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                          >
                            {block.height}
                          </Link>
                        </td>
                        <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                          {block.timestamp ? moment.unix(block.timestamp).fromNow() : '-'}
                        </td>
                        <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                          {block.tx_count || 0}
                        </td>
                        <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                          {block.size ? block.size.toLocaleString() : '0'}
                        </td>
                        <td style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                          {block.amount_total ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                              {formatAmountWithoutTicker(block.amount_total)}
                            </span>
                          ) : '-'}
                          {block.amount_total && (
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                              {config.ticker}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card card-dark" style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            background: '#282729'
          }}>
            <div className="card-header p-3" style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'linear-gradient(135deg, #282729 0%, #222123 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <h6 className="mb-0 text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Latest Transactions
              </h6>
            </div>
            <div className="card-body p-0">
              <div style={{ overflowX: 'auto' }}>
                <table className="table mb-0">
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Hash</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '16px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestTransactions.slice(0, 10).map((tx, index) => {
                      const txHash = tx.hash || tx.tx_hash || '';
                      const amount = tx.amount_out || tx.amount || 0;
                      const fee = tx.fee || 0;

                      return (
                        <tr key={txHash} style={{
                          borderBottom: index === Math.min(10, latestTransactions.length) - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
                        }}>
                          <td style={{ padding: '16px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            <Link
                              to={`/transaction/${txHash}`}
                              style={{ color: '#FF8AFB', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                            >
                              {txHash?.substring(0, 16)}...
                            </Link>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                              {formatAmountWithoutTicker(amount)}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                              {config.ticker}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                              {formatAmountWithoutTicker(fee)}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginLeft: '4px' }}>
                              {config.ticker}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
