import React from 'react';
import logoUrl from '../../assets/logo.svg'; 

export function LogoIcon({ size = 24, className = '', style, ...props }) {
  return (
    <img
      src={logoUrl}
      className={className}
      alt="Logo Helpdesk"
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        ...style 
      }} 
      {...props}
    />git add .
  );
}