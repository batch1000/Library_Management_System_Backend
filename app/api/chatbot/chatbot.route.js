const express = require("express");
const router = express.Router();

const {
  healthChatbot,
  chatbot,
  timSachLevel1,
  timSachLevel2
} = require("./chatbot.controller");

router.get("/healthChatbot", healthChatbot);
router.post("/chatbot", chatbot);
router.post("/tim_sach_level_1", timSachLevel1);
router.post("/tim_sach_level_2", timSachLevel2);

module.exports = router;
