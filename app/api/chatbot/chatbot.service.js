const axios = require("axios");
const mongoose = require("mongoose");

const Sach = require("../../models/sachModel");
const TheoDoiMuonSach = require("../../models/theodoimuonsachModel");

async function checkChatbotHealth() {
  const colabUrl = "https://kerchieft-crescentic-lavon.ngrok-free.dev/health";
  const response = await axios.get(colabUrl);
  return response.data;
}

async function chatbot(message) {
  const colabUrl = "https://kerchieft-crescentic-lavon.ngrok-free.dev/chatbot";

  const response = await axios.post(
    colabUrl,
    { message: message.trim() },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    }
  );

  return response;
}

//Hybrid
async function getTopBorrowedBooks(limit = 10) {
  try {
    console.log(`📊 Lấy top ${limit} sách nhiều lượt mượn...`);

    const results = await TheoDoiMuonSach.aggregate([
      // Bước 1: Lọc chỉ lấy sách đã duyệt hoặc đã trả
      {
        $match: {
          TrangThai: { $in: ["approved", "returned", "overdue"] },
        },
      },

      // Bước 2: Nhóm theo MaSach và tính tổng
      {
        $group: {
          _id: "$MaSach",
          totalBorrows: { $sum: "$SoLuong" },
          totalTransactions: { $sum: 1 },
        },
      },

      // Bước 3: Join với bảng Sach
      {
        $lookup: {
          from: "saches", // ⚠️ TÊN COLLECTION TRONG MONGODB
          localField: "_id",
          foreignField: "_id",
          as: "bookInfo",
        },
      },

      // Bước 4: Flatten array
      { $unwind: "$bookInfo" },

      // Bước 5: Chọn fields cần thiết
      {
        $project: {
          _id: 1,
          MaSach: "$bookInfo.MaSach",
          TenSach: "$bookInfo.TenSach",
          TacGia: "$bookInfo.TacGia",
          Image: "$bookInfo.Image",
          NamXuatBan: "$bookInfo.NamXuatBan",
          totalBorrows: 1,
          totalTransactions: 1,
        },
      },

      // Bước 6: Sắp xếp giảm dần
      { $sort: { totalBorrows: -1 } },

      // Bước 7: Giới hạn số lượng
      { $limit: limit },
    ]);

    console.log(`✅ Tìm thấy ${results.length} sách`);
    return results;
  } catch (error) {
    console.error("❌ Error in getTopBorrowedBooks:", error);
    throw error;
  }
}

async function getTopViewedBooks(limit = 10) {
  try {
    console.log(`📊 Lấy top ${limit} sách nhiều lượt xem...`);

    const results = await TheoDoiXemSach.aggregate([
      {
        $group: {
          _id: "$MaSach",
          totalViews: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "saches",
          localField: "_id",
          foreignField: "_id",
          as: "bookInfo",
        },
      },
      { $unwind: "$bookInfo" },
      {
        $project: {
          _id: 1,
          MaSach: "$bookInfo.MaSach",
          TenSach: "$bookInfo.TenSach",
          TacGia: "$bookInfo.TacGia",
          Image: "$bookInfo.Image",
          NamXuatBan: "$bookInfo.NamXuatBan",
          totalViews: 1,
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: limit },
    ]);

    console.log(`✅ Tìm thấy ${results.length} sách`);
    return results;
  } catch (error) {
    console.error("❌ Error in getTopViewedBooks:", error);
    throw error;
  }
}

// TOP SÁCH RATING CAO NHẤT
async function getTopRatedBooks(limit = 10) {
  try {
    console.log(`📊 Lấy top ${limit} sách rating cao...`);

    const results = await DanhGiaSach.aggregate([
      {
        $group: {
          _id: "$MaSach",
          avgRating: { $avg: "$SoSao" },
          totalReviews: { $sum: 1 },
        },
      },
      // Lọc sách phải có ít nhất 3 đánh giá
      {
        $match: {
          totalReviews: { $gte: 3 },
        },
      },
      {
        $lookup: {
          from: "saches",
          localField: "_id",
          foreignField: "_id",
          as: "bookInfo",
        },
      },
      { $unwind: "$bookInfo" },
      {
        $project: {
          _id: 1,
          MaSach: "$bookInfo.MaSach",
          TenSach: "$bookInfo.TenSach",
          TacGia: "$bookInfo.TacGia",
          Image: "$bookInfo.Image",
          NamXuatBan: "$bookInfo.NamXuatBan",
          avgRating: { $round: ["$avgRating", 2] },
          totalReviews: 1,
        },
      },
      { $sort: { avgRating: -1 } },
      { $limit: limit },
    ]);

    console.log(`✅ Tìm thấy ${results.length} sách`);
    return results;
  } catch (error) {
    console.error("❌ Error in getTopRatedBooks:", error);
    throw error;
  }
}

// TOP SÁCH RATING THẤP NHẤT
async function getLowestRatedBooks(limit = 10) {
  try {
    console.log(`📊 Lấy top ${limit} sách rating thấp...`);

    const results = await DanhGiaSach.aggregate([
      {
        $group: {
          _id: "$MaSach",
          avgRating: { $avg: "$SoSao" },
          totalReviews: { $sum: 1 },
        },
      },
      {
        $match: {
          totalReviews: { $gte: 3 },
        },
      },
      {
        $lookup: {
          from: "saches",
          localField: "_id",
          foreignField: "_id",
          as: "bookInfo",
        },
      },
      { $unwind: "$bookInfo" },
      {
        $project: {
          _id: 1,
          MaSach: "$bookInfo.MaSach",
          TenSach: "$bookInfo.TenSach",
          TacGia: "$bookInfo.TacGia",
          Image: "$bookInfo.Image",
          NamXuatBan: "$bookInfo.NamXuatBan",
          avgRating: { $round: ["$avgRating", 2] },
          totalReviews: 1,
        },
      },
      { $sort: { avgRating: 1 } }, // ⚠️ Sắp xếp TĂNG DẦN
      { $limit: limit },
    ]);

    console.log(`✅ Tìm thấy ${results.length} sách`);
    return results;
  } catch (error) {
    console.error("❌ Error in getLowestRatedBooks:", error);
    throw error;
  }
}

// SÁCH MỚI NHẤT
async function getNewestBooks(limit = 10) {
  try {
    console.log(`📊 Lấy ${limit} sách mới nhất...`);

    const results = await Sach.find()
      .select("MaSach TenSach TacGia Image NamXuatBan createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    console.log(`✅ Tìm thấy ${results.length} sách`);
    return results;
  } catch (error) {
    console.error("❌ Error in getNewestBooks:", error);
    throw error;
  }
}

module.exports = {
  checkChatbotHealth,
  chatbot,
  getTopBorrowedBooks,
  getTopViewedBooks,
  getTopRatedBooks,
  getLowestRatedBooks,
  getNewestBooks,
};
