import './App.css';
import React, {useState} from 'react';
import Button from '@mui/material/Button';
import { TextField } from '@mui/material';
import Stack from '@mui/material/Stack';

function Home(props){
    const [roomName, setRoomName] = useState('');

    const createRoom = () => { 
        props.createRoom(roomName);
    }
    
    const joinRoom = () => {
        props.joinRoom(roomName);
    }

    const onChange = (e) => {
        setRoomName(e.currentTarget.value);
    }
    
    return(
        <div className="home">
            <h1 id="welcome"> Welcome to Online Blackjack</h1>
            <Stack spacing={1}>
                <TextField variant="filled" id="roomName" sx={{width: '50ch' }} onChange={onChange}></TextField>
                <Button id="createRoom" variant="contained" onClick={createRoom}>Create Room</Button>
                <Button id="joinRoom" variant="contained" onClick={joinRoom}> Join Room</Button>
            </Stack>
        </div>    
    )
}

export default Home;
