const express = require("express");
const router = express.Router();

const {
  healthChatbot,
  chatbot,
  getTopBorrowedBooks,
  getTopViewedBooks,
  getTopRatedBooks,
  getLowestRatedBooks,
  getNewestBooks,
} = require("./chatbot.controller");

router.get("/healthChatbot", healthChatbot);
router.post("/chatbot", chatbot);
router.get("/getTopBorrowedBooks", getTopBorrowedBooks);
router.get("/getTopViewedBooks", getTopViewedBooks);
router.get("/getTopRatedBooks", getTopRatedBooks);
router.get("/getLowestRatedBooks", getLowestRatedBooks);
router.get("/getNewestBooks", getNewestBooks);

module.exports = router;
