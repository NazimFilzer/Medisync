const cron = require("node-cron");
const fs = require("fs");
const readline = require("readline");
const whatsappService = require("../services/whatsappService");
const OpenAI = require('openai').OpenAI;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let groupedMedicines = {}; // Global variable to store grouped medicines

function groupMedicinesByDosage(medicineData) {
    const medicines = {
        Morning: [],
        Lunch: [],
        Dinner: [],
    };

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
            }
        });
    });

    return medicines;
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
                        content: `Provide a brief list precautions for these medicines: ${medicineList.join(", ")}. The output should be concise for WhatsApp messaging.`,
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
    let message = `It's time to take your medicines: ${reminder.meds
        .map(
            (medicine) => `${medicine.MedicineName}, Dosage: ${medicine.Dosage}`
        )
        .join(" and ")}.`;

    if (reminder.meds && reminder.meds.length > 0) {
        const medicineNames = reminder.meds.map(med => med.MedicineName);
        const precautions = await openAiMedPrecautions(medicineNames);
        if (precautions) {
            whatsappService.sendMsg(precautions, reminder.recipientPhone);
        }
        whatsappService.sendMsg(message, reminder.recipientPhone);
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
        { time: "Lunch", schedule: `${minute + 2} ${hour} * * *` },
        { time: "Dinner", schedule: `${minute + 3} ${hour} * * *` },
    ];

    reminderTimes.forEach(({ time, schedule }) => {
        cron.schedule(schedule, async () => {
            const meds = groupedMedicines[time];
            if (meds && meds.length > 0) {
                sendMedicineReminder({
                    meds,
                    recipientPhone: process.env.PHNO, // Replace with the recipient's phone number
                    time: schedule,
                });
            }
        });
    });
}



module.exports = {
    readMedicineDataFromFile,
};
