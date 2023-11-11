require('dotenv').config(); 
module.exports = {
  apiUrl: process.env.WHATSAPP_API_URL,
  token: process.env.WHATSAPP_API_TOKEN,
};
