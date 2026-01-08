// routes/kycRoutes.js
import express from "express";
import { upload } from "../middleware/upload.js";
import { submitKyc } from "../controllers/kycController.js";

const router = express.Router();

router.post(
  "/submit",
  upload.fields([
    { name: "idDocument", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "incomeProof", maxCount: 1 }
  ]),
  submitKyc
);

export default router;
