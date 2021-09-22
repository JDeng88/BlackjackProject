import './App.css';
import React, {useState, useEffect} from 'react';
import cards from './exports';
import Stack from '@mui/material/Stack';

function PlayerHand (props){
    const [hand, updateHand] = useState([]);
    useEffect(() => {
        var newHand = props.playerHand;
        updateHand(newHand);
    }, [props.playerHand]);
    return (
        <div className = "hand" id="player">
            <h1>Your Hand</h1>
            <Stack spacing={1} direction="row" alignItems="center" justifyContent="center">
                {hand.map((card) => (<img src={cards[card]} alt="Opponent Card" className="card"></img>))}
            </Stack>
        </div>
    )
}

export default PlayerHand;