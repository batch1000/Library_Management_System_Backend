const authService = require('./auth.service');

async function signup(req, res) {
  try {
    const result = await authService.signup(req.body);
    res.json(result);
    console.log('Đăng ký thành công: ', result._id);
  } catch (error) {
    res.status(500).send('Đăng ký thất bại');
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).send('Đăng nhập thất bại');
  }
}

module.exports = { login, signup };