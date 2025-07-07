import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton
} from '@mui/material';
import { CloudUpload, PlayArrow, Pause, Add, PlaylistAdd, FavoriteBorder, Favorite, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { usePlayer } from '../context/PlayerContext';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const { user, token } = useUser();
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong } = usePlayer();
  const navigate = useNavigate();

  const [openUpload, setOpenUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    audioFile: null,
    coverArtFile: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [songsError, setSongsError] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);

  // Nuevos estados para la creación de playlists
  const [openCreatePlaylist, setOpenCreatePlaylist] = useState(false);
  const [playlistData, setPlaylistData] = useState({
    name: '',
    description: '',
  });
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [createPlaylistError, setCreatePlaylistError] = useState(null);
  const [createPlaylistSuccess, setCreatePlaylistSuccess] = useState(null);

  // Nuevos estados para editar playlists
  const [openEditPlaylist, setOpenEditPlaylist] = useState(false);
  const [editPlaylistData, setEditPlaylistData] = useState({
    PlaylistID: null,
    Name: '',
    Description: '',
  });
  const [updatingPlaylist, setUpdatingPlaylist] = useState(false);
  const [updatePlaylistError, setUpdatePlaylistError] = useState(null);

  // Nuevos estados para mostrar playlists del usuario
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [playlistsError, setPlaylistsError] = useState(null);

  // Nuevos estados para añadir canción a playlist
  const [openAddSongToPlaylist, setOpenAddSongToPlaylist] = useState(false);
  const [selectedSongToAdd, setSelectedSongToAdd] = useState(null);
  const [addSongToPlaylistError, setAddSongToPlaylistError] = useState(null);
  const [addSongToPlaylistSuccess, setAddSongToPlaylistSuccess] = useState(null);

  // Función para cargar canciones recientes
  const fetchRecentSongs = async () => {
    try {
      const response = await axios.get('http://localhost:3001/songs');
      setRecentSongs(response.data);
    } catch (err) {
      console.error('Error al obtener canciones recientes:', err);
      setSongsError('No se pudieron cargar las canciones recientes.');
    } finally {
      setLoadingSongs(false);
    }
  };

  // Función para cargar las playlists del usuario
  const fetchUserPlaylists = async () => {
    if (!user || !token) {
      setUserPlaylists([]);
      setLoadingPlaylists(false);
      return;
    }
    setLoadingPlaylists(true);
    setPlaylistsError(null);
    try {
      const response = await axios.get('http://localhost:3001/playlists/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserPlaylists(response.data);
    } catch (err) {
      console.error('Error al obtener playlists del usuario:', err);
      setPlaylistsError('No se pudieron cargar tus playlists.');
    } finally {
      setLoadingPlaylists(false);
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
      console.error('Error al obtener canciones favoritas:', err);
    }
  };

  // useEffect para cargar canciones recientes al montar el componente
  useEffect(() => {
    fetchRecentSongs();
  }, []);

  // useEffect para cargar las playlists y canciones favoritas del usuario
  useEffect(() => {
    fetchUserPlaylists();
    fetchLikedSongs();
  }, [user, token]);

  const featuredPlaylists = [
    {
      id: 1,
      title: 'Playlist 1',
      description: 'Descripción de la playlist 1',
      image: 'https://via.placeholder.com/200'
    },
    {
      id: 2,
      title: 'Playlist 2',
      description: 'Descripción de la playlist 2',
      image: 'https://via.placeholder.com/200'
    },
    {
      id: 3,
      title: 'Playlist 3',
      description: 'Descripción de la playlist 3',
      image: 'https://via.placeholder.com/200'
    },
    {
      id: 4,
      title: 'Playlist 4',
      description: 'Descripción de la playlist 4',
      image: 'https://via.placeholder.com/200'
    }
  ];

  const handleOpenUpload = () => {
    if (!user) {
      setUploadError('Debes iniciar sesión para subir música.');
      return;
    }
    setOpenUpload(true);
  };

  const handleCloseUpload = () => {
    setOpenUpload(false);
    setUploadData({
      title: '',
      artist: '',
      album: '',
      genre: '',
      audioFile: null,
      coverArtFile: null,
    });
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleChange = (e) => {
    setUploadData({ ...uploadData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setUploadData({ ...uploadData, [e.target.name]: e.target.files[0] });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('title', uploadData.title);
    formData.append('artist', uploadData.artist);
    formData.append('album', uploadData.album);
    formData.append('genre', uploadData.genre);
    formData.append('audio', uploadData.audioFile);
    if (uploadData.coverArtFile) {
      formData.append('coverArt', uploadData.coverArtFile);
    }

    console.log('Usuario y token al subir:', user, token);

    try {
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setUploadSuccess(response.data.message || 'Canción subida exitosamente!');
      setTimeout(() => {
        handleCloseUpload();
        fetchRecentSongs();
      }, 2000);
    } catch (err) {
      console.error('Error al subir canción:', err.response?.data || err.message);
      setUploadError(err.response?.data?.message || 'Error al subir la canción.');
    } finally {
      setUploading(false);
    }
  };

  // Funciones para la creación de playlists
  const handleOpenCreatePlaylist = () => {
    if (!user) {
      setCreatePlaylistError('Debes iniciar sesión para crear playlists.');
      return;
    }
    setOpenCreatePlaylist(true);
  };

  const handleCloseCreatePlaylist = () => {
    setOpenCreatePlaylist(false);
    setPlaylistData({
      name: '',
      description: '',
    });
    setCreatePlaylistError(null);
    setCreatePlaylistSuccess(null);
  };

  const handleChangePlaylistForm = (e) => {
    setPlaylistData({ ...playlistData, [e.target.name]: e.target.value });
  };

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    setCreatingPlaylist(true);
    setCreatePlaylistError(null);
    setCreatePlaylistSuccess(null);

    try {
      const response = await axios.post('http://localhost:3001/playlists', playlistData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCreatePlaylistSuccess(response.data.message || 'Playlist creada exitosamente!');
      setTimeout(() => {
        handleCloseCreatePlaylist();
        fetchUserPlaylists(); // Refrescar la lista de playlists del usuario
      }, 2000);
    } catch (err) {
      console.error('Error al crear playlist:', err.response?.data || err.message);
      setCreatePlaylistError(err.response?.data?.message || 'Error al crear la playlist.');
    } finally {
      setCreatingPlaylist(false);
    }
  };

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

  const handleAddSongToPlaylist = async (playlistId) => {
    if (!selectedSongToAdd || !user || !token) return;

    setAddSongToPlaylistError(null);
    setAddSongToPlaylistSuccess(null);

    try {
      const response = await axios.post(`http://localhost:3001/playlists/${playlistId}/songs`, {
        songId: selectedSongToAdd.SongID,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAddSongToPlaylistSuccess(response.data.message || 'Canción añadida a la playlist!');
      setTimeout(() => {
        handleCloseAddSongToPlaylist();
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
      console.error('Error al alternar el estado de "me gusta":', error);
      // Opcional: mostrar un mensaje de error al usuario
    }
  };

  // Funciones para editar playlist
  const handleOpenEditPlaylist = (playlist) => {
    if (!user) {
      setUpdatePlaylistError('Debes iniciar sesión para editar playlists.');
      return;
    }
    setEditPlaylistData({ 
      PlaylistID: playlist.PlaylistID, 
      Name: playlist.Name, 
      Description: playlist.Description || '' 
    });
    setOpenEditPlaylist(true);
  };

  const handleCloseEditPlaylist = () => {
    setOpenEditPlaylist(false);
    setEditPlaylistData({ PlaylistID: null, Name: '', Description: '' });
    setUpdatePlaylistError(null);
  };

  const handleChangeEditPlaylistForm = (e) => {
    setEditPlaylistData({ ...editPlaylistData, [e.target.name]: e.target.value });
  };

  const handleUpdatePlaylistSubmit = async (e) => {
    e.preventDefault();
    setUpdatingPlaylist(true);
    setUpdatePlaylistError(null);

    try {
      const response = await axios.put(
        `http://localhost:3001/playlists/${editPlaylistData.PlaylistID}`,
        {
          name: editPlaylistData.Name,
          description: editPlaylistData.Description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Playlist actualizada:', response.data);
      setTimeout(() => {
        handleCloseEditPlaylist();
        fetchUserPlaylists(); // Refrescar la lista de playlists del usuario
      }, 1000);
    } catch (err) {
      console.error('Error al actualizar playlist:', err.response?.data || err.message);
      setUpdatePlaylistError(err.response?.data?.message || 'Error al actualizar la playlist.');
    } finally {
      setUpdatingPlaylist(false);
    }
  };

  // Función para eliminar playlist
  const handleDeletePlaylist = async (playlistId) => {
    if (!user || !token) {
      // Esto no debería suceder si el botón está deshabilitado para usuarios no logueados
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar esta playlist? Esta acción es irreversible.')) {
      try {
        await axios.delete(`http://localhost:3001/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Playlist eliminada:', playlistId);
        fetchUserPlaylists(); // Refrescar la lista de playlists del usuario
      } catch (error) {
        console.error('Error al eliminar playlist:', error);
        // Opcional: mostrar un mensaje de error al usuario
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Bienvenido a MusicPlayer
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={handleOpenUpload}
          >
            Subir Música
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreatePlaylist}
          >
            Crear Playlist
          </Button>
        </Box>
        {uploadError && !openUpload && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {uploadError}
            </Typography>
          )}
        {createPlaylistError && !openCreatePlaylist && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {createPlaylistError}
            </Typography>
          )}
        {addSongToPlaylistError && !openAddSongToPlaylist && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {addSongToPlaylistError}
            </Typography>
          )}
        {updatePlaylistError && !openEditPlaylist && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {updatePlaylistError}
            </Typography>
          )}
      </Box>

      {/* Sección de Playlists del Usuario */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Mis Playlists
        </Typography>
        {loadingPlaylists && <CircularProgress />}
        {playlistsError && <Typography color="error">{playlistsError}</Typography>}
        {!loadingPlaylists && userPlaylists.length === 0 && user && (
          <Typography>Aún no has creado ninguna playlist. ¡Crea una ahora!</Typography>
        )}
        {!user && (
          <Typography color="text.secondary">Inicia sesión para ver tus playlists.</Typography>
        )}
        {user && userPlaylists.length > 0 && (
          <Grid container spacing={3}>
            {userPlaylists.map((playlist) => (
              <Grid item xs={12} sm={6} md={3} key={playlist.PlaylistID}>
                <Card 
                  className="music-card"
                  sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardMedia
                    component="img"
                    image="https://via.placeholder.com/200x200"
                    alt={playlist.Name}
                    sx={{
                      height: 200,
                      width: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Typography gutterBottom variant="h6" component="div" noWrap>
                      {playlist.Name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {playlist.Description || 'Sin descripción'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Button 
                        size="small" 
                        startIcon={<Edit />} 
                        onClick={() => handleOpenEditPlaylist(playlist)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        startIcon={<Delete />} 
                        onClick={() => handleDeletePlaylist(playlist.PlaylistID)}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Playlists Destacadas
      </Typography>
      
      <Grid container spacing={3}>
        {featuredPlaylists.map((playlist) => (
          <Grid item xs={12} sm={6} md={3} key={playlist.id}>
            <Card className="music-card">
              <CardMedia
                component="img"
                height="200"
                image={playlist.image}
                alt={playlist.title}
              />
              <CardContent>
                <Typography gutterBottom variant="h6" component="div">
                  {playlist.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {playlist.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Canciones Recientes
        </Typography>
        {loadingSongs && <CircularProgress />}
        {songsError && <Typography color="error">{songsError}</Typography>}
        {!loadingSongs && recentSongs.length === 0 && (
          <Typography>No hay canciones disponibles. ¡Sube algunas!</Typography>
        )}
        <Grid container spacing={2}>
          {recentSongs.map((song) => {
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
                    {song.Artist || 'Artista Desconocido'}
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
      </Box>

      <Dialog open={openUpload} onClose={handleCloseUpload}>
        <DialogTitle>Subir Nueva Canción</DialogTitle>
        <DialogContent>
          <form onSubmit={handleUploadSubmit}>
            <TextField
              autoFocus
              margin="dense"
              name="title"
              label="Título de la Canción"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.title}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="artist"
              label="Artista"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.artist}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="album"
              label="Álbum"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.album}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="genre"
              label="Género"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.genre}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              component="label"
              sx={{ mb: 2 }}
            >
              Seleccionar Archivo de Audio
              <input
                type="file"
                hidden
                accept="audio/*"
                name="audioFile"
                onChange={handleFileChange}
                required
              />
            </Button>
            {uploadData.audioFile && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {uploadData.audioFile.name}
              </Typography>
            )}
            <Button
              variant="outlined"
              component="label"
            >
              Seleccionar Portada (Opcional)
              <input
                type="file"
                hidden
                accept="image/*"
                name="coverArtFile"
                onChange={handleFileChange}
              />
            </Button>
            {uploadData.coverArtFile && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {uploadData.coverArtFile.name}
              </Typography>
            )}
            {uploadError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {uploadError}
              </Typography>
            )}
            {uploadSuccess && (
              <Typography color="primary" variant="body2" sx={{ mt: 1 }}>
                {uploadSuccess}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
              disabled={uploading}
            >
              {uploading ? <CircularProgress size={24} /> : 'Subir Canción'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreatePlaylist} onClose={handleCloseCreatePlaylist}>
        <DialogTitle>Crear Nueva Playlist</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreatePlaylistSubmit}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Nombre de la Playlist"
              type="text"
              fullWidth
              variant="outlined"
              value={playlistData.name}
              onChange={handleChangePlaylistForm}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Descripción (Opcional)"
              type="text"
              fullWidth
              variant="outlined"
              value={playlistData.description}
              onChange={handleChangePlaylistForm}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            {createPlaylistError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {createPlaylistError}
              </Typography>
            )}
            {createPlaylistSuccess && (
              <Typography color="primary" variant="body2" sx={{ mt: 1 }}>
                {createPlaylistSuccess}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
              disabled={creatingPlaylist}
            >
              {creatingPlaylist ? <CircularProgress size={24} /> : 'Crear Playlist'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Editar Playlist */}
      <Dialog open={openEditPlaylist} onClose={handleCloseEditPlaylist}>
        <DialogTitle>Editar Playlist</DialogTitle>
        <DialogContent>
          <form onSubmit={handleUpdatePlaylistSubmit}>
            <TextField
              autoFocus
              margin="dense"
              name="Name"
              label="Nombre de la Playlist"
              type="text"
              fullWidth
              variant="outlined"
              value={editPlaylistData.Name}
              onChange={handleChangeEditPlaylistForm}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="Description"
              label="Descripción (Opcional)"
              type="text"
              fullWidth
              variant="outlined"
              value={editPlaylistData.Description}
              onChange={handleChangeEditPlaylistForm}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            {updatePlaylistError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {updatePlaylistError}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
              disabled={updatingPlaylist}
            >
              {updatingPlaylist ? <CircularProgress size={24} /> : 'Guardar Cambios'}
            </Button>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditPlaylist}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para Añadir Canción a Playlist */}
      <Dialog open={openAddSongToPlaylist} onClose={handleCloseAddSongToPlaylist}>
        <DialogTitle>Añadir "{selectedSongToAdd?.Title || 'Canción'}" a Playlist</DialogTitle>
        <DialogContent>
          {!user && (
            <Typography color="error" variant="body2">Debes iniciar sesión para añadir canciones a playlists.</Typography>
          )}
          {user && loadingPlaylists && <CircularProgress />}
          {user && playlistsError && <Typography color="error">{playlistsError}</Typography>}
          {user && !loadingPlaylists && userPlaylists.length === 0 && (
            <Typography>No tienes playlists. ¡Crea una primero!</Typography>
          )}
          {user && userPlaylists.length > 0 && (
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

    </Box>
  );
}

export default Home; 