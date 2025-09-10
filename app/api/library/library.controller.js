const libraryService = require('./library.service');
const { uploadToCloudinary, deleteImageFromCloudinary } = require('../../services/cloudinary.service');

async function getLibraryCard(req, res) {
    try {
        const { MaDocGia } = req.body;
        const cardInfo = await libraryService.getLibraryCard(MaDocGia);
        res.json(cardInfo);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin thẻ thư viện:', error);
        res.status(500).send('Lấy thông tin thẻ thư viện thất bại');
    }
}

async function getAllInfoExpireCard(req, res) {
    try {
        const info = await libraryService.getAllInfoExpireCard();
        // console.log(JSON.stringify(info, null, 2));
        res.json(info);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin gia hạn thẻ thư viện:', error);
        res.status(500).send('Lấy thông tin gia hạn thẻ thư viện thất bại');
    }
}

async function renewLibraryCard(req, res) {
    try {
        const { cardId } = req.body;
        const info = await libraryService.renewLibraryCard(cardId);
        res.json(info);
    } catch (error) {
        console.error('Lỗi khi gia hạn thẻ thư viện:', error);
        res.status(500).send('Gia hạn thẻ thư viện thất bại');
    }
}


module.exports = {
    getLibraryCard,
    getAllInfoExpireCard,
    renewLibraryCard
};