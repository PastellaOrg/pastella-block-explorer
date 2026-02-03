import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="text-center py-5">
      <div className="spinner-border" role="status" style={{
        color: 'rgb(255 192 251)',
        width: '3rem',
        height: '3rem'
      }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;
