const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const multer = require('multer')();
const app = express();
const port = 3000;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, './index.html')));

app.post('/resize', multer.single('image'), (req, res) => {
  const file = req.file;
  const fileBuffer = file && file.buffer;
  Jimp.read(fileBuffer).then(image => {
    const height = image.getHeight();
    const width = image.getWidth();
    const imageMime = image.getMIME();
    let newDimension = height;
    if (height > width) {
      newDimension = width;
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
    res.send(err);
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));