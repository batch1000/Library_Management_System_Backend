const chatbotService = require("./chatbot.service");

async function healthChatbot(req, res) {
  try {
    const data = await chatbotService.checkChatbotHealth();

    res.json({
      status: "ok",
      data: data,
    });
  } catch (error) {
    console.error("❌ Lỗi khi kiểm tra health chatbot:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể kết nối tới Chatbot server",
      error: error.message,
    });
  }
}

async function chatbot(req, res) {
  try {
    const { message } = req.body;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng nhập câu hỏi",
      });
    }

    // Gọi service
    const response = await chatbotService.chatbot(message);

    // Trả về đúng format cũ
    res.json({
      status: "ok",
      response: response.data.response,
      data: response.data,
    });
  } catch (error) {
    console.error("❌ Lỗi khi gọi chatbot:", error.message);

    // Giữ nguyên toàn bộ logic trả lỗi như code gốc
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        status: "error",
        message: "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        status: "error",
        message:
          error.response.data.response ||
          error.response.data.message ||
          "Đã có lỗi xảy ra",
        data: error.response.data,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Không thể kết nối tới Chatbot server",
      error: error.message,
    });
  }
}

async function timSachLevel1(req, res) {
  try {
    const classification = req.body;
    console.log("*********Schema**********");
    console.log(JSON.stringify(classification, null, 2));

    // Validate input
    if (!classification || !classification.intent) {
      return res.status(400).json({
        status: "error",
        message: "Invalid classification data",
      });
    }

    // Gọi service xử lý
    const results = await chatbotService.timSachLevel1(classification);
    console.log(JSON.stringify(results, null, 2));
    // Trả về kết quả
    res.json(results);
  } catch (error) {
    console.error("❌ Lỗi tim_sach_level_1:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể tìm kiếm sách",
      error: error.message,
    });
  }
}

async function timSachLevel2(req, res) {
  try {
    const classification = req.body;
    console.log("********* Schema Level 2 **********");
    console.log(JSON.stringify(classification, null, 2));

    // Validate input
    if (!classification || !classification.intent) {
      return res.status(400).json({
        status: "error",
        message: "Invalid classification data",
      });
    }

    if (classification.intent !== "tim_sach_level_2") {
      return res.status(400).json({
        status: "error",
        message: "Intent must be tim_sach_level_2",
      });
    }

    // Validate query structure
    if (!classification.query || !classification.query.operator) {
      return res.status(400).json({
        status: "error",
        message: "Missing query or operator in classification",
      });
    }

    // Validate conditions
    if (!classification.query.conditions || !Array.isArray(classification.query.conditions)) {
      return res.status(400).json({
        status: "error",
        message: "Missing or invalid conditions array",
      });
    }

    // Gọi service xử lý
    const results = await chatbotService.timSachLevel2(classification);
    
    console.log(`✅ Found ${results.length} books (level 2)`);
    console.log(JSON.stringify(results, null, 2));

    // Trả về kết quả
    res.json(results);
  } catch (error) {
    console.error("❌ Lỗi tim_sach_level_2:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể tìm kiếm sách (level 2)",
      error: error.message,
    });
  }
}

module.exports = {
  healthChatbot,
  chatbot,
  timSachLevel1,
  timSachLevel2
};
