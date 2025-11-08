const nodemailer = require("nodemailer");

async function emailSender({ email, subject, html }) {
  // Tạo transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // SSL port
    secure: true,
    auth: {
      user: "tailieu1000200317112@gmail.com",
      pass: "", // không dùng mật khẩu Gmail thật!
    },
  });

  // Tạo message
  const message = {
    from: '"Readnest" <tailieu1000200317112@gmail.com>',
    to: email,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(message);
    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

module.exports = { emailSender };
