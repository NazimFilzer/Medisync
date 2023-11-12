const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const medicineNamesSchema = new Schema({
    phone: {
        type: String,
    },
    medicineNames: {
        type: [String], // Array of strings
        default: [],
    }
});

const MedicineNames = mongoose.model('MedicineNames', medicineNamesSchema);

module.exports = MedicineNames;
