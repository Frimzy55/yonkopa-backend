// backend/routes/loanRoutes.js
import express from "express";
//import db from "../db.js";
import { db } from "../config/db.js";


const router = express.Router();

router.post("/apply-loan", (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO loanapplication (
      fullName, dob, gender, nationalId, phone, email, maritalStatus, dependents,
      residentialAddress, residentialGPS, loanType, employerName, jobTitle,
      monthlySalary, employmentType, lengthOfEmployment, businessName, businessType,
      businessRegNo, businessAddress, businessRevenue, yearsInBusiness, loanAmount,
      loanPurpose, loanTerm, repaymentFrequency, guarantorName, guarantorPhone,
      guarantorAddress, guarantorRelationship, guarantorNationality, guarantorGender,
      guarantorDOB
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.fullName, data.dob, data.gender, data.nationalId, data.phone, data.email,
    data.maritalStatus, data.dependents, data.residentialAddress, data.residentialGPS,
    data.loanType, data.employerName, data.jobTitle, data.monthlySalary,
    data.employmentType, data.lengthOfEmployment, data.businessName, data.businessType,
    data.businessRegNo, data.businessAddress, data.businessRevenue, data.yearsInBusiness,
    data.loanAmount, data.loanPurpose, data.loanTerm, data.repaymentFrequency,
    data.guarantorName, data.guarantorPhone, data.guarantorAddress,
    data.guarantorRelationship, data.guarantorNationality, data.guarantorGender,
    data.guarantorDOB
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log("Insert Error: ", err);
      res.status(500).json({ success: false, message: "Database error" });
    } else {
      res.json({ success: true, message: "Loan application submitted!" });
    }
  });
});

export default router;
