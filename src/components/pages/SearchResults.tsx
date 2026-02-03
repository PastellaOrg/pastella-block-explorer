import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/api';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      const query = searchParams.get('q');
      if (!query || !query.trim()) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await apiService.search(query.trim());

        switch (result.type) {
          case 'block':
            // Navigate to block page (handles both height and hash)
            navigate(`/block/${result.value}`);
            break;
          case 'transaction':
            // Navigate to transaction page
            navigate(`/transaction/${result.value}`);
            break;
          case 'wallet':
            // Navigate to wallet page
            navigate(`/wallet/${result.value}`);
            break;
          case 'not_found':
            setLoading(false);
            setError(`No results found for "${query}"`);
            break;
          case 'error':
            setLoading(false);
            setError(result.error || 'An error occurred while searching');
            break;
        }
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'An error occurred while searching');
      }
    };

    performSearch();
  }, [searchParams, navigate]);

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
          Searching...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5" style={{ marginTop: '100px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px', color: 'rgba(255, 255, 255, 0.3)' }}>
          <FontAwesomeIcon icon={faSearch} />
        </div>
        <h3 style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
          {error}
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px' }}>
          Try searching for:
        </p>
        <div style={{
          display: 'inline-block',
          textAlign: 'left',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          fontSize: '0.875rem'
        }}>
          <div style={{ marginBottom: '8px' }}>• Block height (e.g., 115)</div>
          <div style={{ marginBottom: '8px' }}>• Block hash (64-character hex)</div>
          <div style={{ marginBottom: '8px' }}>• Transaction hash (64-character hex)</div>
          <div>• Wallet address (starts with PAS)</div>
        </div>
      </div>
    );
  }

  return null;
};

export default SearchResults;
