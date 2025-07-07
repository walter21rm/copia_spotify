import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Player from './components/Player';
import { UserProvider } from './context/UserContext';
import SearchPage from './pages/SearchPage';
import PlaylistDetail from './pages/PlaylistDetail';
import LikedSongsPage from './pages/LikedSongsPage';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1DB954', // Verde Spotify
      },
      secondary: {
        main: '#212121', // Gris oscuro
      },
      background: {
        default: darkMode ? '#121212' : '#FFFFFF',
        paper: darkMode ? '#1E1E1E' : '#F5F5F5',
      },
    },
  });

  return (
    <UserProvider>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router>
          <Navbar />
          <Container sx={{ mt: 2, mb: 8 }}>
            <h1>Bienvenido a MusicPlayer</h1>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/playlist/:playlistId" element={<PlaylistDetail />} />
              <Route path="/liked-songs" element={<LikedSongsPage />} />
            </Routes>
          </Container>
          <Player />
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App; 