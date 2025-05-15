import React from 'react';

const SegmentedToggle = ({ value, onChange, options }) => {
  return (
    <div style={{
      display: 'flex',
      background: '#42b815',
      borderRadius: '20px',
      padding: '4px',
      width: 'fit-content',
      alignItems: 'center',
      minWidth: 120,
      maxWidth: '100%',
    }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            background: value === option.value ? '#ffe104' : 'transparent',
            color: value === option.value ? 'black' : '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '0.5em 2.2em',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
            fontWeight: value === option.value ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none',
            minWidth: 80,
            maxWidth: 180,
          }}
        >
          {option.label}
        </button>
      ))}
      <style>{`
        @media (max-width: 600px) {
          div[style*='display: flex'] button {
            padding: 0.5em 1.2em !important;
            font-size: 1rem !important;
            min-width: 60px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SegmentedToggle; 