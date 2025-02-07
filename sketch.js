let gameState = "intro";
let board = {};
let tileSize = 60;
let currentPlayer = 'white';
let aiEnabled = false;
let selectedSide = 'curve';
let selectedRotation = 0;
let loopPath = [];
let winner = null;

function setup() {
    createCanvas(800, 600);
    textAlign(CENTER, CENTER);
    document.addEventListener('contextmenu', event => event.preventDefault());
}

function draw() {
    background(220);
    
    if (gameState === "intro") {
        drawIntroScreen();
    } else if (gameState === "game") {
        drawBoard();
        drawCurrentPlayer();
        drawTilePreview();
        drawControls();
        
    } else if (gameState === "gameOver") {
      drawGameOverScreen();
      drawBoard();
      drawLoop();
    }
}

function drawGameOverScreen() {
    fill(0);
    textSize(32);
    text(`${winner} wins!`, width/2, 20);
    
    fill(200);
    rect(width/2 - 100, height/2, 200, 50);
    
    fill(0);
    text("Restart", width/2, height - 100);
}

function drawIntroScreen() {
    fill(0);
    textSize(32);
    text("TRAX", width/2, height/3);
    
    fill(200);
    rect(width/2 - 100, height/2 - 25, 200, 50);
    rect(width/2 - 100, height/2 + 50, 200, 50);
    
    fill(0);
    text("2 Players", width/2, height/2);
    text("vs Computer", width/2, height/2 + 75);
}

function mousePressed() {
    if (gameState === "intro") {
        handleIntroClick();
    } else if (gameState === "game") {
        if (mouseButton === RIGHT) {
            selectedSide = selectedSide === 'curve' ? 'cross' : 'curve';
            selectedRotation = 0;
        } else {
            handleGameClick();
        }
    } else if (gameState === "gameOver") {
        if (mouseX > width/2 - 100 && mouseX < width/2 + 100 &&
            mouseY > height/2 && mouseY < height - 100) {
            restartGame();
        }
    }
}


function handleIntroClick() {
    if (mouseX > width/2 - 100 && mouseX < width/2 + 100) {
        if (mouseY > height/2 - 25 && mouseY < height/2 + 25) {
            startGame(false);
        } else if (mouseY > height/2 + 50 && mouseY < height/2 + 100) {
            startGame(true);
        }
    }
}

function mouseWheel(event) {
    if (gameState === "game" && (!aiEnabled || currentPlayer === 'white')) {
        if (selectedSide === 'curve') {
            // Cycle through all four rotations for curve tiles
            selectedRotation = (selectedRotation + 90) % 360;
        } else if (selectedSide === 'cross') {
            // Only toggle between 0 and 90 for cross tiles
            selectedRotation = (selectedRotation === 0) ? 90 : 0;
        }
    }
    return false;
}

function startGame(ai) {
    gameState = "game";
    aiEnabled = ai;
    board = {'0,0': {side: 'curve', rotation: 0, color: 'white'}};
}

function drawBoard() {
    for (let key in board) {
        let [x, y] = key.split(',').map(Number);
        drawTile(x, y, board[key]);
    }
}

function drawTile(x, y, tile) {
    push();
    translate(width/2 + x * tileSize, height/2 + y * tileSize);
    fill(0);
    stroke(0);
    rect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    push();
    rotate(radians(tile.rotation));
    if (tile.side === 'cross') {
        drawCrossTile(tile.color);
    } else {
        drawCurveTile(tile.color);
    }
    pop();
    drawConnectionDots(tile);
    pop();
}

function drawCrossTile(color) {
    strokeWeight(4);
    
    stroke(255);
    line(-tileSize/2, 0, tileSize/2, 0);

    stroke(200, 0, 0);
    line(0, -tileSize/2, 0, tileSize/2);
}

function drawCurveTile(color) {
    strokeWeight(4);

    stroke(255);
    arc(-tileSize/2, -tileSize/2, tileSize, tileSize, 0, HALF_PI);

    stroke(200, 0, 0);
    arc(tileSize/2, tileSize/2, tileSize, tileSize, PI, PI + HALF_PI);
}

function handleGameClick() {
    if (aiEnabled && currentPlayer === 'red') return;

    let gridX = round((mouseX - width/2) / tileSize);
    let gridY = round((mouseY - height/2) / tileSize);
    let key = `${gridX},${gridY}`;
    
    if (!board[key]) {
        const newTile = {
            side: selectedSide,
            rotation: selectedRotation,
            color: currentPlayer
        };
        
        if (isValidPlacement(gridX, gridY, newTile)) {
            board[key] = newTile;
            checkForcedMoves();
            
            // **Call loop detection after placing a tile**
            checkWinCondition();
            
            currentPlayer = currentPlayer === 'white' ? 'red' : 'white';
            if (aiEnabled) setTimeout(aiMove, 500);
        }
    }
}

function checkForLoop(startKey, color) {
    let visited = new Set();
    let stack = [{ key: startKey, from: null, path: [] }];
    
    while (stack.length > 0) {
        let { key, from, path } = stack.pop();
        
        if (visited.has(key)) {
            loopPath = path.concat([key]); // Store loop path
            return true; // Loop detected
        }
        
        visited.add(key);
        let [x, y] = key.split(',').map(Number);
        let tile = board[key];
        if (!tile) continue;
        
        let connections = getConnections(tile);
        
        for (let [dx, dy, dir] of [[0,-1,'top'], [1,0,'right'], [0,1,'bottom'], [-1,0,'left']]) {
            let neighborKey = `${x+dx},${y+dy}`;
            if (neighborKey !== from && board[neighborKey]) {
                let neighborTile = board[neighborKey];
                let neighborConnections = getConnections(neighborTile);
                let oppositeDir = oppositeDirection(dir);
                
                if (connections[dir] === color && neighborConnections[oppositeDir] === color) {
                    stack.push({ key: neighborKey, from: key, path: path.concat([key]) });
                }
            }
        }
    }
    return false;
}

function restartGame() {
    gameState = "intro";
    board = {};
    currentPlayer = 'white';
    loopPath = [];
    winner = null;
}

function checkWinCondition() {
    loopPath = [];
    for (let key in board) {
        let tile = board[key];
        if (checkForLoop(key, 'white')) {
            winner = 'White';
            gameState = "gameOver";
            return;
        }
        if (checkForLoop(key, 'red')) {
            winner = 'Red';
            gameState = "gameOver";
            return;
        }
    }
}

function drawLoop() {
    if (loopPath.length > 1) {
        stroke(255, 255, 0);
        strokeWeight(6);
        noFill();
        beginShape();
        for (let key of loopPath) {
            let [x, y] = key.split(',').map(Number);
            let screenX = width/2 + x * tileSize;
            let screenY = height/2 + y * tileSize;
            vertex(screenX, screenY);
        }
        endShape(CLOSE);
    }
  noStroke();
}

function checkForcedMoves() {
    let forcedMoveFound = true;
    
    while (forcedMoveFound) {
        forcedMoveFound = false;
        
        // Find empty adjacent spaces
        let emptySpaces = findEmptyAdjacentSpaces();
        
        for (let {x, y} of emptySpaces) {
            let forcedTile = findForcedTile(x, y);
            
            if (forcedTile) {
                let key = `${x},${y}`;
                board[key] = forcedTile;
                forcedMoveFound = true;
                break; // Restart the process to check for new forced moves
            }
        }
    }
}

function findEmptyAdjacentSpaces() {
    let emptySpaces = [];
    let boardKeys = Object.keys(board);
    
    for (let key of boardKeys) {
        let [x, y] = key.split(',').map(Number);
        
        // Check adjacent spaces
        for (let [dx, dy] of [[0,1], [1,0], [0,-1], [-1,0]]) {
            let checkKey = `${x+dx},${y+dy}`;
            if (!board[checkKey]) {
                emptySpaces.push({x: x+dx, y: y+dy});
            }
        }
    }
    
    return [...new Set(emptySpaces.map(space => JSON.stringify(space)))].map(JSON.parse);
}

function findForcedTile(x, y) {
    let adjacentColors = {white: 0, red: 0};
    let forcedColor = null;
    
    // Check adjacent tiles
    for (let [dx, dy] of [[0,1], [1,0], [0,-1], [-1,0]]) {
        let key = `${x+dx},${y+dy}`;
        let tile = board[key];
        
        if (tile) {
            let connections = getConnections(tile);
            let dir = getDirection(dx, dy);
            let oppDir = oppositeDirection(dir);
            
            if (connections[oppDir]) {
                adjacentColors[connections[oppDir]]++;
            }
        }
    }
    
    // Determine if a forced move exists
    if (adjacentColors.white === 2) forcedColor = 'white';
    if (adjacentColors.red === 2) forcedColor = 'red';
    
    if (forcedColor) {
        // Determine forced tile type and rotation based on existing connections
        return findForcedTileConfiguration(x, y, forcedColor);
    }
    
    return null;
}

function findForcedTileConfiguration(x, y, forcedColor) {
    // Check existing adjacent connections to determine tile configuration
    let possibleTiles = [
        {side: 'curve', rotation: 0},
        {side: 'curve', rotation: 90},
        {side: 'curve', rotation: 180},
        {side: 'curve', rotation: 270},
        {side: 'cross', rotation: 0},
        {side: 'cross', rotation: 90}
    ];
    
    for (let tile of possibleTiles) {
        tile.color = forcedColor;
        if (isValidPlacement(x, y, tile)) {
            return tile;
        }
    }
    
    return null;
}

function isValidPlacement(x, y, tile) {
    if (Object.keys(board).length === 0) return true;
    
    const adjacent = [[0,1], [1,0], [0,-1], [-1,0]].some(([dx, dy]) => 
        board[`${x+dx},${y+dy}`]
    );
    if (!adjacent) return false;

    const newConn = getConnections(tile);
    
    for (let [dx, dy] of [[0,1], [1,0], [0,-1], [-1,0]]) {
        const adjKey = `${x+dx},${y+dy}`;
        const adjTile = board[adjKey];
        if (adjTile) {
            const adjConn = getConnections(adjTile);
            const dir = getDirection(dx, dy);
            const oppDir = oppositeDirection(dir);
            
            if (newConn[dir] !== adjConn[oppDir]) {
                return false;
            }
        }
    }
    return true;
}

function getDirection(dx, dy) {
    if (dx === 0 && dy === -1) return 'top';
    if (dx === 1 && dy === 0) return 'right';
    if (dx === 0 && dy === 1) return 'bottom';
    if (dx === -1 && dy === 0) return 'left';
}

function oppositeDirection(dir) {
    return {top: 'bottom', right: 'left', bottom: 'top', left: 'right'}[dir];
}

function drawConnectionDots(tile) {
    let connections = getConnections(tile);
    strokeWeight(8);
    
    // Top
    if (connections.top) stroke(connections.top === 'white' ? 255 : color(200, 0, 0));
    point(0, -tileSize/2);
    
    // Right
    if (connections.right) stroke(connections.right === 'white' ? 255 : color(200, 0, 0));
    point(tileSize/2, 0);
    
    // Bottom
    if (connections.bottom) stroke(connections.bottom === 'white' ? 255 : color(200, 0, 0));
    point(0, tileSize/2);
    
    // Left
    if (connections.left) stroke(connections.left === 'white' ? 255 : color(200, 0, 0));
    point(-tileSize/2, 0);
}

function getConnections(tile) {
    const connections = {top: null, right: null, bottom: null, left: null};
    
    if (tile.side === 'cross') {
        // Cross tiles have consistent connections, but they need to adjust based on rotation
        switch (tile.rotation) {
            case 0:
                connections.top = connections.bottom = 'red';
                connections.left = connections.right = 'white';
                break;
            case 90:
                connections.top = connections.bottom = 'white';
                connections.left = connections.right = 'red';
                break;
            case 180:
                connections.top = connections.bottom = 'red';
                connections.left = connections.right = 'white';
                break;
            case 270:
                connections.top = connections.bottom = 'white';
                connections.left = connections.right = 'red';
                break;
        }
    } else {
        // Curve tiles: The connection ends will have matching colours.
        switch (tile.rotation) {
            case 0:
                connections.top = connections.left = 'white';
                connections.bottom = connections.right = 'red';
                break;
            case 90:
                connections.top = connections.right = 'white';
                connections.bottom = connections.left = 'red';
                break;
            case 180:
                connections.bottom = connections.right = 'white';
                connections.top = connections.left = 'red';
                break;
            case 270:
                connections.bottom = connections.left = 'white';
                connections.top = connections.right = 'red';
                break;
        }
    }
    return connections;
}

function drawTilePreview() {
    if (aiEnabled && currentPlayer === 'red') return;
    
    let gridX = round((mouseX - width/2) / tileSize);
    let gridY = round((mouseY - height/2) / tileSize);
    
    push();
    translate(width/2 + gridX * tileSize, height/2 + gridY * tileSize);
    rotate(radians(selectedRotation));
    
    fill(0, 150);
    stroke(0, 150);
    rect(-tileSize/2, -tileSize/2, tileSize, tileSize);
    
    if (selectedSide === 'cross') {
        drawCrossTile(currentPlayer);
    } else {
        drawCurveTile(currentPlayer);
    }
    pop();
}

function drawControls() {
    fill(0);
    textSize(16);
    text(`Rotation: ${selectedRotation}°`, width - 100, 30);
    text(`Tile Type: ${selectedSide}`, width - 100, 50);
    text("Right-click: Flip tile\nMouse wheel: Rotate", width - 100, 80);
}

function drawCurrentPlayer() {
    fill(0);
    textSize(24);
    text(`Current Player: ${currentPlayer}`, width/2, 50);
}

// AI Move function (placeholder - needs implementation)
function aiMove() {
    // TODO: Implement AI move logic
    currentPlayer = 'white';
}