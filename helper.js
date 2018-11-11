const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

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
    const hash = user.password;
    return verifyHash(password, hash).then(result => {
      if (result === false){
        throw new Error('password does not match');
      }
    })
  })
};

module.exports = {
  createUser,
  checkUser
};

