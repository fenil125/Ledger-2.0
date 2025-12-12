# System Integration Guide

This document explains how the frontend, backend, and database connect and work together as a complete system.

---

## 🔗 System Architecture Overview

The Ledger Management System follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React + Vite + TanStack Query + Tailwind CSS              │
│  Port: 5173 (dev) / Netlify (production)                   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/HTTPS
                    (REST API + JWT Auth)
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  Node.js + Express.js + Prisma ORM                         │
│  Port: 4000 (dev) / Railway/Render (production)            │
└─────────────────────────────────────────────────────────────┘
                            ↕ TCP/IP
                    (Prisma Client + SQL)
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
│  PostgreSQL 15 + Prisma Migrations                         │
│  Port: 5432 (Docker/Local) / Neon (production)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Request/Response Flow

### Example: Creating a Transaction

Let's trace a complete request from user action to database and back:

#### 1. User Interaction (Frontend)

User fills out transaction form and clicks "Create":

```javascript
// Dashboard.jsx
function Dashboard() {
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction created!');
    }
  });

  const handleSubmit = (formData) => {
    createMutation.mutate({
      type: 'buying',
      date: '2025-12-12',
      party_id: 'clx123abc',
      total_weight: 100,
      total_payment: 50000,
      notes: 'Sample transaction'
    });
  };
}
```

#### 2. API Client (Frontend)

API client adds JWT token and sends HTTP request:

```javascript
// base44Client.js
class EntityClient {
  async create(data) {
    const token = localStorage.getItem('token');
    
    const response = await fetch('http://localhost:4000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    return handleResponse(response);
  }
}
```

**HTTP Request:**
```http
POST /api/transactions HTTP/1.1
Host: localhost:4000
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "type": "buying",
  "date": "2025-12-12",
  "party_id": "clx123abc",
  "total_weight": 100,
  "total_payment": 50000,
  "notes": "Sample transaction"
}
```

#### 3. Backend Receives Request

Express server receives and routes the request:

```javascript
// index.js
app.post('/api/transactions', authenticateToken, upload.fields([...]), async (req, res) => {
  // Request flows through middleware stack:
  // 1. CORS middleware
  // 2. Body parser
  // 3. authenticateToken (validates JWT)
  // 4. Multer (handles file uploads)
  // 5. Route handler
});
```

#### 4. Authentication Middleware

JWT token is validated:

```javascript
// middleware/auth.js
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    
    req.user = user; // { id: 'clx456def', email: 'user@example.com', role: 'user' }
    next();
  });
}
```

#### 5. Data Transformation

Backend normalizes data for database:

```javascript
// index.js - Route handler
const data = req.body;

// Transform transaction type: 'buying' → 'buy'
let type = data.type;
if (type === 'buying') type = 'buy';
if (type === 'selling') type = 'sell';

// Parse numeric fields
const totalWeight = parseFloat(data.total_weight);
const totalPayment = parseFloat(data.total_payment);
```

#### 6. Database Query via Prisma

Prisma Client creates database record:

```javascript
// index.js
const transaction = await prisma.transaction.create({
  data: {
    type: 'buy',
    date: new Date('2025-12-12'),
    partyId: 'clx123abc',
    phone: '1234567890',
    totalWeight: 100,
    totalPayment: 50000,
    notes: 'Sample transaction',
    createdBy: req.user.id, // From JWT token
    buyItems: {
      create: [{
        hnyColor: 60,
        hnyRate: 500,
        blackColor: 40,
        blackRate: 450
      }]
    }
  },
  include: {
    party: true,
    buyItems: true,
    creator: true
  }
});
```

**Generated SQL:**
```sql
BEGIN;

INSERT INTO "Transaction" (
  id, type, date, "partyId", phone, 
  "totalWeight", "totalPayment", notes, "createdBy", "createdAt"
) VALUES (
  'clx789ghi', 'buy', '2025-12-12', 'clx123abc', '1234567890',
  100, 50000, 'Sample transaction', 'clx456def', NOW()
) RETURNING *;

INSERT INTO "BuyItem" (
  id, "transactionId", "hnyColor", "hnyRate", "blackColor", "blackRate"
) VALUES (
  'clx789jkl', 'clx789ghi', 60, 500, 40, 450
) RETURNING *;

COMMIT;
```

#### 7. Database Executes Query

PostgreSQL:
1. Validates foreign key constraints (`partyId` → `Party.id`, `createdBy` → `User.id`)
2. Inserts records into `Transaction` and `BuyItem` tables
3. Returns inserted records with generated IDs and timestamps

#### 8. Backend Response Transformation

Backend maps database response to frontend format:

```javascript
// index.js
function mapTransaction(tx) {
  return {
    id: tx.id,
    transaction_type: tx.type === 'buy' ? 'buying' : 'selling', // 'buy' → 'buying'
    date: tx.date,
    party_id: tx.partyId,
    party_name: tx.party?.name,
    phone: tx.phone,
    total_weight: tx.totalWeight,
    total_payment: tx.totalPayment,
    notes: tx.notes,
    created_date: tx.createdAt,
    created_by: tx.creator?.name,
    buy_items: tx.buyItems,
    sell_items: tx.sellItems
  };
}

res.json(mapTransaction(transaction));
```

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "clx789ghi",
  "transaction_type": "buying",
  "date": "2025-12-12T00:00:00.000Z",
  "party_id": "clx123abc",
  "party_name": "Rajesh Traders",
  "phone": "1234567890",
  "total_weight": 100,
  "total_payment": 50000,
  "notes": "Sample transaction",
  "created_date": "2025-12-12T17:45:30.123Z",
  "created_by": "John Doe",
  "buy_items": [
    {
      "id": "clx789jkl",
      "hnyColor": 60,
      "hnyRate": 500,
      "blackColor": 40,
      "blackRate": 450
    }
  ]
}
```

#### 9. Frontend Receives Response

TanStack Query updates cache and triggers re-render:

```javascript
// Dashboard.jsx
const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Transaction.create(data),
  onSuccess: (newTransaction) => {
    // Invalidate cache to refetch latest data
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    
    // Show success notification
    toast.success('Transaction created successfully!');
  }
});
```

#### 10. UI Update

React re-renders with new data:
- Transaction appears in transaction list
- Summary cards update with new totals
- Form resets to empty state

---

## 🔐 Authentication Integration

### Login Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Frontend│                │ Backend │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /api/auth/login     │                          │
     │ { email, password }      │                          │
     │─────────────────────────>│                          │
     │                          │                          │
     │                          │ SELECT * FROM "User"     │
     │                          │ WHERE email = ?          │
     │                          │─────────────────────────>│
     │                          │                          │
     │                          │<─────────────────────────│
     │                          │ User record              │
     │                          │                          │
     │                          │ bcrypt.compare()         │
     │                          │ (verify password)        │
     │                          │                          │
     │                          │ jwt.sign()               │
     │                          │ (generate token)         │
     │                          │                          │
     │<─────────────────────────│                          │
     │ { token, user }          │                          │
     │                          │                          │
     │ localStorage.setItem()   │                          │
     │ (store token)            │                          │
     │                          │                          │
```

### Authenticated Request Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Frontend│                │ Backend │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ GET /api/transactions    │                          │
     │ Authorization: Bearer... │                          │
     │─────────────────────────>│                          │
     │                          │                          │
     │                          │ jwt.verify()             │
     │                          │ (validate token)         │
     │                          │                          │
     │                          │ SELECT * FROM            │
     │                          │ "Transaction"            │
     │                          │─────────────────────────>│
     │                          │                          │
     │                          │<─────────────────────────│
     │                          │ Transaction records      │
     │                          │                          │
     │<─────────────────────────│                          │
     │ { transactions: [...] }  │                          │
     │                          │                          │
```

---

## 📁 File Upload Integration

### Upload Flow with Cloudinary

```
┌─────────┐          ┌─────────┐          ┌──────────┐          ┌───────────┐
│ Frontend│          │ Backend │          │ Database │          │ Cloudinary│
└────┬────┘          └────┬────┘          └────┬─────┘          └─────┬─────┘
     │                    │                     │                      │
     │ POST /api/parties  │                     │                      │
     │ FormData(image)    │                     │                      │
     │───────────────────>│                     │                      │
     │                    │                     │                      │
     │                    │ Multer saves to     │                      │
     │                    │ temp directory      │                      │
     │                    │                     │                      │
     │                    │ Upload to Cloudinary│                      │
     │                    │────────────────────────────────────────────>│
     │                    │                     │                      │
     │                    │<────────────────────────────────────────────│
     │                    │ { secure_url }      │                      │
     │                    │                     │                      │
     │                    │ INSERT INTO "Party" │                      │
     │                    │ image = secure_url  │                      │
     │                    │────────────────────>│                      │
     │                    │                     │                      │
     │                    │<────────────────────│                      │
     │                    │ Party record        │                      │
     │                    │                     │                      │
     │<───────────────────│                     │                      │
     │ { party }          │                     │                      │
     │                    │                     │                      │
```

---

## 🌐 Environment Configuration

### Connection Configuration

#### Frontend `.env`

```bash
VITE_API_URL=http://localhost:4000
```

#### Backend `.env`

```bash
# Server
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ledger

# Authentication
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL (for CORS and OAuth)
FRONTEND_URL=http://localhost:5173
```

### CORS Configuration

Backend allows requests from frontend:

```javascript
// index.js
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## 🔄 Data Flow Patterns

### 1. Read Operation (GET)

```
User clicks "View Transactions"
    ↓
React Component renders
    ↓
useQuery hook executes
    ↓
base44.entities.Transaction.list()
    ↓
GET /api/transactions (with JWT)
    ↓
authenticateToken middleware
    ↓
Prisma: prisma.transaction.findMany()
    ↓
PostgreSQL: SELECT * FROM "Transaction"
    ↓
Database returns rows
    ↓
Prisma maps to objects
    ↓
Backend maps fields (buy → buying)
    ↓
JSON response
    ↓
TanStack Query caches data
    ↓
Component re-renders with data
    ↓
UI displays transactions
```

### 2. Create Operation (POST)

```
User submits form
    ↓
React form validation
    ↓
useMutation hook executes
    ↓
base44.entities.Transaction.create(data)
    ↓
POST /api/transactions (with JWT + data)
    ↓
authenticateToken middleware
    ↓
Multer processes file uploads
    ↓
Cloudinary upload (if files present)
    ↓
Data normalization (buying → buy)
    ↓
Prisma: prisma.transaction.create()
    ↓
PostgreSQL: INSERT INTO "Transaction"
    ↓
Database returns new record
    ↓
Backend maps response
    ↓
JSON response with new transaction
    ↓
TanStack Query invalidates cache
    ↓
Refetch transactions
    ↓
UI updates with new data
```

### 3. Update Operation (PUT)

```
User edits transaction
    ↓
Form pre-filled with existing data
    ↓
User modifies fields
    ↓
useMutation hook executes
    ↓
base44.entities.Transaction.update(id, data)
    ↓
PUT /api/transactions/:id (with JWT + data)
    ↓
authenticateToken middleware
    ↓
Prisma: prisma.transaction.update()
    ↓
PostgreSQL: UPDATE "Transaction" SET ... WHERE id = ?
    ↓
Database returns updated record
    ↓
Backend maps response
    ↓
JSON response
    ↓
TanStack Query updates cache
    ↓
UI reflects changes
```

### 4. Delete Operation (DELETE)

```
User clicks "Delete"
    ↓
Confirmation dialog
    ↓
useMutation hook executes
    ↓
base44.entities.Transaction.delete(id)
    ↓
DELETE /api/transactions/:id (with JWT)
    ↓
authenticateToken middleware
    ↓
Prisma: prisma.transaction.delete()
    ↓
PostgreSQL: DELETE FROM "Transaction" WHERE id = ?
    ↓
Cascade deletes BuyItem/SellItem (ON DELETE CASCADE)
    ↓
Database confirms deletion
    ↓
Backend returns success
    ↓
TanStack Query removes from cache
    ↓
UI removes item from list
```

---

## 🔍 Filtering and Reporting Integration

### Date Range Filter Flow

```
User selects date range in UI
    ↓
React state updates
    ↓
useQuery with query params
    ↓
GET /api/transactions?startDate=2025-12-01&endDate=2025-12-31
    ↓
Backend parses query params
    ↓
Prisma: where: { date: { gte: startDate, lte: endDate } }
    ↓
PostgreSQL: SELECT * WHERE date BETWEEN ? AND ?
    ↓
Filtered results returned
    ↓
UI displays filtered transactions
```

---

## 🔐 Security Integration

### Multi-Layer Security

1. **Frontend**:
   - Token stored in localStorage
   - Automatic logout on 401 response
   - Protected routes with authentication check

2. **Backend**:
   - JWT token validation on every request
   - Role-based access control
   - Input validation and sanitization
   - CORS configuration

3. **Database**:
   - Foreign key constraints
   - Unique constraints on email
   - Cascade deletes for data integrity
   - Audit trail via `createdBy` and timestamps

---

## 🚀 Deployment Integration

### Production Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Netlify CDN                           │
│              (Frontend - Static Files)                   │
│              https://yourapp.netlify.app                 │
└──────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌──────────────────────────────────────────────────────────┐
│                Railway/Render/Heroku                     │
│              (Backend - Node.js API)                     │
│              https://api.yourapp.com                     │
└──────────────────────────────────────────────────────────┘
                            ↕ SSL/TLS
┌──────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL                       │
│              (Database - Serverless)                     │
│              Automatic backups & scaling                 │
└──────────────────────────────────────────────────────────┘
```

### Environment Variables (Production)

**Frontend (Netlify)**:
```bash
VITE_API_URL=https://api.yourapp.com
```

**Backend (Railway/Render)**:
```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=production-secret-key
FRONTEND_URL=https://yourapp.netlify.app
CLOUDINARY_CLOUD_NAME=production-cloud
CLOUDINARY_API_KEY=production-key
CLOUDINARY_API_SECRET=production-secret
```

---

## ✅ Integration Checklist

### Development Setup

- [ ] PostgreSQL running (Docker or local)
- [ ] Backend `.env` configured with `DATABASE_URL`
- [ ] Backend running on port 4000
- [ ] Frontend `.env` configured with `VITE_API_URL`
- [ ] Frontend running on port 5173
- [ ] CORS enabled for localhost:5173
- [ ] JWT_SECRET configured
- [ ] Cloudinary credentials configured (for file uploads)

### Testing Integration

- [ ] Health check: `curl http://localhost:4000/api/health`
- [ ] Login from frontend
- [ ] Create transaction (verify in database)
- [ ] Upload image (verify Cloudinary URL in database)
- [ ] Filter transactions by date
- [ ] Generate report
- [ ] Test notifications

### Production Deployment

- [ ] Frontend deployed to Netlify
- [ ] Backend deployed to Railway/Render
- [ ] Database migrated to Neon
- [ ] Environment variables configured in hosting platforms
- [ ] CORS updated for production frontend URL
- [ ] SSL/TLS enabled on all connections
- [ ] Test complete flow in production

---

## 🔧 Troubleshooting Integration Issues

### Frontend can't connect to backend

**Symptoms**: Network errors, CORS errors

**Solutions**:
1. Check `VITE_API_URL` in frontend `.env`
2. Verify backend is running: `curl http://localhost:4000/api/health`
3. Check CORS configuration in backend
4. Verify no firewall blocking port 4000

### Authentication not working

**Symptoms**: 401 errors, redirected to login

**Solutions**:
1. Check JWT token in localStorage (DevTools → Application → Local Storage)
2. Verify `JWT_SECRET` matches between login and verification
3. Check token expiration (default 7 days)
4. Ensure `Authorization` header is sent with requests

### Database connection failed

**Symptoms**: 500 errors, "database disconnected"

**Solutions**:
1. Verify `DATABASE_URL` in backend `.env`
2. Check PostgreSQL is running: `docker ps` or `pg_isready`
3. Test connection: `npx prisma db pull`
4. Check firewall rules for port 5432

### File uploads not working

**Symptoms**: Images not appearing, upload errors

**Solutions**:
1. Verify Cloudinary credentials in `.env`
2. Check file size limits (default 5MB)
3. Verify allowed file types in Multer config
4. Check Cloudinary quota in dashboard

---

## 📚 Additional Resources

- [Database Setup Guide](file:///c:/Users/fenil/OneDrive/Desktop/Side/DATABASE_SETUP.md)
- [Backend Setup Guide](file:///c:/Users/fenil/OneDrive/Desktop/Side/BACKEND_SETUP.md)
- [Frontend Setup Guide](file:///c:/Users/fenil/OneDrive/Desktop/Side/FRONTEND_SETUP.md)
- [Main README](file:///c:/Users/fenil/OneDrive/Desktop/Side/README.md)
