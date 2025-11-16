const axios = require("axios");

// const BaoCaoThongKeModel = require("./app/models/docgiaModel");
// const TaiKhoan = require("./app/models/docgiaModel");
// const NhanVien = require("./app/models/nhanvienModel");
// const ThongBaoDocGia = require("./app/models/thongbaodocgiaModel");
// const YeuThichSach = require("./app/models/yeuthichsachModel");

const DocGia = require("./app/models/docgiaModel");
const Khoa = require("./app/models/khoaModel");
const KyHoc = require("./app/models/kyhocModel");
const Lop = require("./app/models/lopModel");
const NamHoc = require("./app/models/namhocModel");
const NganhHoc = require("./app/models/nganhhocModel");
const NienKhoa = require("./app/models/nienkhoaModel");
const SinhVien = require("./app/models/sinhvienModel");

//Thẻ thư viện
const TheThuVien = require("./app/models/thethuvienModel");
const ThongTinCapLaiThe = require("./app/models/thongtincaplaitheModel");
const ThongTinGiaHan = require("./app/models/thongtingiahanModel");
const QuyDinhThuVien = require("./app/models/quydinhthuvienModel");

//Phòng học
const PhongHoc = require("./app/models/phonghocModel");
const ViTriPhong = require("./app/models/vitriphongModel");
const TheoDoiDatPhong = require("./app/models/theodoimuonphongModel");
const QuyDinhPhongHoc = require("./app/models/quydinhphonghocModel");

//Sách
const Sach = require("./app/models/sachModel");
const NhaXuatBan = require("./app/models/nhaxuatbanModel");
const QuyDinhMuonSach = require("./app/models/quydinhmuonsachModel");
const QuyDinhPhatSach = require("./app/models/quydinhphatsachModel");
const DanhGiaSach = require("./app/models/danhgiasachModel");
const TheLoaiSach = require("./app/models/theloaisachModel");
const TheoDoiMuonSach = require("./app/models/theodoimuonsachModel");
const TheoDoiXemSach = require("./app/models/theodoixemsachModel");

//Thông tin luận văn
const DotNopLuanVan = require("./app/models/dotnopluanvanModel");
const LuanVan = require("./app/models/luanvanModel");

//Thông tin niên luận
const DotNopNienLuan = require("./app/models/dotnopnienluanModel");
const NienLuan = require("./app/models/nienluanModel");
const BoMon = require("./app/models/bomonModel");
const GiangVien = require("./app/models/giangvienModel");

async function sendDatabaseToChatBot() {
  try {
    // 1️⃣ Lấy dữ liệu từ 2 hàm NLP
    const libraryTexts = await NLPAllInfoAboutLibrary();
    const studyRoomTexts = await NLPAllInfoAboutStudyRoom();
    const bookTexts = await NLPAllInfoAboutBook();

    const allTexts = [...libraryTexts, ...studyRoomTexts, ...bookTexts];

    await axios.post(
      "https://kerchieft-crescentic-lavon.ngrok-free.dev/sendDatabaseToColab",
      {
        data: allTexts,
      }
    );

    console.log("✅ Dữ liệu đã gửi thành công tới chatbot Colab!");
  } catch (err) {
    console.error("❌ Gửi dữ liệu thất bại:", err.message);
  }
}

async function NLPAllInfoAboutLibrary() {
  const texts = [];
  // ✅ Chỉ lấy dữ liệu cần thiết
  const quyDinhs = await QuyDinhThuVien.find().lean();

  quyDinhs.forEach((q) => {
    const txt = `
Trong thư viện, sinh viên cần trả ${q.renewalFee.toLocaleString()} đồng để gia hạn thẻ mỗi năm. 
Nếu làm mất thẻ, họ phải nộp ${q.reissueFee.toLocaleString()} đồng để được cấp lại, và thời gian chờ in thẻ là khoảng ${
      q.printWaitingDays
    } ngày. 
Mỗi thẻ sinh viên có hiệu lực trong ${
      q.cardValidityDays
    } ngày (tương đương khoảng một năm).

Đối với giảng viên, phí gia hạn là ${q.renewalFeeLecturer.toLocaleString()} đồng, 
phí cấp lại thẻ là ${q.reissueFeeLecturer.toLocaleString()} đồng, 
thời gian chờ in thẻ là ${q.printWaitingDaysLecturer} ngày, 
và thẻ có giá trị sử dụng trong ${
      q.cardValidityDaysLecturer
    } ngày (tức khoảng hai năm).

Nhìn chung, quy định thể hiện sự khác biệt giữa sinh viên và giảng viên về mức phí và thời hạn thẻ thư viện.
    `.trim();

    texts.push(txt);

    texts.push("Thư viện mở của từ 7:00 giờ sáng đến 9:00 giờ tối");
    texts.push(
      "Thư viện cung cấp các dịch vụ: thay đổi ảnh thẻ, yêu cầu in lại thẻ, gia hạn thẻ, đặt phòng học, mượn sách, quản lý luận văn và niên luận"
    );
    texts.push(
      "Để thay đổi ảnh thẻ, mở thẻ thư viện, chọn Thay đổi ảnh thẻ, chọn ảnh từ máy tính hoặc chụp từ camera, rồi bấm Cập nhật ảnh thẻ."
    );
    texts.push("Nếu mất thẻ, mở thẻ thư viện và chọn Yêu cầu in lại thẻ.");
    texts.push("Khi thẻ hết hạn, đến thư viện để đóng phí và gia hạn.");

    texts.push(
      "Người dùng có thể đặt phòng học bằng cách mở tab Phòng học, chuyển sang tab Đặt phòng, sau đó bấm nút Đặt phòng để tạo lịch. Sau khi đặt thành công, tất cả lịch đã đặt sẽ hiển thị trong tab Lịch của bạn. Ngoài ra, khi có người khác mời đặt phòng, các lời mời sẽ xuất hiện trong tab Lời mời để người dùng xem và phản hồi."
    );

    texts.push(
      "Để mượn sách, người dùng vào tab Thư viện, chọn mục Sách hoặc Giáo trình, chọn cuốn sách muốn xem, sau đó mở chi tiết và bấm nút Đăng ký mượn. Sau khi mượn xong, người dùng có thể mở tab Sách của tôi để xem danh sách tất cả sách đang mượn."
    );

    texts.push(
      "Đối với luận văn, người dùng vào tab Thư viện và chọn mục Luận văn. Tại đây, người dùng có thể nộp luận văn hoặc tra cứu luận văn."
    );

    texts.push(
      "Đối với niên luận, người dùng vào tab Thư viện và chọn mục Niên luận. Sinh viên chọn mục Nộp niên luận để nộp bài. Giảng viên có hai mục: Quản lý đợt nộp để tạo các đợt nộp niên luận cho sinh viên, và Danh sách niên luận để xem toàn bộ niên luận trong khoa."
    );
  });

  return texts.filter(Boolean);
}

async function NLPAllInfoAboutStudyRoom() {
  const texts = [];

  // ✅ Lấy dữ liệu quy định đặt phòng
  const quyDinhs = await QuyDinhPhongHoc.find().lean();

  quyDinhs.forEach((q) => {
    const txt = `
Trong hệ thống đặt phòng học, sinh viên chỉ có thể đặt phòng trước tối đa ${q.bookingLeadTime} ngày. 
Đối với giảng viên, thời hạn đặt trước linh hoạt hơn, có thể đặt phòng trước tối đa ${q.bookingLeadTimeLecturer} ngày. 
Quy định này giúp giảng viên dễ dàng chủ động sắp xếp lịch giảng dạy và sử dụng phòng học hiệu quả hơn.
    `.trim();

    texts.push(txt);
  });

  // ✅ Lấy dữ liệu tất cả phòng học
  const phongHocs = await PhongHoc.find().populate("ViTri").lean();

  phongHocs.forEach(function (p) {
    var viTriPhong = "Chưa xác định";
    if (p.ViTri && p.ViTri.ViTri) {
      viTriPhong = p.ViTri.ViTri;
    }

    var tienIch = "Không có";
    if (p.TienIch && p.TienIch.trim() !== "") {
      tienIch = p.TienIch;
    }

    var txt =
      "Phòng học " +
      p.TenPhong +
      " (Mã: " +
      p.MaPhong +
      ") là loại " +
      p.LoaiPhong +
      ", sức chứa " +
      p.SucChua +
      " người.\n" +
      "Vị trí: " +
      viTriPhong +
      ".\n" +
      "Tiện ích: " +
      tienIch +
      ".\n" +
      "Số lượng chỗ ngồi: " +
      (p.ChoNgoi ? p.ChoNgoi.length : 0) +
      " chỗ.";

    texts.push(txt);
  });

  return texts.filter(Boolean);
}

async function NLPAllInfoAboutBook() {
  const texts = [];
  let rules = await QuyDinhMuonSach.find().lean();

  rules.forEach((r) => {
    const txt = `
Quy định mượn sách với sinh viên:
- Một sinh viên được mượn tối đa ${r.maxBooks} cuốn sách cùng lúc.
- Trong một ngày, các bạn chỉ có thể mượn tối đa ${r.maxBooksPerDay} cuốn.
- Thời gian mượn tối đa cho mỗi lượt là ${r.borrowDuration} ngày.
- Sau khi yêu cầu mượn được chấp thuận, sinh viên có ${r.pickupDeadline} ngày để đến thư viện nhận sách.
- Nếu muốn gia hạn, mỗi lượt gia hạn sẽ kéo dài thêm ${r.renewalDuration} ngày.

Quy định mượn sách với giảng viên:
- Một giảng viên được mượn tối đa ${r.maxBooksLecturer} cuốn sách.
- Trong ngày, số sách có thể mượn tối đa là ${r.maxBooksPerDayLecturer} cuốn.
- Mỗi lượt mượn có thời hạn ${r.borrowDurationLecturer} ngày.
- Sau khi yêu cầu được duyệt, giảng viên có ${r.pickupDeadlineLecturer} ngày để đến nhận sách.
- Mỗi lượt gia hạn sẽ kéo dài thêm ${r.renewalDurationLecturer} ngày.

Nhìn chung, giảng viên sẽ được mượn nhiều sách hơn và thời gian mượn lâu hơn so với sinh viên.
    `.trim();

    texts.push(txt);
  });

  rules = await QuyDinhPhatSach.find().lean();
  rules.forEach((r) => {
    const txt = `
Quy định phạt đối với sinh viên khi mượn sách:
- Mất sách: Phí = (Giá sách × ${r.coefLost}) + ${r.feeManage}.
- Hư nhẹ: Phí = Giá sách × ${r.coefDamageLight}%.
- Hư nặng: Tính như mất sách.
- Trễ hạn: Phí mỗi ngày = ${r.feeLate} × số ngày trễ.

Quy định phạt đối với giảng viên khi mượn sách:
- Mất sách: Phí = (Giá sách × ${r.coefLostLecturer}) + ${r.feeManageLecturer}.
- Hư nhẹ: Phí = Giá sách × ${r.coefDamageLightLecturer}%.
- Hư nặng: Tính như mất sách.
- Trễ hạn: Phí mỗi ngày = ${r.feeLateLecturer} × số ngày trễ.

Giảng viên có mức phạt thấp hơn sinh viên.
`.trim();

    texts.push(txt);
  });

  return texts.filter(Boolean);
}

module.exports = {
  sendDatabaseToChatBot,
};
