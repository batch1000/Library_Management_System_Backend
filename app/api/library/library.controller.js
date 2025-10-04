const libraryService = require("./library.service");
const {
  uploadToCloudinary,
  deleteImageFromCloudinary,
} = require("../../services/cloudinary.service");

async function getLibraryCard(req, res) {
  try {
    const { MaDocGia } = req.body;
    const cardInfo = await libraryService.getLibraryCard(MaDocGia);
    res.json(cardInfo);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin thẻ thư viện:", error);
    res.status(500).send("Lấy thông tin thẻ thư viện thất bại");
  }
}

async function getAllInfoExpireCard(req, res) {
  try {
    const info = await libraryService.getAllInfoExpireCard();
    // console.log(JSON.stringify(info, null, 2));
    res.json(info);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin gia hạn thẻ thư viện:", error);
    res.status(500).send("Lấy thông tin gia hạn thẻ thư viện thất bại");
  }
}

async function renewLibraryCard(req, res) {
  try {
    const { cardId } = req.body;
    const info = await libraryService.renewLibraryCard(cardId);
    res.json(info);
  } catch (error) {
    console.error("Lỗi khi gia hạn thẻ thư viện:", error);
    res.status(500).send("Gia hạn thẻ thư viện thất bại");
  }
}

async function updateAvatar(req, res) {
  try {
    const { _id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Chưa chọn file ảnh" });
    }

    // Upload ảnh mới
    const uploadResult = await uploadToCloudinary(file.buffer);
    if (!uploadResult) {
      return res.status(500).json({ message: "Update ảnh thất bại" });
    }

    // Gọi service update DB
    const result = await libraryService.updateAvatar(
      _id,
      uploadResult.secure_url
    );

    res.json(result);

    console.log("Upload avatar thành công cho sinh viên:", _id);
  } catch (error) {
    console.error("Lỗi upload avatar:", error);
    res.status(500).json({ message: "Lỗi server khi update avatar" });
  }
}

async function requestCardReprint(req, res) {
  try {
    const { MaThe } = req.body;
    const result = await libraryService.requestCardReprint(MaThe);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi yêu cầu in lại thẻ thư viện:", error);
    res.status(500).send("Yêu cầu in lại thẻ thư viện thất bại");
  }
}

async function getStatusCardReprint(req, res) {
  try {
    const { MaThe } = req.body;
    const result = await libraryService.getStatusCardReprint(MaThe);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi lấy trạng thái in lại thẻ thư viện:", error);
    res.status(500).send("Yêu cầu lấy trạng thái in lại thẻ thư viện thất bại");
  }
}

async function getAllInfoRenewCard(req, res) {
  try {
    const info = await libraryService.getAllInfoRenewCard();
    // console.log(JSON.stringify(info, null, 2));
    res.json(info);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin in lại thẻ thư viện:", error);
    res.status(500).send("Lấy thông tin in lại thẻ thư viện thất bại");
  }
}

async function approveReissueCard(req, res) {
  try {
    const { cardId } = req.body; 
    const result = await libraryService.approveReissueCard(cardId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi duyệt yêu cầu cấp lại thẻ:", error);
    res.status(500).send("Duyệt yêu cầu cấp lại thẻ thất bại");
  }
}

async function printCard(req, res) {
  try {
    const { cardId } = req.body;

    const result = await libraryService.printCard(cardId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi in lại thẻ:", error);
    res.status(500).send("In lại thẻ thất bại");
  }
}

async function denyReissueCard(req, res) {
  try {
    const { cardId } = req.body;
    const result = await libraryService.denyReissueCard(cardId);
    res.json(result);
  } catch (error) {
    console.error("Lỗi khi từ chối yêu cầu cấp lại thẻ:", error);
    res.status(500).send("Từ chối yêu cầu cấp lại thẻ thất bại");
  }
}

async function getCardRule(req, res) {
  try {
    const rule = await libraryService.getCardRule();
    return res.status(200).json(rule);
  } catch (error) {
    console.error("Lỗi khi lấy quy định thẻ thư viện:", error);
    throw error;
  }
}

async function updateCardRule(req, res) {
  try {
    const { renewalFee, reissueFee, printWaitingDays, cardValidityDays } = req.body;

    // gọi service để update
    const updatedRule = await libraryService.updateCardRule({
      renewalFee,
      reissueFee,
      printWaitingDays,
      cardValidityDays
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật quy định thẻ thư viện:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật quy định thẻ thư viện" });
  }
}

module.exports = {
  getLibraryCard,
  getAllInfoExpireCard,
  renewLibraryCard,
  updateAvatar,
  requestCardReprint,
  getStatusCardReprint,
  getAllInfoRenewCard,
  approveReissueCard,
  printCard,
  denyReissueCard,
  getCardRule,
  updateCardRule
};
