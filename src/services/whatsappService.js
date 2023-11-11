const axios = require("axios");
const configs = require("../config/whatsappConfig");

const sendMsg = async (message, recipientPhone) => {
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



const sendMessageTemplate = async (recipientPhone) => {
  const url = `${configs.apiUrl}`;
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "template",
    template: {
      name: "med",
      language: {
        code: "en_US"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "Did you take all your *medicines for this session* ?"
            }
          ]
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            {
              type: "payload",
              payload: "YES_PAYLOAD"
            }
          ]
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [
            {
              type: "payload",
              payload: "NO_PAYLOAD"
            }
          ]
        }
      ]
    }
  };

  const headers = {
    'Authorization': `Bearer ${configs.token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(url, data, { headers: headers });
    console.log('Message sent!', response.data);
  } catch (error) {
    console.error('Failed to send message', error.response.data);
  }
};

module.exports = {sendMessageTemplate,sendMsg};



