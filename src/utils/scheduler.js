const cron = require("node-cron");
const fs = require('fs');
const readline = require('readline');
const whatsappService = require("../services/whatsappService");
const axios = require("axios");

let groupedMedicines = {}; // Global variable to store grouped medicines
let morningMedicines = [];
let lunchMedicines = [];
let dinnerMedicines = {};

function groupMedicinesByDosage(medicineData) {
    const medicines = {
        'Morning': [],
        'Lunch': [],
        'Dinner': []
    };

    medicineData.forEach((medicine) => {
        const dosage = medicine.Dosage.split(', ');
        dosage.forEach((dose) => {
            const time = dose.split(' ')[1]; // Morning, Lunch, or Dinner
            if (medicines[time]) {
                medicines[time].push({
                    MedicineName: medicine['Medicine name'],
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
    const fileStream = fs.createReadStream('medicine_data.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    console.log('Reading medicine data from file...')

    rl.on('line', (line) => {
        const [MedicineName, Dosage, Duration] = line.split(' | ');

        // Check if all expected fields are present
        if (MedicineName && Dosage && Duration) {
            medicineData.push({
                'Medicine name': MedicineName.trim(),
                Dosage: Dosage.trim(),
                Duration: Duration.trim(),
            });
        } else {
            console.warn('Skipping invalid line:', line);
        }
    });

    rl.on('close', async () => {
        groupedMedicines = groupMedicinesByDosage(medicineData);
        scheduleMedicineReminders();
    });
}

function printMedicines(time, meds) {
    console.log(`Medicines to be taken in ${time}:`);
    if (meds && meds.length > 0) {
        meds.forEach((medicine) => {
            console.log(`Medicine Name: ${medicine.MedicineName}`);
            console.log(`Dosage: ${medicine.Dosage}`);
            console.log(`Duration: ${medicine.Duration}`);
            console.log('------------------------');
        });
    } else {
        console.log('No medicines to be taken.');
    }
}

function sendMedicineReminder(reminder) {
    let message = '';

    if (reminder.time.includes('Morning')) {
        // Accumulate morning medicines
        morningMedicines.push(`${reminder.medName}, Dosage: ${reminder.dosage}`);
    } else if (reminder.time.includes('Lunch')) {
        // Accumulate lunch medicines
        lunchMedicines.push(`${reminder.medName}, Dosage: ${reminder.dosage}`);
    } else if (reminder.time.includes('Dinner')) {
        // Accumulate dinner medicines
        dinnerMedicines.push(`${reminder.medName}, Dosage: ${reminder.dosage}`);
    } else {
        // Send messages for other times
        if (reminder.meds && reminder.meds.length > 0) {
            message = `It's time to take your medicines: ${reminder.meds.map(medicine => `${medicine.MedicineName}, Dosage: ${medicine.Dosage}`).join(' and ')}.`;
        }
    }

    if (message) {
        whatsappService.sendMsg(message, reminder.recipientPhone);
    }
}

function getCurrentTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return { hour: currentHour, minute: currentMinute };
}

const hour = getCurrentTime().hour;
const min = getCurrentTime().minute;

function scheduleMedicineReminders() {
    const reminders = [
        { time: `${min + 1} ${hour} * * *`, meds: groupedMedicines['Morning'] },
        { time: `${min + 2} ${hour} * * *`, meds: groupedMedicines['Lunch'] },
        { time: `${min + 3} ${hour} * * *`, meds: groupedMedicines['Dinner'] },
    ];

    reminders.forEach((reminder) => {
        cron.schedule(reminder.time, () => {
            printMedicines(reminder.time, reminder.meds);

            if (reminder.time.includes('Morning')) {
                // Morning message
                if (morningMedicines.length > 0) {
                    const message = `It's time to take your medicines: ${morningMedicines.join(' and ')}.`;
                    whatsappService.sendMsg(message, reminder.recipientPhone);
                    morningMedicines = []; // Clear the morning medicines
                }
            } else if (reminder.time.includes('Lunch')) {
                // Lunch message
                if (lunchMedicines.length > 0) {
                    const message = `It's time to take your medicines: ${lunchMedicines.join(' and ')}.`;
                    whatsappService.sendMsg(message, reminder.recipientPhone);
                    lunchMedicines = []; // Clear the lunch medicines
                }
            } else if (reminder.time.includes('Dinner')) {
                // Dinner message
                if (dinnerMedicines.length > 0) {
                    const message = `It's time to take your medicines: ${dinnerMedicines.join(' and ')}.`;
                    whatsappService.sendMsg(message, reminder.recipientPhone);
                    dinnerMedicines = []; // Clear the dinner medicines
                }
            } else {
                // Messages for other times
                sendMedicineReminder({
                    medName: reminder.meds[0].MedicineName,
                    dosage: reminder.meds[0].Dosage,
                    recipientPhone: '+917907295072', // Replace with the recipient's phone number
                    time: reminder.time,
                    meds: reminder.meds,
                });
            }
        });
    });
}

module.exports = {
    readMedicineDataFromFile,
};
