let gameState = "intro";
let board = {};
let tileSize = 60;
let currentPlayer = "white";
let aiEnabled = true;
let selectedSide = "curve";
let selectedRotation = 0;
let loopPath = [];
let winningLine = [];
let winningLineType = null; // 'horizontal' or 'vertical'
let winningLineEdges = null;
let winningPlayer = null;
let lastPlayedTile = null;
let forcedMoveTiles = new Set(); // Store coordinates of forced move tiles

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  strokeCap(SQUARE);
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
    drawWinningLine();
  }
}

function drawGameOverScreen() {
  fill(0);
  textSize(32);
  text(`${winningPlayer} wins!`, width / 2, 20);

  fill(200);
  rect(width / 2 - 100, height - 80, 200, 50);

  fill(0);
  text("Restart", width / 2, height - 50);
}

function drawIntroScreen() {
  fill(0);
  textSize(32);
  text("TRAX", width / 2, height / 3);

  fill(200);
  rect(width / 2 - 100, height / 2 - 25, 200, 50);
  rect(width / 2 - 100, height / 2 + 50, 200, 50);

  fill(0);
  text("2 Player", width / 2, height / 2);
  text("vs AI", width / 2, height / 2 + 75);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  if (!fullscreen()) {
    fullscreen(true);
    resizeCanvas(windowWidth, windowHeight);
  }

  if (gameState === "intro") {
    handleIntroClick();
  } else if (gameState === "game") {
    if (mouseButton === RIGHT) {
      selectedSide = selectedSide === "curve" ? "cross" : "curve";
      selectedRotation = 0;
    } else {
      handleGameClick();
    }
  } else if (gameState === "gameOver") {
    if (
      mouseX > width / 2 - 100 &&
      mouseX < width / 2 + 100 &&
      mouseY > height - 300 &&
      mouseY < height
    ) {
      restartGame();
    }
  }
}

function handleIntroClick() {
  if (mouseX > width / 2 - 100 && mouseX < width / 2 + 100) {
    if (mouseY > height / 2 - 25 && mouseY < height / 2 + 25) {
      startGame(false);
    } else if (mouseY > height / 2 + 50 && mouseY < height / 2 + 100) {
      startGame(true);
    }
  }
}

function mouseWheel(event) {
  if (gameState === "game" && (!aiEnabled || currentPlayer === "white")) {
    if (selectedSide === "curve") {
      // Cycle through all four rotations for curve tiles
      selectedRotation = (selectedRotation + 90) % 360;
    } else if (selectedSide === "cross") {
      // Only toggle between 0 and 90 for cross tiles
      selectedRotation = selectedRotation === 0 ? 90 : 0;
    }
  }
  return false;
}

function startGame(ai) {
  gameState = "game";
  aiEnabled = ai;
  board = { "0,0": { side: "curve", rotation: 0, color: "white" } };
  lastPlayedTile = { x: 0, y: 0 }; // Initial tile
  forcedMoveTiles.clear();
}

function drawBoard() {
  for (let key in board) {
    let [x, y] = key.split(",").map(Number);
    drawTile(x, y, board[key]);
  }
}

function drawTile(x, y, tile) {
  push();
  translate(width / 2 + x * tileSize, height / 2 + y * tileSize);
  


  fill(0);
  stroke(0);
  rect(-tileSize / 2, -tileSize / 2, tileSize, tileSize);



  push();
  rotate(radians(tile.rotation));
  if (tile.side === "cross") {
    drawCrossTile(tile.color);
  } else {
    drawCurveTile(tile.color);
  }
  
  //This adds a black border onto the tile
  //noFill();
  //strokeWeight(3);
  //stroke(0);
  //rect(-tileSize / 2, -tileSize / 2, tileSize, tileSize);

  pop();
  

  
  // Draw highlight for forced moves
  if (forcedMoveTiles.has(`${x},${y}`)) {
    noFill();
    strokeWeight(2);
    stroke(255, 150, 0);
    rect(-tileSize/2+1, -tileSize/2+1, tileSize-2, tileSize-2);
  }

      // Draw highlight for last played tile
  if (lastPlayedTile && lastPlayedTile.x === x && lastPlayedTile.y === y) {
    noFill();
    strokeWeight(2);
    stroke(255, 215, 0); // Gold color
    rect(-tileSize/2+1, -tileSize/2+1, tileSize-2, tileSize-2);
  }

  pop();
}

function drawCrossTile(color) {
  strokeWeight(8);

  stroke(255);
  line(-tileSize / 2, 0, tileSize / 2, 0);

  stroke(200, 0, 0);
  line(0, -tileSize / 2, 0, tileSize / 2);
}

function drawCurveTile(color) {
  strokeWeight(8);

  stroke(255);
  arc(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 0, HALF_PI);

  stroke(200, 0, 0);
  arc(tileSize / 2, tileSize / 2, tileSize, tileSize, PI, PI + HALF_PI);
}

function handleGameClick() {
  if (aiEnabled && currentPlayer === "red") return;

  let gridX = round((mouseX - width / 2) / tileSize);
  let gridY = round((mouseY - height / 2) / tileSize);
  let key = `${gridX},${gridY}`;

  if (!board[key]) {
    const newTile = {
      side: selectedSide,
      rotation: selectedRotation,
      color: currentPlayer,
    };

    if (isValidPlacement(gridX, gridY, newTile)) {
      const originalBoard = { ...board };
      const originalKeys = new Set(Object.keys(originalBoard));

      // Place the player's tile and record it as last played
      board[key] = newTile;
      lastPlayedTile = { x: gridX, y: gridY };
      forcedMoveTiles.clear(); // Clear previous forced moves

      // Check and place forced moves
      checkForcedMoves();

      // Get all new keys added during this turn (for forced moves)
      const newKeys = Object.keys(board).filter((k) => !originalKeys.has(k));
      
      // Add all forced moves to the set (excluding the manually placed tile)
      newKeys.forEach(k => {
        if (k !== key) {
          const [x, y] = k.split(',').map(Number);
          forcedMoveTiles.add(k);
        }
      });

      const hasInvalid = checkIllegalMoves(newKeys);

      if (hasInvalid) {
        board = originalBoard;
        lastPlayedTile = null;
        forcedMoveTiles.clear();
      } else {
        checkWinCondition();
        currentPlayer = currentPlayer === "white" ? "red" : "white";
        if (aiEnabled && gameState === "game") setTimeout(aiMove, 1000);
      }
    }
  }
}

function checkIllegalMoves(newKeys) {
  const emptySpaces = new Set();

  // Collect all empty spaces adjacent to newKeys
  for (const key of newKeys) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const adjKey = `${x + dx},${y + dy}`;
      if (!board[adjKey]) {
        emptySpaces.add(adjKey);
      }
    }
  }

  // Check each empty space for overflow
  for (const adjKey of emptySpaces) {
    const [x, y] = adjKey.split(",").map(Number);
    const counts = { white: 0, red: 0 };

    // Check all four directions for incoming tracks
    // North (check tile to the north's bottom connection)
    const northKey = `${x},${y - 1}`;
    const northTile = board[northKey];
    if (northTile) {
      const conn = getConnections(northTile);
      if (conn.bottom) {
        counts[conn.bottom]++;
      }
    }

    // East (check tile to the east's left connection)
    const eastKey = `${x + 1},${y}`;
    const eastTile = board[eastKey];
    if (eastTile) {
      const conn = getConnections(eastTile);
      if (conn.left) {
        counts[conn.left]++;
      }
    }

    // South (check tile to the south's top connection)
    const southKey = `${x},${y + 1}`;
    const southTile = board[southKey];
    if (southTile) {
      const conn = getConnections(southTile);
      if (conn.top) {
        counts[conn.top]++;
      }
    }

    // West (check tile to the west's right connection)
    const westKey = `${x - 1},${y}`;
    const westTile = board[westKey];
    if (westTile) {
      const conn = getConnections(westTile);
      if (conn.right) {
        counts[conn.right]++;
      }
    }

    if (counts.white > 2 || counts.red > 2) {
      return true; // invalid overflow found
    }
  }

  return false; // no overflows
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
    let [x, y] = key.split(",").map(Number);
    let tile = board[key];
    if (!tile) continue;

    let connections = getConnections(tile);

    for (let [dx, dy, dir] of [
      [0, -1, "top"],
      [1, 0, "right"],
      [0, 1, "bottom"],
      [-1, 0, "left"],
    ]) {
      let neighborKey = `${x + dx},${y + dy}`;
      if (neighborKey !== from && board[neighborKey]) {
        let neighborTile = board[neighborKey];
        let neighborConnections = getConnections(neighborTile);
        let oppositeDir = oppositeDirection(dir);

        if (
          connections[dir] === color &&
          neighborConnections[oppositeDir] === color
        ) {
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
  currentPlayer = "white";
  loopPath = [];
  winningLine = [];
  winningLineEdges = null;
  winningLineType = null;
  winningPlayer = null;
  lastPlayedTile = null;
  forcedMoveTiles.clear();
}

function checkWinCondition() {
  loopPath = [];
  winningLine = [];
  for (let key in board) {
    if (checkForLoop(key, "white")) {
      winningPlayer = "White Loop";
      gameState = "gameOver";
      return;
    }
    if (checkForLoop(key, "red")) {
      winningPlayer = "Red Loop";
      gameState = "gameOver";
      return;
    }
  }

  if (checkLineWin("white")) {
    winningPlayer = "White Line";
    gameState = "gameOver";
    return;
  }
  if (checkLineWin("red")) {
    winningPlayer = "Red Line";
    gameState = "gameOver";
    return;
  }
}

function checkLineWin(color) {
  let startTiles = Object.keys(board).filter(
    (key) => board[key].color === color
  );

  // Compute board's min and max coordinates
  let boardMinX = Infinity,
    boardMaxX = -Infinity,
    boardMinY = Infinity,
    boardMaxY = -Infinity;
  for (let key in board) {
    let [x, y] = key.split(",").map(Number);
    boardMinX = Math.min(boardMinX, x);
    boardMaxX = Math.max(boardMaxX, x);
    boardMinY = Math.min(boardMinY, y);
    boardMaxY = Math.max(boardMaxY, y);
  }
  const horizontalSpan = boardMaxX - boardMinX;
  const verticalSpan = boardMaxY - boardMinY;

  for (let startKey of startTiles) {
    let visited = new Set(); // Create a new visited set for each startKey
    let path = new Set();
    if (
      dfsCheckLine(
        startKey,
        color,
        visited,
        path,
        boardMinX,
        boardMaxX,
        boardMinY,
        boardMaxY,
        horizontalSpan,
        verticalSpan
      )
    ) {
      winningLine = Array.from(path);
      return true;
    }
  }
  return false;
}

function dfsCheckLine(
  startKey,
  color,
  visited,
  path,
  boardMinX,
  boardMaxX,
  boardMinY,
  boardMaxY,
  horizontalSpan,
  verticalSpan
) {
  let stack = [{ key: startKey, from: null }];
  let tilesInPath = new Set();
  let edgePoints = {
    horizontal: { start: null, end: null },
    vertical: { start: null, end: null },
  };

  while (stack.length > 0) {
    let { key, from } = stack.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    tilesInPath.add(key);

    let [x, y] = key.split(",").map(Number);
    let tile = board[key];
    if (!tile) continue;
    let connections = getConnections(tile);

    // Check for edge connections
    if (x === boardMinX && connections.left === color) {
      edgePoints.horizontal.start = { x, y };
    }
    if (x === boardMaxX && connections.right === color) {
      edgePoints.horizontal.end = { x, y };
    }
    if (y === boardMinY && connections.top === color) {
      edgePoints.vertical.start = { x, y };
    }
    if (y === boardMaxY && connections.bottom === color) {
      edgePoints.vertical.end = { x, y };
    }

    // Existing neighbor checking code...
    for (let [dx, dy, dir] of [
      [0, -1, "top"],
      [1, 0, "right"],
      [0, 1, "bottom"],
      [-1, 0, "left"],
    ]) {
      let neighborKey = `${x + dx},${y + dy}`;
      if (!visited.has(neighborKey) && board[neighborKey]) {
        let neighborTile = board[neighborKey];
        let neighborConnections = getConnections(neighborTile);
        let oppositeDir = oppositeDirection(dir);

        if (
          connections[dir] === color &&
          neighborConnections[oppositeDir] === color
        ) {
          stack.push({ key: neighborKey, from: key });
        }
      }
    }
  }

  // Check for horizontal line win
  if (
    horizontalSpan >= 7 &&
    edgePoints.horizontal.start &&
    edgePoints.horizontal.end
  ) {
    winningLine = Array.from(tilesInPath);
    winningLineType = "horizontal";
    winningLineEdges = {
      start: edgePoints.horizontal.start,
      end: edgePoints.horizontal.end,
    };
    return true;
  }

  // Check for vertical line win
  if (
    verticalSpan >= 7 &&
    edgePoints.vertical.start &&
    edgePoints.vertical.end
  ) {
    winningLine = Array.from(tilesInPath);
    winningLineType = "vertical";
    winningLineEdges = {
      start: edgePoints.vertical.start,
      end: edgePoints.vertical.end,
    };
    return true;
  }

  return false;
}

function drawLoop() {
  
  if (loopPath.length > 1) {
    forcedMoveTiles.clear();
    stroke(0, 255, 0);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let key of loopPath) {
      let [x, y] = key.split(",").map(Number);
      let screenX = width / 2 + x * tileSize;
      let screenY = height / 2 + y * tileSize;
      vertex(screenX, screenY);
    }
    endShape(CLOSE);
  }
  noStroke();
}

function drawWinningLine() {
  if (!winningLineType || !winningLineEdges) return;
  forcedMoveTiles.clear();
  stroke(0, 255, 0);
  strokeWeight(20);
  noFill();

  // Convert edge points to screen coordinates
  const start = {
    x: width / 2 + winningLineEdges.start.x * tileSize,
    y: height / 2 + winningLineEdges.start.y * tileSize,
  };

  const end = {
    x: width / 2 + winningLineEdges.end.x * tileSize,
    y: height / 2 + winningLineEdges.end.y * tileSize,
  };

  // Adjust points to tile edges
  if (winningLineType === "horizontal") {
    start.x -= tileSize / 2;
    end.x += tileSize / 2;
  } else {
    start.y -= tileSize / 2;
    end.y += tileSize / 2;
  }

  //draw dots at beginning and end of winning line
  point(start.x, start.y);
  point(end.x, end.y);

  strokeWeight(2);
  noStroke();
}

function checkForcedMoves() {
  let forcedMoveFound = true;

  while (forcedMoveFound) {
    forcedMoveFound = false;

    // Find empty adjacent spaces
    let emptySpaces = findEmptyAdjacentSpaces();

    for (let { x, y } of emptySpaces) {
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
    let [x, y] = key.split(",").map(Number);

    // Check adjacent spaces
    for (let [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      let checkKey = `${x + dx},${y + dy}`;
      if (!board[checkKey]) {
        emptySpaces.push({ x: x + dx, y: y + dy });
      }
    }
  }

  return [...new Set(emptySpaces.map((space) => JSON.stringify(space)))].map(
    JSON.parse
  );
}

function findForcedTile(x, y) {
  let adjacentColors = { white: 0, red: 0 };
  let forcedColor = null;

  // Check adjacent tiles
  for (let [dx, dy] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]) {
    let key = `${x + dx},${y + dy}`;
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
  if (adjacentColors.white === 2) forcedColor = "white";
  if (adjacentColors.red === 2) forcedColor = "red";

  if (forcedColor) {
    // Determine forced tile type and rotation based on existing connections
    return findForcedTileConfiguration(x, y, forcedColor);
  }

  return null;
}

function findForcedTileConfiguration(x, y, forcedColor) {
  // Check existing adjacent connections to determine tile configuration
  let possibleTiles = [
    { side: "curve", rotation: 0 },
    { side: "curve", rotation: 90 },
    { side: "curve", rotation: 180 },
    { side: "curve", rotation: 270 },
    { side: "cross", rotation: 0 },
    { side: "cross", rotation: 90 },
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

  const adjacent = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ].some(([dx, dy]) => board[`${x + dx},${y + dy}`]);
  if (!adjacent) return false;

  const newConn = getConnections(tile);

  for (let [dx, dy] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]) {
    const adjKey = `${x + dx},${y + dy}`;
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
  if (dx === 0 && dy === -1) return "top";
  if (dx === 1 && dy === 0) return "right";
  if (dx === 0 && dy === 1) return "bottom";
  if (dx === -1 && dy === 0) return "left";
}

function oppositeDirection(dir) {
  return { top: "bottom", right: "left", bottom: "top", left: "right" }[dir];
}

function drawConnectionDots(tile) {
  let connections = getConnections(tile);
  strokeWeight(8);

  // Top
  if (connections.top)
    stroke(connections.top === "white" ? 255 : color(200, 0, 0));
  point(0, -tileSize / 2);

  // Right
  if (connections.right)
    stroke(connections.right === "white" ? 255 : color(200, 0, 0));
  point(tileSize / 2, 0);

  // Bottom
  if (connections.bottom)
    stroke(connections.bottom === "white" ? 255 : color(200, 0, 0));
  point(0, tileSize / 2);

  // Left
  if (connections.left)
    stroke(connections.left === "white" ? 255 : color(200, 0, 0));
  point(-tileSize / 2, 0);
}

function getConnections(tile) {
  const connections = { top: null, right: null, bottom: null, left: null };

  if (tile.side === "cross") {
    // Cross tiles have consistent connections, but they need to adjust based on rotation
    switch (tile.rotation) {
      case 0:
        connections.top = connections.bottom = "red";
        connections.left = connections.right = "white";
        break;
      case 90:
        connections.top = connections.bottom = "white";
        connections.left = connections.right = "red";
        break;
      case 180:
        connections.top = connections.bottom = "red";
        connections.left = connections.right = "white";
        break;
      case 270:
        connections.top = connections.bottom = "white";
        connections.left = connections.right = "red";
        break;
    }
  } else {
    // Curve tiles: The connection ends will have matching colours.
    switch (tile.rotation) {
      case 0:
        connections.top = connections.left = "white";
        connections.bottom = connections.right = "red";
        break;
      case 90:
        connections.top = connections.right = "white";
        connections.bottom = connections.left = "red";
        break;
      case 180:
        connections.bottom = connections.right = "white";
        connections.top = connections.left = "red";
        break;
      case 270:
        connections.bottom = connections.left = "white";
        connections.top = connections.right = "red";
        break;
    }
  }
  return connections;
}

function drawTilePreview() {
  if (aiEnabled && currentPlayer === "red") return;

  let gridX = round((mouseX - width / 2) / tileSize);
  let gridY = round((mouseY - height / 2) / tileSize);

  push();
  translate(width / 2 + gridX * tileSize, height / 2 + gridY * tileSize);
  rotate(radians(selectedRotation));

  fill(0, 150);
  stroke(0, 150);
  rect(-tileSize / 2, -tileSize / 2, tileSize, tileSize);

  if (selectedSide === "cross") {
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
  text(`Current Player: ${currentPlayer}`, width / 2, 50);
}

function aiMove() {
    let emptySpaces = findEmptyAdjacentSpaces();
    let bestMove = null;

    // 1. First Priority: Check for immediate winning moves
    bestMove = findWinningMove(emptySpaces);
    if (bestMove) {
        makeMove(bestMove);
        return;
    }

    // 2. Second Priority: Block opponent's immediate winning moves
    bestMove = findBlockingMove(emptySpaces);
    if (bestMove) {
        makeMove(bestMove);
        return;
    }

    // 3. Third Priority: Block potential 4-arc loops
    bestMove = findLoopBlockingMove();
    if (bestMove) {
        makeMove(bestMove);
        return;
    }

    // 4. Fourth Priority: Make a safe random move
    bestMove = findSafeRandomMove(emptySpaces);
    if (bestMove) {
        makeMove(bestMove);
    }
}

function findWinningMove(emptySpaces) {
    for (let {x, y} of emptySpaces) {
        for (let tileType of ['curve', 'cross']) {
            let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
            for (let rotation of rotations) {
                let tile = { side: tileType, rotation: rotation, color: 'red' };
                if (!isValidPlacement(x, y, tile)) continue;

                // Simulate move
                let originalBoard = JSON.parse(JSON.stringify(board));
                let key = `${x},${y}`;
                board[key] = tile;
                checkForcedMoves();
                checkWinCondition();

                let isWinning = gameState === "gameOver" && 
                    (winningPlayer === 'Red Loop' || winningPlayer === 'Red Line');

                // Restore board state
                board = originalBoard;
                gameState = "game";
                winningPlayer = null;

                if (isWinning) {
                    return { x, y, tile };
                }
            }
        }
    }
    return null;
}

function findBlockingMove(emptySpaces) {
    for (let {x, y} of emptySpaces) {
        for (let tileType of ['curve', 'cross']) {
            let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
            for (let rotation of rotations) {
                let tile = { side: tileType, rotation: rotation, color: 'red' };
                if (!isValidPlacement(x, y, tile)) continue;

                // Simulate move
                let originalBoard = JSON.parse(JSON.stringify(board));
                let key = `${x},${y}`;
                board[key] = tile;
                checkForcedMoves();

                // Check if this prevents opponent's immediate win
                let preventsWin = !canOpponentWinNextMove();

                // Restore board state
                board = originalBoard;

                if (preventsWin) {
                    return { x, y, tile };
                }
            }
        }
    }
    return null;
}

function findLoopBlockingMove() {
    // Find all white curves
    let whiteCurves = Object.entries(board)
        .filter(([_, tile]) => tile.side === 'curve' && tile.color === 'white')
        .map(([key, tile]) => ({
            key,
            x: parseInt(key.split(',')[0]),
            y: parseInt(key.split(',')[1]),
            connections: getConnections(tile)
        }));

    // Check each pair of connected white curves
    for (let i = 0; i < whiteCurves.length; i++) {
        for (let j = i + 1; j < whiteCurves.length; j++) {
            let curve1 = whiteCurves[i];
            let curve2 = whiteCurves[j];

            // Check if curves are connected
            if (areConnected(curve1, curve2)) {
                // Find potential completion points
                let blockingPoints = findPotentialCompletionPoints(curve1, curve2);
                
                for (let point of blockingPoints) {
                    let blockingTile = findBestBlockingTile(point.x, point.y);
                    if (blockingTile) {
                        return { x: point.x, y: point.y, tile: blockingTile };
                    }
                }
            }
        }
    }
    return null;
}

function findSafeRandomMove(emptySpaces) {
    let safeMoves = [];
    for (let {x, y} of emptySpaces) {
        for (let tileType of ['curve', 'cross']) {
            let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
            for (let rotation of rotations) {
                let tile = { side: tileType, rotation: rotation, color: 'red' };
                if (!isValidPlacement(x, y, tile)) continue;

                // Check if move is safe
                let originalBoard = JSON.parse(JSON.stringify(board));
                let key = `${x},${y}`;
                board[key] = tile;
                checkForcedMoves();
                checkWinCondition();

                let isSafe = gameState !== "gameOver" || 
                    !(winningPlayer === 'White Loop' || winningPlayer === 'White Line');

                board = originalBoard;
                gameState = "game";
                winningPlayer = null;

                if (isSafe) {
                    safeMoves.push({ x, y, tile });
                }
            }
        }
    }

    return safeMoves.length > 0 ? 
        safeMoves[Math.floor(Math.random() * safeMoves.length)] : null;
}

function areConnected(curve1, curve2) {
    let dx = curve2.x - curve1.x;
    let dy = curve2.y - curve1.y;
    let dir = getDirection(dx, dy);
    let oppDir = oppositeDirection(dir);
    
    return curve1.connections[dir] === 'white' && 
           curve2.connections[oppDir] === 'white';
}

function findPotentialCompletionPoints(curve1, curve2) {
    let points = [];
    let freeEnds1 = getFreeEnds(curve1);
    let freeEnds2 = getFreeEnds(curve2);

    for (let end1 of freeEnds1) {
        for (let end2 of freeEnds2) {
            // Check diagonal points that could complete the loop
            let potentialPoints = [
                { x: end1.x, y: end2.y },
                { x: end2.x, y: end1.y }
            ];

            for (let point of potentialPoints) {
                let key = `${point.x},${point.y}`;
                if (!board[key]) {
                    points.push(point);
                }
            }
        }
    }

    return points;
}

function getFreeEnds(curve) {
    let ends = [];
    for (let [dir, color] of Object.entries(curve.connections)) {
        if (color === 'white') {
            let [dx, dy] = directionToOffset(dir);
            let x = curve.x + dx;
            let y = curve.y + dy;
            let key = `${x},${y}`;
            if (!board[key]) {
                ends.push({ x, y });
            }
        }
    }
    return ends;
}

function findBestBlockingTile(x, y) {
    // Try curves first, as they're generally more versatile
    for (let rotation of [0, 90, 180, 270]) {
        let tile = { side: 'curve', rotation, color: 'red' };
        if (isValidPlacement(x, y, tile)) {
            return tile;
        }
    }
    
    // Fall back to crosses if curves don't work
    for (let rotation of [0, 90]) {
        let tile = { side: 'cross', rotation, color: 'red' };
        if (isValidPlacement(x, y, tile)) {
            return tile;
        }
    }
    
    return null;
}

function directionToOffset(dir) {
    const offsets = {
        'top': [0, -1],
        'right': [1, 0],
        'bottom': [0, 1],
        'left': [-1, 0]
    };
    return offsets[dir];
}

function makeMove(move) {
    let key = `${move.x},${move.y}`;
    const originalKeys = new Set(Object.keys(board));
    
    board[key] = move.tile;
    lastPlayedTile = { x: move.x, y: move.y };
    forcedMoveTiles.clear(); // Clear previous forced moves
    
    checkForcedMoves();
    
    // Identify forced moves
    const newKeys = Object.keys(board).filter((k) => !originalKeys.has(k));
    newKeys.forEach(k => {
        if (k !== key) {
            const [x, y] = k.split(',').map(Number);
            forcedMoveTiles.add(k);
        }
    });
    
    checkWinCondition();
    if (gameState !== "gameOver") currentPlayer = 'white';
}

function canOpponentWinNextMove() {
    let originalBoard = JSON.parse(JSON.stringify(board));
    let originalGameState = gameState;
    let originalPlayer = currentPlayer;
    
    currentPlayer = 'white';
    let emptySpaces = findEmptyAdjacentSpaces();
    
    for (let {x, y} of emptySpaces) {
        for (let tileType of ['curve', 'cross']) {
            let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
            for (let rotation of rotations) {
                let tile = { side: tileType, rotation, color: 'white' };
                if (!isValidPlacement(x, y, tile)) continue;

                let key = `${x},${y}`;
                board[key] = tile;
                checkForcedMoves();
                checkWinCondition();

                if (gameState === "gameOver" && 
                    (winningPlayer === 'White Loop' || winningPlayer === 'White Line')) {
                    
                    // Restore original state
                    board = originalBoard;
                    gameState = originalGameState;
                    currentPlayer = originalPlayer;
                    return true;
                }

                board = JSON.parse(JSON.stringify(originalBoard));
                gameState = originalGameState;
            }
        }
    }
    
    // Restore original state
    board = originalBoard;
    gameState = originalGameState;
    currentPlayer = originalPlayer;
    return false;
}