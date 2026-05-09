const express = require("express");
const router = express.Router();
const multer = require("multer");
const { analyzeDocument } = require("../controllers/documentController");
const { verifyToken } = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

router.post("/analyze", verifyToken, upload.single("file"), analyzeDocument);

module.exports = router;