const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);


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

app.use(express.static(__dirname + '/public'));
app.use(cors());
app.use(express.json())

const rooms = [];

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
        var roomIndex = searchRooms(name);
        if (roomIndex != -1){
            fn(false);
        } else {
            socket.join(name);
            var id = socket.id;
            rooms.push({
                roomName: name,
                currentPlayer: id,
                playerOne: id,
                playerTwo: null,
            });
            io.to(id).emit('waiting');
            fn(true);
        }

    })

    socket.on('joinRoom', (name, fn) => {
        var roomIndex = searchRooms(name);
        if (roomIndex == -1){
            fn('nonexist');
        } else {
            if (rooms[roomIndex].playerTwo == null){
                socket.join(name);
                var id = socket.id;
                rooms[roomIndex].playerTwo = id;
                io.to(name).emit('currentPlayer', rooms[roomIndex].playerOne);
                fn('waiting');
                intializeRoom(roomIndex);         
            } else{
                fn('full');
            }
        }
    })

    socket.on('hit', (name, fn) => {
        var roomIndex = searchRooms(name);
        var id = socket.id;
        var newCard = rooms[roomIndex].shoe.shift()
        if (rooms[roomIndex].playerOne == id){
            rooms[roomIndex].playerOneHand.push(newCard);
            var isBust = checkBust(rooms[roomIndex].playerOneHand);
            fn({
                newCard: newCard,
                isBust: isBust
            });
            io.to(rooms[roomIndex].playerTwo).emit('opponentHit');
        } else {
            rooms[roomIndex].playerTwoHand.push(newCard);
            var isBust = checkBust(rooms[roomIndex].playerTwoHand);
            fn({
                newCard: newCard,
                isBust: isBust
            });
            io.to(rooms[roomIndex].playerOne).emit('opponentHit');
        }
    })

    socket.on('stand', (name) => 
    {
        var roomIndex = searchRooms(name);
        var id = socket.id;
        if (rooms[roomIndex].playerOne == id){
            io.to(name).emit('switchPlayer')
        } else {
            var room = rooms[roomIndex];
            io.to(room.roomName).emit('winner', checkWinner(roomIndex));
            io.to(room.playerOne).emit('revealHand', (room.playerTwoHand));
            io.to(room.playerTwo).emit('revealHand', (room.playerOneHand));
        }

    })
})

const searchRooms = (value) => {
    return rooms.findIndex(room => room.roomName == value);
}

function intializeRoom(roomIndex){
    var numDecks = Math.floor(Math.random() * 5) + 1; //random int from 1-5 inclusive, allowing for multiple decks
    var shoe = []; //shoe is term for multiple decks
    for (i = 0; i < numDecks; i++){
        shoe = shoe.concat(deck);
    }
    shoe = shuffle(shoe);
    hands = dealHands(shoe);
    rooms[roomIndex].playerOneHand = hands[0];
    rooms[roomIndex].playerTwoHand = hands[1];
    rooms[roomIndex].shoe = hands[2];
    io.to(rooms[roomIndex].playerOne).emit('initialHands', {
        playerHand: rooms[roomIndex].playerOneHand,
        opponentFirstCard: rooms[roomIndex].playerTwoHand[0],
        currentPlayer: rooms[roomIndex].currentPlayer,
        roomName: rooms[roomIndex].roomName
    }) 
    io.to(rooms[roomIndex].playerTwo).emit('initialHands', {
        playerHand: rooms[roomIndex].playerTwoHand,
        opponentFirstCard: rooms[roomIndex].playerOneHand[0],
        currentPlayer: rooms[roomIndex].currentPlayer,
        roomName: rooms[roomIndex].roomName
    }) 

}

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
    return [playerOneHand, playerTwoHand, shoe];
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
    console.log(sum);
    return sum;
}


function checkWinner(roomIndex){ 
    var lowestDiff = 21;
    var hands = [
        [rooms[roomIndex].playerOne, rooms[roomIndex].playerOneHand], 
        [rooms[roomIndex].playerTwo, rooms[roomIndex].playerTwoHand]
    ];
    var winners = []; //Array to store multiple winners in case of tie
    hands.forEach((element) => {
        var currentDiff = 21 - sumHand(element[1]);
        if (currentDiff >= 0 && currentDiff <  lowestDiff){
            lowestDiff = currentDiff;
            winners = [element[0]];
        } else if(currentDiff == lowestDiff){
            winners.push(element[0]);
        }
    })
    return winners;
}
