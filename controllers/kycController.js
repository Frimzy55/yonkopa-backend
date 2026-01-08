// controllers/kycController.js
/*import { db } from "../config/db.js";

export const submitKyc = (req, res) => {
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

  db.query(sql, values, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.json({ message: "KYC submitted successfully!" });
  });
};





// controllers/kycController.js
import { db } from "../config/db.js";

export const submitKyc = (req, res) => {
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

    // Generate proper KYC code
    const kycCode = String(result.insertId).padStart(5, "0");

    return res.json({
      message: "KYC submitted successfully!",
      id: result.insertId,
      kycCode
    });
  });
}; */






// controllers/kycController.js
import { db } from "../config/db.js";

export const submitKyc = (req, res) => {
  const data = req.body;
  const files = req.files;

  // Step 1: Insert new KYC record
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

    // Step 2: Generate KYC code (00001, 00002, ...)
    const kycCode = String(result.insertId).padStart(5, "0");

    // Step 3: Update the record with the KYC code
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
};

