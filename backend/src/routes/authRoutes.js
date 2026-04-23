const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ mensagem: "auth ok" });
});

module.exports = router;