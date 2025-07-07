import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography,
  Paper
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeDown,
  VolumeMute,
  Repeat,
  RepeatOne,
  Shuffle
} from '@mui/icons-material';
import { usePlayer } from '../context/PlayerContext';

function Player() {
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, audioElement, nextSong, previousSong, repeatMode, toggleRepeatMode, isShuffling, toggleShuffle } = usePlayer();
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioElement) {
      const setAudioData = () => {
        setDuration(audioElement.duration);
        setCurrentTime(audioElement.currentTime);
      };

      const setAudioTime = () => {
        setCurrentTime(audioElement.currentTime);
      };

      const setAudioVolume = () => {
        setVolume(audioElement.volume * 100);
      };

      audioElement.addEventListener('loadedmetadata', setAudioData);
      audioElement.addEventListener('timeupdate', setAudioTime);
      audioElement.addEventListener('volumechange', setAudioVolume);

      // Limpiar event listeners al desmontar el componente o al cambiar la canción
      return () => {
        audioElement.removeEventListener('loadedmetadata', setAudioData);
        audioElement.removeEventListener('timeupdate', setAudioTime);
        audioElement.removeEventListener('volumechange', setAudioVolume);
      };
    }
  }, [audioElement]);

  const handlePlayPause = () => {
    if (currentSong) {
      if (isPlaying) {
        pauseSong();
      } else {
        resumeSong();
      }
    }
  };

  const handleVolumeChange = (event, newValue) => {
    if (audioElement) {
      const newVolume = newValue / 100;
      audioElement.volume = newVolume;
      setVolume(newValue);
    }
  };

  const handleTimeChange = (event, newValue) => {
    if (audioElement) {
      audioElement.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) {
      return <VolumeMute />;
    } else if (volume < 50) {
      return <VolumeDown />;
    } else {
      return <VolumeUp />;
    }
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'none') {
      return <Repeat />;
    } else if (repeatMode === 'one') {
      return <RepeatOne />;
    } else {
      return <Repeat />;
    }
  };

  const getShuffleIcon = () => {
    return isShuffling ? <Shuffle /> : <Shuffle />;
  };

  return (
    <Paper 
      className="player"
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: '#282828',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        borderTop: '1px solid #1a1a1a'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '30%' }}>
        {currentSong && (
          <img 
            src={currentSong.CoverArtPath ? `${process.env.REACT_APP_BACKEND_URL}/uploads/${currentSong.CoverArtPath.replace(/\\/g, '/')}` : 'https://via.placeholder.com/60'} 
            alt={currentSong.Title}
            style={{ width: 60, height: 60, marginRight: 16, objectFit: 'cover' }}
          />
        )}
        <Box>
          <Typography variant="subtitle1" noWrap>{currentSong ? currentSong.Title : 'No hay canción'}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{currentSong ? currentSong.Artist : '-'}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={toggleRepeatMode} 
            disabled={!currentSong}
            color={repeatMode === 'none' ? 'inherit' : 'primary'}
          >
            {getRepeatIcon()}
          </IconButton>
          <IconButton onClick={toggleShuffle} disabled={!currentSong}>
            {getShuffleIcon()}
          </IconButton>
          <IconButton onClick={previousSong} disabled={!currentSong}>
            <SkipPrevious />
          </IconButton>
          <IconButton onClick={handlePlayPause} disabled={!currentSong}>
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton onClick={nextSong} disabled={!currentSong}>
            <SkipNext />
          </IconButton>
        </Box>
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption">{formatTime(currentTime)}</Typography>
          <Slider
            value={currentTime}
            onChange={handleTimeChange}
            max={duration}
            min={0}
            step={1}
            sx={{ color: 'primary.main' }}
            disabled={!currentSong}
          />
          <Typography variant="caption">{formatTime(duration)}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', width: '30%', justifyContent: 'flex-end' }}>
        {getVolumeIcon()}
        <Slider
          value={volume}
          onChange={handleVolumeChange}
          sx={{ width: 100, color: 'primary.main' }}
          disabled={!currentSong}
        />
      </Box>

      {currentSong && (
        <div>
          <audio
            src={currentSong.FilePath ? `${process.env.REACT_APP_BACKEND_URL}/uploads/${currentSong.FilePath.replace(/\\/g, '/')}` : ''}
            type="audio/mpeg"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </Paper>
  );
}

export default Player; 