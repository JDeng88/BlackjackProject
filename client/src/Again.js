import './App.css';
import React from 'react';
import Button from '@mui/material/Button';

function Again (props){

    const confirmAgain = () => {
        props.confirmAgain();
    }
   
    return (
        <div className = "Again">
            <Button variant="contained" onClick = {confirmAgain}> Click to play again </Button>
        </div>
    )
}

export default Again;