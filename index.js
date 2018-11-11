const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const multer = require('multer')();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helpers = require('./helper');
const xss = require('xss');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

function connectDb() {
  mongoose.connect('mongodb://localhost/tasvir');
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback() {
    console.log("Database connected");
  });
}

function verifyDetails({userName, password}) {
  userName = xss(userName);
  password = xss(password);
  return {userName, password};
}

app.get('/*', (req, res) => res.sendFile(path.join(__dirname, './index.html')));

app.post('/signup', (req, res) => {
  try {
    const userDetails = verifyDetails(req.body);
    helpers.createUser(userDetails).then(data => {
      res.sendStatus(200);
    }).catch(err => {
      res.sendStatus(500);
    });
  } catch (e) {
    res.sendStatus(500);
  }
});

app.post('/login', (req, res) => {
  const userDetails = verifyDetails(req.body);
  helpers.checkUser(userDetails).then(data => {
    res.sendStatus(200);
  }).catch(err => {
    res.sendStatus(500);
  });
});

app.post('/resize', multer.single('image'), (req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;
  helpers.checkUser({userName, password}).then(() => {
    const size = req.body.newSize;
    const file = req.file;
    const fileBuffer = file && file.buffer;
    Jimp.read(fileBuffer).then(image => {
      const height = image.getHeight();
      const width = image.getWidth();
      if (!width || !height) {
        throw new Error('file not recognized');
      }
      const imageMime = image.getMIME();
      let newDimension = height;
      if (height > width) {
        newDimension = width;
      }
      if (parseInt(size) == size) {
        newDimension = parseInt(size);
      }
      image.resize(newDimension, newDimension);
      image.getBase64Async(imageMime).then((buffer) => {
        res.send({
          width,
          height,
          newDimension,
          data: buffer
        });
      });
    }).catch(err => {
      res.sendStatus(500);
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
  connectDb();
});