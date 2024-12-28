const basicAuth = require('express-basic-auth');

const auth = basicAuth({
  users: { [process.env.API_USERNAME]: process.env.API_PASSWORD },
  challenge: true,
  realm: 'HR - HTML to PDF Service',
});

module.exports = auth;