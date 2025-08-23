const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dm8u2phzh',
    api_key: '868446333223278',
    api_secret: '_OI_PwxAG_Vf8bHh3GMLRZ1gYDI'
});

async function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'images' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(buffer);
    });
}

async function deleteImageFromCloudinary(publicId) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}
module.exports = {
    uploadToCloudinary,
    deleteImageFromCloudinary,
};
