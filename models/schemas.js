const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerSchema = new Schema({
    playerID: {
        type: String,
        required: true
    },
    hand: {
        type: Array
    }
})

const RoomSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    playerOne: {
        type: PlayerSchema,
    },
    playerTwo: {
        type: PlayerSchema,
    },
    shoe: {
        type: Array,
    },
    winner: {
        type: String
    },
    currentPlayer: {
        type: String
    }
})



// module.exports = Room = mongoose.model('room', RoomSchema);
// module.exports = Player = mongoose.model('player', PlayerSchema);

module.exports = {
    Room: mongoose.model('room', RoomSchema),
    Player: mongoose.model('player', PlayerSchema)
}