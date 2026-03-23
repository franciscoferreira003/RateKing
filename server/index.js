const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initializeDatabase, generateId } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());

// Auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userId = decoded.userId;
    req.isAdmin = true;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all reviews by category
app.get('/api/reviews/:category', async (req, res) => {
  const { category } = req.params;
  const validCategories = ['movies', 'songs', 'videogames', 'shows'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get all reviews across all categories
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    const grouped = { movies: [], songs: [], videogames: [], shows: [] };
    for (const row of result.rows) {
      if (grouped[row.category]) {
        grouped[row.category].push(row);
      }
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get single review
app.get('/api/reviews/:category/:id', async (req, res) => {
  const { category, id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE category = $1 AND id = $2',
      [category, parseInt(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Create new review
app.post('/api/reviews/:category', authMiddleware, async (req, res) => {
  const { category } = req.params;
  const validCategories = ['movies', 'songs', 'videogames', 'shows'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const id = Date.now();
    const result = await pool.query(
      'INSERT INTO reviews (id, title, rating, description, category, user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [id, req.body.title, req.body.rating, req.body.description, category, req.userId, new Date(), new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
app.put('/api/reviews/:category/:id', authMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    const checkResult = await pool.query(
      'SELECT * FROM reviews WHERE category = $1 AND id = $2',
      [category, parseInt(id)]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const review = checkResult.rows[0];
    if (review.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this review' });
    }

    const result = await pool.query(
      'UPDATE reviews SET title = $1, rating = $2, description = $3, updated_at = $4 WHERE id = $5 RETURNING *',
      [req.body.title, req.body.rating, req.body.description, new Date(), parseInt(id)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
app.delete('/api/reviews/:category/:id', authMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    const checkResult = await pool.query(
      'SELECT * FROM reviews WHERE category = $1 AND id = $2',
      [category, parseInt(id)]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const review = checkResult.rows[0];
    if (review.user_id !== req.userId && !req.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [parseInt(id)]);
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Admin routes
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      isAdmin: u.is_admin,
      createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (checkResult.rows[0].is_admin) {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  const { username, email, isAdmin, password } = req.body;
  try {
    const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateQuery = 'UPDATE users SET username = $1, email = $2, is_admin = $3';
    let params = [username || checkResult.rows[0].username, email || checkResult.rows[0].email, isAdmin !== undefined ? isAdmin : checkResult.rows[0].is_admin];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = $4 WHERE id = $5 RETURNING *';
      params.push(hashedPassword, req.params.id);
    } else {
      updateQuery += ' WHERE id = $4 RETURNING *';
      params.push(req.params.id);
    }

    const result = await pool.query(updateQuery, params);
    res.json({
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      isAdmin: result.rows[0].is_admin
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.delete('/api/admin/reviews/:category/:id', adminMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    const result = await pool.query('DELETE FROM reviews WHERE category = $1 AND id = $2 RETURNING *', [category, parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Get user's reviews
app.get('/api/users/reviews', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Search reviews
app.get('/api/search', async (req, res) => {
  const { q, category } = req.query;
  try {
    let query = 'SELECT * FROM reviews WHERE (LOWER(title) LIKE $1 OR LOWER(description) LIKE $1)';
    const params = [`%${q?.toLowerCase() || ''}%`];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    const result = await pool.query(query, params);

    const grouped = { movies: [], songs: [], videogames: [], shows: [] };
    for (const row of result.rows) {
      if (grouped[row.category]) {
        grouped[row.category].push(row);
      }
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();

    const result = await pool.query(
      'INSERT INTO users (id, username, email, password, is_admin, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, username, email, hashedPassword, false, new Date()]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Movies API - Search movies
app.get('/api/movies/search', async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      const result = await pool.query('SELECT * FROM movies');
      return res.json({ Response: 'True', Search: result.rows });
    }
    const result = await pool.query(
      'SELECT * FROM movies WHERE LOWER(title) LIKE $1 OR LOWER(director) LIKE $1 OR LOWER(actors) LIKE $1',
      [`%${query.toLowerCase()}%`]
    );
    res.json({ Response: 'True', Search: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Movies API - Get movie details
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM movies WHERE imdb_id = $1', [id]);
    if (result.rows.length > 0) {
      res.json({ Response: 'True', ...result.rows[0] });
    } else {
      res.json({ Response: 'False', Error: 'Movie not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

// Movies API - Get all movies
app.get('/api/movies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM movies');
    res.json({ Response: 'True', Search: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized');

    // Load initial movies data if needed
    const moviesCount = await pool.query('SELECT COUNT(*) FROM movies');
    if (parseInt(moviesCount.rows[0].count) === 0) {
      const moviesFile = path.join(__dirname, 'movies.json');
      if (fs.existsSync(moviesFile)) {
        const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
        for (const movie of movies) {
          await pool.query(
            'INSERT INTO movies (imdb_id, title, year, poster, plot, director, actors, genre, imdb_rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (imdb_id) DO NOTHING',
            [movie.imdbID, movie.Title, movie.Year, movie.Poster, movie.Plot, movie.Director, movie.Actors, movie.Genre, movie.imdbRating]
          );
        }
        console.log('Movies loaded from file');
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }

  // Serve static frontend if dist folder exists (production build)
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/*path', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();