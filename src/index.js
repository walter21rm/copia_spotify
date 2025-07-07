import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { UserProvider } from './context/UserContext';
import { PlayerProvider } from './context/PlayerContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PlayerProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </PlayerProvider>
  </React.StrictMode>
); 