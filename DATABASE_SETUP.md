# Database Setup and Architecture

This document explains how the PostgreSQL database was created, configured, and how its components connect together.

---

## 🗄️ Database Technology

The application uses **PostgreSQL 15** as its primary database, managed through **Prisma ORM** for type-safe database access and migrations.

### Why PostgreSQL + Prisma?

- **PostgreSQL**: Robust, ACID-compliant relational database with excellent JSON support
- **Prisma ORM**: Type-safe database client with auto-completion, migrations, and visual database browser
- **Neon**: Serverless PostgreSQL option for production with auto-scaling and 10GB free tier

---

## 🚀 Database Creation Options

### Option 1: Docker (Local Development - Recommended)

The project includes a `docker-compose.yml` file that creates a PostgreSQL container:

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

volumes:
  postgres-data:
```

**Start the database:**
```powershell
cd backend
docker compose up -d
```

**Connection String:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ledger
```

### Option 2: Neon Serverless (Production)

Neon provides serverless PostgreSQL with automatic scaling:

1. **Sign up**: Visit [neon.tech](https://neon.tech) and create a free account
2. **Create project**: Name it "ledger"
3. **Copy connection string**: Example format:
   ```
   postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Update `.env`**: Add the connection string to `backend/.env`

**Benefits:**
- No server management
- Auto-scaling
- Automatic backups
- 10GB free tier

### Option 3: Local PostgreSQL Installation

Install PostgreSQL directly on your system:

1. Download from [postgresql.org](https://www.postgresql.org/download/)
2. During installation, set password for `postgres` user
3. Create database:
   ```sql
   CREATE DATABASE ledger;
   ```
4. Update `.env`:
   ```
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ledger
   ```

---

## 📊 Database Schema

The database schema is defined in `backend/prisma/schema.prisma` using Prisma's schema language.

### Schema Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Core Models

#### 1. User Model

Stores application users with authentication and profile information.

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String
  password     String
  role         String        @default("user") // 'admin' or 'user'
  profileImage String?       // Cloudinary URL
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relations
  transactions  Transaction[]
  parties       Party[]       @relation("CreatedParties")
  notifications Notification[]
}
```

**Key Features:**
- CUID primary key for distributed systems
- Unique email constraint
- Role-based access control
- Profile image stored on Cloudinary
- Soft delete via `isActive` flag

#### 2. Party Model

Stores customers and vendors with contact information.

```prisma
model Party {
  id          String        @id @default(cuid())
  name        String
  phone       String
  email       String?
  address     String?
  notes       String?
  image       String?       // Cloudinary URL for party photo/logo
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  // Relations
  createdBy   String
  creator     User          @relation("CreatedParties", fields: [createdBy], references: [id])
  transactions Transaction[]
}
```

**Key Features:**
- Party logo/photo support
- Audit trail via `createdBy` relation
- Indexed on phone and name for fast lookups

#### 3. Transaction Model

Stores buy/sell transactions with date tracking and image attachments.

```prisma
model Transaction {
  id            String        @id @default(cuid())
  type          String        // 'buy' or 'sell'
  date          DateTime      // Transaction date for filtering
  partyId       String
  phone         String
  totalWeight   Float
  totalPayment  Float
  notes         String?
  
  // Image attachments
  invoiceImage  String?       // Cloudinary URL
  receiptImage  String?       // Cloudinary URL
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  // Relations
  createdBy     String
  creator       User          @relation(fields: [createdBy], references: [id])
  party         Party         @relation(fields: [partyId], references: [id])
  buyItems      BuyItem[]
  sellItems     SellItem[]
}
```

**Key Features:**
- Supports both buy and sell transaction types
- Date-based filtering for reports
- Invoice and receipt image attachments
- One-to-many relations with buy/sell items

#### 4. BuyItem Model

Stores details of items purchased in buying transactions.

```prisma
model BuyItem {
  id                   String        @id @default(cuid())
  transactionId        String
  hnyColor             Float         // Honey color weight (kg)
  hnyRate              Float?        // Honey color rate (₹/kg)
  blackColor           Float         // Black color weight (kg)
  blackRate            Float?        // Black color rate (₹/kg)
  transportationCharges Float        @default(0)
  createdAt            DateTime      @default(now())
  
  // Relations
  transaction          Transaction   @relation(fields: [transactionId], references: [id], onDelete: Cascade)
}
```

**Key Features:**
- Tracks honey and black color weights
- Optional rate fields for existing data
- Cascade delete with parent transaction

#### 5. SellItem Model

Stores details of items sold in selling transactions.

```prisma
model SellItem {
  id                   String        @id @default(cuid())
  transactionId        String
  itemName             String        // e.g., "Shoes HNY", "Sheet Black"
  count                Float         // Number of items
  weightPerItem        Float         // Weight per item in kg
  ratePerItem          Float         // Rate per item (₹/item)
  totalWeight          Float         // count × weightPerItem
  totalAmount          Float         // count × ratePerItem
  transportationCharges Float        @default(0)
  paymentDueDays       Int?          // Payment due in days
  paymentReceived      Float         @default(0)
  balanceLeft          Float         @default(0)
  createdAt            DateTime      @default(now())
  
  // Relations
  transaction          Transaction   @relation(fields: [transactionId], references: [id], onDelete: Cascade)
}
```

**Key Features:**
- Flexible item naming
- Payment tracking (received, balance, due days)
- Automatic calculations for total weight and amount
- Cascade delete with parent transaction

#### 6. Report Model

Stores generated reports with JSON data snapshots.

```prisma
model Report {
  id             String        @id @default(cuid())
  name           String
  type           String        // 'daily', 'monthly', 'quarterly', 'yearly', 'custom'
  startDate      DateTime
  endDate        DateTime
  data           Json          // Store report data as JSON
  generatedBy    String
  createdAt      DateTime      @default(now())
}
```

**Key Features:**
- Flexible JSON storage for report data
- Date range tracking
- Report type categorization

#### 7. Notification Model

Stores admin notifications for transaction activities.

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  message   String
  type      String   // 'create', 'update', 'delete'
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**Key Features:**
- User-specific notifications
- Read/unread tracking
- Cascade delete with user

---

## 🔗 Database Relationships

### Entity Relationship Diagram

```
User (1) ──────< (N) Party
  │                    │
  │                    │
  └──< (N) Transaction (N) >──┘
           │
           ├──< (N) BuyItem
           └──< (N) SellItem

User (1) ──────< (N) Notification

User (1) ──────< (N) Report (implicit via generatedBy)
```

### Relationship Details

1. **User → Party**: One-to-Many
   - A user can create multiple parties
   - Each party is created by one user
   - Field: `Party.createdBy` → `User.id`

2. **User → Transaction**: One-to-Many
   - A user can create multiple transactions
   - Each transaction is created by one user
   - Field: `Transaction.createdBy` → `User.id`

3. **Party → Transaction**: One-to-Many
   - A party can have multiple transactions
   - Each transaction belongs to one party
   - Field: `Transaction.partyId` → `Party.id`

4. **Transaction → BuyItem**: One-to-Many
   - A buy transaction can have multiple buy items
   - Each buy item belongs to one transaction
   - Field: `BuyItem.transactionId` → `Transaction.id`
   - Cascade delete enabled

5. **Transaction → SellItem**: One-to-Many
   - A sell transaction can have multiple sell items
   - Each sell item belongs to one transaction
   - Field: `SellItem.transactionId` → `Transaction.id`
   - Cascade delete enabled

6. **User → Notification**: One-to-Many
   - A user can have multiple notifications
   - Each notification belongs to one user
   - Field: `Notification.userId` → `User.id`
   - Cascade delete enabled

---

## 🔄 Database Migrations

Prisma manages database schema changes through migrations.

### Generate Prisma Client

After any schema changes, regenerate the Prisma client:

```powershell
cd backend
npx prisma generate
```

This creates type-safe database client code in `node_modules/@prisma/client`.

### Create Migration

When you modify `schema.prisma`, create a migration:

```powershell
npx prisma migrate dev --name describe_your_changes
```

This will:
1. Generate SQL migration files in `prisma/migrations/`
2. Apply the migration to your database
3. Regenerate Prisma Client

### Apply Migrations (Production)

For production databases, use:

```powershell
npx prisma migrate deploy
```

This applies pending migrations without prompting.

### View Migration Status

Check which migrations have been applied:

```powershell
npx prisma migrate status
```

### Reset Database (Development Only)

⚠️ **Warning**: This deletes all data!

```powershell
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed script (if configured)

---

## 🌱 Database Seeding

The `backend/scripts/seed.js` file populates the database with sample data.

### Seed Script Configuration

In `package.json`:

```json
{
  "prisma": {
    "seed": "node scripts/seed.js"
  }
}
```

### Run Seed

```powershell
npm run seed
```

### Seed Data Created

- **2 Users**: Admin and regular user
- **5 Parties**: Sample customers and vendors
- **11 Transactions**: Mix of buy (6) and sell (5) transactions
- **Buy Items**: Associated with buy transactions
- **Sell Items**: Associated with sell transactions

---

## 🔍 Database Inspection

### Prisma Studio

Visual database browser for viewing and editing data:

```powershell
npx prisma studio
```

Opens at `http://localhost:5555` with a GUI to:
- Browse all tables
- View relationships
- Add/edit/delete records
- Filter and search data

### Direct SQL Queries

Using Prisma's raw query capabilities:

```javascript
const result = await prisma.$queryRaw`SELECT * FROM "User" WHERE email = ${email}`;
```

---

## 📈 Database Indexing

Indexes are defined in the schema for performance optimization:

```prisma
model User {
  // ...
  @@index([email])
}

model Party {
  // ...
  @@index([phone])
  @@index([name])
  @@index([createdBy])
}

model Transaction {
  // ...
  @@index([type])
  @@index([date])
  @@index([partyId])
  @@index([createdBy])
  @@index([createdAt])
}
```

**Indexed Fields:**
- User: email
- Party: phone, name, createdBy
- Transaction: type, date, partyId, createdBy, createdAt
- Notification: userId + isRead (composite), createdAt

---

## 🔐 Database Security

### Connection Security

- **SSL/TLS**: Neon requires `sslmode=require` in connection string
- **Environment Variables**: Database credentials stored in `.env` (never committed)
- **Connection Pooling**: Prisma manages connection pool automatically

### Access Control

- **User Roles**: Admin and user roles defined in User model
- **Row-Level Security**: Implemented in application layer via Prisma queries
- **Audit Trail**: All records track `createdBy` and timestamps

### Password Security

- Passwords hashed using bcrypt before storage
- JWT tokens for stateless authentication
- Session management via express-session

---

## 🛠️ Database Maintenance

### Backup (Neon)

Neon provides automatic backups. Manual backup:

```powershell
pg_dump $DATABASE_URL > backup.sql
```

### Restore

```powershell
psql $DATABASE_URL < backup.sql
```

### Monitor Connection

Health check endpoint verifies database connectivity:

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

---

## 📝 Environment Configuration

Required environment variables in `backend/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/ledger"

# For Neon (production)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# For Docker (local)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ledger"
```

---

## 🔄 How Database Components Connect

1. **Prisma Schema** (`schema.prisma`) defines the data model
2. **Prisma Client** is generated from the schema
3. **Migrations** sync schema changes to PostgreSQL
4. **Backend API** uses Prisma Client to query database
5. **PostgreSQL** stores the actual data
6. **Prisma Studio** provides visual interface for inspection

**Connection Flow:**
```
schema.prisma → prisma generate → Prisma Client → PostgreSQL
                                        ↓
                                  Backend API
```

---

## ✅ Quick Start Checklist

- [ ] Choose database option (Docker, Neon, or Local)
- [ ] Configure `DATABASE_URL` in `backend/.env`
- [ ] Run `npx prisma generate` to create Prisma Client
- [ ] Run `npx prisma migrate dev` to create tables
- [ ] Run `npm run seed` to populate sample data
- [ ] Test with `curl http://localhost:4000/api/health`
- [ ] Open Prisma Studio with `npx prisma studio` to inspect data

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs)
- [Database Schema File](file:///c:/Users/fenil/OneDrive/Desktop/Side/backend/prisma/schema.prisma)
