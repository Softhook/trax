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
  text("vs dumb AI", width / 2, height / 2 + 75);
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
  pop();
  //drawConnectionDots(tile);
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
      // Take a snapshot of the board before making changes
      const originalBoard = { ...board };
      const originalKeys = new Set(Object.keys(originalBoard));

      // Place the player's tile
      board[key] = newTile;

      // Check and place forced moves
      checkForcedMoves();

      // Get all new keys added during this turn (player + forced)
      const newKeys = Object.keys(board).filter((k) => !originalKeys.has(k));

      // Check adjacent empty spaces for overflow
      const hasInvalid = checkIllegalMoves(newKeys);

      if (hasInvalid) {
        // Revert the board to the original state
        board = originalBoard;
      } else {
        // Proceed with the move
        checkWinCondition();
        currentPlayer = currentPlayer === "white" ? "red" : "white";
        if (aiEnabled && gameState === "game") setTimeout(aiMove, 500);  // Add game state check here
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
    stroke(255, 255, 0);
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

  stroke(255, 255, 0);
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
  let bestMove = null;
  let bestScore = -Infinity;

  let emptySpaces = findEmptyAdjacentSpaces();
  for (let { x, y } of emptySpaces) {
    for (let side of ["curve", "cross"]) {
      let rotations = side === "curve" ? [0, 90, 180, 270] : [0, 90];
      for (let rotation of rotations) {
        let testTile = { side, rotation, color: "red" };

        if (isValidPlacement(x, y, testTile)) {
          board[`${x},${y}`] = testTile;
          let score = evaluateBoard();
          delete board[`${x},${y}`];

          if (score > bestScore) {
            bestScore = score;
            bestMove = { x, y, side, rotation };
          }
        }
      }
    }
  }

  if (bestMove) {
    board[`${bestMove.x},${bestMove.y}`] = {
      side: bestMove.side,
      rotation: bestMove.rotation,
      color: "red",
    };
    checkForcedMoves();
    checkWinCondition();
    currentPlayer = "white";
  }
}

function evaluateBoard() {
  if (checkForLoop("red")) return 1000;
  if (checkLineWin("red")) return 1000;
  if (checkForLoop("white")) return -1000;
  if (checkLineWin("white")) return -1000;
  return Math.random(); // Random factor to avoid predictable moves
}
