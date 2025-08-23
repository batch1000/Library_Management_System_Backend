const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Giới hạn 100MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|mp4|mov/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) return cb(null, true);
    cb(new Error("Only images and videos are supported"));
  },
});

module.exports = upload;