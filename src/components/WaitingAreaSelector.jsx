import React, { useState } from 'react';

const WaitingAreaSelector = ({ onOriginChange, onDestinationChange, waitingAreas }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleOriginChange = (e) => {
    const value = e.target.value;
    setOrigin(value);
    onOriginChange(value);
  };

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    onDestinationChange(value);
  };

  // Clear handlers
  const clearOrigin = () => {
    setOrigin('');
    onOriginChange('');
  };
  const clearDestination = () => {
    setDestination('');
    onDestinationChange('');
  };

  return (
    <div className="waiting-area-selector">
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              id="origin"
              value={origin}
              onChange={handleOriginChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                fontSize: '16px'
              }}
            >
              <option value="">Select your starting point</option>
              {waitingAreas.map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
            {origin && (
              <button
                type="button"
                onClick={clearOrigin}
                style={{
                  marginLeft: 8,
                  background: '#eee',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#d32f2f'
                }}
                aria-label="Clear origin"
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              id="destination"
              value={destination}
              onChange={handleDestinationChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                fontSize: '16px'
              }}
            >
              <option value="">Select your destination point</option>
              {waitingAreas.map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
            {destination && (
              <button
                type="button"
                onClick={clearDestination}
                style={{
                  marginLeft: 8,
                  background: '#eee',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#d32f2f'
                }}
                aria-label="Clear destination"
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingAreaSelector; 