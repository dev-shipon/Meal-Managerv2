import React from 'react';

export default function Logo({ size = 24, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <stop offset="0%" stopColor="#6366f1" />
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background shape */}
      <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#logoGradient)" fillOpacity="0.1" />
      <rect x="10" y="10" width="80" height="80" rx="20" stroke="url(#logoGradient)" strokeWidth="2" strokeDasharray="10 5" />
      
      {/* Bowl / Pot shape */}
      <path 
        d="M30 45C30 58.8071 41.1929 70 55 70C68.8071 70 80 58.8071 80 45H30Z" 
        fill="url(#logoGradient)" 
        filter="url(#glow)"
      />
      <rect x="25" y="35" width="60" height="8" rx="4" fill="url(#logoGradient)" />
      
      {/* Steam / Aroma lines */}
      <path d="M45 25C45 25 48 20 45 15" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 25C55 25 58 20 55 15" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
      <path d="M65 25C65 25 68 20 65 15" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Accent dot */}
      <circle cx="85" cy="15" r="5" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
