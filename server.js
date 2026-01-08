import express from 'express';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import kycRoutes from "./routes/kycRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";

const app = express();
const PORT = 5000;

// Secret key for JWT (store in .env in production)
const JWT_SECRET = 'your_jwt_secret_key_here';

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Bench123$qwert',
  database: 'yonkopa'
});

db.connect(err => {
  if (err) console.error('❌ Database connection failed:', err);
  else console.log('✅ Connected to MySQL database');
});

// --- SIGNUP customer ENDPOINT ---
app.post('/signup', async (req, res) => {
  const { fullName, email, phone, password, confirmPassword, role } = req.body;

  if (password !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'customer'; // defaults to 'customer'

    const sql =
      'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [fullName, email, phone, hashedPassword, userRole], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error creating account' });
      }
      res.status(201).json({ message: 'Account created successfully!', role: userRole });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// Signup admin endpoint
app.post('/signup1', async (req, res) => {
  const { full_name, email, phone, password, role } = req.body;

  if (!full_name || !email || !phone || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into MySQL
    const query = `INSERT INTO users (full_name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
    db.query(query, [full_name, email, phone, hashedPassword, role], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json({ message: 'User registered successfully!' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// --- LOGIN ENDPOINT ---
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // Create JWT token with role info
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  });
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user; // attaches user data (id, email, role)
    next();
  });
};

// --- ROLE AUTHORIZATION MIDDLEWARE ---
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized role' });
    }
    next();
  };
};

// --- PROTECTED ROUTES ---
app.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: `Welcome ${req.user.email}, your role is ${req.user.role}`,
    user: req.user
  });
});

// Only admin can access this route
app.get('/admin/dashboard', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin, this is your dashboard.' });
});

// Only loan officer or admin can access this route
app.get('/loan/management', authenticateToken, authorizeRoles('loan_officer', 'admin'), (req, res) => {
  res.json({ message: 'Loan management area accessed successfully.' });
});




//app.use("/uploads", express.static("uploads"));

//app.use("/api/kyc", kycRoutes);

//app.use("/api/loan", loanRoutes);






app.post("/api/verify-customer", async (req, res) => {
  const { phone, kycCode } = req.body;

  const query = "SELECT * FROM customers_kyc WHERE mobileNumber = ? AND kyc_code = ?";
  db.query(query, [phone, kycCode], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length > 0) {
      return res.json({ verified: true });
    } else {
      return res.json({ verified: false });
    }
  });
});












app.get("/users", (req, res) => {
  const sql = "SELECT id, full_name, email, phone, role, created_at FROM users";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// GET single user by ID (optional)
app.get("/users/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results[0]);
  });
});

// CREATE user
app.post("/users", async (req, res) => {
  const { full_name, email, phone, password, role } = req.body;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [full_name, email, phone, hashedPassword, role], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User created", id: results.insertId });
  });
});

// UPDATE user
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, password, role } = req.body;

  let sql, params;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql = "UPDATE users SET full_name=?, email=?, phone=?, password=?, role=? WHERE id=?";
    params = [full_name, email, phone, hashedPassword, role, id];
  } else {
    sql = "UPDATE users SET full_name=?, email=?, phone=?, role=? WHERE id=?";
    params = [full_name, email, phone, role, id];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User updated" });
  });
});

// DELETE user
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM users WHERE id=?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User deleted" });
  });
});







// GET all users with optional search
app.get("/userss", (req, res) => {
  const { search } = req.query;
  let sql = "SELECT id, full_name, email, phone, role, created_at FROM users";

  if (search) {
    sql += " WHERE full_name LIKE ? OR role LIKE ?";
    const searchTerm = `%${search}%`;
    db.query(sql, [searchTerm, searchTerm], (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
  } else {
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
  }
});






app.get("/api/customers/search", (req, res) => {
  const { q } = req.query;

  const sql = `
    SELECT * FROM users 
    WHERE role = 'customer'
    AND (
      full_name LIKE ? 
      OR phone LIKE ? 
      OR id LIKE ?
    )
  `;

  const param = `%${q}%`;

  db.query(sql, [param, param, param], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});





// GET pending loan applications (async/await)
// GET pending loan applications (CALLBACK STYLE – CORRECT)
app.get('/api/loan-applications/pending', (req, res) => {
  const sql = `
    SELECT 
      id,
      fullName,
      loanType,
      loanAmount,
      created_at,
      0 AS creditScore,
      'pending' AS status
    FROM loanapplication
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching applications:', err);
      return res.status(500).json({ message: 'Error fetching applications' });
    }

    res.json(rows);
  });
});


app.use("/uploads", express.static("uploads"));

app.use("/api/kyc", kycRoutes);

app.use("/api/loan", loanRoutes);


app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
