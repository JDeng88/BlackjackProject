const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);
const mongoose = require('mongoose');


app.use(express.static(__dirname + '/public'));
app.use(cors());
app.use(express.json())

const db = process.env.DB_URI || require('./config/keys').mongoURI;
mongoose
    .connect(db)
    .then(() => console.log('database sucessfully connected'))
    .catch(err => console.log(err));

const schemas = require('./models/schemas');
const Player = schemas.Player;
const Room = schemas.Room;

const io = require('socket.io')(server, {
    cors: {
      origins: [port]
    }
  });


const deck = ["D2", "C2", "H2", "S2", 
            "D3", "C3", "H3", "S3", 
            "D4", "C4", "H4", "S4", 
            "D5", "C5", "H5", "S5", 
            "D6", "C6", "H6", "S6", 
            "D7", "C7", "H7", "S7",
            "D8", "C8", "H8", "S8", 
            "D9", "C9", "H9", "S9", 
            "DT", "CT", "HT", "ST", 
            "DJ", "CJ", "HJ", "SJ", 
            "DQ", "CQ", "HQ", "SQ", 
            "DK", "CK", "HK", "SK", 
            "DA", "CA", "HA", "SA"]

//D = diamond, C = club, H = heart, S = spade, T= ten, J = Jack, Q = Queen, K = King, A = Ace


if (process.env.NODE_ENV === 'production'){
    app.use(express.static('client/build'));
    app.get('*', (req, res)  => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    })
}

server.listen(port, () => {
    console.log("Listening on port " + port);
})



io.on('connection', socket => {
    socket.on('createRoom', (name, fn) => {     
        (async () => {
            var room = await handleCreateRoom(name, socket.id);
            if (room == null){
                fn(false);
            } else {
                socket.join(room.name);
                fn(true);
            }
        })()
    })

    socket.on('joinRoom', (name, fn) => {     
        (async () => {
            var room = await handleJoinRoom(name, socket.id);
            if (room == null){
                fn('nonexist');
            } else if (room.playerTwo != null){
                fn('full');
            }
            try {
                socket.join(room.name);
                io.to(room.playerOne.playerID).emit('initialHands', {
                    playerHand: room.playerOne.hand,
                    opponentFirstCard: room.playerTwo.hand[0],
                    currentPlayer: room.currentPlayer,
                }) 
                io.to(room.playerTwo.playerID).emit('initialHands', {
                    playerHand: room.playerTwo.hand,
                    opponentFirstCard: room.playerOne.hand[0],
                    currentPlayer: room.currentPlayer,
                })
            } catch(err) {
                console.log(err);
            }
            
        })()
    })

    socket.on('hit', (fn) => { 
        var id = socket.id;
        (async () => {
            var room = await Room.findOne({currentPlayer: id});
            var newCard = room.shoe.shift();
            if (room.playerOne.playerID == id){
                room.playerOne.hand.push(newCard);
                await room.save();
                var isBust = checkBust(room.playerOne.hand);
                fn({
                    newCard: newCard,
                    isBust: isBust
                })
                io.to(room.playerTwo.playerID).emit('opponentHit');
            } else {
                room.playerTwo.hand.push(newCard);
                await room.save();
                var isBust = checkBust(room.playerTwo.hand); //socket.emit to everyone except socket
                fn({
                    newCard: newCard,
                    isBust: isBust
                })
                io.to(room.playerOne.playerID).emit('opponentHit');
            }
        })()
    })

    socket.on('stand', () => 
    {
        (async () => {
            var id = socket.id;
            var room = await Room.findOne({currentPlayer: id});
            if (room.playerOne.playerID == id){
                room.currentPlayer = room.playerTwo.playerID;
                await room.save();
                io.to(room.name).emit('switchPlayer');
            } else {
                var hands = [[room.playerOne.hand, room.playerOne.playerID], [room.playerTwo.hand, room.playerTwo.playerID]];
                io.to(room.name).emit('winner', checkWinner(hands));
                io.to(room.playerOne.playerID).emit('revealHand', room.playerTwo.hand);
                io.to(room.playerTwo.playerID).emit('revealHand', room.playerOne.hand);
            }
        })()
    })

    socket.on('disconnect', () => { //TODO: remove rooms
        (async () => {
            var id = socket.id;
            var room = await Room.findOne({"playerOne.playerID": id});
            if (room == null){
                room = await Room.findOne({"playerTwo.playerID": id});
                if (room != null){
                    room.playerTwo = null;
                    await room.save();
                } else {
                    return;
                }
            } else {
                room.playerOne = null;
                await room.save();
            }
            if (room.playerOne == null && room.playerTwo == null){
                Room.deleteOne({name: room.name}, function(err){
                    if (err){
                        console.log(err);
                    }
                });

            }
        })()
    })

    socket.on('again', () => {
        (async () => {
            var id = socket.id;
            var room = await Room.findOne({"playerOne.playerID": id});
            if (room == null){
                room = await Room.findOne({"playerTwo.playerID": id});
                room.playerTwo.again = true;
                await room.save();
            } else {
                room.playerOne.again = true;
                await room.save();
            }
            if (room.playerOne.again && room.playerTwo.again){
                room = await initializeRoom(room, room.playerOne.playerID, room.playerTwo.playerID);
                io.to(room.playerOne.playerID).emit('initialHands', {
                    playerHand: room.playerOne.hand,
                    opponentFirstCard: room.playerTwo.hand[0],
                    currentPlayer: room.currentPlayer,
                }) 
                io.to(room.playerTwo.playerID).emit('initialHands', {
                    playerHand: room.playerTwo.hand,
                    opponentFirstCard: room.playerOne.hand[0],
                    currentPlayer: room.currentPlayer,
                })
            }
        })()
    })


})



function shuffle(array) { //Fisher-Yates shuffle
    var m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    } 
    return array;
  }

function dealHands(shoe){
    var playerOneHand = [];
    var playerTwoHand = [];
    playerOneHand = playerOneHand.concat(shoe.shift());
    playerTwoHand = playerTwoHand.concat(shoe.shift());
    playerOneHand = playerOneHand.concat(shoe.shift());
    playerTwoHand = playerTwoHand.concat(shoe.shift());
    return [shoe, playerOneHand, playerTwoHand];
}

function checkBust(hand){
    var sum = sumHand(hand);
    if (sum > 21){
        return true;
    } else {
        return false;
    }
}

function sumHand(hand){ 
    var numAces = 0;
    var sum = 0;
    hand.forEach((card) => {
        var value = card.charAt(1);
        if (value == 'A'){
            numAces += 1;
            sum++;
        } else if (isNaN(value)){
            sum += 10;
        } else{
            sum += parseInt(value);
        }
    })
    while (numAces > 0){
        if (sum + 10 <= 21){
            sum += 10;
        } else {
            break;
        }
    }
    return sum;
}


function checkWinner(hands){ 
    var lowestDiff = 21;
    var winners = []; //Array to store multiple winners in case of tie
    hands.forEach((element) => {
        var currentDiff = 21 - sumHand(element[0]); //element[0] is the hand, element[1] is the player id
        if (currentDiff >= 0 && currentDiff <  lowestDiff){
            lowestDiff = currentDiff;
            winners = [element[1]];
        } else if(currentDiff == lowestDiff){
            winners.push(element[1]);
        }
    })
    return winners;
}

async function handleJoinRoom(name, id){
    var room = await Room.findOne({name: name});
    if (room == null){
        return null;
    } else {
        return initializeRoom(room, room.playerOne.playerID, id);
    }
}

async function handleCreateRoom(name, id){
    var room = await Room.findOne({name: name});
    if (room == null){
        var newPlayer = new Player({
            playerID: id
        })
        var newRoom = new Room({
            name: name,
            playerOne: newPlayer
        })
       await newRoom.save();
       return newRoom;
    } else {
        return null;
    }
}

async function initializeRoom(room, playerOneID, playerTwoID){
    var numDecks = Math.floor(Math.random() * 5) + 1; //random int from 1-5 inclusive, allowing for multiple decks
    var shoe = []; //shoe is term for multiple decks
    for (i = 0; i < numDecks; i++){
        shoe = shoe.concat(deck);
    }
    shoe = shuffle(shoe);
    hands = dealHands(shoe); //0 is shoe, 1 is p1, 2 is p2
    var playerOne = new Player({
        playerID: playerOneID,
        hand: hands[1]
    });
    var playerTwo = new Player({
        playerID: playerTwoID,
        hand: hands[2]
    })
    room.playerOne = playerOne;
    room.playerTwo = playerTwo;
    room.shoe = hands[0];
    room.currentPlayer = room.playerOne.playerID;
    await room.save();
    return room;
}




