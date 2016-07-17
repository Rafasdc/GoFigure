"use strict";

var express    = require("express");
var bodyParser = require("body-parser");

var aiInterface = require("./aiInterface");

var algorithms = require("./algorithms")
//var algorithmsInstance = new algorithms();

var Storage = require('./DBServer');

var app = express();

var db = new Storage('GoFigure');

// use the parse to get JSON objects out of the request. 
app.use(bodyParser.json());

// server static files from the client/ directory.
app.use(express.static('client'));

var games = {};


/**
 * Handle a request for task data.
 */
app.post("/setVisualSettings", function (req, res) {
    console.log("POST Request to: /setVisualSettings");
    db.setVisualSetting(req.body);
    res.status(200).send();
});

app.post('/endGame', function(req, res) {
    console.log("POST Request to: /endGame");
    delete games[req.body.userName];
    res.status(200).send();
});

app.post("/setGame", function (req, res) {
    console.log("POST Request to: /setGame");
    db.setGame(req.body);
    //console.log( "Gurjyot ");

    var userName = req.body.userName;
    //var size = req.body.gameSettings.boardSize
    //games[userName] = makeEmptyBoard(size);
    //console.log(games);
    
    db.getCurrentGame({'userName':userName}, function(docs){
        //console.log(docs);
        games[userName] = [];
        games[userName].push(docs.currentGame.boardState);
    });
    
    //console.log(games[userName]);
    
    res.status(200).send();
});

app.post("/makeAccount", function(req, res){
   
   console.log("POST Request to: /makeAccount"); 
   db.makeAccount(req.body, function(err){
       if(err){
           res.status(401).send();
       }else{
           res.status(200).send();
       }
    
    });
});

app.post("/authenticate", function(req, res){
    console.log("POST Request to: /authenticate");
    db.authenticateUser(req.body, function(err){
        if(err){
            res.status(401).send();
        }else{
            res.status(200).send();
        }
    });
});

app.post("/saveReplay", function(req, res) {
   console.log("POST Request to: /saveReplay");
    var userName = req.body.userName;
    var replayName = req.body.replayName;
    var visualSettings = req.body.visualSettings;
    var boardStates = games[userName];
    
    var replay = {
        "userName" : userName,
        "replayName": replayName,
        "boardStates": boardStates,
        "visualSettings": visualSettings
    }
    
    db.saveReplay(replay, function(docs) {
        res.json(docs);
        //console.log(docs);
        if(docs == null){
            delete games[userName];
            console.log(games);
        }
    });
});




function makeEmptyBoard(size){
    var board = new Array(size);
    for(var i = 0; i<size; i++){
        board[i] = new Array(size);
    }
    
    for(var i = 0; i<size; i++){
        for(var j = 0; j<size; j++){
            board[i][j] = 0;
        }
    }
    
    return board;
}


// get the board data
app.post("/getCurrentGame", function (req, res) {
    console.log("POST Request to: /getCurrentGame");
    db.getCurrentGame(req.body, function(docs){
            //console.log(docs);
            res.json(docs);
        });
  
});

app.post("/makeMove", function(req,res){
    console.log("POST Request to: /makeMove");
    
    
   
    var object = req.body;
    
   // console.log(position);
    //console.log(position.row);
   getPosition(object, function(position, prevBoard){
   
        var isValid = algorithms.validate(object.board, prevBoard, position);
        console.log(isValid);
        var armiesKilled = algorithms.checkDeath(position, object.board);
        //console.log(armiesKilled);
        var numArmiesKilled = armiesKilled.length;
        var scoringSettings = object.gameSettings.scoringSettings;
        var playerTurn = object.turn;
        if(isValid > 0){
            
            if (isValid==1) res.json("Error, Suicidal Move");
            if (isValid==2) res.json("Error, Ko");
            //do bad things here
        }
        
        else {
            if(object.turn == 1){
                object.turn = 2;
            }
            else{
                object.turn = 1;
            }
            for (var i = 0; i < numArmiesKilled; i++) {
                object.board[armiesKilled[i].row][armiesKilled[i].column] = 0;
            }
            var scores = {}
            if (scoringSettings == "Area Scoring") {
                scores = algorithms.areaScoring(object.board);
            } else if (scoringSettings == "Territory Scoring") {
                scores = algorithms.areaScoring(object.board);
                if(playerTurn == 1){
                    object.player2Score = (scores.player2)-numArmiesKilled;
                }
                else{
                    object.player1Score = (scores.player1)-numArmiesKilled;
                }
                
            } else {
                scores = algorithms.stoneScoring(object.board);
            }
            object.player1Score = scores.player1;
            object.player2Score = scores.player2;
        
            db.makeMove(object, function(docs) {
                res.json(docs);
                var userName = req.body.userName;
                games[userName].push(object.board);
                
                //console.log(games[userName]);
            });
            
        
        }   
   });
    
});

function getPosition(object, cb){
    
    var position = {row: 0, column: 0};
        
    
        
    /*prevBoard = */db.getCurrentGame({"userName": object.userName}, function(prevBoard){
        //object.prevBoard = prevBoard;
        for(var i=0; i < object.board.length; i++){
            for(var j=0; j < object.board.length; j++){
                if (object.board[i][j] != prevBoard.currentGame.boardState[i][j]){
                    position.row = i;
                    position.column = j;
                    cb(position, prevBoard);
                }
            }
        }
    })
}



app.post("/pass", function(req,res) {
    console.log("POST Request to: /pass");
    db.passMove(req.body, function(docs) {
       res.json(docs); 
    });
});

app.post("/randomMove", function(req,res){
    //aiInterface.random()
})


// Listen for changes
app.listen(process.env.PORT || 80, function () {
    
    console.log("Listening on port 80");
    
    
    db.connect(function(){
        // some message here....
        
    });
    
    
});




/*
app.post("/add", function (req, res) {

    console.log("POST Request to: /add");
    
    db.addTask(req.body, function(err){
        if(err){
            res.status(500).send();
        }else{
            res.status(200).send();
        }
    });
    
    res.status(200).send();
});

app.post("/remove", function (req, res) {
    
    console.log("POST Request to: /remove");
    console.log(req.body);

    db.removeTask(req.body.id, function(err){
        if(err){
            res.status(500).send();
        }else{
            res.status(200).send();
        }
    });
});
*/
