import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faKey, faDownload, faCopy, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { generateWallet } from '../../utils/walletGenerator';

interface WalletData {
  address: string;
  seed: string;
  mnemonic: string;
  privateKey: string;
  publicKey: string;
}

// Main wallet generation function
async function generateWalletData(): Promise<WalletData> {
  const wallet = await generateWallet();
  return {
    address: wallet.address,
    seed: wallet.privateKey,
    mnemonic: wallet.mnemonic,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey
  };
}

const Tools: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<{ field: string | null }>({ field: null });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleGenerateWallet = async () => {
    setGenerating(true);

    try {
      const newWallet = await generateWalletData();
      setWallet(newWallet);
    } catch (error) {
      console.error('Error generating wallet:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ field });
      setTimeout(() => setCopied({ field: null }), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleGenerateNewClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmGenerateNew = () => {
    setShowConfirmDialog(false);
    setWallet(null);
  };

  const handleCancelGenerateNew = () => {
    setShowConfirmDialog(false);
  };

  const downloadPaperWallet = () => {
    if (!wallet) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1240;
    canvas.height = 1754;

    // Background
    ctx.fillStyle = '#282729';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pastella Paper Wallet', canvas.width / 2, 80);

    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('CryptoNote Wallet - Keep Safe!', canvas.width / 2, 120);

    const leftX = 100;
    const leftY = 200;

    // Address Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Wallet Address', leftX, leftY);

    ctx.fillStyle = '#10b981';
    ctx.font = '16px monospace';
    const addressLines = wrapText(ctx, wallet.address, 520);
    addressLines.forEach((line, i) => {
      ctx.fillText(line, leftX, leftY + 40 + (i * 25));
    });

    // QR Code placeholder
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftX, leftY + 100, 200, 200);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftX, leftY + 100, 200, 200);

    ctx.fillStyle = '#282729';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', leftX + 100, leftY + 205);

    const rightX = 640;
    const rightY = 200;

    // Seed Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Seed (Hex)', rightX, rightY);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '14px monospace';
    const seedLines = wrapText(ctx, wallet.seed, 520);
    seedLines.forEach((line, i) => {
      ctx.fillText(line, rightX, rightY + 40 + (i * 25));
    });

    // Mnemonic Section
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Mnemonic Seed', rightX, rightY + 250);

    ctx.fillStyle = '#8b5cf6';
    ctx.font = '14px monospace';
    const mnemonicLines = wrapText(ctx, wallet.mnemonic, 520);
    mnemonicLines.forEach((line, i) => {
      ctx.fillText(line, rightX, rightY + 290 + (i * 25));
    });

    // Warning
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ SECURITY WARNING ⚠', canvas.width / 2, 750);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '18px Arial';
    const warnings = [
      '• Never share your seed or private keys',
      '• Keep your mnemonic seed secure and backed up',
      '• Anyone with the seed can control the funds',
      '• This is a real wallet - handle with care'
    ];
    warnings.forEach((warning, i) => {
      ctx.fillText(warning, canvas.width / 2, 800 + (i * 35));
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px Arial';
    ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, canvas.width / 2, 1000);

    // Download
    const link = document.createElement('a');
    link.download = `pastella-paper-wallet-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px' }}>
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            TOOLS
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#f1f2f3',
            margin: 0,
            letterSpacing: '-0.025em'
          }}>
            Pastella Wallet Generator
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            Generate a secure Pastella wallet with paper wallet export
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '8px',
        marginBottom: '24px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '1.5rem', color: '#f59e0b', marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b', margin: '0 0 8px 0' }}>
              Security Notice
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              <li>This wallet generator runs entirely in your browser</li>
              <li>No data is sent to any server - everything stays local</li>
              <li><strong>Make sure nobody is watching your screen</strong> when generating wallets</li>
              <li>Keep your seed and mnemonic secure and never share them with anyone</li>
              <li>Make sure to back up your mnemonic seed in a safe location</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '24px',
        padding: '24px'
      }}>
        {!wallet ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FontAwesomeIcon
              icon={faWallet}
              style={{
                fontSize: '4rem',
                color: 'rgba(255, 255, 255, 0.1)',
                marginBottom: '20px'
              }}
            />
            <h3 style={{
              fontSize: '1.25rem',
              color: '#f1f2f3',
              marginBottom: '12px',
              fontWeight: 600
            }}>
              Generate a New Wallet
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '24px',
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Click the button below to generate a new Pastella wallet with a unique address, keys, and mnemonic seed.
            </p>
            <button
              onClick={handleGenerateWallet}
              disabled={generating}
              style={{
                background: generating
                  ? 'rgba(189, 129, 185, 0.3)'
                  : '#bd81b9',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 32px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: generating ? 0.7 : 1
              }}
            >
              {generating ? (
                <>
                  <span className="spinner">⟳</span> Generating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faKey} style={{ marginRight: '8px' }} />
                  Generate Wallet
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                color: '#f1f2f3',
                fontWeight: 600,
                margin: 0
              }}>
                Your Wallet
              </h3>
              <button
                onClick={handleGenerateNewClick}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Generate New
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faWallet} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    Wallet Address
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(wallet.address, 'address')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied.field === 'address' ? (
                    <>
                      <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px', color: '#10b981' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCopy} style={{ marginRight: '4px' }} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                wordBreak: 'break-all',
                fontSize: '0.9rem',
                color: '#10b981',
                fontWeight: 500
              }}>
                {wallet.address}
              </div>
            </div>

            <div style={{
              background: 'rgba(236, 72, 153, 0.05)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faKey} style={{ color: '#ec4899' }} />
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    Private Key
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(wallet.privateKey, 'privateKey')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied.field === 'privateKey' ? (
                    <>
                      <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px', color: '#10b981' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCopy} style={{ marginRight: '4px' }} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                wordBreak: 'break-all',
                fontSize: '0.9rem',
                color: '#ec4899',
                fontWeight: 500
              }}>
                {wallet.privateKey}
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faKey} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    Mnemonic Seed (25 words)
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(wallet.mnemonic, 'mnemonic')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied.field === 'mnemonic' ? (
                    <>
                      <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px', color: '#10b981' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCopy} style={{ marginRight: '4px' }} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                wordBreak: 'break-word',
                fontSize: '0.9rem',
                color: '#8b5cf6',
                fontWeight: 500,
                lineHeight: '1.6'
              }}>
                {wallet.mnemonic}
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'rgba(139, 92, 246, 0.8)', lineHeight: '1.5' }}>
                💡 Write down these 25 words and store them safely. They can restore your wallet.
              </p>
            </div>

            <button
              onClick={downloadPaperWallet}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
              <FontAwesomeIcon icon={faDownload} style={{ fontSize: '0.875rem' }} />
              Download Paper Wallet
            </button>
          </div>
        )}
      </div>

      <div style={{
        background: '#282729',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h6 style={{ margin: 0, color: '#f1f2f3', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>
          Technical Details
        </h6>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              Mnemonic Words
            </div>
            <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
              25 Words
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              Curve
            </div>
            <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
              Ed25519
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              Hash Function
            </div>
            <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
              Keccak-256
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              Address Prefix
            </div>
            <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
              PAS
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#282729',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                style={{ fontSize: '2rem', color: '#f59e0b' }}
              />
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#f1f2f3',
                margin: 0
              }}>
                Generate New Wallet?
              </h3>
            </div>

            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              Are you sure you want to generate a new wallet? <strong style={{ color: '#ef4444' }}>This action cannot be undone!</strong>
            </p>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5',
                margin: 0
              }}>
                <strong style={{ color: '#ef4444' }}>⚠️ Important:</strong> Make sure you have securely backed up your current mnemonic seed before continuing. If you lose access to your current wallet, you will not be able to recover it!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelGenerateNew}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerateNew}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Yes, Generate New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tools;
