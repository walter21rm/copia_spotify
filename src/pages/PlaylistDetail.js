import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Container, CircularProgress, Alert, Grid, Card, CardMedia, CardContent, Box, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PlayArrow, Pause, PlaylistAdd, FavoriteBorder, Favorite } from '@mui/icons-material';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { usePlayer } from '../context/PlayerContext';

function PlaylistDetail() {
  const { playlistId } = useParams();
  const { user, token } = useUser();
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]); // Nuevo estado para canciones favoritas

  // Nuevos estados para añadir canción a playlist (similar a Home.js)
  const [openAddSongToPlaylist, setOpenAddSongToPlaylist] = useState(false);
  const [selectedSongToAdd, setSelectedSongToAdd] = useState(null);
  const [addSongToPlaylistError, setAddSongToPlaylistError] = useState(null);
  const [addSongToPlaylistSuccess, setAddSongToPlaylistSuccess] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]); // Este componente también necesita las playlists del usuario
  const [loadingUserPlaylists, setLoadingUserPlaylists] = useState(true); // Nuevo estado de carga
  const [userPlaylistsError, setUserPlaylistsError] = useState(null); // Nuevo estado de error

  // Función para cargar las playlists del usuario (duplicada de Home.js pero necesaria aquí)
  const fetchUserPlaylists = async () => {
    if (!user || !token) {
      setUserPlaylists([]);
      setLoadingUserPlaylists(false);
      return;
    }
    setLoadingUserPlaylists(true);
    setUserPlaylistsError(null);
    try {
      const response = await axios.get('http://localhost:3001/playlists/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserPlaylists(response.data);
    } catch (err) {
      console.error('Error al obtener playlists del usuario en PlaylistDetail:', err);
      setUserPlaylistsError('No se pudieron cargar tus playlists.');
    } finally {
      setLoadingUserPlaylists(false);
    }
  };

  // Nueva función para cargar las canciones favoritas del usuario
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
      console.error('Error al obtener canciones favoritas en PlaylistDetail:', err);
    }
  };

  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      if (!user || !token || !playlistId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Obtener detalles de la playlist
        const playlistResponse = await axios.get(`http://localhost:3001/playlists/${playlistId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPlaylist(playlistResponse.data);

        // Obtener las canciones de la playlist
        const playlistSongsResponse = await axios.get(`http://localhost:3001/playlists/${playlistId}/songs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSongs(playlistSongsResponse.data);

      } catch (err) {
        console.error('Error al obtener detalles de la playlist:', err);
        setError('Error al cargar la playlist o sus canciones.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistDetails();
    fetchUserPlaylists(); // Cargar las playlists del usuario para el diálogo de añadir
    fetchLikedSongs(); // Cargar las canciones favoritas del usuario
  }, [playlistId, user, token]);

  // Funciones para añadir canción a playlist
  const handleOpenAddSongToPlaylist = (song) => {
    if (!user) {
      setAddSongToPlaylistError('Debes iniciar sesión para añadir canciones a playlists.');
      return;
    }
    setSelectedSongToAdd(song);
    setOpenAddSongToPlaylist(true);
  };

  const handleCloseAddSongToPlaylist = () => {
    setOpenAddSongToPlaylist(false);
    setSelectedSongToAdd(null);
    setAddSongToPlaylistError(null);
    setAddSongToPlaylistSuccess(null);
  };

  const handleAddSongToPlaylist = async (playlistIdToAdd) => {
    if (!selectedSongToAdd || !user || !token) return;

    setAddSongToPlaylistError(null);
    setAddSongToPlaylistSuccess(null);

    try {
      const response = await axios.post(`http://localhost:3001/playlists/${playlistIdToAdd}/songs`, {
        songId: selectedSongToAdd.SongID,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAddSongToPlaylistSuccess(response.data.message || 'Canción añadida a la playlist!');
      setTimeout(() => {
        handleCloseAddSongToPlaylist();
        // Opcional: Actualizar las canciones de la playlist si la canción se añadió a la playlist actual
        // if (parseInt(playlistIdToAdd) === parseInt(playlistId)) {
        //   fetchPlaylistDetails(); // Recargar las canciones de esta playlist
        // }
      }, 1500);
    } catch (err) {
      console.error('Error al añadir canción a la playlist:', err.response?.data || err.message);
      setAddSongToPlaylistError(err.response?.data?.message || 'Error al añadir la canción a la playlist.');
    }
  };

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
      console.error('Error al alternar el estado de "me gusta" en PlaylistDetail:', error);
      // Opcional: mostrar un mensaje de error al usuario
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        {playlist ? `Playlist: ${playlist.Name}` : 'Cargando Playlist...'}
      </Typography>
      {playlist && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {playlist.Description || 'Sin descripción'}
        </Typography>
      )}

      {loading && <CircularProgress />}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && songs.length === 0 && (
        <Typography variant="body1">Esta playlist no tiene canciones aún.</Typography>
      )}

      {!loading && !error && songs.length > 0 && (
        <Grid container spacing={2}>
          {songs.map((song) => {
            const isLiked = likedSongs.includes(song.SongID);
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
                        playSong(song, songs);
                      }
                    }}
                    color="primary"
                  >
                    {currentSong && currentSong.SongID === song.SongID && isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <IconButton 
                    onClick={() => handleOpenAddSongToPlaylist(song)} 
                    color="secondary"
                  >
                    <PlaylistAdd />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          );
        })}
        </Grid>
      )}

      {/* Diálogo para Añadir Canción a Playlist */}
      <Dialog open={openAddSongToPlaylist} onClose={handleCloseAddSongToPlaylist}>
        <DialogTitle>Añadir "{selectedSongToAdd?.Title || 'Canción'}" a Playlist</DialogTitle>
        <DialogContent>
          {!user && (
            <Typography color="error" variant="body2">Debes iniciar sesión para añadir canciones a playlists.</Typography>
          )}
          {user && loadingUserPlaylists && <CircularProgress />}
          {user && userPlaylistsError && <Typography color="error">{userPlaylistsError}</Typography>}
          {user && !loadingUserPlaylists && !userPlaylistsError && userPlaylists.length === 0 && (
            <Typography>No tienes playlists. ¡Crea una primero!</Typography>
          )}
          {user && !loadingUserPlaylists && !userPlaylistsError && userPlaylists.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Selecciona una playlist:</Typography>
              {userPlaylists.map((playlistItem) => (
                <Button
                  key={playlistItem.PlaylistID}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                  onClick={() => handleAddSongToPlaylist(playlistItem.PlaylistID)}
                >
                  {playlistItem.Name}
                </Button>
              ))}
            </Box>
          )}
          {addSongToPlaylistError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {addSongToPlaylistError}
            </Typography>
          )}
          {addSongToPlaylistSuccess && (
            <Typography color="primary" variant="body2" sx={{ mt: 2 }}>
              {addSongToPlaylistSuccess}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddSongToPlaylist}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}

export default PlaylistDetail; 