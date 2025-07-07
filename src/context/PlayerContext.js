import React, { createContext, useContext, useState } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => {
  return useContext(PlayerContext);
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null); // { SongID, Title, Artist, FilePath, CoverArtPath }
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState(null); // Para la instancia de Audio
  const [queue, setQueue] = useState([]); // Nueva cola de canciones
  const [currentSongIndex, setCurrentSongIndex] = useState(-1); // Índice de la canción actual en la cola
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isShuffling, setIsShuffling] = useState(false); // Nuevo estado para reproducción aleatoria

  const toggleRepeatMode = () => {
    setRepeatMode((prevMode) => {
      switch (prevMode) {
        case 'none':
          return 'one';
        case 'one':
          return 'all';
        case 'all':
          return 'none';
        default:
          return 'none';
      }
    });
  };

  const toggleShuffle = () => {
    setIsShuffling((prev) => !prev);
  };

  const playSong = (song, optionalQueue = []) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    let processedQueue = optionalQueue.length > 0 ? optionalQueue : (song ? [song] : []);
    let initialSongIndex = song ? processedQueue.findIndex(s => s.SongID === song.SongID) : 0;

    if (isShuffling && processedQueue.length > 1) {
      // Si estamos en modo aleatorio, y la cola tiene más de una canción,
      // desordena la cola, asegurando que la canción actual esté en la posición 0 temporalmente
      const currentSongInQueue = processedQueue[initialSongIndex];
      const otherSongs = processedQueue.filter(s => s.SongID !== currentSongInQueue.SongID);

      // Fisher-Yates shuffle
      for (let i = otherSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
      }
      processedQueue = [currentSongInQueue, ...otherSongs];
      initialSongIndex = 0; // La canción actual siempre estará en el índice 0 de la cola barajada
    }

    setQueue(processedQueue);
    setCurrentSongIndex(initialSongIndex);

    if (processedQueue.length === 0) {
      setCurrentSong(null);
      setIsPlaying(false);
      if (audioElement) audioElement.src = ''; // Clear audio source
      return;
    }

    const songToPlay = processedQueue[initialSongIndex];
    if (!songToPlay) {
        return; // Should not happen if newIndex is valid
    }

    const newAudio = new Audio(`http://localhost:3001/uploads/${songToPlay.FilePath.replace(/\\/g, '/')}`);
    newAudio.play().catch(e => console.error("Error al reproducir la canción:", e));
    
    setCurrentSong(songToPlay);
    setIsPlaying(true);
    setAudioElement(newAudio);

    newAudio.onended = () => {
      if (repeatMode === 'one') {
        newAudio.currentTime = 0;
        newAudio.play().catch(e => console.error("Error al reiniciar la canción:", e));
      } else {
        nextSong(); // Play next song automatically
      }
    };
  };

  const pauseSong = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  };

  const resumeSong = () => {
    if (audioElement) {
      audioElement.play().catch(e => console.error("Error al reanudar la canción:", e));
      setIsPlaying(true);
    }
  };

  const nextSong = () => {
    if (queue.length > 0) {
      const newIndex = (currentSongIndex + 1) % queue.length; // Wraps around to the beginning if it's the last song
      playSong(queue[newIndex], queue); // Play the next song in the queue
    } else {
      // If there are no more songs, stop playback
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentSong(null);
      setCurrentSongIndex(-1);
      setQueue([]);
    }
  };

  const previousSong = () => {
    if (queue.length > 0) {
      const newIndex = (currentSongIndex - 1 + queue.length) % queue.length; // Wraps around to the end if it's the first song
      playSong(queue[newIndex], queue); // Play the previous song in the queue
    } else {
      // If there is no previous song, restart the current song or stop
      if (audioElement) {
        audioElement.currentTime = 0; // Restart the current song
      }
    }
  };

  const value = {
    currentSong,
    isPlaying,
    playSong,
    pauseSong,
    resumeSong,
    audioElement,
    nextSong,
    previousSong,
    repeatMode,
    toggleRepeatMode,
    isShuffling, // Expose new state
    toggleShuffle, // Expose new function
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}; 