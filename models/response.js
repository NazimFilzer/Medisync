const mongoose = require('mongoose')
const Schema = mongoose.Schema

const responseSchema = new Schema({
    phone: {
        type: String,
    },
    Morning: {
        type: Boolean,
        default: false,
    },
    Lunch: {
        type: Boolean,
        default: false,
    },
    Dinner: {
        type: Boolean,
        default: false,
    },
    currentSession: {
        type: String,
        default: "Morning",
    }
})

const Response = mongoose.model('response', responseSchema)
module.exports = Response

