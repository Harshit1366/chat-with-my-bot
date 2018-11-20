const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const keys = require('../config/keys');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');

const publicPath = path.join(__dirname, '../public');
const viewPath = path.join(__dirname, '../views');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);

app.use(express.static(publicPath));
app.use(express.static(viewPath));

const apiai = require('apiai')(keys.APIAI_TOKEN);

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('chatMessage', (message) => {
    console.log('Message: ' + message.text);

    let apiaiReq = apiai.textRequest(message.text, {
      sessionId: keys.APIAI_SESSION_ID
    });

    apiaiReq.on('response', (response) => {
      console.log('Bot reply: ' + JSON.stringify(response.result.fulfillment.speech));
      socket.emit('newMessage', generateMessage('MMB Admin', response.result.fulfillment.speech));
    });

    apiaiReq.on('error', (error) => {
      console.log(error);
    });

    apiaiReq.end();

  });


  socket.on('chat message', (message) => {
    console.log('Message: ' + message);

    let apiaiReq = apiai.textRequest(message, {
      sessionId: keys.APIAI_SESSION_ID
    });

    apiaiReq.on('response', (response) => {
      let aiText = response.result.fulfillment.speech;
      console.log('Bot reply: ' + aiText);
      socket.emit('bot reply', aiText);
    });

    apiaiReq.on('error', (error) => {
      console.log(error);
    });

    apiaiReq.end();

  });


  socket.on('join', (params, callback) => {
    socket.emit('newMessage', generateMessage('MMB Admin', 'Welcome to MMB Enquiry Bot Chat. How may I help you?'));
    callback();
  });


  socket.on('createMessage', (message, callback) => {
      io.emit('newMessage', generateMessage('You', message.text));
    callback();
  });


  socket.on('createLocationMessage', (coords) => {
      io.emit('newLocationMessage', generateLocationMessage('You', coords.latitude, coords.longitude));
  });

});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
