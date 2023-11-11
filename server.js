require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const { sendMsg } = require("./src/services/whatsappService");
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { getMediaUrl, downloadAndUploadImage } = require('./src/utils/getImage');


const app = express();
app.use(bodyParser.json());
const { sendMsg,sendMessageTemplate } = require("./src/services/whatsappService");


app.get("/", (req, res) => {
  res.send("Medication Reminder Service is running.");
});
sendMsg("haistart",process.env.PHNO);
sendMessageTemplate(process.env.PHNO);

app.post("/sendMsg", (req, res) => {
  const { message, number } = req.body;
  sendMsg(message, number);
  res.send("Message Sent");
});

let mytoken = "testing";

app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challange = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === mytoken) {
      res.status(200).send(challange);
    } else {
      res.status(403);
    }
  }
});


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Webhook endpoint to handle incoming messages
app.post('/webhook', async (req, res) => {
  const messages = req.body.entry[0].changes[0].value.messages;
  if (messages && messages[0].type === 'image') {
    const mediaId = messages[0].image.id;
    const accessToken = process.env.WHATSAPP_API_TOKEN;
    try {
      const mediaUrl = await getMediaUrl(mediaId, accessToken);
      const cloudinaryUrl = await downloadAndUploadImage(mediaUrl, accessToken);
      console.log('Cloudinary URL:', cloudinaryUrl);


      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing the image:', error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

sendMsg("Hello Peeps", +917907295072);



const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
