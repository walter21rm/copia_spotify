import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Typography, Container, CircularProgress, Alert, Grid, Card, CardMedia, CardContent, Box, IconButton } from '@mui/material';
import { PlayArrow, Pause, FavoriteBorder, Favorite } from '@mui/icons-material';
import axios from 'axios';
import { usePlayer } from '../context/PlayerContext';
import { useUser } from '../context/UserContext';

function SearchPage() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation();
    const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = usePlayer();
    const { user, token } = useUser();
    const [likedSongs, setLikedSongs] = useState([]);

    // Parsear el término de búsqueda de la URL
    const searchTerm = new URLSearchParams(location.search).get('q');

    // Función para cargar canciones favoritas del usuario
    const fetchLikedSongs = async () => {
      if (!user || !token) {
        setLikedSongs([]);
        return;
      }
      try {
        const response = await axios.get(`http://localhost:3001/users/${user.UserID}/liked-songs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setLikedSongs(response.data.map(song => song.SongID)); // Almacenar solo los SongID
      } catch (err) {
        console.error('Error al obtener canciones favoritas en SearchPage:', err);
      }
    };

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchTerm) {
                setSearchResults([]);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`http://localhost:3001/search/songs?q=${searchTerm}`);
                setSearchResults(response.data);
            } catch (err) {
                console.error('Error al buscar canciones:', err);
                setError('Hubo un error al buscar canciones. Por favor, inténtalo de nuevo.');
            } finally {
                setLoading(false);
            }
        };

        fetchSearchResults();
        fetchLikedSongs(); // Llamar a fetchLikedSongs también
    }, [searchTerm, user, token]); // Ejecutar cuando el término de búsqueda, usuario o token cambien

    // Función para manejar el "me gusta" / "no me gusta" de una canción
    const handleLikeToggle = async (songId, isCurrentlyLiked) => {
      if (!user || !token) {
        // Opcional: mostrar un mensaje al usuario para que inicie sesión
        return;
      }
  
      try {
        if (isCurrentlyLiked) {
          await axios.delete(`http://localhost:3001/songs/${songId}/like`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setLikedSongs(prev => prev.filter(id => id !== songId));
        } else {
          await axios.post(`http://localhost:3001/songs/${songId}/like`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setLikedSongs(prev => [...prev, songId]);
        }
      } catch (error) {
        console.error('Error al alternar el estado de "me gusta" en SearchPage:', error);
        // Opcional: mostrar un mensaje de error al usuario
      }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Resultados de búsqueda para: "{searchTerm}"
            </Typography>

            {loading && <CircularProgress />}

            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && searchResults.length === 0 && searchTerm && (
                <Typography variant="body1">No se encontraron canciones para "{searchTerm}".</Typography>
            )}

            {!loading && !error && searchResults.length > 0 && (
                <Grid container spacing={3}>
                    {searchResults.map((song) => {
                        const isLiked = likedSongs.includes(song.SongID);
                        return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={song.SongID}>
                            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={`http://localhost:3001/uploads/${song.CoverArtPath.replace(/\\/g, '/')}`}
                                    alt={song.Title}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <CardContent sx={{ flexGrow: 1, pr: '50px' }}> {/* Añadir padding-right para el botón */}
                                    <Typography variant="h6" component="div" noWrap>
                                        {song.Title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {song.Artist} - {song.Album}
                                    </Typography>
                                </CardContent>
                                <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center' }}>
                                    {user && (
                                      <IconButton 
                                        onClick={() => handleLikeToggle(song.SongID, isLiked)}
                                        color={isLiked ? 'error' : 'inherit'}
                                      >
                                        {isLiked ? <Favorite /> : <FavoriteBorder />}
                                      </IconButton>
                                    )}
                                    <IconButton
                                        onClick={() => {
                                            if (currentSong && currentSong.SongID === song.SongID) {
                                                if (isPlaying) {
                                                    pauseSong();
                                                } else {
                                                    resumeSong();
                                                }
                                            } else {
                                                playSong({
                                                    ...song,
                                                    FilePath: `${process.env.REACT_APP_BACKEND_URL}/uploads/${song.FilePath}`,
                                                    CoverArtPath: song.CoverArtPath
                                                        ? `${process.env.REACT_APP_BACKEND_URL}/uploads/${song.CoverArtPath}`
                                                        : null,
                                                });
                                            }
                                        }}
                                        color="primary"
                                    >
                                        {currentSong && currentSong.SongID === song.SongID && isPlaying ? <Pause /> : <PlayArrow />}
                                    </IconButton>
                                </Box>
                            </Card>
                        </Grid>
                    );})}
                </Grid>
            )}
        </Container>
    );
}

export default SearchPage; 