import './App.css';
import React, {useState, useEffect} from 'react';
import io from 'socket.io-client';
import Home from './Home';
import Waiting from './Waiting'
import OpponentHand from './OpponentHand';
import PlayerHand from './PlayerHand';
import PlayerActions from './PlayerActions';
import Snackbar from '@mui/material/Snackbar';

const socket = io.connect('http://localhost:5000');

function App() {

  const [lobbyState, updateLobbyState] = useState('');
  const [playerHand, updatePlayerHand] = useState([]);
  const [opponentHand, updateOpponentHand] = useState([]);
  const [currentPlayer, updateCurrentPlayer] = useState(false);
  const [roomName, updateRoomName] = useState();
  const [isBust, updateIsBust] = useState(false);
  const [winStatus, updateWinStatus] = useState(false);
  const [errorStatus, updateErrorStatus] = useState({
      status: false,
      message: '',
  });

  const createRoom = (roomName) => { 
    socket.emit('createRoom', roomName, function(status){
      if(status){
        updateLobbyState('waiting');
        updateCurrentPlayer(true);
      } else {
        updateErrorStatus({
          status: true,
          message: "This room already exists",
        })
      }
    });
    
  }

  const joinRoom = (roomName) => { 
    socket.emit('joinRoom', roomName, function(status){
      if (status === 'waiting'){
        updateLobbyState(status);
      } else {
        if (status === 'full'){
          updateErrorStatus({
            status: true,
            message: "This room is already full"
          })
        } else if (status === 'nonexist'){
            updateErrorStatus({
              status: true,
              message: "The room you are looking for does not exist"
            })
        }
      }
    });
  }

  const hit = () => {
    socket.emit('hit', roomName, function(res){ 
      console.log('old player hand is ' + playerHand);
      updatePlayerHand((playerHand) => [...playerHand, res.newCard]);
      updateIsBust(res.isBust);
      if (res.isBust) {
        stand();
      }
      updateLobbyState('started');
      console.log('new player hand is ' + playerHand);
    });
  }

  const stand = () => {
    socket.emit('stand', roomName);
  }

  useEffect(() => {
  
    socket.once('initialHands', (data) => {
      updateRoomName(data.roomName);
      updatePlayerHand((playerHand) => [...data.playerHand]);
      updateOpponentHand((opponentHand) => [data.opponentFirstCard, 'back']); 
      updateLobbyState('started');
    })
    
    socket.off('switchPlayer').once('switchPlayer', () => {
      updateCurrentPlayer(!currentPlayer);
    })
  
    socket.off('opponentHit').once('opponentHit', () => {
      console.log('opponent smacked');
      updateOpponentHand((opponentHand) => [...opponentHand, 'back']);
    })

    socket.on('winner', (winner) => {
      updateLobbyState('over');
      if (winner.length === 0){
        updateWinStatus('bust');
      } else if (winner.length === 2){
        updateWinStatus('draw');
      } else if (winner[0] === socket.id){
        updateWinStatus('won');
      } else {
        updateWinStatus('lost');
      }
    });

    socket.on('revealHand', (hand) => {
      updateOpponentHand((opponentHand) => [...hand]);
    })

  })

  const updateMessage = () => {
    var message;
    if (lobbyState === 'started'){
      if (!isBust){
        if (currentPlayer){
          message = <div> <PlayerActions hit={hit} stand={stand} /> </div>
        } else {
          message = <h1> It is your opponents turn. </h1>
        }
      } else {
        message = <h1> You are bust </h1>
      }
    } else {
      switch(winStatus){
        case('draw'):
          message = <h1> You tied </h1>
          break;
        case('won'):
          message = <h1> You win</h1>
          break;
        case('lost'):
          message = <h1> You lose </h1>
          break;
        case('bust'):
          message = <h1> Both players lose </h1>
          break;
        default:
          break;
      }
    }
    return message;
  }

  const updateAlert = () => {
    var alert = (<Snackbar
                  open={errorStatus.status}
                  autoHideDuration={6000}
                  message={errorStatus.message}
                  onClose={() => {updateErrorStatus({
                                    status: false,
                                    message: '',
                                    })
                                  }}
                />)
                
    return alert;
  }

  switch(lobbyState){
    case 'started':
    case 'over':
      let message = updateMessage();
      return (
        <div className="lobby">
          <OpponentHand opponentHand = {opponentHand}/>
          <PlayerHand playerHand = {playerHand} />
          {message}
        </div>
    )
    case 'waiting':
      return (
        <Waiting />
      )
    default:
      let alert = updateAlert();
      return (
        <div className="homeComponent">
          {alert}
          <div className="ui">
            <Home 
              createRoom={createRoom} 
              joinRoom={joinRoom}
            />    
          </div>           
        </div> 
      )
  } 
}

export default App;
