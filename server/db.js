const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Check if we're using PostgreSQL (production) or JSON files (development)
const USE_DATABASE = !!process.env.DATABASE_URL;

let pool;
if (USE_DATABASE) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

// File paths for JSON storage
const DATA_DIR = __dirname;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');

// Initialize JSON files if they don't exist
function initJsonFiles() {
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
    console.log('Created users.json with admin user');
  }

  if (!fs.existsSync(REVIEWS_FILE)) {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify({
      movies: [],
      songs: [],
      videogames: [],
      shows: []
    }, null, 2));
    console.log('Created reviews.json');
  }

  if (!fs.existsSync(MOVIES_FILE)) {
    // Try to load from movies.json in parent directory if exists
    const sourceMovies = path.join(__dirname, 'movies.json');
    if (fs.existsSync(sourceMovies)) {
      console.log('Movies file exists');
    } else {
      fs.writeFileSync(MOVIES_FILE, JSON.stringify([], null, 2));
      console.log('Created empty movies.json');
    }
  }
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function initializeDatabase() {
  if (USE_DATABASE) {
    // PostgreSQL initialization
    let client;
    try {
      client = await pool.connect();
      console.log('Connected to PostgreSQL database');

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id BIGINT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          rating INTEGER NOT NULL,
          description TEXT,
          category VARCHAR(50) NOT NULL,
          user_id VARCHAR(36) REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS movies (
          imdb_id VARCHAR(20) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          year VARCHAR(10),
          poster TEXT,
          plot TEXT,
          director VARCHAR(255),
          actors TEXT,
          genre VARCHAR(255),
          imdb_rating VARCHAR(10)
        )
      `);

      const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@reviewapp.com'");
      if (adminCheck.rows.length === 0) {
        const adminPassword = bcrypt.hashSync('AlPaFrGo2003_', 10);
        await client.query(
          'INSERT INTO users (id, username, email, password, is_admin, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [generateId(), 'admin', 'admin@reviewapp.com', adminPassword, true, new Date()]
        );
        console.log('Admin user created in PostgreSQL');
      }

      console.log('PostgreSQL database initialized');
    } finally {
      if (client) client.release();
    }
  } else {
    // JSON file initialization
    console.log('Using JSON files for local development');
    initJsonFiles();
    console.log('JSON files initialized');
  }
}

module.exports = {
  pool,
  initializeDatabase,
  generateId,
  USE_DATABASE,
  USERS_FILE,
  REVIEWS_FILE,
  MOVIES_FILE
};