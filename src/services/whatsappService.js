const axios = require("axios");
const configs = require("../config/whatsappConfig");

exports.sendMsg = async (message, recipientPhone) => {
  let data = JSON.stringify({
    messaging_product: "whatsapp",
    to: recipientPhone,
    text: { body: message },
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${configs.apiUrl}`,
    headers: {
      Authorization: `Bearer ${configs.token}`,
      "Content-Type": "application/json",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error.response.data); // Log the error response
    });

};