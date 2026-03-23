const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initializeDatabase, generateId, USE_DATABASE, USERS_FILE, REVIEWS_FILE, MOVIES_FILE } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const OMDB_API_KEY = 'e1f7378f'; // OMDB API Key
const OMDB_URL = 'http://www.omdbapi.com/';

console.log('=== SERVER STARTING ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('USE_DATABASE:', USE_DATABASE);

app.use(cors());
app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Helper functions for JSON storage
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

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

    if (USE_DATABASE) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      const user = result.rows[0];
      if (!user || !user.is_admin) {
        console.log('Admin middleware - User not admin:', decoded.userId);
        return res.status(403).json({ error: 'Admin access required' });
      }
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      const user = users.find(u => u.id === decoded.userId);
      if (!user || !user.isAdmin) {
        console.log('Admin middleware - User not admin:', decoded.userId);
        return res.status(403).json({ error: 'Admin access required' });
      }
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

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  console.log('=== REGISTER REQUEST ===');
  console.log('Body:', { ...req.body, password: '[HIDDEN]' });

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      console.log('Register - Missing fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (USE_DATABASE) {
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
    } else {
      // JSON storage
      const users = readJsonFile(USERS_FILE) || [];
      if (users.find(u => u.email === email)) {
        console.log('Register - Email already registered');
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = generateId();
      const newUser = {
        id,
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      writeJsonFile(USERS_FILE, users);

      console.log('Register - User created successfully:', id);
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: { id, username, email, isAdmin: false } });
    }
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

    if (USE_DATABASE) {
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
    } else {
      // JSON storage
      const users = readJsonFile(USERS_FILE) || [];
      const user = users.find(u => u.email === email);

      if (!user) {
        console.log('Login - User not found');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log('Login - Invalid password');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('Login - Success for user:', user.username);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
    }
  } catch (err) {
    console.error('Login - Error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  console.log('=== GET ME REQUEST ===');
  try {
    if (USE_DATABASE) {
      const result = await pool.query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [req.userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = result.rows[0];
      res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin });
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      const user = users.find(u => u.id === req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin });
    }
  } catch (err) {
    console.error('Get me - Error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============ USER ROUTES ============

app.get('/api/users/:id', async (req, res) => {
  try {
    if (USE_DATABASE) {
      const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result.rows[0]);
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      const user = users.find(u => u.id === req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ id: user.id, username: user.username });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============ ADMIN USER ROUTES ============

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  console.log('=== GET ALL USERS ===');
  try {
    if (USE_DATABASE) {
      const result = await pool.query('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC');
      res.json(result.rows.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: u.is_admin,
        createdAt: u.created_at
      })));
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt
      })));
    }
  } catch (err) {
    console.error('Get users - Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  console.log('=== DELETE USER ===', req.params.id);
  try {
    if (USE_DATABASE) {
      const checkResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (checkResult.rows[0].is_admin) {
        return res.status(403).json({ error: 'Cannot delete admin user' });
      }
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      res.json({ message: 'User deleted' });
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      const userIndex = users.findIndex(u => u.id === req.params.id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (users[userIndex].isAdmin) {
        return res.status(403).json({ error: 'Cannot delete admin user' });
      }
      users.splice(userIndex, 1);
      writeJsonFile(USERS_FILE, users);
      res.json({ message: 'User deleted' });
    }
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
    if (USE_DATABASE) {
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
    } else {
      const users = readJsonFile(USERS_FILE) || [];
      const userIndex = users.findIndex(u => u.id === req.params.id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      users[userIndex] = {
        ...users[userIndex],
        username: username || users[userIndex].username,
        email: email || users[userIndex].email,
        isAdmin: isAdmin !== undefined ? isAdmin : users[userIndex].isAdmin,
        password: password ? await bcrypt.hash(password, 10) : users[userIndex].password
      };

      writeJsonFile(USERS_FILE, users);
      res.json({
        id: users[userIndex].id,
        username: users[userIndex].username,
        email: users[userIndex].email,
        isAdmin: users[userIndex].isAdmin
      });
    }
  } catch (err) {
    console.error('Update user - Error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ============ REVIEW ROUTES ============

app.get('/api/reviews/:category', async (req, res) => {
  const { category } = req.params;
  console.log('=== GET REVIEWS BY CATEGORY ===', category);
  const validCategories = ['movies', 'songs', 'videogames', 'shows'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  try {
    if (USE_DATABASE) {
      const result = await pool.query(
        'SELECT * FROM reviews WHERE category = $1 ORDER BY created_at DESC',
        [category]
      );
      res.json(result.rows);
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      res.json(data[category] || []);
    }
  } catch (err) {
    console.error('Get reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.get('/api/reviews', async (req, res) => {
  console.log('=== GET ALL REVIEWS ===');
  try {
    if (USE_DATABASE) {
      const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
      const grouped = { movies: [], songs: [], videogames: [], shows: [] };
      for (const row of result.rows) {
        if (grouped[row.category]) {
          grouped[row.category].push(row);
        }
      }
      res.json(grouped);
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      res.json(data);
    }
  } catch (err) {
    console.error('Get all reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews/:category', authMiddleware, async (req, res) => {
  console.log('=== CREATE REVIEW ===');
  const { category } = req.params;
  const validCategories = ['movies', 'songs', 'videogames', 'shows'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    if (USE_DATABASE) {
      const id = Date.now();
      const result = await pool.query(
        'INSERT INTO reviews (id, title, rating, description, category, user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [id, req.body.title, req.body.rating, req.body.description, category, req.userId, new Date(), new Date()]
      );
      console.log('Review created:', id);
      res.status(201).json(result.rows[0]);
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      if (!data[category]) data[category] = [];

      const newReview = {
        id: Date.now(),
        title: req.body.title,
        rating: req.body.rating,
        description: req.body.description,
        category,
        userId: req.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      data[category].push(newReview);
      writeJsonFile(REVIEWS_FILE, data);
      res.status(201).json(newReview);
    }
  } catch (err) {
    console.error('Create review - Error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

app.put('/api/reviews/:category/:id', authMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    if (USE_DATABASE) {
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
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      if (!data[category]) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
      if (reviewIndex === -1) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (data[category][reviewIndex].userId !== req.userId) {
        return res.status(403).json({ error: 'Not authorized to edit this review' });
      }

      data[category][reviewIndex] = {
        ...data[category][reviewIndex],
        title: req.body.title,
        rating: req.body.rating,
        description: req.body.description,
        updatedAt: new Date().toISOString()
      };

      writeJsonFile(REVIEWS_FILE, data);
      res.json(data[category][reviewIndex]);
    }
  } catch (err) {
    console.error('Update review - Error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

app.delete('/api/reviews/:category/:id', authMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    if (USE_DATABASE) {
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
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      if (!data[category]) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
      if (reviewIndex === -1) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (data[category][reviewIndex].userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this review' });
      }

      const deleted = data[category].splice(reviewIndex, 1);
      writeJsonFile(REVIEWS_FILE, data);
      res.json(deleted[0]);
    }
  } catch (err) {
    console.error('Delete review - Error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
  console.log('=== GET ALL REVIEWS (ADMIN) ===');
  try {
    if (USE_DATABASE) {
      const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
      res.json(result.rows);
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      const allReviews = [];
      for (const [cat, reviews] of Object.entries(data)) {
        allReviews.push(...reviews.map(r => ({ ...r, category: cat })));
      }
      res.json(allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (err) {
    console.error('Get admin reviews - Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.delete('/api/admin/reviews/:category/:id', adminMiddleware, async (req, res) => {
  const { category, id } = req.params;
  try {
    if (USE_DATABASE) {
      const result = await pool.query('DELETE FROM reviews WHERE category = $1 AND id = $2 RETURNING *', [category, parseInt(id)]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }
      res.json(result.rows[0]);
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      if (!data[category]) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
      if (reviewIndex === -1) {
        return res.status(404).json({ error: 'Review not found' });
      }

      const deleted = data[category].splice(reviewIndex, 1);
      writeJsonFile(REVIEWS_FILE, data);
      res.json(deleted[0]);
    }
  } catch (err) {
    console.error('Delete admin review - Error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ============ SEARCH ROUTE ============

app.get('/api/search', async (req, res) => {
  const { q, category } = req.query;
  try {
    if (USE_DATABASE) {
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
    } else {
      const data = readJsonFile(REVIEWS_FILE) || { movies: [], songs: [], videogames: [], shows: [] };
      const results = {};
      const categories = category ? [category] : Object.keys(data);

      for (const cat of categories) {
        results[cat] = (data[cat] || []).filter(r =>
          r.title.toLowerCase().includes(q?.toLowerCase()) ||
          r.description.toLowerCase().includes(q?.toLowerCase())
        );
      }
      res.json(results);
    }
  } catch (err) {
    console.error('Search - Error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============ MOVIE ROUTES ============

// Search movies from OMDB API
app.get('/api/movies/search', async (req, res) => {
  const { query } = req.query;
  console.log('=== SEARCH MOVIES (OMDB) ===', query);

  try {
    const searchUrl = query
      ? `${OMDB_URL}?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`
      : `${OMDB_URL}?s=movie&apikey=${OMDB_API_KEY}&type=movie`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.Response === 'True') {
      res.json({ Response: 'True', Search: data.Search || [] });
    } else {
      res.json({ Response: 'False', Error: data.Error || 'No movies found', Search: [] });
    }
  } catch (err) {
    console.error('Search movies - Error:', err);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details from OMDB API
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  console.log('=== GET MOVIE DETAILS ===', id);

  try {
    const response = await fetch(`${OMDB_URL}?i=${id}&apikey=${OMDB_API_KEY}`);
    const data = await response.json();

    if (data.Response === 'True') {
      res.json({ Response: 'True', ...data });
    } else {
      res.json({ Response: 'False', Error: data.Error || 'Movie not found' });
    }
  } catch (err) {
    console.error('Get movie - Error:', err);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

// Get popular movies (OMDB doesn't have this, so we return stored movies)
app.get('/api/movies', async (req, res) => {
  console.log('=== GET ALL MOVIES ===');

  try {
    // First check local database/files
    if (USE_DATABASE) {
      const result = await pool.query('SELECT * FROM movies LIMIT 50');
      console.log('Movies found:', result.rows.length);
      res.json({ Response: 'True', Search: result.rows });
    } else {
      const movies = readJsonFile(MOVIES_FILE) || [];
      console.log('Movies found:', movies.length);

      // If no local movies, search for popular ones
      if (movies.length === 0) {
        const popularSearches = ['star wars', 'marvel', 'harry potter', 'lord of the rings', 'matrix'];
        const allMovies = [];

        for (const search of popularSearches) {
          const response = await fetch(`${OMDB_URL}?s=${encodeURIComponent(search)}&apikey=${OMDB_API_KEY}&type=movie`);
          const data = await response.json();
          if (data.Response === 'True' && data.Search) {
            allMovies.push(...data.Search.slice(0, 3));
          }
        }

        // Remove duplicates
        const uniqueMovies = allMovies.filter((movie, index, self) =>
          index === self.findIndex(m => m.imdbID === movie.imdbID)
        );

        res.json({ Response: 'True', Search: uniqueMovies });
      } else {
        res.json({ Response: 'True', Search: movies });
      }
    }
  } catch (err) {
    console.error('Get movies - Error:', err);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Admin - Add movie
app.post('/api/admin/movies', adminMiddleware, async (req, res) => {
  console.log('=== ADD MOVIE ===');
  console.log('Body:', req.body);

  try {
    const { imdbID, Title, Year, Poster, Plot, Director, Actors, Genre, imdbRating } = req.body;

    if (!imdbID || !Title) {
      return res.status(400).json({ error: 'IMDB ID and Title are required' });
    }

    if (USE_DATABASE) {
      const result = await pool.query(
        'INSERT INTO movies (imdb_id, title, year, poster, plot, director, actors, genre, imdb_rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (imdb_id) DO UPDATE SET title = $2, year = $3, poster = $4, plot = $5, director = $6, actors = $7, genre = $8, imdb_rating = $9 RETURNING *',
        [imdbID, Title, Year || '', Poster || '', Plot || '', Director || '', Actors || '', Genre || '', imdbRating || '']
      );
      console.log('Movie added/updated:', result.rows[0].title);
      res.status(201).json(result.rows[0]);
    } else {
      const movies = readJsonFile(MOVIES_FILE) || [];
      const existingIndex = movies.findIndex(m => m.imdbID === imdbID);

      const movieData = {
        imdbID,
        Title,
        Year: Year || '',
        Poster: Poster || '',
        Plot: Plot || '',
        Director: Director || '',
        Actors: Actors || '',
        Genre: Genre || '',
        imdbRating: imdbRating || ''
      };

      if (existingIndex >= 0) {
        movies[existingIndex] = movieData;
      } else {
        movies.push(movieData);
      }

      writeJsonFile(MOVIES_FILE, movies);
      console.log('Movie added/updated:', Title);
      res.status(201).json(movieData);
    }
  } catch (err) {
    console.error('Add movie - Error:', err);
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

// Admin - Delete movie
app.delete('/api/admin/movies/:id', adminMiddleware, async (req, res) => {
  console.log('=== DELETE MOVIE ===', req.params.id);

  try {
    if (USE_DATABASE) {
      const result = await pool.query('DELETE FROM movies WHERE imdb_id = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Movie not found' });
      }
      console.log('Movie deleted:', result.rows[0].title);
      res.json({ message: 'Movie deleted', movie: result.rows[0] });
    } else {
      const movies = readJsonFile(MOVIES_FILE) || [];
      const movieIndex = movies.findIndex(m => m.imdbID === req.params.id);

      if (movieIndex === -1) {
        return res.status(404).json({ error: 'Movie not found' });
      }

      const deleted = movies.splice(movieIndex, 1);
      writeJsonFile(MOVIES_FILE, movies);
      console.log('Movie deleted:', deleted[0].Title);
      res.json({ message: 'Movie deleted', movie: deleted[0] });
    }
  } catch (err) {
    console.error('Delete movie - Error:', err);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// ============ START SERVER ============

async function startServer() {
  console.log('=== STARTING SERVER INITIALIZATION ===');

  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    if (USE_DATABASE) {
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
    console.log(`Mode: ${USE_DATABASE ? 'PostgreSQL' : 'JSON Files'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  });
}

startServer();