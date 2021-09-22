import './App.css';
import React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

function PlayerActions (props){

    const hit = () => {
        props.hit();
    }
    
    const stand = () => {
        props.stand();
    }

    return (
        <div className = "actions">
            <Stack spacing={1} direction="row" justifyContent="center"> 
                <Button variant="contained" onClick = {hit}> Hit </Button>
                <Button variant="contained" onClick = {stand}> Stand </Button>
            </Stack>
        </div>
    )
}

export default PlayerActions;