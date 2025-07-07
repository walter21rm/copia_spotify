import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, InputBase } from '@mui/material';
import { Search as SearchIcon, AccountCircle, ExitToApp as LogoutIcon, Favorite as FavoriteIcon } from '@mui/icons-material';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { styled, alpha } from '@mui/material/styles';

const Search = styled('div')(({
  theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(1),
      width: 'auto',
    },
  }));

  const SearchIconWrapper = styled('div')(({
    theme }) => ({
      padding: theme.spacing(0, 2),
      height: '100%',
      position: 'absolute',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }));

    const StyledInputBase = styled(InputBase)(({ theme }) => ({
      color: 'inherit',
      '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          width: '12ch',
          '&:focus': {
            width: '20ch',
          },
        },
      },
    }));

function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      if (searchTerm.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  return (
    <AppBar position="static" className="navbar">
      <Toolbar>
        <Typography variant="h6" component={Link} to="/" sx={{ 
          flexGrow: 1, 
          textDecoration: 'none', 
          color: 'white',
          fontWeight: 'bold'
        }}>
          MusicPlayer
        </Typography>

        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Buscar…"
            inputProps={{ 'aria-label': 'search' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearch}
          />
        </Search>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', ml: 2 }}>
          {user ? (
            <>
              <Button 
                color="inherit"
                component={Link}
                to="/liked-songs"
                startIcon={<FavoriteIcon />}
              >
                Mis Canciones Favoritas
              </Button>
              <Typography variant="body1">
                Bienvenido, {user.Username}
              </Typography>
              <Button 
                color="inherit" 
                onClick={logout}
                startIcon={<LogoutIcon />}
              >
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <>
              <Button 
                color="inherit" 
                component={Link} 
                to="/login"
                startIcon={<AccountCircle />}
              >
                Iniciar Sesión
              </Button>
              
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                to="/register"
              >
                Registrarse
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 