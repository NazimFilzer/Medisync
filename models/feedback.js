const mongoose = require('mongoose')
const Schema = mongoose.Schema

const feedbackSchema = new Schema({
    setReminder: {
        type: Boolean,
        default: true,
    }
   
})

const Feedback = mongoose.model('feedback', feedbackSchema)
module.exports = Feedback

