const mongoose = require('mongoose');

module.exports = mongoose.Schema({
  sessionCreated: Date,
  round: Number,
  messages: Array,
  feedback: Array,
  relatedIds: Array
});
