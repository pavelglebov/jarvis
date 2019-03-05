const mongoose = require('mongoose');

module.exports = mongoose.Schema({
    created: Date,
    round: Number,
    messages: Array,
    feedback: Array
});