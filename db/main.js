const mongoose = require('mongoose');
const SessionSchema = require('./session');

const connect = (dbName) => {
  mongoose.connect(`mongodb://localhost:27017/${dbName}`, {useNewUrlParser: true});
  return mongoose.model('session', SessionSchema);
};

module.exports = {
  connect,
};
