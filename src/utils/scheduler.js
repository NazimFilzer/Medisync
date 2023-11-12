const cron = require("node-cron");
const fs = require("fs");
const readline = require("readline");
const whatsappService = require("../services/whatsappService");
const OpenAI = require('openai').OpenAI;
const Response = require('../../models/response');
const Feedback = require("../../models/feedback");
const MedicineNames = require("../../models/medicineName");

let remind_cron;
let medicineNames = [];

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let groupedMedicines = {}; // Global variable to store grouped medicines
let allMedicineNames = new Set();
let allMedicines = [];

function groupMedicinesByDosage(medicineData) {
    const medicines = {
        Morning: [],
        Lunch: [],
        Dinner: [],
    };

    medicineNames = medicineData.slice(2).map(item => item['Medicine name']);

    // Now seach the phone number in the db and update the medicineNames array  

    // const saveMeds = MedicineNames.findOneAndUpdate(
    //     { phone: process.env.PHNO },
    //     { medicineNames },
    //     { new: true }
    // );

    console.log(medicineNames)

    medicineData.forEach((medicine) => {
        const dosage = medicine.Dosage.split(", ");
        dosage.forEach((dose) => {
            const time = dose.split(" ")[1]; // Morning, Lunch, or Dinner
            if (medicines[time]) {
                medicines[time].push({
                    MedicineName: medicine["Medicine name"],
                    Dosage: dose,
                    Duration: medicine.Duration,
                });
                allMedicineNames.add(medicine["Medicine name"]);


            }
        });
    });

    return medicines;
}
function getAllMedicineNames() {
    return Array.from(allMedicineNames);
}

// dietplan
async function generateDietPlanForMedicines(medicineNames) {
    try {
        console.log("Generating diet plan for medicines...");
        if (medicineNames && medicineNames.length > 0) {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a diet recommendation bot. Provide a diet plan considering the dietary needs and restrictions of specific medicines.",
                    },
                    {
                        role: "user",
                        content: `I am taking these medicines: ${medicineNames.join(
                            ", "
                        )}. What diet plan should I follow considering these medicines? Also give  Specific Plans for Breakfast, Lunch and Dinner. Add foods from Indian Diet and give options.`,
                    },
                ],
            });

            return response.choices[0].message.content;
        }
    } catch (err) {
        console.log(err);
    }
}


function readMedicineDataFromFile() {
    const medicineData = [];
    const fileStream = fs.createReadStream("medicine_data.txt");
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    console.log("Reading medicine data from file...");

    rl.on("line", (line) => {
        const [MedicineName, Dosage, Duration] = line.split(" | ");
        if (MedicineName && Dosage && Duration) {
            medicineData.push({
                "Medicine name": MedicineName.trim(),
                Dosage: Dosage.trim(),
                Duration: Duration.trim(),
            });
        } else {
            console.warn("Skipping invalid line:", line);
        }
    });

    rl.on("close", () => {
        groupedMedicines = groupMedicinesByDosage(medicineData);
        scheduleMedicineReminders();
    });
}

async function openAiMedPrecautions(medicineList) {
    try {
        console.log("Calling OpenAI API...");
        if (medicineList && medicineList.length > 0) {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a medical advice bot providing concise prerequisites and precautions for medicine consumption.",
                    },
                    {
                        role: "user",
                        content: `Provide a brief list precautions for these medicines: ${medicineList.join(
                            ", "
                        )}. The output should be concise for WhatsApp messaging Only 3 short points.`,
                    },
                ],
            });

            return response.choices[0].message.content;
        }
    } catch (err) {
        console.log(err);
    }
}

async function sendMedicineReminder(reminder) {

    const saveMeds = await MedicineNames.findOneAndUpdate(
        { phone: process.env.PHNO },
        { medicineNames },
        { new: true }
    );

    if (reminder.meds && reminder.meds.length > 0) {
        const medicineNames = reminder.meds.map(med => med.MedicineName);
        const precautions = await openAiMedPrecautions(medicineNames);
        if (precautions) {
            whatsappService.sendMsg(precautions, reminder.recipientPhone);
        }
        console.log("Sending medicine reminder...",reminder.meds);
        const timeOfDay = reminder.meds[0].Dosage.split(' ')[1]; // Extracting 'Morning', 'Lunch', or 'Dinner'
        // console.log("Sending medicine reminder...", timeOfDay);
        let message = `It's time for your  ${timeOfDay} medication ⏰  : ${reminder.meds
            .map(
                (medicine) => `${medicine.MedicineName}\nDosage: ${medicine.Dosage.split(' ')[0] + " Pill"}\n\n`
            )
            .join("")}`;


        whatsappService.sendMsg(message, reminder.recipientPhone);
        setTimeout(() => {
            whatsappService.sendMessageTemplate(process.env.PHNO);
        }, 3000);
    }
}

function getCurrentTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return { hour: currentHour, minute: currentMinute };
}

function scheduleMedicineReminders() {
    const { hour, minute } = getCurrentTime();
    const reminderTimes = [
        { time: "Morning", schedule: `${minute + 1} ${hour} * * *` },
        { time: "Lunch", schedule: `${minute + 3} ${hour} * * *` },
        { time: "Dinner", schedule: `${minute + 4} ${hour} * * *` },
    ];

    reminderTimes.forEach(({ time, schedule }) => {
        console.log("Scheduling reminder for:", time, schedule);
        cron.schedule(schedule, async () => {
            const meds = groupedMedicines[time];
            if (meds && meds.length > 0) {
                // Schedule main medicine reminder

                sendMedicineReminder({
                    meds,
                    recipientPhone: process.env.PHNO, // Replace with the recipient's phone number
                    time: schedule,
                });

                const feedback = await Feedback.findOneAndUpdate({ phone: process.env.PHNO }, { setReminder: true }, { new: true });

                if (feedback.setReminder === true) {
                    // Schedule follow-up reminder every 1 minutes for 3 times
                    for (let i = 1; i <= 3; i++) {
                        const followUpSchedule = `${minute + i * 1} ${hour} * * *`;
                        remind_cron = cron.schedule(followUpSchedule, () => {
                            sendReminder({
                                meds,
                                recipientPhone: process.env.PHNO, // Replace with the recipient's phone number
                                time: schedule,
                            })
                        });
                    }
                }

            }
        });
    });
}

async function stopCron() {
    remind_cron.stop();
    console.log("remind_cron stopped");
}

async function sendReminder(reminder) {


    const timeOfDay = reminder.meds[0].Dosage.split(' ')[1]; // Extracting 'Morning', 'Lunch', or 'Dinner'
    console.log("Sending medicine reminder...", timeOfDay);
    let message = `It's time for your  ${timeOfDay} medication ⏰  : ${reminder.meds
        .map(
            (medicine) => `${medicine.MedicineName}\nDosage: ${medicine.Dosage.split(' ')[0] + " Pill"}\n\n`
        )
        .join("")}`;


    whatsappService.sendMsg(message, reminder.recipientPhone);
    setTimeout(() => {
        whatsappService.sendMessageTemplate(process.env.PHNO);
    }, 3000);
}

// Export setReminder variable and scheduleMedicineReminders function
module.exports = {
    readMedicineDataFromFile,
    stopCron,  // Export the remind_cron instance
    generateDietPlanForMedicines
};
