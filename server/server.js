require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload()); // Middleware para subida de archivos

// Servir archivos estáticos (para las canciones y portadas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear las carpetas de carga si no existen
const uploadDir = path.join(__dirname, 'uploads');
const songsDir = path.join(uploadDir, 'songs');
const coverArtsDir = path.join(uploadDir, 'cover_arts');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir);
if (!fs.existsSync(coverArtsDir)) fs.mkdirSync(coverArtsDir);

// Conexión a la base de datos SQLite
const db = new sqlite3.Database('./musicplayer.sqlite', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        // Crear tablas si no existen
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS Users (
                    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Username TEXT NOT NULL UNIQUE,
                    Email TEXT NOT NULL UNIQUE,
                    PasswordHash TEXT NOT NULL,
                    RegistrationDate TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS Songs (
                    SongID INTEGER PRIMARY KEY AUTOINCREMENT,
                    Title TEXT NOT NULL,
                    Artist TEXT,
                    Album TEXT,
                    Genre TEXT,
                    FilePath TEXT NOT NULL,
                    CoverArtPath TEXT,
                    UploadDate TEXT DEFAULT CURRENT_TIMESTAMP,
                    UserID INTEGER,
                    FOREIGN KEY (UserID) REFERENCES Users(UserID)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS Playlists (
                    PlaylistID INTEGER PRIMARY KEY AUTOINCREMENT,
                    UserID INTEGER,
                    Name TEXT NOT NULL,
                    Description TEXT,
                    CreationDate TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (UserID) REFERENCES Users(UserID)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS PlaylistSongs (
                    PlaylistSongID INTEGER PRIMARY KEY AUTOINCREMENT,
                    PlaylistID INTEGER,
                    SongID INTEGER,
                    AddedDate TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (PlaylistID) REFERENCES Playlists(PlaylistID),
                    FOREIGN KEY (SongID) REFERENCES Songs(SongID)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS LikedSongs (
                    LikedSongID INTEGER PRIMARY KEY AUTOINCREMENT,
                    UserID INTEGER NOT NULL,
                    SongID INTEGER NOT NULL,
                    LikedDate TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(UserID, SongID), -- Para evitar que un usuario le dé like a la misma canción varias veces
                    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
                    FOREIGN KEY (SongID) REFERENCES Songs(SongID) ON DELETE CASCADE
                )
            `);
            console.log('Tablas SQLite verificadas/creadas.');
        });
    }
});

// JWT Secret (¡usa una cadena más segura en producción!)
const jwtSecret = 'MI_SECRETO_DE_PRUEBA_123'; // Cambiado a un valor más simple

// Middleware para proteger rutas (autenticación JWT)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Token recibido en backend:', token);

    if (!token) {
        return res.sendStatus(401); // No autorizado
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            console.error('Error al verificar el token:', err);
            console.log('Payload user (si error):', user);
            return res.sendStatus(403); // Token inválido o expirado
        }
        console.log('Token verificado exitosamente. Usuario:', user);
        req.user = user; // Adjuntar el payload del usuario al request
        next();
    });
};

// Función para sanitizar nombres de archivo
const sanitizeFilename = (filename) => {
    // Normaliza a NFD (Forma de Descomposición Canónica) y elimina diacríticos (acentos, etc.)
    // Luego reemplaza caracteres no alfanuméricos (excepto ., -, _) con un guion bajo
    // Y finalmente elimina guiones bajos duplicados o al inicio/final.
    return filename
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_|_$/g, "");
};

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Por favor, ingresa todos los campos.' });
    }

    try {
        // Verificar si el usuario o el email ya existen
        db.get('SELECT UserID FROM Users WHERE Username = ? OR Email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (row) {
                return res.status(409).json({ message: 'El nombre de usuario o el correo electrónico ya están registrados.' });
            }

            // Hashear la contraseña
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Insertar nuevo usuario
            db.run('INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)', [username, email, passwordHash], function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                const newUser = { UserID: this.lastID, username, email };
                // Generar token JWT para el nuevo usuario y enviarlo también
                const token = jwt.sign({ UserID: newUser.UserID, username: newUser.username }, jwtSecret, { expiresIn: '24h' });
                res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser, token });
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor durante el registro.' });
    }
});

// Ruta de inicio de sesión de usuario
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Por favor, ingresa correo electrónico y contraseña.' });
    }

    try {
        // Buscar usuario por correo electrónico
        db.get('SELECT * FROM Users WHERE Email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (!user) {
                return res.status(400).json({ message: 'Credenciales inválidas.' });
            }

            // Comparar contraseña hasheada
            const isMatch = await bcrypt.compare(password, user.PasswordHash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Credenciales inválidas.' });
            }

            // Generar token JWT
            const token = jwt.sign({ UserID: user.UserID, username: user.Username }, jwtSecret, { expiresIn: '24h' });

            res.json({ message: 'Inicio de sesión exitoso', token, user: { UserID: user.UserID, Username: user.Username, Email: user.Email } });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor durante el inicio de sesión.' });
    }
});

// Ruta para subir canciones (protegida)
app.post('/upload', authenticateToken, async (req, res) => {
    console.log('Inicio de ruta /upload. Archivos:', req.files); // Log 1

    if (!req.files || Object.keys(req.files).length === 0) {
        console.log('No se subió ningún archivo. Código 400.'); // Log 2
        return res.status(400).json({ message: 'No se subió ningún archivo.' });
    }

    const { title, artist, album, genre } = req.body;
    const audioFile = req.files.audio;
    const coverArtFile = req.files.coverArt;

    if (!audioFile) {
        console.log('No se proporcionó archivo de audio. Código 400.'); // Log 3
        return res.status(400).json({ message: 'Se requiere un archivo de audio.' });
    }

    const audioFileName = `${Date.now()}_${sanitizeFilename(audioFile.name)}`;
    const audioFilePath = path.join(songsDir, audioFileName);

    let coverArtFileName = null;
    let coverArtFilePath = null;

    if (coverArtFile) {
        coverArtFileName = `${Date.now()}_${sanitizeFilename(coverArtFile.name)}`;
        coverArtFilePath = path.join(coverArtsDir, coverArtFileName);
    }

    console.log('Original audioFile.name:', audioFile.name); // Nuevo Log
    console.log('Generated audioFileName (to save on disk and DB):', audioFileName); // Nuevo Log
    if (coverArtFile) {
        console.log('Original coverArtFile.name:', coverArtFile.name); // Nuevo Log
        console.log('Generated coverArtFileName (to save on disk and DB):', coverArtFileName); // Nuevo Log
    }

    console.log('Intentando mover archivos...'); // Log 4
    try {
        await audioFile.mv(audioFilePath);
        console.log('Archivo de audio movido a:', audioFilePath); // Log 5
        if (coverArtFile) {
            await coverArtFile.mv(coverArtFilePath);
            console.log('Archivo de portada movido a:', coverArtFilePath); // Log 6
        }

        console.log('Archivos movidos exitosamente. Intentando insertar en DB...'); // Log 7
        // Guardar en la base de datos
        const insertSql = `
            INSERT INTO Songs (Title, Artist, Album, Genre, FilePath, CoverArtPath, UserID)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(insertSql, [
            title,
            artist,
            album,
            genre,
            `songs/${audioFileName}`,
            coverArtFileName ? `cover_arts/${coverArtFileName}` : null,
            req.user.UserID // ID del usuario que sube la canción
        ], function(err) {
            if (err) {
                console.error('Error al guardar la canción en la base de datos:', err.message); // Log 8 (Error DB)
                // Si hay un error, intentar eliminar los archivos subidos para limpiar
                fs.unlink(audioFilePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo de audio post-DB error:', unlinkErr);
                });
                if (coverArtFilePath) {
                    fs.unlink(coverArtFilePath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error al eliminar imagen de portada post-DB error:', unlinkErr);
                    });
                }
                return res.status(500).json({ message: 'Error al guardar la canción en la base de datos.', error: err.message });
            }
            res.status(201).json({ message: 'Canción subida y guardada exitosamente', songId: this.lastID });
        });

    } catch (err) {
        console.error('Error en el bloque try/catch de subida (movimiento de archivo):', err);
        res.status(500).json({ message: 'Error en el servidor al subir el archivo.', error: err.message });
    }
});

// Ruta para buscar canciones
app.get('/search/songs', (req, res) => {
    const searchTerm = req.query.q; // Obtener el término de búsqueda de la query string (e.g., ?q=rock)

    if (!searchTerm) {
        return res.status(400).json({ message: 'Por favor, proporciona un término de búsqueda.' });
    }

    const query = `
        SELECT SongID, Title, Artist, Album, Genre, FilePath, CoverArtPath
        FROM Songs
        WHERE Title LIKE ? OR Artist LIKE ? OR Album LIKE ? OR Genre LIKE ?
    `;
    const searchPattern = `%${searchTerm}%`;

    db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
            console.error('Error al buscar canciones:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar canciones.' });
        }
        res.json(rows);
    });
});

// Nueva ruta para obtener todas las canciones
app.get('/songs', (req, res) => {
    const query = 'SELECT SongID, Title, Artist, Album, Genre, FilePath, CoverArtPath FROM Songs';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener canciones:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al obtener canciones.' });
        }
        res.json(rows);
    });
});

// Ruta para eliminar una canción (protegida)
app.delete('/songs/:songId', authenticateToken, (req, res) => {
    const songId = req.params.songId;
    const userId = req.user.UserID; // Obtener el ID del usuario autenticado

    // Primero, obtener la ruta de los archivos para poder eliminarlos
    db.get('SELECT FilePath, CoverArtPath, UserID FROM Songs WHERE SongID = ?', [songId], (err, song) => {
        if (err) {
            console.error('Error al obtener la canción para eliminar:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al obtener la canción.' });
        }
        if (!song) {
            return res.status(404).json({ message: 'Canción no encontrada.' });
        }

        // Verificar si el usuario autenticado es el propietario de la canción
        if (song.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta canción.' });
        }

        // Eliminar la canción de la base de datos
        db.run('DELETE FROM Songs WHERE SongID = ?', [songId], function(err) {
            if (err) {
                console.error('Error al eliminar la canción de la base de datos:', err.message);
                return res.status(500).json({ message: 'Error en el servidor al eliminar la canción de la base de datos.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Canción no encontrada en la base de datos.' });
            }

            // Eliminar archivos del disco
            const audioFilePath = path.join(__dirname, song.FilePath);
            fs.unlink(audioFilePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error al eliminar archivo de audio:', unlinkErr.message);
                    // No devolvemos un error al cliente si falla el unlink, ya que la DB ya se actualizó
                }
            });

            if (song.CoverArtPath) {
                const coverArtFilePath = path.join(__dirname, song.CoverArtPath);
                fs.unlink(coverArtFilePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error al eliminar archivo de portada:', unlinkErr.message);
                    }
                });
            }

            res.status(200).json({ message: 'Canción eliminada exitosamente.' });
        });
    });
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Backend MusicPlayer con SQLite funcionando!');
});

// Nueva ruta para crear una playlist (protegida)
app.post('/playlists', authenticateToken, (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    if (!name) {
        return res.status(400).json({ message: 'El nombre de la playlist es obligatorio.' });
    }

    const insertSql = `
        INSERT INTO Playlists (UserID, Name, Description)
        VALUES (?, ?, ?)
    `;
    db.run(insertSql, [userId, name, description], function(err) {
        if (err) {
            console.error('Error al crear la playlist en la base de datos:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al crear la playlist.' });
        }
        res.status(201).json({ message: 'Playlist creada exitosamente!', playlistId: this.lastID });
    });
});

// Nueva ruta para obtener las playlists de un usuario (protegida)
app.get('/playlists/user', authenticateToken, (req, res) => {
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    const query = 'SELECT PlaylistID, Name, Description, CreationDate FROM Playlists WHERE UserID = ?';
    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error al obtener playlists del usuario:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al obtener playlists.' });
        }
        res.json(rows);
    });
});

// Nueva ruta para añadir una canción a una playlist (protegida)
app.post('/playlists/:playlistId/songs', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const { songId } = req.body;
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    if (!songId) {
        return res.status(400).json({ message: 'Se requiere el ID de la canción para añadir a la playlist.' });
    }

    // 1. Verificar que la playlist exista y pertenezca al usuario
    db.get('SELECT PlaylistID, UserID FROM Playlists WHERE PlaylistID = ?', [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error al buscar playlist:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar playlist.' });
        }
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist no encontrada.' });
        }
        if (playlist.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta playlist.' });
        }

        // 2. Verificar que la canción exista
        db.get('SELECT SongID FROM Songs WHERE SongID = ?', [songId], (err, song) => {
            if (err) {
                console.error('Error al buscar canción:', err.message);
                return res.status(500).json({ message: 'Error en el servidor al buscar canción.' });
            }
            if (!song) {
                return res.status(404).json({ message: 'Canción no encontrada.' });
            }

            // 3. Verificar si la canción ya está en la playlist
            db.get('SELECT PlaylistSongID FROM PlaylistSongs WHERE PlaylistID = ? AND SongID = ?', [playlistId, songId], (err, row) => {
                if (err) {
                    console.error('Error al verificar canción en playlist:', err.message);
                    return res.status(500).json({ message: 'Error en el servidor al verificar canción en playlist.' });
                }
                if (row) {
                    return res.status(409).json({ message: 'La canción ya está en esta playlist.' });
                }

                // 4. Añadir la canción a la playlist
                const insertSql = `
                    INSERT INTO PlaylistSongs (PlaylistID, SongID)
                    VALUES (?, ?)
                `;
                db.run(insertSql, [playlistId, songId], function(err) {
                    if (err) {
                        console.error('Error al añadir canción a la playlist en DB:', err.message);
                        return res.status(500).json({ message: 'Error al añadir la canción a la playlist.' });
                    }
                    res.status(201).json({ message: 'Canción añadida a la playlist exitosamente!', playlistSongId: this.lastID });
                });
            });
        });
    });
});

// Nueva ruta para obtener las canciones de una playlist específica (protegida)
app.get('/playlists/:playlistId/songs', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    // 1. Verificar que la playlist exista y pertenezca al usuario
    db.get('SELECT PlaylistID, UserID FROM Playlists WHERE PlaylistID = ?', [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error al buscar playlist para obtener canciones:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar playlist.' });
        }
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist no encontrada.' });
        }
        if (playlist.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para ver las canciones de esta playlist.' });
        }

        // 2. Obtener las canciones de la playlist
        const query = `
            SELECT S.SongID, S.Title, S.Artist, S.Album, S.Genre, S.FilePath, S.CoverArtPath
            FROM Songs S
            JOIN PlaylistSongs PS ON S.SongID = PS.SongID
            WHERE PS.PlaylistID = ?
            ORDER BY PS.AddedDate ASC
        `;
        db.all(query, [playlistId], (err, songs) => {
            if (err) {
                console.error('Error al obtener canciones de la playlist:', err.message);
                return res.status(500).json({ message: 'Error en el servidor al obtener canciones de la playlist.' });
            }
            res.json(songs);
        });
    });
});

// Nueva ruta para obtener los detalles de una playlist específica (protegida)
app.get('/playlists/:playlistId', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    db.get('SELECT PlaylistID, UserID, Name, Description, CreationDate FROM Playlists WHERE PlaylistID = ?', [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error al obtener detalles de la playlist:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al obtener detalles de la playlist.' });
        }
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist no encontrada.' });
        }
        if (playlist.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para ver los detalles de esta playlist.' });
        }
        res.json(playlist);
    });
});

// Nueva ruta para dar "me gusta" a una canción (protegida)
app.post('/songs/:songId/like', authenticateToken, (req, res) => {
    const songId = req.params.songId;
    const userId = req.user.UserID; // Obtener el ID del usuario desde el token

    // 1. Verificar que la canción exista
    db.get('SELECT SongID FROM Songs WHERE SongID = ?', [songId], (err, song) => {
        if (err) {
            console.error('Error al buscar canción para dar like:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar canción.' });
        }
        if (!song) {
            return res.status(404).json({ message: 'Canción no encontrada.' });
        }

        // 2. Verificar si el usuario ya le dio "me gusta" a esta canción
        db.get('SELECT LikedSongID FROM LikedSongs WHERE UserID = ? AND SongID = ?', [userId, songId], (err, likedSong) => {
            if (err) {
                console.error('Error al verificar like existente:', err.message);
                return res.status(500).json({ message: 'Error en el servidor al verificar like.' });
            }
            if (likedSong) {
                return res.status(409).json({ message: 'Ya le has dado "me gusta" a esta canción.' });
            }

            // 3. Insertar el "me gusta" en la tabla LikedSongs
            db.run('INSERT INTO LikedSongs (UserID, SongID) VALUES (?, ?)', [userId, songId], function(err) {
                if (err) {
                    console.error('Error al dar like a la canción en DB:', err.message);
                    return res.status(500).json({ message: 'Error al dar "me gusta" a la canción.' });
                }
                res.status(201).json({ message: 'Canción marcada como "me gusta" exitosamente!', likedSongId: this.lastID });
            });
        });
    });
});

// Nueva ruta para quitar el "me gusta" de una canción (protegida)
app.delete('/songs/:songId/like', authenticateToken, (req, res) => {
    const songId = req.params.songId;
    const userId = req.user.UserID;

    db.run('DELETE FROM LikedSongs WHERE UserID = ? AND SongID = ?', [userId, songId], function(err) {
        if (err) {
            console.error('Error al quitar like a la canción en DB:', err.message);
            return res.status(500).json({ message: 'Error al quitar el "me gusta" de la canción.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'La canción no estaba marcada como "me gusta" por este usuario.' });
        }
        res.status(200).json({ message: 'Se ha quitado el "me gusta" a la canción exitosamente.' });
    });
});

// Nueva ruta para obtener las canciones que le gustan a un usuario (protegida)
app.get('/users/:userId/liked-songs', authenticateToken, (req, res) => {
    const requestedUserId = parseInt(req.params.userId, 10);
    const authenticatedUserId = req.user.UserID;

    // Asegurarse de que el usuario autenticado está pidiendo sus propias canciones favoritas
    if (requestedUserId !== authenticatedUserId) {
        return res.status(403).json({ message: 'No tienes permiso para ver las canciones favoritas de otro usuario.' });
    }

    const query = `
        SELECT S.SongID, S.Title, S.Artist, S.Album, S.Genre, S.FilePath, S.CoverArtPath
        FROM Songs S
        JOIN LikedSongs LS ON S.SongID = LS.SongID
        WHERE LS.UserID = ?
        ORDER BY LS.LikedDate DESC
    `;
    db.all(query, [authenticatedUserId], (err, rows) => {
        if (err) {
            console.error('Error al obtener canciones favoritas:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al obtener canciones favoritas.' });
        }
        res.json(rows);
    });
});

// Nueva ruta para eliminar una playlist (protegida)
app.delete('/playlists/:playlistId', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.UserID; // Obtener el ID del usuario autenticado

    // 1. Verificar que la playlist exista y pertenezca al usuario
    db.get('SELECT PlaylistID, UserID FROM Playlists WHERE PlaylistID = ?', [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error al buscar playlist para eliminar:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar playlist.' });
        }
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist no encontrada.' });
        }
        if (playlist.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta playlist.' });
        }

        // Iniciar una transacción para asegurar que ambas operaciones (eliminar canciones de la playlist y la playlist en sí) sean atómicas
        db.serialize(() => {
            db.run('BEGIN TRANSACTION;');

            // 2. Eliminar todas las canciones asociadas a la playlist en PlaylistSongs
            db.run('DELETE FROM PlaylistSongs WHERE PlaylistID = ?', [playlistId], function(err) {
                if (err) {
                    console.error('Error al eliminar canciones de la playlist:', err.message);
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Error al eliminar canciones asociadas a la playlist.' });
                }

                // 3. Eliminar la playlist de la tabla Playlists
                db.run('DELETE FROM Playlists WHERE PlaylistID = ?', [playlistId], function(err) {
                    if (err) {
                        console.error('Error al eliminar la playlist de la base de datos:', err.message);
                        db.run('ROLLBACK;');
                        return res.status(500).json({ message: 'Error al eliminar la playlist.' });
                    }
                    if (this.changes === 0) {
                        db.run('ROLLBACK;');
                        return res.status(404).json({ message: 'Playlist no encontrada en la base de datos (después de eliminar canciones).', changes: this.changes });
                    }

                    db.run('COMMIT;');
                    res.status(200).json({ message: 'Playlist eliminada exitosamente.' });
                });
            });
        });
    });
});

// Nueva ruta para editar una playlist (protegida)
app.put('/playlists/:playlistId', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.UserID;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'El nombre de la playlist es obligatorio para la edición.' });
    }

    // 1. Verificar que la playlist exista y pertenezca al usuario
    db.get('SELECT PlaylistID, UserID FROM Playlists WHERE PlaylistID = ?', [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error al buscar playlist para editar:', err.message);
            return res.status(500).json({ message: 'Error en el servidor al buscar playlist.' });
        }
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist no encontrada.' });
        }
        if (playlist.UserID !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para editar esta playlist.' });
        }

        // 2. Actualizar la playlist
        const updateSql = 'UPDATE Playlists SET Name = ?, Description = ? WHERE PlaylistID = ?';
        db.run(updateSql, [name, description, playlistId], function(err) {
            if (err) {
                console.error('Error al actualizar la playlist en DB:', err.message);
                return res.status(500).json({ message: 'Error al actualizar la playlist.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Playlist no encontrada o no se realizaron cambios.' });
            }
            res.status(200).json({ message: 'Playlist actualizada exitosamente!' });
        });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor de MusicPlayer escuchando en http://localhost:${port}`);
}); 