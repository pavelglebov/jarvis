const mongoose = require('mongoose');
const SessionSchema = require('./session');
mongoose.connect('mongodb://localhost/jarvis', {useNewUrlParser: true});

module.exports = mongoose.model('session', SessionSchema);