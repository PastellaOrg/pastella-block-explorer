import React from 'react';

interface CardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`card card-dark ${className}`}>
      <div className="card-header card-header-dark h6">
        {icon && <i className={`${icon} me-2`}></i>}
        {title}
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;
