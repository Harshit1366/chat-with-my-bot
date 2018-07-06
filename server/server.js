const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const keys = require('../config/keys');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');


// You can find your project ID in your Dialogflow agent settings

// const languageCode = 'en-US';
//
// // Instantiate a DialogFlow client.
// const dialogflow = require('dialogflow');
// const sessionClient = new dialogflow.SessionsClient();
//
// // Define session path
// const sessionPath = sessionClient.sessionPath(APIAI_TOKEN, APIAI_SESSION_ID);





const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));

const apiai = require('apiai')(keys.APIAI_TOKEN);

io.on('connection', (socket) => {
  console.log('New user connected');


  socket.on('chatMessage', (message) => {
    console.log('Message: ' + message.text);

    // Get a reply from API.ai

    // The text query request.
    // const request = {
    //   session: sessionPath,
    //   queryInput: {
    //     text: {
    //       text: message.text,
    //       languageCode: languageCode,
    //     },
    //   },
    // };
    //
    // // Send request and log result
    // sessionClient
    //   .detectIntent(request)
    //   .then(responses => {
    //     console.log('Detected intent');
    //     const result = responses[0].queryResult;
    //     console.log(`  Query: ${result.queryText}`);
    //     console.log(`  Response: ${result.fulfillmentText}`);
    //     if (result.intent) {
    //       console.log(`  Intent: ${result.intent.displayName}`);
    //     } else {
    //       console.log(`  No intent matched.`);
    //     }
    //   })
    //   .catch(err => {
    //     console.error('ERROR:', err);
    //   });

    let apiaiReq = apiai.textRequest(message.text, {
      sessionId: keys.APIAI_SESSION_ID
    });

    apiaiReq.on('response', (response) => {

      //const result = response.queryResult;
      //console.log(`  Response: ${result.fulfillmentText}`);
      console.log('Bot reply: ' + JSON.stringify(response.result.fulfillment.speech));
      socket.emit('newMessage', generateMessage('NCUBot', response.result.fulfillment.speech));
    });

    apiaiReq.on('error', (error) => {
      console.log(error);
    });

    apiaiReq.end();

  });

  socket.on('join', (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return callback('Name and room name are required.');
    }

    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);

    io.to(params.room).emit('updateUserList', users.getUserList(params.room));
    socket.emit('newMessage', generateMessage('NCUBot', 'Welcome to NCU Enquiry Bot Chat. How may I help you?'));
    socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined.`));
    callback();
  });

  socket.on('createMessage', (message, callback) => {
    var user = users.getUser(socket.id);

    if (user && isRealString(message.text)) {
      io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
    }

    callback();
  });

  socket.on('createLocationMessage', (coords) => {
    var user = users.getUser(socket.id);

    if (user) {
      io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
    }
  });

  socket.on('disconnect', () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUserList', users.getUserList(user.room));
      io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
