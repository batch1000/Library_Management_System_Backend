const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./app/api/auth/auth.routes'));
app.use('/api/book', require('./app/api/book/book.routes'));

module.exports = app;


// const DocGia = require('./app/models/docgiaModel'); // chỉnh lại đường dẫn nếu khác
// (async () => {
//     try {
//         const readers = await DocGia.find();

//         console.log(`📌 Tổng số độc giả: ${readers.length}`);
//         readers.forEach((dg, i) => {
//             console.log(
//                 `${i + 1}. _id: ${dg._id} | Họ tên: ${dg.HoLot} ${dg.Ten}}`
//             );
//         });
//     } catch (err) {
//         console.error("❌ Lỗi:", err.message);
//     }
// })();

// const Sach = require('./app/models/sachModel');
// (async () => {
//     try {
//         const books = await Sach.find();

//         console.log(`📌 Tổng số sách: ${books.length}`);
//         books.forEach((book, i) => {
//             console.log(`${i + 1}. _id: ${book._id} | Tên sách: ${book.TenSach}`);
//         });
//     } catch (err) {
//         console.error("❌ Lỗi:", err.message);
//     }
// })();

//----------------------Rating Book-------------------------
// const { addRatingBook } = require('./app/api/book/book.service');
// const readers = [
//     { username: "dungle94", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thupham99", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoavu98", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichdo97", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamngo93", id: "689f390c0ba6ed16dcf4765e" },
// ];

// (async () => {
//     try {
//         const bookId = "687a99b7a9de141afc8ea580"; // sách cố định

//         for (let reader of readers) {
//             const stars = Math.floor(Math.random() * 5) + 1; // random 1-5

//             const result = await addRatingBook(bookId, reader.id, stars);

//             if (result) {
//                 console.log(`✅ ${reader.username} đã đánh giá thành công (${stars}⭐)`);
//             } else {
//                 console.log(`⚠️ ${reader.username} đã đánh giá sách này trước đó!`);
//             }
//         }
//     } catch (err) {
//         console.error("❌ Lỗi khi chạy script:", err.message);
//     }
// })();


//----------------------View Book-------------------------
// const TheoDoiXemSach = require('./app/models/theodoixemsachModel');
// // Hàm ghi nhận lượt xem
// async function addBookView(bookId, readerId) {
//   if (!bookId || !readerId) {
//     throw new Error("Thiếu thông tin sách hoặc độc giả để ghi nhận lượt xem.");
//   }

//   // Tạo một record mới cho lượt xem
//   const newView = new TheoDoiXemSach({
//     MaSach: bookId,
//     MaDocGia: readerId
//   });

//   const savedView = await newView.save();
//   return savedView;
// }

// (async () => {
//   try {
//     const bookId = "687a99b7a9de141afc8ea580";   // ID sách cố định
//     const readerId = "689f390b0ba6ed16dcf4764a"; // Một độc giả cụ thể

//     const result = await addBookView(bookId, readerId);

//     console.log(`✅ Đã ghi nhận lượt xem cho độc giả ${readerId} với sách ${bookId}`);
//     console.log(result); // In ra document vừa lưu
//   } catch (err) {
//     console.error("❌ Lỗi khi chạy script:", err.message);
//   }
// })();


//----------------------Borrow Book-------------------------
// const TheoDoiMuonSach = require('./app/models/theodoimuonsachModel');
// async function lendBook(data) {
//     try {
//         const { MaSach, MaDocGia, SoLuongMuon, Msnv } = data;

//         const ngayMuon = new Date();
//         const ngayTra = new Date();
//         ngayTra.setDate(ngayMuon.getDate() + 7); // cho mượn 1 tuần

//         const record = new TheoDoiMuonSach({
//             MaSach,
//             MaDocGia,
//             SoLuong: SoLuongMuon,
//             TrangThai: 'approved',
//             Msnv,
//             NgayMuon: ngayMuon,
//             NgayTra: ngayTra
//         });

//         const savedRecord = await record.save();
//         return savedRecord;

//     } catch (err) {
//         console.error('Lỗi khi mượn sách:', err);
//         throw err;
//     }
// }

// // Test mượn sách
// (async () => {
//     try {
//         const bookId = "687a99b7a9de141afc8ea580";   // ID sách thật
//         const readerId = "689f390b0ba6ed16dcf4764a"; // Một độc giả thật
//         const staffId = "6877b60c14b0cc1b10278e45";  // Nhân viên đã cho sẵn

//         const result = await lendBook({
//             MaSach: bookId,
//             MaDocGia: readerId,
//             SoLuongMuon: 1,
//             Msnv: staffId
//         });

//         console.log(`✅ Độc giả ${readerId} đã mượn sách ${bookId}`);
//         console.log(result); // In ra document vừa lưu

//     } catch (err) {
//         console.error("❌ Lỗi khi chạy script:", err.message);
//     }
// })();





//----------------------Rating Book 2 Weeks-------------------------
// const DanhGiaSach = require('./app/models/danhgiasachModel');
// const readers = [
//     { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//     { username: "hoangTran", id: "68951fb83475df14e828916e" },
//     { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//     { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//     { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//     { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//     { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//     { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//     { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//     { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//     { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//     { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//     { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//     { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//     { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//     { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
// ];

// const books = [
//     { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//     { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//     { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//     { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//     { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//     { title: "1984", id: "687aa878a9de141afc8ea595" },
//     { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//     { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//     { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//     { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//     { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//     { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//     { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//     { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//     { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//     { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//     { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//     { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//     { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//     { title: "Dune", id: "687b908fc290a2086476f2d1" },
// ];

// async function createRating(bookId, readerId, stars, customDate) {
//     const existingRating = await DanhGiaSach.findOne({
//         MaSach: bookId,
//         MaDocGia: readerId
//     });

//     if (existingRating) {
//         return null;
//     }

//     const newRating = new DanhGiaSach({
//         MaSach: bookId,
//         MaDocGia: readerId,
//         SoSao: stars,
//         BinhLuan: "",
//         NgayDanhGia: customDate,
//         createdAt: customDate,
//         updatedAt: customDate
//     });

//     return await newRating.save();
// }

// function getRandomBook() {
//     const popularBooks = books.slice(0, 8);
//     const otherBooks = books.slice(8);

//     if (Math.random() < 0.7) {
//         return popularBooks[Math.floor(Math.random() * popularBooks.length)];
//     } else {
//         return otherBooks[Math.floor(Math.random() * otherBooks.length)];
//     }
// }

// function getRandomRating() {
//     const rand = Math.random();
//     if (rand < 0.4) return 5;
//     if (rand < 0.7) return 4;
//     if (rand < 0.85) return 3;
//     if (rand < 0.95) return 2;
//     return 1;
// }

// function getRandomDateInLast14Days() {
//     const now = new Date();
//     let adjustedDaysAgo;
//     const rand = Math.random();

//     if (rand < 0.4) {
//         adjustedDaysAgo = Math.floor(Math.random() * 3);
//     } else if (rand < 0.7) {
//         adjustedDaysAgo = Math.floor(Math.random() * 4) + 3;
//     } else {
//         adjustedDaysAgo = Math.floor(Math.random() * 7) + 7;
//     }

//     const targetDate = new Date(now);
//     targetDate.setDate(now.getDate() - adjustedDaysAgo);

//     const randomHour = Math.floor(Math.random() * 14) + 8;
//     const randomMinute = Math.floor(Math.random() * 60);

//     targetDate.setHours(randomHour, randomMinute, 0, 0);
//     return targetDate;
// }

// (async () => {
//     try {
//         console.log("Bắt đầu tạo dữ liệu đánh giá sách...\n");

//         let successCount = 0;
//         let duplicateCount = 0;

//         const totalRatings = Math.floor(Math.random() * 41) + 80;

//         for (let i = 0; i < totalRatings; i++) {
//             const randomReader = readers[Math.floor(Math.random() * readers.length)];
//             const randomBook = getRandomBook();
//             const stars = getRandomRating();
//             const randomDate = getRandomDateInLast14Days();

//             const result = await createRating(randomBook.id, randomReader.id, stars, randomDate);

//             if (result) {
//                 successCount++;
//                 const daysAgo = Math.floor((new Date() - randomDate) / (1000 * 60 * 60 * 24));
//                 console.log(`${randomReader.username} đã đánh giá "${randomBook.title}" (${stars} sao) - ${daysAgo} ngày trước`);
//             } else {
//                 duplicateCount++;
//                 console.log(`${randomReader.username} đã đánh giá "${randomBook.title}" trước đó`);
//             }

//             await new Promise(resolve => setTimeout(resolve, 100));
//         }

//         console.log(`\nKết quả:`);
//         console.log(`Đánh giá thành công: ${successCount}`);
//         console.log(`Đánh giá trùng lặp: ${duplicateCount}`);
//         console.log(`Tổng: ${successCount + duplicateCount} lần thử`);

//         console.log(`\nPhân phối dữ liệu:`);
//         console.log(`40% dữ liệu: 3 ngày gần nhất`);
//         console.log(`30% dữ liệu: 4-7 ngày trước`);
//         console.log(`30% dữ liệu: 8-14 ngày trước`);
//     } catch (err) {
//         console.error("Lỗi khi chạy script:", err.message);
//     }
// })();




//----------------------Delete All Ratings-------------------------
// const DanhGiaSach = require('./app/models/danhgiasachModel');

// async function deleteAllRatings() {
//     try {
//         const result = await DanhGiaSach.deleteMany({}); // xóa hết
//         console.log(`🗑️ Đã xóa ${result.deletedCount} đánh giá trong hệ thống.`);
//     } catch (err) {
//         console.error("❌ Lỗi khi xóa đánh giá:", err.message);
//     }
// }

// // // Chạy function
// (async () => {
//     await deleteAllRatings();
// })();



// //----------------------View Book-------------------------
// const TheoDoiXemSach = require('./app/models/theodoixemsachModel');

// // Hàm tạo lượt xem trực tiếp vào database
// async function createBookView(bookId, readerId, customDate) {
//     const newView = new TheoDoiXemSach({
//         MaSach: bookId,
//         MaDocGia: readerId,
//         ThoiDiemXem: customDate
//     });

//     const savedView = await newView.save();
//     return savedView;
// }

// const readers = [
//     { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//     { username: "hoangTran", id: "68951fb83475df14e828916e" },
//     { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//     { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//     { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//     { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//     { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//     { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//     { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//     { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//     { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//     { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//     { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//     { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//     { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//     { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
//     { username: "thuyDinh", id: "689f394bfc24c01b60e1ccae" },
//     { username: "phucVu", id: "689f394bfc24c01b60e1ccb3" },
//     { username: "huongLy", id: "689f394bfc24c01b60e1ccb8" },
//     { username: "datNguyen", id: "689f394bfc24c01b60e1ccbd" },
//     { username: "trangBui", id: "689f394cfc24c01b60e1ccc2" },
// ];

// const books = [
//     { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//     { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//     { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//     { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//     { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//     { title: "1984", id: "687aa878a9de141afc8ea595" },
//     { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//     { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//     { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//     { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//     { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//     { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//     { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//     { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//     { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//     { title: "Man's Search for Meaning", id: "687ab5d0a9de141afc8ea5cc" },
//     { title: "A Brief History of Time", id: "687ab6d4a9de141afc8ea5d3" },
//     { title: "The Book Thief", id: "687ab95ba9de141afc8ea5da" },
//     { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//     { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//     { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//     { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//     { title: "Dune", id: "687b908fc290a2086476f2d1" },
//     { title: "The Name of the Wind", id: "687b9143c290a2086476f2d8" },
//     { title: "Hiểu về trái tim", id: "687ba4a2c290a2086476f2f6" },
// ];

// // Hàm chọn sách theo trọng số (một số sách "hot" hơn)
// function getRandomBook() {
//     const hotBooks = books.slice(0, 10); // 10 sách hot nhất
//     const normalBooks = books.slice(10, 18); // 8 sách bình thường
//     const lessPopular = books.slice(18); // Sách ít phổ biến hơn

//     const rand = Math.random();
//     if (rand < 0.5) { // 50% - sách hot
//         return hotBooks[Math.floor(Math.random() * hotBooks.length)];
//     } else if (rand < 0.8) { // 30% - sách bình thường  
//         return normalBooks[Math.floor(Math.random() * normalBooks.length)];
//     } else { // 20% - sách ít phổ biến
//         return lessPopular[Math.floor(Math.random() * lessPopular.length)];
//     }
// }

// // Hàm mô phỏng hành vi xem thực tế (một số độc giả active hơn)
// function getRandomReader() {
//     const activeReaders = readers.slice(0, 12); // 12 độc giả active
//     const normalReaders = readers.slice(12);    // 13 độc giả bình thường

//     // 65% cơ hội chọn độc giả active, 35% độc giả bình thường
//     if (Math.random() < 0.65) {
//         return activeReaders[Math.floor(Math.random() * activeReaders.length)];
//     } else {
//         return normalReaders[Math.floor(Math.random() * normalReaders.length)];
//     }
// }

// // Hàm tạo ngày xem phân bố đều trong 2 tuần
// function generateDistributedViewDates(targetCount) {
//     const now = new Date();
//     const twoWeeksAgo = new Date();
//     twoWeeksAgo.setDate(now.getDate() - 14);
    
//     const dates = [];
//     const totalDays = 14;
    
//     // Phân bố theo thời gian thực tế: ngày gần đây nhiều hơn
//     const dayWeights = [];
//     for (let day = 0; day < totalDays; day++) {
//         // Ngày càng gần hiện tại thì weight càng cao
//         const weight = Math.max(0.3, 1 - (day * 0.05)); // Giảm dần từ 1.0 xuống 0.3
//         dayWeights.push(weight);
//     }
    
//     // Điều chỉnh theo ngày trong tuần
//     const adjustWeightByDayOfWeek = (date, weight) => {
//         const dayOfWeek = date.getDay();
//         const weekdayMultiplier = {
//             0: 0.7,  // Chủ nhật - ít hơn
//             1: 1.1,  // Thứ 2 - nhiều 
//             2: 1.2,  // Thứ 3 - nhiều
//             3: 1.3,  // Thứ 4 - nhiều nhất
//             4: 1.2,  // Thứ 5 - nhiều
//             5: 1.1,  // Thứ 6 - nhiều
//             6: 0.8   // Thứ 7 - ít hơn
//         };
//         return weight * weekdayMultiplier[dayOfWeek];
//     };
    
//     // Tạo phân bố cho từng ngày
//     for (let day = 0; day < totalDays; day++) {
//         const currentDate = new Date(now);
//         currentDate.setDate(now.getDate() - (totalDays - 1 - day)); // Đảo ngược để ngày gần nhất có index cao
        
//         let weight = dayWeights[day];
//         weight = adjustWeightByDayOfWeek(currentDate, weight);
        
//         // Tính số lượng cho ngày này
//         const baseCount = Math.floor(targetCount / totalDays * weight);
//         const randomVariation = Math.floor(Math.random() * 4) - 1; // -1 đến 2
//         const dayCount = Math.max(1, baseCount + randomVariation);
        
//         // Tạo các thời điểm trong ngày với phân bố thực tế
//         for (let i = 0; i < dayCount; i++) {
//             const viewDate = new Date(currentDate);
            
//             // Phân bố giờ trong ngày theo thói quen thực tế
//             let hour;
//             const hourRand = Math.random();
//             if (hourRand < 0.15) { // 15% - sáng sớm (7-9h)
//                 hour = 7 + Math.floor(Math.random() * 2);
//             } else if (hourRand < 0.35) { // 20% - buổi sáng (9-12h)
//                 hour = 9 + Math.floor(Math.random() * 3);
//             } else if (hourRand < 0.45) { // 10% - buổi trưa (12-14h)
//                 hour = 12 + Math.floor(Math.random() * 2);
//             } else if (hourRand < 0.7) { // 25% - buổi chiều (14-18h)
//                 hour = 14 + Math.floor(Math.random() * 4);
//             } else { // 30% - buổi tối (18-22h)
//                 hour = 18 + Math.floor(Math.random() * 4);
//             }
            
//             const minute = Math.floor(Math.random() * 60);
//             viewDate.setHours(hour, minute, 0, 0);
//             dates.push(viewDate);
//         }
//     }
    
//     // Trộn ngẫu nhiên để tránh pattern
//     for (let i = dates.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [dates[i], dates[j]] = [dates[j], dates[i]];
//     }
    
//     return dates.slice(0, targetCount);
// }

// // Hàm tạo combinations với khả năng duplicate (vì người dùng có thể xem sách nhiều lần)
// function generateViewCombinations(targetCount) {
//     const combinations = [];
    
//     for (let i = 0; i < targetCount; i++) {
//         const reader = getRandomReader();
//         const book = getRandomBook();
        
//         combinations.push({
//             reader,
//             book
//         });
//     }
    
//     return combinations;
// }

// (async () => {
//     try {
//         console.log("Bat dau tao du lieu luot xem sach phan bo deu trong 2 tuan...\n");

//         const targetViewCount = 500; // Tăng lên 500 lượt xem (nhiều hơn mượn sách)
//         let successCount = 0;
//         let errorCount = 0;

//         // Tạo combinations
//         console.log("Dang tao combinations xem sach...");
//         const combinations = generateViewCombinations(targetViewCount);
//         console.log(`Da tao ${combinations.length} combinations\n`);

//         // Tạo ngày xem phân bố đều
//         console.log("Dang tao phan bo ngay xem...");
//         const viewDates = generateDistributedViewDates(targetViewCount);
//         console.log(`Da tao ${viewDates.length} ngay xem phan bo deu\n`);

//         // Thực hiện tạo dữ liệu
//         for (let i = 0; i < Math.min(combinations.length, viewDates.length); i++) {
//             try {
//                 const combo = combinations[i];
//                 const viewDate = viewDates[i];

//                 const result = await createBookView(combo.book.id, combo.reader.id, viewDate);

//                 if (result) {
//                     successCount++;
//                     const daysAgo = Math.floor((new Date() - viewDate) / (1000 * 60 * 60 * 24));
//                     const timeStr = viewDate.toLocaleTimeString('vi-VN', { 
//                         hour: '2-digit', 
//                         minute: '2-digit' 
//                     });
//                     console.log(`[${successCount}] ${combo.reader.username} xem "${combo.book.title}" - ${daysAgo} ngay truoc luc ${timeStr}`);
//                 }

//                 // Delay để tránh spam database
//                 if (i % 20 === 0) {
//                     await new Promise(resolve => setTimeout(resolve, 30));
//                 }

//             } catch (error) {
//                 errorCount++;
//                 if (errorCount <= 5) { // Chỉ log 5 lỗi đầu tiên
//                     console.log(`Loi khi tao luot xem: ${error.message}`);
//                 }
//             }

//             // Progress indicator mỗi 50 lượt
//             if ((i + 1) % 50 === 0) {
//                 console.log(`--- Da xu ly ${i + 1}/${targetViewCount} luot ---`);
//             }
//         }

//         // Thống kê kết quả
//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`KET QUA TAO DU LIEU LUOT XEM SACH`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Thanh cong: ${successCount} luot xem`);
//         console.log(`Loi: ${errorCount} luot`);
//         console.log(`Tong cong: ${successCount + errorCount} lan thu`);

//         // Thống kê chi tiết
//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`THONG KE CHI TIET`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Ti le thanh cong: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
//         console.log(`Trung binh moi sach: ~${(successCount / books.length).toFixed(1)} luot xem`);
//         console.log(`Trung binh moi doc gia: ~${(successCount / readers.length).toFixed(1)} luot xem`);

//         // Phân tích phân bố thời gian
//         console.log(`\nPHAN BO THOI GIAN:`);
//         console.log(`Du lieu duoc phan bo trong 14 ngay qua`);
//         console.log(`Ngay gan day nhieu luot xem hon ngay cu`);
//         console.log(`Gio cao diem: 14h-18h (25%) va 18h-22h (30%)`);
//         console.log(`Thu 4 co nhieu luot xem nhat, chu nhat it nhat`);

//         // Phân tích hành vi
//         console.log(`\nPHAN TICH HANH VI:`);
//         console.log(`65% luot xem tu doc gia tich cuc`);
//         console.log(`50% luot xem tap trung vao sach hot`);
//         console.log(`Cho phep xem sach nhieu lan (khong check duplicate)`);

//     } catch (err) {
//         console.error("Loi chung khi chay script:", err.message);
//     }
// })();


// //----------------------Borrow Book with Duplicate Check-------------------------
// const TheoDoiMuonSach = require('./app/models/theodoimuonsachModel');

// async function lendBook(data) {
//     try {
//         const { MaSach, MaDocGia, SoLuongMuon, Msnv, NgayMuonCustom } = data;

//         // Kiểm tra xem độc giả này có đang mượn sách này chưa
//         const existingBorrow = await TheoDoiMuonSach.findOne({
//             MaSach: MaSach,
//             MaDocGia: MaDocGia,
//             TrangThai: 'approved' // Chỉ check những sách đang được mượn
//         });

//         if (existingBorrow) {
//             throw new Error(`Độc giả đang mượn sách này rồi`);
//         }

//         // Sử dụng ngày mượn tùy chỉnh nếu có, không thì random như cũ
//         let ngayMuon;
//         if (NgayMuonCustom) {
//             ngayMuon = NgayMuonCustom;
//         } else {
//             // Random ngày mượn trong vòng 2 tuần trở lại đây
//             const now = new Date();
//             const twoWeeksAgo = new Date();
//             twoWeeksAgo.setDate(now.getDate() - 14);

//             const randomTime = twoWeeksAgo.getTime() + Math.random() * (now.getTime() - twoWeeksAgo.getTime());
//             ngayMuon = new Date(randomTime);
//         }

//         const ngayTra = new Date(ngayMuon);
//         ngayTra.setDate(ngayMuon.getDate() + 7); // cho mượn 1 tuần

//         const record = new TheoDoiMuonSach({
//             MaSach,
//             MaDocGia,
//             SoLuong: SoLuongMuon,
//             TrangThai: 'approved',
//             Msnv,
//             NgayMuon: ngayMuon,
//             NgayTra: ngayTra,
//             DaGiaHan: false
//         });

//         const savedRecord = await record.save();
//         return savedRecord;

//     } catch (err) {
//         console.error('Lỗi khi mượn sách:', err.message);
//         throw err;
//     }
// }

// const readers = [
//     { username: "thanhTran", id: "687113ca8d3f5218287b7651" },
//     { username: "hoangTran", id: "68951fb83475df14e828916e" },
//     { username: "hainguyen", id: "689f296763a64118d8c26bcc" },
//     { username: "lanNguyen", id: "689f38b3fb95ec1614eba15d" },
//     { username: "namPham", id: "689f38b3fb95ec1614eba162" },
//     { username: "anhLe", id: "689f38b3fb95ec1614eba167" },
//     { username: "hongVo", id: "689f38b3fb95ec1614eba16c" },
//     { username: "phucNguyen", id: "689f390b0ba6ed16dcf4763f" },
//     { username: "maiTran", id: "689f390b0ba6ed16dcf47645" },
//     { username: "dungLe", id: "689f390b0ba6ed16dcf4764a" },
//     { username: "thuPham", id: "689f390b0ba6ed16dcf4764f" },
//     { username: "khoaVu", id: "689f390c0ba6ed16dcf47654" },
//     { username: "bichDo", id: "689f390c0ba6ed16dcf47659" },
//     { username: "tamNgo", id: "689f390c0ba6ed16dcf4765e" },
//     { username: "yenHuynh", id: "689f390c0ba6ed16dcf47663" },
//     { username: "huyBui", id: "689f390c0ba6ed16dcf47668" },
//     { username: "hoaDang", id: "689f390d0ba6ed16dcf4766d" },
//     { username: "lamTruong", id: "689f394afc24c01b60e1cc9f" },
//     { username: "hanhNguyen", id: "689f394afc24c01b60e1cca4" },
//     { username: "quangPhan", id: "689f394bfc24c01b60e1cca9" },
//     { username: "thuyDinh", id: "689f394bfc24c01b60e1ccae" },
//     { username: "phucVu", id: "689f394bfc24c01b60e1ccb3" },
//     { username: "huongLy", id: "689f394bfc24c01b60e1ccb8" },
//     { username: "datNguyen", id: "689f394bfc24c01b60e1ccbd" },
//     { username: "trangBui", id: "689f394cfc24c01b60e1ccc2" },
//     { username: "sonHoang", id: "689f394cfc24c01b60e1ccc7" },
//     { username: "ngocDoan", id: "689f394cfc24c01b60e1cccc" },
// ];

// const books = [
//     { title: "The Secret Deep", id: "687a67faa9de141afc8ea572" },
//     { title: "Giết con chim nhại", id: "687a9762a9de141afc8ea579" },
//     { title: "Mắt Biếc", id: "687a99b7a9de141afc8ea580" },
//     { title: "The Martian", id: "687a9a9ea9de141afc8ea587" },
//     { title: "The Hobbit", id: "687a9b0fa9de141afc8ea58e" },
//     { title: "1984", id: "687aa878a9de141afc8ea595" },
//     { title: "Tuổi thơ dữ dội", id: "687aa8eaa9de141afc8ea59c" },
//     { title: "Ngồi Khóc Trên Cây", id: "687aa9b0a9de141afc8ea5a0" },
//     { title: "The Shining", id: "687aab5fa9de141afc8ea5a7" },
//     { title: "Dế Mèn phiêu lưu ký", id: "687aac4da9de141afc8ea5ab" },
//     { title: "Becoming", id: "687aaf03a9de141afc8ea5af" },
//     { title: "Tôi thấy hoa vàng trên cỏ xanh", id: "687ab02ca9de141afc8ea5b3" },
//     { title: "The Da Vinci Code", id: "687ab0c9a9de141afc8ea5b7" },
//     { title: "Pride and Prejudice", id: "687ab1bea9de141afc8ea5be" },
//     { title: "Sống Mòn", id: "687ab383a9de141afc8ea5c5" },
//     { title: "Man's Search for Meaning", id: "687ab5d0a9de141afc8ea5cc" },
//     { title: "A Brief History of Time", id: "687ab6d4a9de141afc8ea5d3" },
//     { title: "The Book Thief", id: "687ab95ba9de141afc8ea5da" },
//     { title: "Atomic Habits", id: "687b8566c290a2086476f28f" },
//     { title: "Deep Work", id: "687b7a30c290a2086476f281" },
//     { title: "Đắc Nhân Tâm", id: "687ba752c290a2086476f301" },
//     { title: "Norwegian Wood", id: "687ba60ac290a2086476f2fa" },
//     { title: "Dune", id: "687b908fc290a2086476f2d1" },
//     { title: "The Name of the Wind", id: "687b9143c290a2086476f2d8" },
// ];

// // Hàm chọn sách theo độ phổ biến cho việc mượn
// function getRandomBookForBorrow() {
//     const popularBooks = books.slice(0, 8);   // Sách phổ biến, dễ mượn
//     const mediumBooks = books.slice(8, 16);   // Sách trung bình
//     const lessPopular = books.slice(16);      // Sách ít được mượn

//     const rand = Math.random();
//     if (rand < 0.6) { // 60% - sách phổ biến
//         return popularBooks[Math.floor(Math.random() * popularBooks.length)];
//     } else if (rand < 0.85) { // 25% - sách trung bình
//         return mediumBooks[Math.floor(Math.random() * mediumBooks.length)];
//     } else { // 15% - sách ít phổ biến
//         return lessPopular[Math.floor(Math.random() * lessPopular.length)];
//     }
// }

// // Hàm chọn độc giả theo thói quen mượn sách
// function getRandomReaderForBorrow() {
//     const frequentReaders = readers.slice(0, 10); // 10 độc giả mượn nhiều
//     const normalReaders = readers.slice(10, 20);  // 10 độc giả bình thường  
//     const occasionalReaders = readers.slice(20);  // 7 độc giả thỉnh thoảng mượn

//     const rand = Math.random();
//     if (rand < 0.5) { // 50% - độc giả mượn thường xuyên
//         return frequentReaders[Math.floor(Math.random() * frequentReaders.length)];
//     } else if (rand < 0.8) { // 30% - độc giả bình thường
//         return normalReaders[Math.floor(Math.random() * normalReaders.length)];
//     } else { // 20% - độc giả thỉnh thoảng
//         return occasionalReaders[Math.floor(Math.random() * occasionalReaders.length)];
//     }
// }

// // Hàm random số lượng mượn thực tế
// function getRandomBorrowQuantity() {
//     const rand = Math.random();
//     if (rand < 0.75) return 1; // 75% mượn 1 cuốn
//     if (rand < 0.95) return 2; // 20% mượn 2 cuốn  
//     return 3; // 5% mượn 3 cuốn
// }

// // Hàm tạo ngày mượn phân bố đều trong 2 tuần
// function generateDistributedBorrowDates(targetCount) {
//     const now = new Date();
//     const twoWeeksAgo = new Date();
//     twoWeeksAgo.setDate(now.getDate() - 14);
    
//     const dates = [];
//     const totalDays = 14;
    
//     // Tạo phân bố theo các ngày trong tuần
//     // Thứ 2-6: nhiều hơn, thứ 7-CN: ít hơn
//     const dayWeights = {
//         0: 0.8,  // Chủ nhật - ít
//         1: 1.2,  // Thứ 2 - nhiều
//         2: 1.3,  // Thứ 3 - nhiều  
//         3: 1.4,  // Thứ 4 - nhiều nhất
//         4: 1.3,  // Thứ 5 - nhiều
//         5: 1.2,  // Thứ 6 - nhiều
//         6: 0.9   // Thứ 7 - ít
//     };
    
//     // Tạo phân bố cho từng ngày
//     for (let day = 0; day < totalDays; day++) {
//         const currentDate = new Date(twoWeeksAgo);
//         currentDate.setDate(twoWeeksAgo.getDate() + day);
        
//         const dayOfWeek = currentDate.getDay();
//         const weight = dayWeights[dayOfWeek];
        
//         // Tính số lượng cho ngày này (với một chút random)
//         const baseCount = Math.floor(targetCount / totalDays * weight);
//         const randomVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, hoặc 1
//         const dayCount = Math.max(1, baseCount + randomVariation);
        
//         // Tạo các thời điểm trong ngày (giờ làm việc 8h-17h)
//         for (let i = 0; i < dayCount; i++) {
//             const borrowDate = new Date(currentDate);
            
//             // Random giờ trong ngày làm việc (8h-17h)
//             const hour = 8 + Math.floor(Math.random() * 9);
//             const minute = Math.floor(Math.random() * 60);
            
//             borrowDate.setHours(hour, minute, 0, 0);
//             dates.push(borrowDate);
//         }
//     }
    
//     // Trộn ngẫu nhiên array để tránh pattern
//     for (let i = dates.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [dates[i], dates[j]] = [dates[j], dates[i]];
//     }
    
//     return dates.slice(0, targetCount);
// }

// // Hàm kiểm tra nếu combination đã exist
// async function checkExistingCombination(MaSach, MaDocGia) {
//     try {
//         const existing = await TheoDoiMuonSach.findOne({
//             MaSach: MaSach,
//             MaDocGia: MaDocGia,
//             TrangThai: 'approved'
//         });
//         return !!existing;
//     } catch (error) {
//         return false;
//     }
// }

// // Hàm tạo combinations unique
// function generateUniqueCombinations(targetCount) {
//     const combinations = [];
//     const used = new Set();
    
//     let attempts = 0;
//     const maxAttempts = targetCount * 3; // Để đảm bảo có đủ combinations
    
//     while (combinations.length < targetCount && attempts < maxAttempts) {
//         const reader = getRandomReaderForBorrow();
//         const book = getRandomBookForBorrow();
//         const quantity = getRandomBorrowQuantity();
        
//         const key = `${book.id}-${reader.id}`;
        
//         if (!used.has(key)) {
//             used.add(key);
//             combinations.push({
//                 reader,
//                 book,
//                 quantity,
//                 key
//             });
//         }
        
//         attempts++;
//     }
    
//     return combinations;
// }

// (async () => {
//     try {
//         console.log("Bắt đầu tạo dữ liệu mượn sách phân bố đều trong 2 tuần...\n");

//         const staffId = "6877b60c14b0cc1b10278e45";
//         const targetSuccessCount = 150; // Tăng target lên 150
        
//         let successCount = 0;
//         let errorCount = 0;
//         let duplicateCount = 0;

//         // Tạo các combinations unique trước
//         console.log("Đang tạo combinations unique...");
//         const combinations = generateUniqueCombinations(targetSuccessCount * 1.2); // Tạo thêm 20% để dự phòng
//         console.log(`Đã tạo ${combinations.length} combinations unique\n`);

//         // Tạo các ngày mượn phân bố đều
//         console.log("Đang tạo phân bố ngày mượn...");
//         const borrowDates = generateDistributedBorrowDates(targetSuccessCount);
//         console.log(`Đã tạo ${borrowDates.length} ngày mượn phân bố đều\n`);

//         // Thực hiện tạo dữ liệu
//         for (let i = 0; i < Math.min(combinations.length, borrowDates.length); i++) {
//             try {
//                 const combo = combinations[i];
//                 const borrowDate = borrowDates[i];
                
//                 // Kiểm tra trước khi tạo để tránh duplicate
//                 const exists = await checkExistingCombination(combo.book.id, combo.reader.id);
//                 if (exists) {
//                     duplicateCount++;
//                     console.log(`Bỏ qua: ${combo.reader.username} đã mượn "${combo.book.title}" rồi`);
//                     continue;
//                 }

//                 const result = await lendBook({
//                     MaSach: combo.book.id,
//                     MaDocGia: combo.reader.id,
//                     SoLuongMuon: combo.quantity,
//                     Msnv: staffId,
//                     NgayMuonCustom: borrowDate
//                 });

//                 if (result) {
//                     successCount++;
//                     const formattedDate = borrowDate.toLocaleDateString('vi-VN');
//                     const formattedTime = borrowDate.toLocaleTimeString('vi-VN', { 
//                         hour: '2-digit', 
//                         minute: '2-digit' 
//                     });
//                     console.log(`[${successCount}] ${combo.reader.username} mượn ${combo.quantity} cuốn "${combo.book.title}" - ${formattedDate} ${formattedTime}`);
//                 }

//                 // Delay nhỏ để tránh spam database
//                 if (i % 10 === 0) {
//                     await new Promise(resolve => setTimeout(resolve, 50));
//                 }

//             } catch (error) {
//                 if (error.message.includes('đang mượn sách này rồi')) {
//                     duplicateCount++;
//                 } else {
//                     errorCount++;
//                     console.log(`Lỗi: ${error.message}`);
//                 }
//             }

//             // Dừng khi đạt target
//             if (successCount >= targetSuccessCount) {
//                 console.log(`\nĐã đạt target ${targetSuccessCount} lượt mượn, dừng lại.`);
//                 break;
//             }
//         }

//         // Thống kê kết quả
//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`KET QUA TAO DU LIEU MUON SACH`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Thanh cong: ${successCount} luot muon`);
//         console.log(`Trung lap: ${duplicateCount} luot`);
//         console.log(`Loi khac: ${errorCount} luot`);
//         console.log(`Tong cong: ${successCount + duplicateCount + errorCount} lan thu`);

//         // Thống kê chi tiết
//         const totalAttempts = successCount + duplicateCount + errorCount;
//         console.log(`\n${'='.repeat(50)}`);
//         console.log(`THONG KE CHI TIET`);
//         console.log(`${'='.repeat(50)}`);
//         console.log(`Ti le thanh cong: ${((successCount / totalAttempts) * 100).toFixed(1)}%`);
//         console.log(`Ti le trung lap: ${((duplicateCount / totalAttempts) * 100).toFixed(1)}%`);
//         console.log(`Trung binh moi sach: ~${(successCount / books.length).toFixed(1)} luot muon`);
//         console.log(`Trung binh moi doc gia: ~${(successCount / readers.length).toFixed(1)} luot muon`);

//         // Ước tính tổng số sách được mượn
//         const estimatedTotalBooks = Math.round(successCount * 1.3);
//         console.log(`Tong sach duoc muon (uoc tinh): ~${estimatedTotalBooks} cuon`);
        
//         // Thông tin về phân bố thời gian
//         console.log(`Du lieu duoc phan bo deu trong 14 ngay qua`);
//         console.log(`Gio muon: 8h00 - 17h00 (gio hanh chinh)`);

//     } catch (err) {
//         console.error("Loi chung khi chay script:", err.message);
//     }
// })();