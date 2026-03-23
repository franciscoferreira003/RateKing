const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple UUID generator
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = path.join(__dirname, 'reviews.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const MOVIES_FILE = path.join(__dirname, 'movies.json');

// Initialize data files
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    movies: [],
    songs: [],
    videogames: [],
    shows: []
  }, null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
  const adminPassword = bcrypt.hashSync('AlPaFrGo2003_', 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify([{
    id: generateId(),
    username: 'admin',
    email: 'admin@reviewapp.com',
    password: adminPassword,
    isAdmin: true,
    createdAt: new Date().toISOString()
  }], null, 2));
}

// Auth middleware
const authMiddleware = (req, res, next) => {
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
const adminMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.id === decoded.userId);
    if (!user || !user.isAdmin) {
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
app.get('/api/reviews/:category', (req, res) => {
  const { category } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  res.json(data[category]);
});

// Get all reviews across all categories
app.get('/api/reviews', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  res.json(data);
});

// Get single review
app.get('/api/reviews/:category/:id', (req, res) => {
  const { category, id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const review = data[category].find(r => r.id === parseInt(id));
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json(review);
});

// Create new review
app.post('/api/reviews/:category', authMiddleware, (req, res) => {
  const { category } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const newReview = {
    id: Date.now(),
    title: req.body.title,
    rating: req.body.rating,
    description: req.body.description,
    userId: req.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data[category].push(newReview);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.status(201).json(newReview);
});

// Update review
app.put('/api/reviews/:category/:id', authMiddleware, (req, res) => {
  const { category, id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const review = data[category][reviewIndex];
  if (review.userId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to edit this review' });
  }

  data[category][reviewIndex] = {
    ...data[category][reviewIndex],
    title: req.body.title,
    rating: req.body.rating,
    description: req.body.description,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json(data[category][reviewIndex]);
});

// Delete review
app.delete('/api/reviews/:category/:id', authMiddleware, (req, res) => {
  const { category, id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const review = data[category][reviewIndex];
  if (review.userId !== req.userId && !req.isAdmin) {
    return res.status(403).json({ error: 'Not authorized to delete this review' });
  }

  const deleted = data[category].splice(reviewIndex, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json(deleted[0]);
});

// Admin routes
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const userList = users.map(u => ({ id: u.id, username: u.username, email: u.email, isAdmin: u.isAdmin, createdAt: u.createdAt }));
  res.json(userList);
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (users[userIndex].isAdmin) {
    return res.status(403).json({ error: 'Cannot delete admin user' });
  }
  const deleted = users.splice(userIndex, 1);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ message: 'User deleted', user: deleted[0] });
});

app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { username, email, isAdmin, password } = req.body;
  users[userIndex] = {
    ...users[userIndex],
    username: username || users[userIndex].username,
    email: email || users[userIndex].email,
    isAdmin: isAdmin !== undefined ? isAdmin : users[userIndex].isAdmin,
    password: password ? await bcrypt.hash(password, 10) : users[userIndex].password
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ id: users[userIndex].id, username: users[userIndex].username, email: users[userIndex].email, isAdmin: users[userIndex].isAdmin });
});

app.get('/api/admin/reviews', adminMiddleware, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const allReviews = [];
  for (const [cat, reviews] of Object.entries(data)) {
    allReviews.push(...reviews.map(r => ({ ...r, category: cat })));
  }
  res.json(allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.delete('/api/admin/reviews/:category/:id', adminMiddleware, (req, res) => {
  const { category, id } = req.params;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!data[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const reviewIndex = data[category].findIndex(r => r.id === parseInt(id));
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const deleted = data[category].splice(reviewIndex, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json(deleted[0]);
});

// Get user's reviews
app.get('/api/users/reviews', authMiddleware, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const userReviews = [];
  for (const [cat, reviews] of Object.entries(data)) {
    userReviews.push(...reviews.filter(r => r.userId === req.userId).map(r => ({ ...r, category: cat })));
  }
  res.json(userReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Search reviews
app.get('/api/search', (req, res) => {
  const { q, category } = req.query;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  const results = {};
  const categories = category ? [category] : Object.keys(data);

  for (const cat of categories) {
    results[cat] = data[cat].filter(r =>
      r.title.toLowerCase().includes(q?.toLowerCase()) ||
      r.description.toLowerCase().includes(q?.toLowerCase())
    );
  }

  res.json(results);
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: generateId(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, username, email, isAdmin: newUser.isAdmin || false } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin });
});

app.get('/api/users/:id', (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username });
});

// Movies API - Search movies
app.get('/api/movies/search', (req, res) => {
  const { query } = req.query;
  const movies = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
  if (!query) {
    return res.json({ Response: 'True', Search: movies });
  }
  const results = movies.filter(m =>
    m.Title.toLowerCase().includes(query.toLowerCase()) ||
    m.Director?.toLowerCase().includes(query.toLowerCase()) ||
    m.Actors?.toLowerCase().includes(query.toLowerCase())
  );
  res.json({ Response: 'True', Search: results });
});

// Movies API - Get movie details
app.get('/api/movies/:id', (req, res) => {
  const { id } = req.params;
  const movies = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
  const movie = movies.find(m => m.imdbID === id);
  if (movie) {
    res.json({ Response: 'True', ...movie });
  } else {
    res.json({ Response: 'False', Error: 'Movie not found' });
  }
});

// Movies API - Get all movies
app.get('/api/movies', (req, res) => {
  const movies = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
  res.json({ Response: 'True', Search: movies });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
