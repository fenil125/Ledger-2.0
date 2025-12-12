# Ledger Management System

A full-stack ledger application for managing buying and selling transactions with parties (customers/vendors). Built with React, Node.js, Express, PostgreSQL, and Prisma ORM.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Database Design](#database-design)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [How They Are Linked](#how-they-are-linked)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

---

## 🎯 Project Overview

The Ledger Management System is designed to help businesses track buying and selling transactions with their vendors and customers. The application provides:

- **Transaction Management**: Record buy/sell transactions with detailed item breakdowns
- **Party Management**: Maintain a database of customers and vendors with contact information
- **User Authentication**: Secure login with JWT tokens and Google OAuth
- **Image Uploads**: Attach invoices, receipts, and profile images using Cloudinary
- **Notifications**: Real-time admin notifications for transaction activities
- **Reports**: Generate daily, monthly, quarterly, and yearly reports
- **Role-Based Access**: Admin and user roles with different permissions

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.2
- **Build Tool**: Vite 5.0
- **Routing**: React Router DOM v7
- **State Management**: TanStack Query (React Query) v5
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS 3.4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: Date-fns, React Day Picker
- **Notifications**: Sonner (toast notifications)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.18
- **Database ORM**: Prisma 5.22
- **Database**: PostgreSQL 15
- **Authentication**: Passport.js, JWT, Google OAuth 2.0
- **File Upload**: Multer 2.0
- **Image Storage**: Cloudinary
- **Password Hashing**: bcrypt 6.0
- **Session Management**: express-session

### Database
- **Primary Database**: PostgreSQL 15 (via Docker or Neon serverless)
- **ORM**: Prisma with migrations
- **Connection Pooling**: pg (node-postgres)

### DevOps & Deployment
- **Frontend Hosting**: Netlify
- **Backend Hosting**: (Can be deployed to Railway, Render, or Heroku)
- **Database**: Docker Compose (local) or Neon (production)
- **Environment Management**: dotenv

---

## 🏗️ Project Architecture

```
Side/
├── backend/                      # Node.js + Express API
│   ├── config/                   # Configuration files
│   │   └── passport.js          # Google OAuth config
│   ├── middleware/              # Custom middleware
│   │   └── auth.js             # JWT authentication
│   ├── prisma/                  # Prisma ORM
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migrations
│   ├── scripts/                 # Utility scripts
│   │   ├── migrate.js          # Database migration runner
│   │   └── seed.js             # Seed data
│   ├── index.js                 # Main Express server
│   ├── db.js                    # PostgreSQL connection
│   ├── db.sql                   # Legacy SQL schema
│   ├── docker-compose.yml       # PostgreSQL container
│   ├── package.json             # Backend dependencies
│   ├── .env                     # Environment variables
│   └── README.md               # Backend documentation
│
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── api/                # API client
│   │   │   └── base44Client.js # HTTP client with auth
│   │   ├── components/         # Reusable components
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   ├── forms/          # Form components
│   │   │   └── ui/             # UI primitives
│   │   ├── context/            # React Context
│   │   │   └── AuthContext.jsx # Authentication state
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Parties.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Admin.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Notifications.jsx
│   │   ├── lib/                # Utilities
│   │   ├── App.jsx             # Root component
│   │   ├── Layout.jsx          # App layout
│   │   ├── main.jsx            # Entry point
│   │   └── styles.css          # Global styles
│   ├── index.html              # HTML template
│   ├── vite.config.mjs         # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS config
│   └── package.json            # Frontend dependencies
│
├── netlify.toml                # Netlify deployment config
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## 🗄️ Database Design

### Database Creation

The application uses **PostgreSQL** as its primary database, managed through **Prisma ORM**.

#### Option 1: Docker Setup (Local Development)

The `docker-compose.yml` file creates a PostgreSQL 15 container:

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: ledger-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ledger
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

**Start the database:**
```bash
cd backend
docker compose up -d
```

#### Option 2: Neon Serverless (Production)

Neon is a serverless PostgreSQL service. The connection string is configured in `.env`:

```
DATABASE_URL="postgresql://username:password@hostname/ledger?sslmode=require"
```

### Database Schema

The database schema is defined in `backend/prisma/schema.prisma` using Prisma ORM:

#### Core Tables

1. **User** - Application users with authentication
   - Fields: id, email, name, password, role, profileImage, isActive
   - Relations: transactions, parties, notifications

2. **Party** - Customers and vendors
   - Fields: id, name, phone, email, address, notes, image, isActive
   - Relations: transactions, createdBy (User)

3. **Transaction** - Buy/sell transactions
   - Fields: id, type (buy/sell), date, partyId, phone, totalWeight, totalPayment, notes
   - Images: invoiceImage, receiptImage (Cloudinary URLs)
   - Relations: party, creator (User), buyItems, sellItems

4. **BuyItem** - Items purchased in buying transactions
   - Fields: id, transactionId, hnyColor, hnyRate, blackColor, blackRate, transportationCharges
   - Relations: transaction

5. **SellItem** - Items sold in selling transactions
   - Fields: id, transactionId, itemName, count, weightPerItem, ratePerItem, totalWeight, totalAmount
   - Payment tracking: paymentReceived, balanceLeft, paymentDueDays
   - Relations: transaction

6. **Report** - Generated reports
   - Fields: id, name, type, startDate, endDate, data (JSON), generatedBy

7. **Notification** - Admin notifications
   - Fields: id, userId, message, type, isRead
   - Relations: user

### Database Migrations

Prisma automatically generates and runs migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run seed
```

### Legacy SQL Schema

The `db.sql` file contains a simplified schema for backward compatibility:

- `parties` table: Basic party information
- `transactions` table: Transaction master records
- `buy_items` table: Buying transaction details
- `sell_items` table: Selling transaction details

---

## 🎨 Frontend Architecture

### Technology Choices

The frontend is built with **React 18** and **Vite** for fast development and optimized builds.

#### Key Libraries

1. **React Router DOM** - Client-side routing with protected routes
2. **TanStack Query** - Data fetching, caching, and state management
3. **Tailwind CSS** - Utility-first CSS framework
4. **Radix UI** - Accessible, unstyled UI primitives
5. **Framer Motion** - Smooth animations
6. **Sonner** - Toast notifications

### Component Structure

```
src/
├── api/
│   └── base44Client.js        # API client with JWT auth
├── components/
│   ├── dashboard/             # Transaction cards, charts
│   ├── forms/                 # Transaction, Party forms
│   └── ui/                    # Buttons, dialogs, inputs
├── context/
│   └── AuthContext.jsx        # Global auth state
├── pages/
│   ├── Dashboard.jsx          # Transaction list, summary
│   ├── Parties.jsx            # Party management
│   ├── Reports.jsx            # Report generation
│   ├── Admin.jsx              # User management
│   ├── Login.jsx              # Authentication
│   └── Notifications.jsx      # Notification center
├── App.jsx                    # Route configuration
└── Layout.jsx                 # Sidebar, header, nav
```

### Authentication Flow

1. User logs in via `/login` (email/password or Google OAuth)
2. Server returns JWT token
3. Token stored in `localStorage`
4. `AuthContext` provides global auth state
5. `base44Client.js` adds `Authorization: Bearer <token>` to all requests
6. Protected routes check `isAuthenticated` before rendering

### API Client (`base44Client.js`)

Centralized HTTP client with automatic authentication:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const base44 = {
  entities: {
    Transaction: new EntityClient('Transaction', '/api/transactions'),
    Party: new EntityClient('Party', '/api/parties'),
    User: new EntityClient('User', '/api/users'),
  },
  async getSummary() { ... },
  async getNotifications() { ... },
  async exportCSV() { ... }
};
```

### State Management

- **TanStack Query** handles server state (data fetching, caching, refetching)
- **React Context** handles client state (auth, theme, user preferences)
- **Local component state** handles form inputs, UI toggles

---

## ⚙️ Backend Architecture

### Server Setup

The backend is an **Express.js** server that provides REST APIs.

**Entry Point:** `backend/index.js`

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

app.listen(process.env.PORT || 4000);
```

### Authentication & Authorization

1. **JWT Tokens** - Stateless authentication
2. **Passport.js** - Google OAuth 2.0 integration
3. **Middleware** - `authenticateToken` protects routes
4. **Session** - express-session for OAuth flow

**Protected Route Example:**
```javascript
app.get('/api/transactions', authenticateToken, async (req, res) => {
  // req.user contains authenticated user
  const transactions = await prisma.transaction.findMany();
  res.json(transactions);
});
```

### File Uploads

**Multer** handles multipart/form-data file uploads:
- Profile images → `uploads/profiles/`
- Transaction images → `uploads/transactions/`

**Cloudinary Integration:**
Files are uploaded to Cloudinary for cloud storage:

```javascript
async function uploadToCloudinary(file, folder) {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: `ledger/${folder}`,
    resource_type: 'auto'
  });
  return result.secure_url;
}
```

### Data Mapping

The backend maps database fields to frontend expectations:

| Database Field | Frontend Field | Mapping Logic |
|---------------|----------------|---------------|
| `type` (buy/sell) | `transaction_type` (buying/selling) | `mapTransaction()` function |
| `created_at` | `created_date` | Alias in response |
| `partyId` | `party_name` | SQL JOIN with parties table |

**Example Mapping Function:**
```javascript
function mapTransaction(tx) {
  return {
    ...tx,
    transaction_type: tx.type === 'buy' ? 'buying' : 'selling',
    created_date: tx.createdAt,
    party_name: tx.party?.name
  };
}
```

### Database Connection

**Prisma Client** manages the PostgreSQL connection:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Query example
const users = await prisma.user.findMany();
```

**Legacy Connection** (`db.js`):
```javascript
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});
```

---

## 🔗 How They Are Linked

### 1. Database → Backend Connection

#### Via Prisma ORM

```javascript
// backend/index.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Database connection configured via .env
// DATABASE_URL=postgresql://user:password@host:5432/ledger
```

**Connection Flow:**
1. `.env` file contains `DATABASE_URL`
2. Prisma reads `schema.prisma` and generates client
3. `PrismaClient` connects to PostgreSQL
4. API routes query Prisma models

#### Via pg (node-postgres)

```javascript
// backend/db.js
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function query(text, params) {
  return pool.query(text, params);
}
```

### 2. Frontend → Backend Connection

#### API Client Configuration

```javascript
// frontend/src/api/base44Client.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const base44 = {
  entities: {
    Transaction: new EntityClient('Transaction', '/api/transactions'),
    Party: new EntityClient('Party', '/api/parties'),
  }
};
```

**Environment Variables:**

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:4000
```

**Backend** (`backend/.env`):
```
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ledger
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Request/Response Flow

```
Frontend Component
    ↓
base44Client.js (adds JWT token)
    ↓
HTTP Request → http://localhost:4000/api/transactions
    ↓
Backend Express Server (index.js)
    ↓
authenticateToken Middleware (validates JWT)
    ↓
Route Handler (executes business logic)
    ↓
Prisma Client (queries PostgreSQL)
    ↓
Database (PostgreSQL)
    ↓
Response with JSON data
    ↓
Frontend receives data & updates UI
```

#### Example: Creating a Transaction

**Frontend:**
```javascript
// Frontend component
const createTransaction = async (data) => {
  const response = await base44.entities.Transaction.create(data);
  return response;
};
```

**API Client:**
```javascript
// base44Client.js
async create(data) {
  const response = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

**Backend:**
```javascript
// index.js
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const data = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      type: data.type,
      date: new Date(data.date),
      partyId: data.party_id,
      totalPayment: data.total_payment,
      createdBy: req.user.id // From JWT token
    }
  });
  res.json(transaction);
});
```

**Database:**
```sql
-- Prisma generates SQL query
INSERT INTO "Transaction" (id, type, date, "partyId", "totalPayment", "createdBy") 
VALUES ($1, $2, $3, $4, $5, $6) 
RETURNING *;
```

### 3. Authentication Link

**Login Flow:**

1. User submits credentials at `/login`
2. Frontend sends POST to `/api/auth/login`
3. Backend validates credentials with bcrypt
4. Backend generates JWT token
5. Frontend stores token in localStorage
6. All subsequent requests include `Authorization: Bearer <token>`
7. Backend middleware validates token and extracts user info
8. Protected routes access `req.user`

**Google OAuth Flow:**

1. Frontend redirects to `/api/auth/google`
2. Backend uses Passport.js Google strategy
3. User authenticates with Google
4. Google redirects to `/api/auth/google/callback`
5. Backend creates/finds user, generates JWT
6. Redirects frontend to `/auth/callback?token=<jwt>`
7. Frontend stores token and redirects to dashboard

### 4. File Upload Link

**Upload Flow:**

1. Frontend form submits multipart/form-data
2. Multer middleware processes files
3. Files saved to temp directory
4. Backend uploads to Cloudinary
5. Cloudinary returns secure URL
6. Backend saves URL in database
7. Frontend displays image using Cloudinary URL

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for local PostgreSQL)
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd Side
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start PostgreSQL (using Docker)
docker compose up -d

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run seed

# Start backend server
npm run dev
```

Backend runs at `http://localhost:4000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with API URL

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Access Application

Open browser at `http://localhost:5173`

**Default Credentials** (if seeded):
- Email: `admin@example.com`
- Password: `admin123`

---

## 📚 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/google` | GET | Google OAuth login |
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/me` | GET | Get current user |

### Transactions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transactions` | GET | List all transactions |
| `/api/transactions/:id` | GET | Get transaction by ID |
| `/api/transactions` | POST | Create transaction |
| `/api/transactions/:id` | PUT | Update transaction |
| `/api/transactions/:id` | DELETE | Delete transaction |

### Parties

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parties` | GET | List all parties |
| `/api/parties/:id` | GET | Get party by ID |
| `/api/parties` | POST | Create party |
| `/api/parties/:id` | PUT | Update party |
| `/api/parties/:id` | DELETE | Delete party |

### Users (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List all users |
| `/api/users/:id` | GET | Get user by ID |
| `/api/users/register` | POST | Create user |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET | List notifications |
| `/api/notifications/unread-count` | GET | Get unread count |
| `/api/notifications/:id/read` | PUT | Mark as read |
| `/api/notifications/mark-all-read` | PUT | Mark all as read |

### Reports

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/summary` | GET | Get summary statistics |
| `/api/export/csv` | GET | Export data as CSV |

---

## 🌐 Deployment

### Frontend Deployment (Netlify)

The project is configured for Netlify deployment via `netlify.toml`:

```toml
[build]
  base    = "frontend"
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

**Steps:**
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `frontend/dist`
4. Add environment variable: `VITE_API_URL=<backend-url>`
5. Deploy

### Backend Deployment (Railway/Render)

1. Connect repository to hosting platform
2. Set root directory to `backend`
3. Add environment variables from `.env.example`
4. Set start command: `npm start`
5. Deploy

### Database Deployment (Neon)

1. Create Neon project
2. Copy connection string
3. Add to backend `.env` as `DATABASE_URL`
4. Run migrations: `npx prisma migrate deploy`

---

## 📝 Additional Documentation

- [Backend Setup Guide](backend/README.md)
- [Frontend Setup Guide](frontend/README.md)
- [Backend Integration Details](BACKEND_INTEGRATION.md)
- [Database Fix Notes](DATABASE_FIX.md)
- [Neon Prisma Setup](NEON_PRISMA_SETUP.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 🆘 Support

For issues and questions, please check the documentation files or contact the development team.
