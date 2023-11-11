require("dotenv").config();
const cors = require("cors");

const express = require("express");
const bodyParser = require("body-parser");
const {
  sendMsg,
  sendMessageTemplate,
} = require("./src/services/whatsappService");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { getMediaUrl, downloadAndUploadImage } = require("./src/utils/getImage");
const { ocr } = require("./src/utils/ocr");
const { readMedicineDataFromFile } = require("./src/utils/scheduler");
const mongoose = require("mongoose");



const app = express();
app.use(bodyParser.json());
app.use(cors());

// connect to mongooos eand cosole connected
mongoose.connect(process.env.DB).then(console.log('DB Connected'));


app.get("/", (req, res) => {
  res.send("Medication Reminder Service is running.");
});

// Sneding Template
// sendMessageTemplate(process.env.PHNO);

app.post("/getMeds", (req, res) => {
  console.log(req.body);

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
  api_secret: process.env.CLOUD_API_SECRET,
});

// Webhook endpoint to handle incoming messages
app.post("/webhook", async (req, res) => {
  const messages = req.body.entry[0].changes[0].value.messages;
  if (messages && messages[0].type === "image") {
    const mediaId = messages[0].image.id;
    const accessToken = process.env.WHATSAPP_API_TOKEN;
    try {

      const mediaUrl = await getMediaUrl(mediaId, accessToken);
      const cloudinaryUrl = await downloadAndUploadImage(mediaUrl, accessToken);
      console.log("Cloudinary URL:", cloudinaryUrl);
      await ocr(cloudinaryUrl);
      res.sendStatus(200);

    } catch (error) {
      console.error("Error processing the image:", error);
      res.sendStatus(500);
    }
  } if(messages && messages[0].type === "text") { 
    const usermsg = messages[0].text.body;
    if(currentmsg!==usermsg){
      currentmsg=usermsg;
      console.log(messages[0].text.body);
    const response = await openAiMedBot(messages[0].text.body);
    sendMsg(response, process.env.PHNO);
    res.sendStatus(200);

    }
    else{
      console.log("Same Message");
      res.sendStatus(200);
    }
    
    


  }
  else if (messages && messages[0].type === "button" && messages[0].context) {

    console.log(messages);
    const interactiveData = messages.interactive;
    if (messages[0].button.text === "YES") {
      const response= await Response.findOne({phone: process.env.PHNO});
      
      if(response.curremtSession =="Morning"){
        response.Morning = true;
      }




      console.log("User clicked YES");
      sendMsg("you clicked yes", process.env.PHNO);
      // Add your logic here for YES button click
    } else if (messages[0].button.text === "NO") {
      console.log("User clicked NO");
      sendMsg("you clicked no", process.env.PHNO);
      // Add your logic here for NO button click
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(200);
  }
});

//sendMsg("Hello Peeps", process.env.PHNO);
readMedicineDataFromFile();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
