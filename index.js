const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const multer = require('multer')();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helpers = require('./helper');
const uuid = require('uuid/v4');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const morgan = require('morgan');
const fs = require('fs');
const port = 3000;


// passport configuration
passport.use(new LocalStrategy(
  {usernameField: 'userName'},
  (userName, password, done) => {
    helpers.checkUser({userName, password}).then(user => {
      return done(null, user);
    }).catch(err => {
      return done(err);
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.userName);
});

passport.deserializeUser((userName, done) => {
  done(null, {userName});
});


// express middlewares
const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, '/logs/access.log'), { flags: 'a' });

// setup the logger
app.use(morgan('combined', { stream: accessLogStream }));

app.use(session({
  genid: (req) => {
    return uuid();
  },
  store: new MongoStore({mongooseConnection: mongoose.connection}),
  secret: 'ibn batuta',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


// app routes
app.get('/images/:image', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const imageName = req.params && req.params.image;
      const userName = req.user && req.user.userName;
      const filePath = `./uploads/${userName}/${imageName}`;
      fs.readFile(filePath, function (err, data) {
        if (err) {
          throw err;
        }
        res.writeHead(200, {'Content-Type': 'image/jpeg'});
        res.end(data);
      });
    } else {
      res.sendStatus(401);
    }
  } catch (e) {
    res.sendStatus(500);
  }
});

app.get('/logout', (req, res) => {
  try {
    req.logout();
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(401);
  }
});

app.get('/check', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const userName = req.user && req.user.userName;
      const filePath = `./uploads/${userName}/`;
      fs.readdir(filePath, function (err, items) {
        items = items || [];
        const allImages = [];
        for (let i = 0; i < items.length; i++) {
          allImages.push(`/images/${items[i]}`);
        }
        res.send({images: allImages});
      });
    } else {
      res.sendStatus(401);
    }
  } catch (e) {
    res.sendStatus(500);
  }
});

app.get('/*', (req, res) => res.sendFile(path.join(__dirname, './index.html')));

app.post('/signup', (req, res) => {
  try {
    const userDetails = helpers.verifyDetails(req.body);
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
  passport.authenticate('local', (err, user) => {
    req.login(user, (err) => {
      if (err) {
        return res.sendStatus(401);
      }
      try {
        const userName = user && user.userName;
        const filePath = `./uploads/${userName}/`;
        fs.readdir(filePath, function (err, items) {
          items = items || [];
          const allImages = [];
          for (let i = 0; i < items.length; i++) {
            allImages.push(`/images/${items[i]}`);
          }
          res.send({images: allImages});
        });
      } catch (e) {
        res.sendStatus(500);
      }
    });
  })(req, res);
});

app.post('/resize', multer.single('image'), (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userName = req.user && req.user.userName;
      const newDimension = parseInt(req.body.newSize);
      const fileBuffer = req.file && req.file.buffer;
      Jimp.read(fileBuffer).then(image => {
        if (!helpers.checkImageValidity(image)) {
          throw new Error('invalid file');
        }
        const height = image.getHeight();
        const width = image.getWidth();
        const imageMime = image.getMIME();
        const imageClone = image.clone();
        imageClone.write(`./uploads/${userName}/${Date.now()}.${image.getExtension()}`);
        image.resize(newDimension, newDimension);
        image.getBase64Async(imageMime).then((buffer) => {
          res.send({
            width,
            height,
            newDimension,
            data: buffer
          });
        });
      });
    } catch (e) {
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(401);
  }
});

app.listen(port, () => {
  helpers.connectDb(mongoose);
});