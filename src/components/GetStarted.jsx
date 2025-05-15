import React from 'react';

const GetStarted = ({ onGetStarted }) => {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: `url('/background.png') center center/cover no-repeat`,
      boxSizing: 'border-box',
      paddingTop: '8vh',
    }}>
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
      }}>
        <img 
          src="/Jeepsielog/jiepsielog.png" 
          alt="Jeepsielog" 
          className="w-32 h-32"
          style={{
            width: 'min(1040px, 60vw)',
            maxWidth: 1040,
            margin: '4vh auto 2vh auto',
            display: 'block',
            objectFit: 'contain',
          }}
        />
        <h1 
          className="libre-baskerville-regular"
          style={{
            fontSize: 'clamp(1.2rem, 5vw, 1.8rem)',
            color: '#222',
            marginBottom: '2vw',
            textAlign: 'center',
            letterSpacing: 1,
            maxWidth: 800,
            width: '100%',
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          Optimizing your ride, Enhancing your day
        </h1>
        <button
          onClick={onGetStarted}
          style={{
            padding: '14px 100px',
            fontSize: 'clamp(1.4rem, 2.5vw, 1.2rem)',
            fontWeight: 700,
            background: '#ffe104',
            border: '#329301 3px solid',
            borderRadius: 30,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            transition: 'background 0.2s',
            minWidth: 120,
            maxWidth: 360,
            width: 'auto',
            display: 'block',
          }}
        >
          GET STARTED
        </button>
        <img
          src="/Jeepsielog/logo.png"
          alt="Logo"
          className="w-8 h-8"
          style={{
            width: 'min(320px, 60vw)',
            maxWidth: 320,
            margin: '0 auto 0 auto',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </div>
      <style>{`
        @media (max-width: 600px) {
          div[style] {
            min-height: 100vh !important;
            justify-content: center !important;
            padding-top: 0 !important;
          }
          img[alt='Jeepsielog'] {
            width: 90vw !important;
            max-width: 95vw !important;
            margin: 2vh auto 1vh auto !important;
          }
          h1.libre-baskerville-regular {
            font-size: 1.1rem !important;
            max-width: 98vw !important;
            margin-bottom: 3vw !important;
          }
          button {
            width: 50vw !important;
            font-size: 1.1rem !important;
            padding: 12px 4vw !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
          img[alt='Logo'] {
            width: 60vw !important;
            max-width: 70vw !important;
            margin: 2vw auto 0 auto !important;
          }
        }
        @media (max-width: 400px) {
          div[style] {
            padding-top: 2vh !important;
          }
          h1.libre-baskerville-regular {
            font-size: 0.98rem !important;
          }
          button { font-size: 0.92rem !important; padding: 10px 2vw !important; }
        }
      `}</style>
    </div>
  );
};

export default GetStarted; 