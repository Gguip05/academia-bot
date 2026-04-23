const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ mensagem: "contatos ok" });
});

module.exports = router;