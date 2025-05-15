import React, { useState } from 'react';
import MapComponent from './components/Map';
import GetStarted from './components/GetStarted';

function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="App bg-gradient-to-r from-yellow-400 to-green-700 min-h-screen">
      {started ? (
        <MapComponent />
      ) : (
        <GetStarted onGetStarted={() => setStarted(true)} />
      )}
    </div>
  );
}

export default App;