const { Pool } = require('pg');

// Configure pool for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');

    // Create users table
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
    console.log('Users table created/verified');

    // Create reviews table
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
    console.log('Reviews table created/verified');

    // Create movies table
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
    console.log('Movies table created/verified');

    // Check if admin user exists, if not create one
    const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@reviewapp.com'");
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const adminPassword = bcrypt.hashSync('AlPaFrGo2003_', 10);
      await client.query(`
        INSERT INTO users (id, username, email, password, is_admin, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        generateId(),
        'admin',
        'admin@reviewapp.com',
        adminPassword,
        true,
        new Date().toISOString()
      ]);
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    if (client) client.release();
  }
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = { pool, initializeDatabase, generateId };