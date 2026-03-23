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

console.log('=== SERVER STARTING ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

app.use(cors());
app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  console.log('Auth middleware - checking token');
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    console.log('Auth middleware - Token valid for user:', decoded.userId);
    next();
  } catch (err) {
    console.log('Auth middleware - Invalid token:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  console.log('Admin middleware - checking admin rights');
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('Admin middleware - No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user || !user.is_admin) {
      console.log('Admin middleware - User not admin:', decoded.userId);
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userId = decoded.userId;
    req.isAdmin = true;
    console.log('Admin middleware - Admin access granted for user:', decoded.userId);
    next();
  } catch (err) {
    console.log('Admin middleware - Error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  console.log('=== REGISTER REQUEST ===');
  console.log('Body:', { ...req.body, password: '[HIDDEN]' });

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      console.log('Register - Missing fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    console.log('Register - Checking if email exists:', email);
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('Register - Email already registered');
      return res.status(400).json({ error: 'Email already registered' });
    }

    console.log('Register - Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();

    console.log('Register - Creating user with id:', id);
    const result = await pool.query(
      'INSERT INTO users (id, username, email, password, is_admin, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, username, email, hashedPassword, false, new Date()]
    );

    const user = result.rows[0];
    console.log('Register - User created successfully:', user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin } });
  } catch (err) {
    console.error('Register - Error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  console.log('Body:', { ...req.body, password: '[HIDDEN]' });

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Login - Missing fields');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Login - Looking up user:', email);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    console.log('Login - Query result, rows found:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('Login - User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('Login - User found:', user.id, user.username);

    console.log('Login - Comparing passwords');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Login - Password valid:', isValid);

    if (!isValid) {
      console.log('Login - Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login - Generating token');
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Login - Success for user:', user.username);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin } });
  } catch (err) {
    console.error('Login - Error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  console.log('=== GET ME REQUEST ===');
  try {
    const result = await pool.query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      console.log('Get me - User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    console.log('Get me - User found:', user.username);
    res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin });
  } catch (err) {
    console.error('Get me - Error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Admin routes
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  console.log('=== GET ALL USERS ===');
  try {
    const result = await pool.query('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    console.log('Get users - Found:', result.rows.length);
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      isAdmin: u.is_admin,
      createdAt: u.created_at
    })));
  } catch (err) {
    console.error('Get users - Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  console.log('=== DELETE USER ===', req.params.id);
  try {
    const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (checkResult.rows[0].is_admin) {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    console.log('Delete user - Success');
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user - Error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  console.log('=== UPDATE USER ===', req.params.id);
  console.log('Body:', req.body);

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
    console.log('Update user - Success');
    res.json({
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      isAdmin: result.rows[0].is_admin
    });
  } catch (err) {
    console.error('Update user - Error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
  console.log('=== GET ALL REVIEWS (ADMIN) ===');
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get admin reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get all reviews by category
app.get('/api/reviews/:category', async (req, res) => {
  const { category } = req.params;
  console.log('=== GET REVIEWS BY CATEGORY ===', category);
  const validCategories = ['movies', 'songs', 'videogames', 'shows'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    console.log('Found reviews:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Get reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get all reviews across all categories
app.get('/api/reviews', async (req, res) => {
  console.log('=== GET ALL REVIEWS ===');
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    const grouped = { movies: [], songs: [], videogames: [], shows: [] };
    for (const row of result.rows) {
      if (grouped[row.category]) {
        grouped[row.category].push(row);
      }
    }
    console.log('Total reviews:', result.rows.length);
    res.json(grouped);
  } catch (err) {
    console.error('Get all reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create new review
app.post('/api/reviews/:category', authMiddleware, async (req, res) => {
  console.log('=== CREATE REVIEW ===');
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
    console.log('Review created:', id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create review - Error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Movies API
app.get('/api/movies/search', async (req, res) => {
  const { query } = req.query;
  console.log('=== SEARCH MOVIES ===', query);
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
    console.error('Search movies - Error:', err);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

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
    console.error('Get movie - Error:', err);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

app.get('/api/movies', async (req, res) => {
  console.log('=== GET ALL MOVIES ===');
  try {
    const result = await pool.query('SELECT * FROM movies');
    console.log('Movies found:', result.rows.length);
    res.json({ Response: 'True', Search: result.rows });
  } catch (err) {
    console.error('Get movies - Error:', err);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Initialize database and start server
async function startServer() {
  console.log('=== STARTING SERVER INITIALIZATION ===');

  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Load initial movies data if needed
    console.log('Checking if movies need to be loaded...');
    const moviesCount = await pool.query('SELECT COUNT(*) FROM movies');
    console.log('Movies in database:', moviesCount.rows[0].count);

    if (parseInt(moviesCount.rows[0].count) === 0) {
      const moviesFile = path.join(__dirname, 'movies.json');
      if (fs.existsSync(moviesFile)) {
        console.log('Loading movies from file...');
        const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
        console.log('Movies to load:', movies.length);
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
    console.error('=== DATABASE INITIALIZATION FAILED ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }

  // Serve static frontend if dist folder exists (production build)
  const distPath = path.join(__dirname, '../dist');
  console.log('Checking for dist folder:', distPath);
  console.log('Dist exists:', fs.existsSync(distPath));

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/*path', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static files being served from dist');
  }

  app.listen(PORT, () => {
    console.log('=== SERVER STARTED ===');
    console.log(`Server running on port ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  });
}

startServer();