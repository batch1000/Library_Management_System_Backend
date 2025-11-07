const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dm8u2phzh",
  api_key: "868446333223278",
  api_secret: "_OI_PwxAG_Vf8bHh3GMLRZ1gYDI",
});

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    let options = { resource_type: "image", folder: "images" }; // mặc định ảnh

    // Kiểm tra PDF theo magic number (%PDF)
    const header = buffer.toString("utf8", 0, 4);
    if (header === "%PDF") {
      options = {
        resource_type: "raw",
        folder: "pdfs",
        format: "pdf",
        access_mode: "public",
      };
    }

    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function uploadExcelToCloudinary(buffer, originalFilename) { 
  return new Promise((resolve, reject) => { 
    const options = { 
      resource_type: "raw", // Excel phải dùng "raw"
      folder: "excels", 
      public_id: `excel_${Date.now()}`, // Đặt tên file
      access_mode: "public",
      // Giữ nguyên extension gốc
      format: originalFilename.split('.').pop(),
    }; 
 
    const stream = cloudinary.uploader.upload_stream( 
      options, 
      (error, result) => { 
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve(result); 
      } 
    ); 
 
    stream.end(buffer); 
  }); 
}

async function deleteImageFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}
module.exports = {
  uploadToCloudinary,
  deleteImageFromCloudinary,
  uploadExcelToCloudinary
};
