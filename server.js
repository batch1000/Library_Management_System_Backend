const app = require("./app");
const config = require("./app/config")
const connectDB = require('./app/services/db.service');

const PORT = config.app.port;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
})

connectDB();