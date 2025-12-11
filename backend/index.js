const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const passport = require('./config/passport');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

const prisma = new PrismaClient();
const app = express();

// Configure Cloudinary (add these to .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Helper: Upload image to Cloudinary
async function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

// Helper: Map transaction for frontend
function mapTransaction(tx) {
  return {
    id: tx.id,
    transaction_type: tx.type === 'buy' ? 'buying' : 'selling',
    type: tx.type,
    date: tx.date,
    party_id: tx.partyId,
    party_name: tx.party?.name || 'Unknown',
    phone: tx.phone,
    total_weight: tx.totalWeight,
    total_payment: tx.totalPayment,
    notes: tx.notes,
    invoice_image: tx.invoiceImage,
    receipt_image: tx.receiptImage,
    created_by: tx.creator?.email || tx.creator?.name || 'Unknown',
    created_date: tx.createdAt,
    // For buying transactions, include rate and weight info from first buy item
    hny_rate: tx.buyItems?.[0]?.hnyRate || 0,
    hny_weight: tx.buyItems?.[0]?.hnyColor || 0,
    black_rate: tx.buyItems?.[0]?.blackRate || 0,
    black_weight: tx.buyItems?.[0]?.blackColor || 0,
    buy_items: tx.buyItems?.map(item => ({
      id: item.id,
      hny_color: item.hnyColor,
      hny_rate: item.hnyRate,
      black_color: item.blackColor,
      black_rate: item.blackRate,
    })) || [],
    sell_items: tx.sellItems?.map(item => ({
      id: item.id,
      item_name: item.itemName,
      count: item.count,
      weight_per_item: item.weightPerItem,
      rate_per_item: item.ratePerItem,
      total_weight: item.totalWeight,
      total_amount: item.totalAmount,
      payment_due_days: item.paymentDueDays,
      payment_received: item.paymentReceived,
      balance_left: item.balanceLeft,
    })) || [],
  };
}

// Notification helper - Store notifications in database for admin
async function notifyAdmin(action, details, userId) {
  try {
    // Find all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true, name: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    const message = `${user?.name || user?.email || 'Unknown'} ${action} ${details}`;
    
    // Store notification for each admin
    await Promise.all(admins.map(admin => 
      prisma.notification.create({
        data: {
          userId: admin.id,
          message,
          type: action.includes('created') ? 'create' : action.includes('updated') ? 'update' : 'delete',
          isRead: false,
        }
      }).catch(() => {}) // Ignore errors if notification table doesn't exist yet
    ));

    console.log(`[ADMIN NOTIFICATION] ${message}`);
  } catch (error) {
    console.error('Notification error:', error.message);
  }
}

// ============ HEALTH CHECK ============
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ============ AUTHENTICATION ROUTES ============
// Google OAuth login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL + '/login' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, profileImage: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// ============ NOTIFICATION ROUTES ============
// Get notifications for current user (admin only)
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.json([]); // Non-admins get empty notifications
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notifications
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { 
        id: req.params.id,
        userId: req.user.id, // Ensure user can only mark their own notifications
      },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.json({ count: 0 });
    }

    const count = await prisma.notification.count({
      where: { 
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ USER ROUTES ============
app.post('/api/users/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    let profileImage = null;
    
    if (req.file) {
      profileImage = await uploadToCloudinary(req.file, 'users');
    }
    
    const user = await prisma.user.create({
      data: { email, name, password, role: role || 'user', profileImage },
      select: { id: true, email: true, name: true, role: true, profileImage: true, createdAt: true },
    });
    
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, profileImage: true, isActive: true, createdAt: true },
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PARTY ROUTES ============
app.get('/api/parties', authenticateToken, async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { email: true, name: true } } },
    });
    
    res.json(parties.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      address: p.address,
      notes: p.notes,
      image: p.image,
      is_active: p.isActive,
      created_at: p.createdAt,
      created_by: p.creator?.email || 'system',
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parties', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, phone, email, address, notes, createdBy } = req.body;
    let image = null;
    
    if (req.file) {
      image = await uploadToCloudinary(req.file, 'parties');
    }
    
    // Default user if not provided
    const userId = createdBy || (await prisma.user.findFirst())?.id;
    if (!userId) return res.status(400).json({ error: 'No user found. Create a user first.' });
    
    const party = await prisma.party.create({
      data: { name, phone, email, address, notes, image, createdBy: userId },
    });
    
    res.json(party);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/parties/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, phone, email, address, notes, isActive } = req.body;
    const data = { name, phone, email, address, notes };
    
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (req.file) {
      data.image = await uploadToCloudinary(req.file, 'parties');
    }
    
    const party = await prisma.party.update({
      where: { id: req.params.id },
      data,
    });
    
    res.json(party);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/parties/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.party.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ TRANSACTION ROUTES ============
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate, partyId } = req.query;
    const where = {};
    
    if (type && type !== 'all') where.type = type;
    if (partyId && partyId !== 'all') where.partyId = partyId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        party: true,
        buyItems: true,
        sellItems: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(transactions.map(mapTransaction));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { 
        party: true, 
        buyItems: true, 
        sellItems: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
      },
    });
    
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(mapTransaction(transaction));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', authenticateToken, upload.fields([
  { name: 'invoiceImage', maxCount: 1 },
  { name: 'receiptImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = req.body;
    
    // Map type
    let type = data.type || data.transaction_type;
    if (type === 'buying') type = 'buy';
    if (type === 'selling') type = 'sell';
    
    // Find or create party
    let partyId = data.party_id;
    if (!partyId && (data.party_name || data.phone)) {
      const existingParty = await prisma.party.findFirst({
        where: {
          OR: [
            { name: data.party_name },
            { phone: data.phone }
          ]
        }
      });
      
      if (existingParty) {
        partyId = existingParty.id;
      } else {
        const newParty = await prisma.party.create({
          data: {
            name: data.party_name || 'Unknown',
            phone: data.phone || '',
            email: data.email,
            address: data.address,
            notes: data.notes,
            createdBy: req.user.id, // Use authenticated user
          }
        });
        partyId = newParty.id;
      }
    }
    
    // Upload images
    let invoiceImage = null, receiptImage = null;
    if (req.files?.invoiceImage) {
      invoiceImage = await uploadToCloudinary(req.files.invoiceImage[0], 'invoices');
    }
    if (req.files?.receiptImage) {
      receiptImage = await uploadToCloudinary(req.files.receiptImage[0], 'receipts');
    }
    
    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        type,
        date: new Date(data.date),
        partyId,
        phone: data.phone,
        totalWeight: parseFloat(data.total_weight),
        totalPayment: parseFloat(data.total_payment),
        notes: data.notes,
        invoiceImage,
        receiptImage,
        createdBy: req.user.id, // Use authenticated user
        buyItems: type === 'buy' ? {
          create: [{
            hnyColor: parseFloat(data.hny_weight || 0),
            hnyRate: parseFloat(data.hny_rate || 0),
            blackColor: parseFloat(data.black_weight || 0),
            blackRate: parseFloat(data.black_rate || 0),
          }]
        } : undefined,
        sellItems: type === 'sell' ? {
          create: [{
            itemName: data.item_name,
            count: parseFloat(data.count || 0),
            weightPerItem: parseFloat(data.weight_per_item || 0),
            ratePerItem: parseFloat(data.rate_per_item || 0),
            totalWeight: parseFloat(data.total_weight || 0),
            totalAmount: parseFloat(data.total_payment || 0),
            paymentDueDays: data.payment_due_days ? parseInt(data.payment_due_days) : null,
            paymentReceived: parseFloat(data.payment_received || 0),
            balanceLeft: parseFloat(data.total_payment || 0) - parseFloat(data.payment_received || 0),
          }]
        } : undefined,
      },
      include: { 
        party: true, 
        buyItems: true, 
        sellItems: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
      },
    });
    
    // Notify admins about new transaction
    await notifyAdmin(
      'created',
      `a ${type} transaction for ${transaction.party?.name || 'Unknown'} (₹${transaction.totalPayment})`,
      req.user.id
    );
    
    res.json(mapTransaction(transaction));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', authenticateToken, upload.fields([
  { name: 'invoiceImage', maxCount: 1 },
  { name: 'receiptImage', maxCount: 1 }
]), async (req, res) => {
  try {
    // Check ownership - only creator or admin can update
    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      select: { createdBy: true, party: { select: { name: true } }, totalPayment: true, type: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (existing.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own transactions' });
    }

    const data = req.body;
    const updateData = {
      date: data.date ? new Date(data.date) : undefined,
      phone: data.phone,
      totalWeight: data.total_weight ? parseFloat(data.total_weight) : undefined,
      totalPayment: data.total_payment ? parseFloat(data.total_payment) : undefined,
      notes: data.notes,
    };
    
    // Upload new images if provided
    if (req.files?.invoiceImage) {
      updateData.invoiceImage = await uploadToCloudinary(req.files.invoiceImage[0], 'invoices');
    }
    if (req.files?.receiptImage) {
      updateData.receiptImage = await uploadToCloudinary(req.files.receiptImage[0], 'receipts');
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: { 
        party: true, 
        buyItems: true, 
        sellItems: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
      },
    });
    
    // Notify admins about transaction update (only if not updated by admin)
    if (req.user.role !== 'admin') {
      await notifyAdmin(
        'updated',
        `a transaction for ${transaction.party?.name || 'Unknown'} (₹${transaction.totalPayment})`,
        req.user.id
      );
    }
    
    res.json(mapTransaction(transaction));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    // Check ownership - only creator or admin can delete
    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      select: { createdBy: true, party: { select: { name: true } }, totalPayment: true, type: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (existing.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own transactions' });
    }

    await prisma.transaction.delete({ where: { id: req.params.id } });
    
    // Notify admins about transaction deletion (only if not deleted by admin)
    if (req.user.role !== 'admin') {
      await notifyAdmin(
        'deleted',
        `a ${existing.type} transaction for ${existing.party?.name || 'Unknown'} (₹${existing.totalPayment})`,
        req.user.id
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ REPORTS ============
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const where = {};
    
    if (type && type !== 'all') where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    const buyStats = await prisma.transaction.aggregate({
      where: { ...where, type: 'buy' },
      _count: { id: true },
      _sum: { totalWeight: true, totalPayment: true },
    });
    
    const sellStats = await prisma.transaction.aggregate({
      where: { ...where, type: 'sell' },
      _count: { id: true },
      _sum: { totalWeight: true, totalPayment: true },
    });
    
    res.json({
      buying: {
        count: buyStats._count.id,
        sum_weight: buyStats._sum.totalWeight || 0,
        sum_payment: buyStats._sum.totalPayment || 0,
      },
      selling: {
        count: sellStats._count.id,
        sum_weight: sellStats._sum.totalWeight || 0,
        sum_payment: sellStats._sum.totalPayment || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/generate', authenticateToken, async (req, res) => {
  try {
    const { name, type, startDate, endDate, generatedBy } = req.body;
    
    const where = {};
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: { party: true, buyItems: true, sellItems: true },
    });
    
    const report = await prisma.report.create({
      data: {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        data: transactions,
        generatedBy,
      }
    });
    
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ EXPORT CSV ============
app.get('/api/export', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { party: true },
      orderBy: { date: 'desc' },
    });
    
    let csv = 'Date,Type,Party,Phone,Weight,Payment\n';
    transactions.forEach(t => {
      csv += `${t.date.toISOString().split('T')[0]},${t.type},${t.party?.name || 'Unknown'},${t.phone},${t.totalWeight},${t.totalPayment}\n`;
    });
    
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Ledger API with Prisma listening on http://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});
