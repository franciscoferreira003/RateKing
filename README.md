# Review App

A web application for reviewing movies, songs, videogames, and shows.

## Features

- Create, edit, and delete reviews
- Rate items with a 5-star system
- Browse by category (Movies, Songs, Videogames, Shows)
- Search across all reviews
- Filter search results by category
- Responsive design

## Project Structure

```
review-app/
├── server/
│   └── index.js          # Express backend API
│   └── reviews.json      # Data storage (auto-created)
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js        # Main React app
│       ├── App.css
│       ├── index.js      # Entry point
│       └── components/
│           ├── ReviewList.js
│           ├── ReviewForm.js
│           └── Search.js
├── package.json
└── vite.config.js
```

## Getting Started

### Install dependencies
```bash
npm install
```

### Run the development server
```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 3000).

### Run only the backend
```bash
npm run server
```

### Run only the frontend
```bash
npm run client
```

### Build for production
```bash
npm run build
```

## API Endpoints

- `GET /api/reviews` - Get all reviews
- `GET /api/reviews/:category` - Get reviews by category
- `GET /api/reviews/:category/:id` - Get single review
- `POST /api/reviews/:category` - Create new review
- `PUT /api/reviews/:category/:id` - Update review
- `DELETE /api/reviews/:category/:id` - Delete review
- `GET /api/search?q=query&category=xxx` - Search reviews

## Categories

- Movies 🎬
- Songs 🎵
- Videogames 🎮
- Shows 📺
