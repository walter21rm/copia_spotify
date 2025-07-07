import React, { useState, useEffect } from 'react';
import { Typography, Container, CircularProgress, Alert, Grid, Card, CardMedia, CardContent, Box, IconButton } from '@mui/material';
import { PlayArrow, Pause, FavoriteBorder, Favorite } from '@mui/icons-material';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { usePlayer } from '../context/PlayerContext';

function LikedSongsPage() {
  const { user, token } = useUser();
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = usePlayer();

  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar las canciones favoritas del usuario
  const fetchLikedSongs = async () => {
    if (!user || !token) {
      setLikedSongs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:3001/users/${user.UserID}/liked-songs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLikedSongs(response.data); // Aquí almacenamos los objetos completos de la canción
    } catch (err) {
      console.error('Error al obtener canciones favoritas en LikedSongsPage:', err);
      setError('No se pudieron cargar tus canciones favoritas.');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el "me gusta" / "no me gusta" de una canción
  const handleLikeToggle = async (songId, isCurrentlyLiked) => {
    if (!user || !token) {
      // Esto no debería suceder si el botón está deshabilitado para usuarios no logueados
      return;
    }

    try {
      if (isCurrentlyLiked) {
        await axios.delete(`http://localhost:3001/songs/${songId}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLikedSongs(prev => prev.filter(song => song.SongID !== songId)); // Actualizar estado local
      } else {
        // En esta página, solo quitaremos likes, no añadiremos nuevas canciones a la lista directamente
        // Si queremos añadir, tendríamos que recargar la lista completa
        // Por ahora, solo permitimos quitar.
        await axios.post(`http://localhost:3001/songs/${songId}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Para añadir una canción que se acaba de dar like, tendríamos que hacer otra petición o añadirla manualmente.
        // Dado que el enfoque es ver las que ya te gustan, me centraré en quitar.
        // Si se desea añadir una canción favorita aquí, sería necesario volver a cargar fetchLikedSongs.
        fetchLikedSongs(); // Recargar la lista para mostrar la nueva canción favorita
      }
    } catch (error) {
      console.error('Error al alternar el estado de "me gusta" en LikedSongsPage:', error);
    }
  };

  useEffect(() => {
    fetchLikedSongs();
  }, [user, token]); // Recargar cuando el usuario o token cambien

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Mis Canciones Favoritas
      </Typography>

      {loading && <CircularProgress />}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && likedSongs.length === 0 && user && (
        <Typography variant="body1">Aún no has marcado ninguna canción como favorita.</Typography>
      )}
      {!user && (
          <Typography color="text.secondary">Inicia sesión para ver tus canciones favoritas.</Typography>
      )}

      {!loading && !error && likedSongs.length > 0 && (
        <Grid container spacing={2}>
          {likedSongs.map((song) => {
            const isLiked = true; // En esta página, todas las canciones están liked por definición
            return (
            <Grid item xs={12} key={song.SongID}>
              <Card sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <CardMedia
                  component="img"
                  sx={{ width: 60, height: 60, flexShrink: 0, objectFit: 'cover' }}
                  image={song.CoverArtPath ? `http://localhost:3001/uploads/${song.CoverArtPath.replace(/\\/g, '/')}` : 'https://via.placeholder.com/60'}
                  alt={song.Title}
                />
                <CardContent sx={{ flex: '1 0 auto', ml: 2, pr: '100px' }}>
                  <Typography component="div" variant="h6" noWrap>
                    {song.Title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" component="div" noWrap>
                    {song.Artist}
                  </Typography>
                </CardContent>
                <Box sx={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center' }}>
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
                        // Cuando se reproduce desde liked songs, la cola es la lista actual de liked songs
                        playSong(song, likedSongs);
                      }
                    }}
                    color="primary"
                  >
                    {currentSong && currentSong.SongID === song.SongID && isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          );
        })}
        </Grid>
      )}
    </Container>
  );
}

export default LikedSongsPage; 