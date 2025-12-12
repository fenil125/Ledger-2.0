# Backend Setup and Architecture

This document explains how the Express.js backend was created, configured, and how its components connect together.

---

## ⚙️ Backend Technology Stack

The backend is built with **Node.js** and **Express.js**, providing a RESTful API for the frontend.

### Core Technologies

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database ORM**: Prisma 5.22
- **Authentication**: Passport.js, JWT, Google OAuth 2.0
- **File Upload**: Multer 2.0
- **Image Storage**: Cloudinary
- **Password Hashing**: bcrypt 6.0
- **Session Management**: express-session
- **CORS**: cors middleware

---

## 🏗️ Backend Structure

```
backend/
├── config/
│   └── passport.js          # Google OAuth configuration
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── scripts/
│   ├── migrate.js           # Migration runner
│   └── seed.js              # Database seeding
├── index.js                 # Main Express server
├── db.js                    # Legacy PostgreSQL connection
├── db.sql                   # Legacy SQL schema
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables
└── docker-compose.yml       # PostgreSQL container
```

---

## 🚀 Server Initialization

### Entry Point: `index.js`

The main server file initializes Express and configures all middleware:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware configuration
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Middleware Stack

1. **CORS**: Allows cross-origin requests from frontend
2. **Body Parser**: Parses JSON and URL-encoded request bodies
3. **Session**: Manages user sessions for OAuth
4. **Passport**: Handles authentication strategies

---

## 🔐 Authentication & Authorization

### JWT Authentication

JWT (JSON Web Tokens) provide stateless authentication.

#### Token Generation

```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

#### Authentication Middleware

Located in `middleware/auth.js`:

```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach user to request
    next();
  });
}
```

#### Protected Routes

```javascript
app.get('/api/transactions', authenticateToken, async (req, res) => {
  // req.user contains authenticated user info
  const transactions = await prisma.transaction.findMany();
  res.json(transactions);
});
```

### Google OAuth 2.0

Configured in `config/passport.js`:

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: profile.emails[0].value }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          name: profile.displayName,
          password: '', // No password for OAuth users
          profileImage: profile.photos[0]?.value
        }
      });
    }
    
    done(null, user);
  }
));
```

#### OAuth Routes

```javascript
// Initiate Google OAuth
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// OAuth callback
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);
```

### Password Hashing

Using bcrypt for secure password storage:

```javascript
const bcrypt = require('bcrypt');

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, user.password);
```

---

## 📁 File Upload System

### Multer Configuration

Multer handles multipart/form-data file uploads:

```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### Cloudinary Integration

Images are uploaded to Cloudinary for cloud storage:

```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(file, folder) {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `ledger/${folder}`,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Failed to upload to Cloudinary');
  }
}
```

### File Upload Routes

```javascript
// Upload party with image
app.post('/api/parties', authenticateToken, upload.single('image'), async (req, res) => {
  let imageUrl = null;
  
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file, 'parties');
  }
  
  const party = await prisma.party.create({
    data: {
      ...req.body,
      image: imageUrl,
      createdBy: req.user.id
    }
  });
  
  res.json(party);
});

// Upload transaction with invoice and receipt
app.post('/api/transactions', authenticateToken, upload.fields([
  { name: 'invoiceImage', maxCount: 1 },
  { name: 'receiptImage', maxCount: 1 }
]), async (req, res) => {
  let invoiceImage = null;
  let receiptImage = null;
  
  if (req.files?.invoiceImage) {
    invoiceImage = await uploadToCloudinary(req.files.invoiceImage[0], 'invoices');
  }
  if (req.files?.receiptImage) {
    receiptImage = await uploadToCloudinary(req.files.receiptImage[0], 'receipts');
  }
  
  // Create transaction with images...
});
```

---

## 🔄 Data Mapping and Transformation

The backend maps database fields to match frontend expectations.

### Transaction Type Mapping

Frontend uses `buying`/`selling`, database stores `buy`/`sell`:

```javascript
function mapTransaction(tx) {
  return {
    ...tx,
    transaction_type: tx.type === 'buy' ? 'buying' : 'selling',
    created_date: tx.createdAt,
    party_name: tx.party?.name,
    creator_name: tx.creator?.name
  };
}

// Apply mapping to responses
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { party: true, creator: true, buyItems: true, sellItems: true }
  });
  res.json(transactions.map(mapTransaction));
});
```

### Request Data Normalization

Incoming requests are normalized before database insertion:

```javascript
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const data = req.body;
  
  // Normalize transaction type
  let type = data.type || data.transaction_type;
  if (type === 'buying') type = 'buy';
  if (type === 'selling') type = 'sell';
  
  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      type,
      date: new Date(data.date),
      partyId: data.party_id,
      totalWeight: parseFloat(data.total_weight),
      totalPayment: parseFloat(data.total_payment),
      createdBy: req.user.id
    }
  });
  
  res.json(mapTransaction(transaction));
});
```

---

## 🛣️ API Route Structure

### Route Organization

Routes are organized by resource type:

1. **Health Check**: `/api/health`
2. **Authentication**: `/api/auth/*`
3. **Users**: `/api/users/*`
4. **Parties**: `/api/parties/*`
5. **Transactions**: `/api/transactions/*`
6. **Notifications**: `/api/notifications/*`
7. **Reports**: `/api/reports/*`
8. **Export**: `/api/export/*`

### Health Check Endpoint

```javascript
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
```

### CRUD Pattern

All resources follow a consistent CRUD pattern:

```javascript
// List all
app.get('/api/parties', authenticateToken, async (req, res) => {
  const parties = await prisma.party.findMany();
  res.json(parties);
});

// Get one
app.get('/api/parties/:id', authenticateToken, async (req, res) => {
  const party = await prisma.party.findUnique({ where: { id: req.params.id } });
  res.json(party);
});

// Create
app.post('/api/parties', authenticateToken, async (req, res) => {
  const party = await prisma.party.create({ data: req.body });
  res.json(party);
});

// Update
app.put('/api/parties/:id', authenticateToken, async (req, res) => {
  const party = await prisma.party.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(party);
});

// Delete
app.delete('/api/parties/:id', authenticateToken, async (req, res) => {
  await prisma.party.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

---

## 🔔 Notification System

Admin notifications are created for transaction activities:

```javascript
async function notifyAdmin(action, details, userId) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' }
  });
  
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        message: `${action}: ${details}`,
        type: action.toLowerCase()
      }
    });
  }
}

// Usage in transaction creation
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const transaction = await prisma.transaction.create({ data: req.body });
  
  await notifyAdmin(
    'CREATE',
    `New ${transaction.type} transaction for ${transaction.party.name}`,
    req.user.id
  );
  
  res.json(transaction);
});
```

---

## 📊 Filtering and Querying

### Date Range Filtering

```javascript
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { type, startDate, endDate, partyId } = req.query;
  const where = {};
  
  if (type && type !== 'all') where.type = type;
  if (partyId) where.partyId = partyId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  
  const transactions = await prisma.transaction.findMany({
    where,
    include: { party: true, buyItems: true, sellItems: true },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(transactions.map(mapTransaction));
});
```

### Summary Reports

```javascript
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = {};
  
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  
  const buyTransactions = await prisma.transaction.findMany({
    where: { ...where, type: 'buy' },
    include: { buyItems: true }
  });
  
  const sellTransactions = await prisma.transaction.findMany({
    where: { ...where, type: 'sell' },
    include: { sellItems: true }
  });
  
  const summary = {
    totalBuyWeight: buyTransactions.reduce((sum, tx) => sum + tx.totalWeight, 0),
    totalBuyPayment: buyTransactions.reduce((sum, tx) => sum + tx.totalPayment, 0),
    totalSellWeight: sellTransactions.reduce((sum, tx) => sum + tx.totalWeight, 0),
    totalSellPayment: sellTransactions.reduce((sum, tx) => sum + tx.totalPayment, 0),
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length
  };
  
  res.json(summary);
});
```

---

## 🗄️ Database Connection

### Prisma Client

The backend uses Prisma Client for all database operations:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Example query
const users = await prisma.user.findMany({
  where: { isActive: true },
  include: { transactions: true }
});
```

### Connection Configuration

Connection string is configured via environment variable:

```bash
DATABASE_URL="postgresql://user:password@host:5432/ledger"
```

Prisma automatically:
- Manages connection pooling
- Handles reconnection
- Provides query logging (in development)

### Legacy Connection (db.js)

For backward compatibility, raw PostgreSQL queries are supported:

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}
```

---

## ⚠️ Error Handling

### Global Error Handler

```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});
```

### Route-Level Error Handling

```javascript
app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transaction = await prisma.transaction.create({ data: req.body });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

---

## 🔧 Environment Configuration

Required environment variables in `backend/.env`:

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ledger"

# Authentication
JWT_SECRET="your-secret-key-here"
SESSION_SECRET="your-session-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Frontend URL (for OAuth redirect)
FRONTEND_URL="http://localhost:5173"
```

---

## 🔄 How Backend Components Connect

```
HTTP Request
    ↓
Express Server (index.js)
    ↓
CORS Middleware → Body Parser → Session → Passport
    ↓
Authentication Middleware (auth.js)
    ↓
Route Handler
    ↓
Prisma Client
    ↓
PostgreSQL Database
    ↓
Response Mapping (mapTransaction)
    ↓
JSON Response
```

---

## 📦 Package Scripts

Defined in `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "migrate": "npx prisma migrate dev",
    "seed": "node scripts/seed.js",
    "prisma:generate": "npx prisma generate",
    "prisma:studio": "npx prisma studio"
  }
}
```

**Usage:**
- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:studio` - Open Prisma Studio

---

## ✅ Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Configure `.env` file with all required variables
- [ ] Generate Prisma Client: `npx prisma generate`
- [ ] Run migrations: `npm run migrate`
- [ ] Seed database: `npm run seed`
- [ ] Start server: `npm run dev`
- [ ] Test health endpoint: `curl http://localhost:4000/api/health`

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Backend Source Code](file:///c:/Users/fenil/OneDrive/Desktop/Side/backend/index.js)
