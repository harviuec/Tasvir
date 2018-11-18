const bcrypt = require('bcrypt');
const xss = require('xss');
const fs = require('fs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const saltRounds = 10;

function createHash(password) {
  return bcrypt.hash(password, saltRounds);
}

function verifyHash(password, hash) {
  return bcrypt.compare(password, hash);
}

const UserSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String
});

const User = mongoose.model('User', UserSchema);

const createUser = (userData) => {
  return createHash(userData.password).then(password => {
    const userName = userData.userName;
    const newUser = new User({userName, password});
    return newUser.save();
  });
};

const checkUser = (userData) => {
  const {userName, password} = userData;
  return User.findOne({userName}).then(user => {
    if (!user) {
      throw new Error('user does not exist');
    }
    const hash = user.password;
    return verifyHash(password, hash).then(result => {
      if (result === false){
        throw new Error('password does not match');
      }
      return user;
    })
  });
};

const verifyDetails = ({userName, password}) => {
  userName = xss(userName);
  password = xss(password);
  return {userName, password};
};

const connectDb = () => {
  mongoose.connect('mongodb://localhost:27017/tasvir', {useNewUrlParser: true});
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback() {
    console.log("Database connected");
  });
};

const checkImageValidity = (image) => {
  const height = image.getHeight();
  const width = image.getWidth();
  const imageMime = image.getMIME().split('/');
  const allowedTypes = ['jpeg', 'jpg', 'png'];
  if (!width || !height || imageMime[0] !== 'image' || allowedTypes.indexOf(imageMime[1]) === -1) {
    return false;
  }
  return true;
};

module.exports = {
  createUser,
  checkUser,
  verifyDetails,
  connectDb,
  checkImageValidity
};

