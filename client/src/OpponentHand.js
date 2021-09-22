import './App.css';
import React, { useState, useEffect } from 'react';
import cards from './exports'
import Stack from '@mui/material/Stack';

function OpponentHand(props){
    const [opponentHand, updateOpponentHand] = useState([]);
    useEffect(() => {
        updateOpponentHand(props.opponentHand);
    }, [props.opponentHand]);
    return (
        <div className="hand" id="opponent">
            <h1> Your Opponent's hand</h1>
            <Stack spacing={1} direction="row" alignItems="center" justifyContent="center">
                {opponentHand.map((card) => (<img src={cards[card]} alt="Opponent Card" className="card"></img>))}
            </Stack>
        </div>
    )
}

export default OpponentHand;