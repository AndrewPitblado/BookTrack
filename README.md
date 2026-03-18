# BookTrack

A web application for tracking books you've read and unlocking achievements for consistent reading habits.

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT tokens

## Project Structure

```
BookTrack/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   └── services/       # API service
│   └── package.json
│
└── server/                 # Express backend
    ├── config/             # Database configuration
    ├── middleware/         # Auth middleware
    ├── models/             # Sequelize models
    ├── routes/             # API routes
    ├── index.js            # Server entry point
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MySQL server running locally

### 1. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE booktrack;
```

### 2. Server Setup

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
npm install
npm run dev
```

The server will start on `http://localhost:5001` (or the PORT specified in your `.env`).

You should see:
```
Database synced successfully
Server running on port 5001
```

### 3. Client Setup

```bash
cd client
npm install
npm run dev
```

### 4. Seed Achievements (Optional)

Run this SQL to add some starter achievements:
```sql
INSERT INTO achievements (name, description, criteria, icon, createdAt, updatedAt) VALUES
('First Book', 'Finish your first book', '{"type": "books_finished", "count": 1}', '📖', NOW(), NOW()),
('Bookworm', 'Finish 5 books', '{"type": "books_finished", "count": 5}', '📚', NOW(), NOW()),
('Avid Reader', 'Finish 10 books', '{"type": "books_finished", "count": 10}', '🏆', NOW(), NOW()),
('Library Builder', 'Finish 25 books', '{"type": "books_finished", "count": 25}', '🏛️', NOW(), NOW());
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Books
- `GET /api/books/search?q=query` - Search Google Books
- `POST /api/books` - Add book to database
- `GET /api/books/:id` - Get book by ID

### User Books
- `GET /api/user-books` - Get user's books
- `POST /api/user-books` - Add book to user's list
- `PUT /api/user-books/:id` - Update book status
- `DELETE /api/user-books/:id` - Remove from list
- `GET /api/user-books/history` - Get read history

### Achievements
- `GET /api/achievements` - Get all achievements
- `GET /api/achievements/user` - Get user's achievements
- `POST /api/achievements/check` - Check for new achievements

## Environment Variables

### Server (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=booktrack
DB_PORT=3306
JWT_SECRET=your_generated_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=5001
GOOGLE_BOOKS_API_KEY=optional_api_key
```

### Client (.env)
```
VITE_API_URL=http://localhost:5001/api
```

**Note:** Generate a strong JWT_SECRET with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Each team member needs their own local `.env` file with their MySQL credentials.

## Deploying To Netlify + Railway

### 1. Prepare Hosting Accounts
- Push this repo to GitHub.
- Create a Railway project for the backend and MySQL database.
- Create a Netlify site for the frontend.

### 2. Railway Backend Setup
- Service source: this repo, root directory `server`.
- Build command: `npm install`.
- Start command: `npm start`.
- Set environment variables in Railway:
```
NODE_ENV=production
PORT=5001
DB_HOST=<railway_mysql_host>
DB_PORT=<railway_mysql_port>
DB_NAME=<railway_mysql_database>
DB_USER=<railway_mysql_user>
DB_PASSWORD=<railway_mysql_password>
JWT_SECRET=<long_random_secret>
JWT_EXPIRES_IN=7d
GOOGLE_BOOKS_API_KEY=<optional>
CORS_ORIGIN=https://booktrack.apitblado.com
AUTO_SEED_ACHIEVEMENTS=true
```
- Verify health endpoint works:
    - `https://<your-railway-backend-domain>/api/health`

### 3. Netlify Frontend Setup
- Site source: this repo, base directory `client`.
- Build command: `npm run build`.
- Publish directory: `dist`.
- Set environment variable in Netlify:
```
VITE_API_URL=https://api.booktrack.apitblado.com/api
```
- Redeploy after saving environment variables.

### 4. Custom Domain Setup (Namecheap)
- Recommended domains:
    - Frontend: `booktrack.apitblado.com`
    - Backend: `api.booktrack.apitblado.com`
- Add DNS records in Namecheap:
    - CNAME `booktrack` -> Netlify target host (provided by Netlify)
    - CNAME `api.booktrack` -> Railway target host (provided by Railway)
- Add both custom domains in Netlify/Railway dashboards and wait for SSL to provision.

### 5. Seed Data
- Achievements now auto-seed on backend startup when `AUTO_SEED_ACHIEVEMENTS` is not set to `false`.
- To run manually in Railway service shell:
```bash
npm run seed:achievements
node seedUsers.js
```

### 6. Production Checklist
- Confirm login/register works from `booktrack.apitblado.com`.
- Confirm book search and user-book updates work.
- Confirm CORS only allows your frontend domain.
- Confirm `.env` files are not committed.
