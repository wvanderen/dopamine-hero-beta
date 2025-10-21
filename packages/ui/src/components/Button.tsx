import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  const baseStyles = {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: variant === 'primary' ? '#0070f3' : '#6c757d',
    color: 'white',
  };

  return (
    <button style={baseStyles} onClick={onClick}>
      {children}
    </button>
  );
};
