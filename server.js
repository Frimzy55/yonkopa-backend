import express from 'express';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';   // ✅ ADD THIS
import kycRoutes from "./routes/kycRoutes.js";
//import loanRoutes from "./routes/loanRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// ✅ Load environment variables
dotenv.config();



// ✅ Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Use env port
const PORT = process.env.PORT || 5000;

// ✅ Use JWT secret from env
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());



// ✅ MySQL Connection using env variables
/*const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  
  
});*/



// ✅ Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

//const db = mysql.createConnection(process.env.MYSQL_URL);

/*db.connect(err => {
  if (err) console.error('❌ Database connection failed :', err);
  else console.log('✅ Connected to MySQL database');
});*/


db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
    connection.release();
  }
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




app.use("/uploads", express.static("uploads"));

app.use("/api/kyc", kycRoutes);

//app.use("/api/loan", loanRoutes);






/*app.post("/api/verify-customer", async (req, res) => {
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
});*/





app.post("/api/verify-customer", (req, res) => {
  const { phone, kycCode } = req.body;

  const query = `
    SELECT 
      id,
      kyc_code,
      firstName,
      lastName,
      email,
      mobileNumber,
      dateOfBirth
    FROM customers_kyc
    WHERE mobileNumber = ? AND kyc_code = ?
  `;

  db.query(query, [phone, kycCode], (err, results) => {
    if (err) {
      console.error("Verify customer error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.json({ verified: false });
    }

    res.json({
      verified: true,
      customer: results[0]
    });
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
      kycCode,
      fullName,
      loanType,
      loanAmount,
      createdAt,
      phone,
      
      'pending' AS status
    FROM loans
    ORDER BY createdAt DESC
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

//app.use("/api/kyc", kycRoutes);

//app.use("/api/loan", loanRoutes);






app.post("/api/loan/apply-loan", (req, res) => {
  const formData = { ...req.body };

  // List of allowed columns in loans table
  const allowedFields = [
    "kycCode","fullName","phone","email","dob","gender","nationalId","maritalStatus","dependents",
    "residentialAddress","residentialGPS","loanType","employerName","jobTitle",
    "monthlySalary","businessName","businessType","businessRegNo","businessAddress",
    "businessRevenue","yearsInBusiness","loanAmount","loanPurpose","loanTerm",
    "repaymentFrequency","guarantorName","guarantorPhone","guarantorAddress",
    "guarantorRelationship","guarantorNationality","guarantorGender","guarantorDOB"
  ];

  // Remove unknown fields
  for (const key in formData) {
    if (!allowedFields.includes(key)) delete formData[key];
  }

  // Convert empty strings to null
  for (const key in formData) {
    if (formData[key] === "") formData[key] = null;
  }

  // Insert into MySQL
  const query = "INSERT INTO loans SET ?";
  db.query(query, formData, (err, result) => {
    if (err) {
      console.error("MySQL Insert Error:", err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    res.json({ success: true, id: result.insertId });
  });
});




















// API endpoint to save applicant profile
app.post('/api/applications/save-profile', (req, res) => {
  const { loanId, customerId, applicantName, contactNumber, creditOfficer, loanType, loanAmount, applicationDate } = req.body;

  const sql = `
    INSERT INTO applicant_profiles 
    (loanId, customerId, applicantName, contactNumber, creditOfficer, loanType, loanAmount, applicationDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      applicantName = VALUES(applicantName),
      contactNumber = VALUES(contactNumber),
      creditOfficer = VALUES(creditOfficer),
      loanType = VALUES(loanType),
      loanAmount = VALUES(loanAmount),
      applicationDate = VALUES(applicationDate)
  `;

  db.query(
    sql,
    [loanId, customerId, applicantName, contactNumber, creditOfficer, loanType, loanAmount, applicationDate],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Profile saved successfully', result });
    }
  );
});

//app.listen(5000, () => console.log('Server running on port 5000'));







// Simple route to save collateral (no MVC)
app.post('/api/collateral/save', (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO collateral_details
    (loanId, lendingType, collateralType,
     landLocation, landSize, landValue,
     vehicleMake, vehicleModel, vehicleValue,
     buildingType, buildingSize, buildingValue,
     bankName, accountNumber, depositAmount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      lendingType=VALUES(lendingType),
      collateralType=VALUES(collateralType),
      landLocation=VALUES(landLocation),
      landSize=VALUES(landSize),
      landValue=VALUES(landValue),
      vehicleMake=VALUES(vehicleMake),
      vehicleModel=VALUES(vehicleModel),
      vehicleValue=VALUES(vehicleValue),
      buildingType=VALUES(buildingType),
      buildingSize=VALUES(buildingSize),
      buildingValue=VALUES(buildingValue),
      bankName=VALUES(bankName),
      accountNumber=VALUES(accountNumber),
      depositAmount=VALUES(depositAmount)
  `;

  db.query(sql, [
    data.loanId, data.lendingType, data.collateralType,
    data.landLocation || null, data.landSize || null, data.landValue || null,
    data.vehicleMake || null, data.vehicleModel || null, data.vehicleValue || null,
    data.buildingType || null, data.buildingSize || null, data.buildingValue || null,
    data.bankName || null, data.accountNumber || null, data.depositAmount || null
  ], (err, result) => {
    if (err) {
      console.error('Error saving collateral:', err);
      return res.status(500).json({ message: 'Failed to save collateral', error: err });
    }
    res.json({ message: 'Collateral saved successfully', result });
  });
});









// ✅ Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ KYC submission endpoint
app.post(
  "/kyc/submit",
  upload.fields([
    { name: "idDocument", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "incomeProof", maxCount: 1 }
  ]),
  (req, res) => {
    const data = req.body;
    const files = req.files;

    const sql = `
      INSERT INTO customers_kyc (
        firstName, middleName, lastName, dateOfBirth, gender, nationality,
        maritalStatus, nationalId, passportNumber, taxId, mobileNumber,
        email, residentialAddress, city, state, zipCode, postalAddress,
        employmentStatus, employerName, jobTitle, monthlyIncome,
        businessType, yearsInCurrentEmployment, bankName, bankAccountNumber,
        accountType, branch, loanPurpose, existingLoans,
        idDocument, addressProof, incomeProof
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
      data.firstName, data.middleName, data.lastName, data.dateOfBirth, data.gender,
      data.nationality, data.maritalStatus, data.nationalId, data.passportNumber, data.taxId,
      data.mobileNumber, data.email, data.residentialAddress, data.city, data.state,
      data.zipCode, data.postalAddress, data.employmentStatus, data.employerName,
      data.jobTitle, data.monthlyIncome, data.businessType, data.yearsInCurrentEmployment,
      data.bankName, data.bankAccountNumber, data.accountType, data.branch,
      data.loanPurpose, data.existingLoans,
      files?.idDocument?.[0]?.filename || null,
      files?.addressProof?.[0]?.filename || null,
      files?.incomeProof?.[0]?.filename || null
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      // Generate KYC code
      const kycCode = String(result.insertId).padStart(5, "0");

      // Update KYC code
      const updateSql = `UPDATE customers_kyc SET kyc_code = ? WHERE id = ?`;
      db.query(updateSql, [kycCode, result.insertId], (err2) => {
        if (err2) {
          console.error("Error updating KYC code:", err2);
          return res.status(500).json({ message: "Failed to update KYC code" });
        }

        return res.json({
          message: "KYC submitted successfully!",
          id: result.insertId,
          kycCode
        });
      });
    });
  }
);







app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
