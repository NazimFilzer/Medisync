const axios = require('axios');
const fs = require('fs');
const OpenAI = require('openai').OpenAI;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const { readMedicineDataFromFile } = require('./scheduler');



async function openAiMeds(ocr) {
    try {
        if (ocr) {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a medication planner bot.",
                    },
                    {
                        role: "user",
                        content: `Take the medicine name, medicine dosage and timigs from ${ocr} and convert in the form of 
                        Medicine name | Dosage                  | Duration
                            Medecine1    | 1 Morning, 1 Dinner     | 10 days
                            Medecine1    | 1/2 Morning, 1/2 Dinner | 7 days
                            Medecine1    | 1 Lunch, 1 Dinner       | 10 days
                            Convert to this correct format like this table, I need this table only as output Nothing else`,
                    },
                ],
            });

            console.log(response.choices[0].message.content);
            writeTofile(response.choices[0].message.content);
        }

    } catch (err) {
        console.log(err);
    }
}
/*const medicineNames = getAllMedicineNames();


generateDietPlanForMedicines(medicineNames).then((dietPlan) => {
  console.log("Recommended Diet Plan:", dietPlan);

});
whatsappService.sendMsg(dietPlan, process.env.PHNO);*/


async function ocr(imageUrl) {
    // const imageUrl = "http://res.cloudinary.com/dvlfsldbh/image/upload/v1699634498/hjomkdlac3dilbam72m0.jpg";
    console.log(imageUrl);
    const apiKey = "gcI3MxczYbqSdf84r2JFwN5SAc4CSUCr";
    const requestOptions = {
        method: "GET",
        headers: {
            apikey: apiKey,
        },
    };

    try {
        const response = await axios.get(`https://api.apilayer.com/image_to_text/url?url=${imageUrl}`, requestOptions);
        console.log("Got OCR text");
        await openAiMeds(response.data.all_text);
        readMedicineDataFromFile();

    } catch (error) {
        console.log(error.response.data); // Log the error response
    }
}

module.exports = {
    ocr,
};

writeTofile = (data) => {
    fs.writeFile('medicine_data.txt', data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
}


