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

// Top sách nhiều lượt mượn
async function getTopBorrowedBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Controller: Lấy top ${limit} sách nhiều lượt mượn...`);

    const data = await chatbotService.getTopBorrowedBooks(limit);

    res.json(data); // Trả về mảng trực tiếp (không wrap trong object)
  } catch (error) {
    console.error("❌ Lỗi getTopBorrowedBooks:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sách nhiều lượt mượn",
      error: error.message,
    });
  }
}

// Top sách nhiều lượt xem
async function getTopViewedBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Controller: Lấy top ${limit} sách nhiều lượt xem...`);

    const data = await chatbotService.getTopViewedBooks(limit);

    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi getTopViewedBooks:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sách nhiều lượt xem",
      error: error.message,
    });
  }
}

// Top sách rating cao
async function getTopRatedBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Controller: Lấy top ${limit} sách rating cao...`);

    const data = await chatbotService.getTopRatedBooks(limit);

    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi getTopRatedBooks:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sách rating cao",
      error: error.message,
    });
  }
}

// Top sách rating thấp
async function getLowestRatedBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Controller: Lấy top ${limit} sách rating thấp...`);

    const data = await chatbotService.getLowestRatedBooks(limit);

    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi getLowestRatedBooks:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sách rating thấp",
      error: error.message,
    });
  }
}

// Sách mới nhất
async function getNewestBooks(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`📊 Controller: Lấy ${limit} sách mới nhất...`);

    const data = await chatbotService.getNewestBooks(limit);
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi getNewestBooks:", error.message);

    res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sách mới nhất",
      error: error.message,
    });
  }
}

module.exports = {
  healthChatbot,
  chatbot,
  getTopBorrowedBooks,
  getTopViewedBooks,
  getTopRatedBooks,
  getLowestRatedBooks,
  getNewestBooks
};
