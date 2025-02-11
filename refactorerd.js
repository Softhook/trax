class Game {
    constructor() {
        this.gameState = "intro";
        this.board = new Board();
        this.currentPlayer = null;
        this.aiEnabled = true;
        this.selectedSide = "curve";
        this.selectedRotation = 0;
        this.loopPath = [];
        this.winningLine = [];
        this.winningLineType = null;
        this.winningLineEdges = null;
        this.winningPlayer = null;
        this.lastPlayedTile = null;
        this.forcedMoveTiles = new Set();
        this.playerColor = null;
        this.aiColor = null;
        this.gameRenderer = new GameRenderer(this, this.board);
        this.aiPlayer = new AIPlayer(this, this.board);
    }

    setup() {
        this.gameRenderer.setup();
    }

    draw() {
        this.gameRenderer.draw();
    }

    windowResized() {
        this.gameRenderer.windowResized();
    }

    mousePressed() {
        if (!fullscreen()) {
            fullscreen(true);
            this.gameRenderer.windowResized();
        }

        if (this.gameState === "intro") {
            this.handleIntroClick();
        } else if (this.gameState === "game") {
            if (mouseButton === RIGHT) {
                this.selectedSide = this.selectedSide === "curve" ? "cross" : "curve";
                this.selectedRotation = 0;
            } else {
                this.handleGameClick();
            }
        } else if (this.gameState === "gameOver") {
            if (mouseX > width / 2 - 100 && mouseX < width / 2 + 100 && mouseY > height - 80 && mouseY < height - 30) {
                this.restartGame();
            }
        }
    }

    mouseWheel(event) {
        if (this.gameState === "game" && (!this.aiEnabled || this.currentPlayer === this.playerColor)) {
            if (this.selectedSide === "curve") {
                this.selectedRotation = (this.selectedRotation + 90) % 360;
            } else if (this.selectedSide === "cross") {
                this.selectedRotation = this.selectedRotation === 0 ? 90 : 0;
            }
        }
        return false;
    }

    startGame(ai) {
        this.gameState = "game";
        this.aiEnabled = ai;
        this.board.clear();
        this.lastPlayedTile = null;
        this.forcedMoveTiles.clear();
        this.loopPath = [];
        this.winningLine = [];
        this.winningLineType = null;
        this.winningLineEdges = null;
        this.winningPlayer = null;


        this.currentPlayer = "white"; // White always starts
        this.aiPlayer.setAIColor(this.aiColor);
        this.aiPlayer.setPlayerColor(this.playerColor);

        if (this.aiEnabled && this.playerColor === "red") {
            setTimeout(() => this.aiPlayer.aiMove(), 500);
        }
    }

    restartGame() {
        this.gameState = "intro";
        this.board.clearBoard();
        this.currentPlayer = null;
        this.playerColor = null;
        this.aiColor = null;
        this.loopPath = [];
        this.winningLine = [];
        this.winningLineEdges = null;
        this.winningLineType = null;
        this.winningPlayer = null;
        this.lastPlayedTile = null;
        this.forcedMoveTiles.clear();
    }

    handleIntroClick() {
        if (mouseY > height / 2 - 25 && mouseY < height / 2 + 25) {
            if (mouseX > width / 2 - 75 && mouseX < width / 2 - 25) {
                this.playerColor = "red";
                this.aiColor = "white";
            } else if (mouseX > width / 2 + 25 && mouseX < width / 2 + 75) {
                this.playerColor = "white";
                this.aiColor = "red";
            }
            this.currentPlayer = "white";
        }

        if (mouseY > height / 2 + 50 && mouseY < height / 2 + 100) {
            if (this.playerColor) {
                this.startGame(false);
            }
        } else if (mouseY > height / 2 + 125 && mouseY < height / 2 + 175) {
            if (this.playerColor) {
                this.startGame(true);
            }
        }
    }

    handleGameClick() {
        if (this.aiEnabled && this.currentPlayer === this.aiColor && this.playerColor !== this.aiColor) return;

        let gridX = round((mouseX - width / 2) / this.board.tileSize);
        let gridY = round((mouseY - height / 2) / this.board.tileSize);
        let key = `${gridX},${gridY}`;

        if (!this.board.tiles[key]) {
            const newTile = new Tile(this.selectedSide, this.selectedRotation, this.currentPlayer);

            if (this.isValidPlacement(gridX, gridY, newTile)) {
                const originalBoardState = this.board.cloneBoard();
                const originalKeys = new Set(Object.keys(originalBoardState.tiles));

                this.board.placeTile(gridX, gridY, newTile);
                this.lastPlayedTile = { x: gridX, y: gridY };
                this.forcedMoveTiles.clear();

                this.checkForcedMoves();

                const newKeys = Object.keys(this.board.tiles).filter((k) => !originalKeys.has(k));

                newKeys.forEach(k => {
                    if (k !== key) {
                        const [x, y] = k.split(',').map(Number);
                        this.forcedMoveTiles.add(k);
                    }
                });

                const hasInvalid = this.checkIllegalMoves(newKeys);

                if (hasInvalid) {
                    this.board.tiles = originalBoardState.tiles;
                    this.lastPlayedTile = null;
                    this.forcedMoveTiles.clear();
                } else {
                    this.checkWinCondition();
                    this.currentPlayer = this.currentPlayer === "white" ? "red" : "white";
                    if (this.aiEnabled && this.gameState === "game" && this.currentPlayer === this.aiColor && this.playerColor !== this.aiColor) setTimeout(() => this.aiPlayer.aiMove(), 500);
                }
            }
        }
    }

    checkWinCondition() {
        this.loopPath = [];
        this.winningLine = [];
        for (let key in this.board.tiles) {
            if (this.checkForLoop(key, "white")) {
                this.winningPlayer = "White Loop";
                this.gameState = "gameOver";
                return;
            }
            if (this.checkForLoop(key, "red")) {
                this.winningPlayer = "Red Loop";
                this.gameState = "gameOver";
                return;
            }
        }

        if (this.checkLineWin("white")) {
            this.winningPlayer = "White Line";
            this.gameState = "gameOver";
            return;
        }
        if (this.checkLineWin("red")) {
            this.winningPlayer = "Red Line";
            this.gameState = "gameOver";
            return;
        }
    }

    checkLineWin(color) {
        let startTiles = Object.keys(this.board.tiles).filter(
            (key) => this.board.tiles[key].color === color
        );

        let boardMinX = Infinity,
            boardMaxX = -Infinity,
            boardMinY = Infinity,
            boardMaxY = -Infinity;
        for (let key in this.board.tiles) {
            let [x, y] = key.split(",").map(Number);
            boardMinX = Math.min(boardMinX, x);
            boardMaxX = Math.max(boardMaxX, x);
            boardMinY = Math.min(boardMinY, y);
            boardMaxY = Math.max(boardMaxY, y);
        }
        const horizontalSpan = boardMaxX - boardMinX;
        const verticalSpan = boardMaxY - boardMinY;

        for (let startKey of startTiles) {
            let visited = new Set();
            let path = new Set();
            if (
                this.dfsCheckLine(
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
                this.winningLine = Array.from(path);
                return true;
            }
        }
        return false;
    }

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
            let tile = this.board.tiles[key];
            if (!tile) continue;
            let connections = tile.getConnections();

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

            for (let [dx, dy, dir] of [
                [0, -1, "top"],
                [1, 0, "right"],
                [0, 1, "bottom"],
                [-1, 0, "left"],
            ]) {
                let neighborKey = `${x + dx},${y + dy}`;
                if (!visited.has(neighborKey) && this.board.tiles[neighborKey]) {
                    let neighborTile = this.board.tiles[neighborKey];
                    let neighborConnections = neighborTile.getConnections();
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

        if (
            horizontalSpan >= 7 &&
            edgePoints.horizontal.start &&
            edgePoints.horizontal.end
        ) {
            this.winningLine = Array.from(tilesInPath);
            this.winningLineType = "horizontal";
            this.winningLineEdges = {
                start: edgePoints.horizontal.start,
                end: edgePoints.horizontal.end,
            };
            return true;
        }

        if (
            verticalSpan >= 7 &&
            edgePoints.vertical.start &&
            edgePoints.vertical.end
        ) {
            this.winningLine = Array.from(tilesInPath);
            this.winningLineType = "vertical";
            this.winningLineEdges = {
                start: edgePoints.vertical.start,
                end: edgePoints.vertical.end,
            };
            return true;
        }

        return false;
    }


    checkForLoop(startKey, color) {
        let visited = new Set();
        let stack = [{ key: startKey, from: null, path: [] }];

        while (stack.length > 0) {
            let { key, from, path } = stack.pop();

            if (visited.has(key)) {
                this.loopPath = path.concat([key]);
                return true;
            }

            visited.add(key);
            let [x, y] = key.split(",").map(Number);
            let tile = this.board.tiles[key];
            if (!tile) continue;

            let connections = tile.getConnections();

            for (let [dx, dy, dir] of [
                [0, -1, "top"],
                [1, 0, "right"],
                [0, 1, "bottom"],
                [-1, 0, "left"],
            ]) {
                let neighborKey = `${x + dx},${y + dy}`;
                if (neighborKey !== from && this.board.tiles[neighborKey]) {
                    let neighborTile = this.board.tiles[neighborKey];
                    let neighborConnections = neighborTile.getConnections();
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

    checkIllegalMoves(newKeys) {
        const emptySpaces = new Set();

        for (const key of newKeys) {
            const [x, y] = key.split(",").map(Number);
            for (const [dx, dy] of [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
            ]) {
                const adjKey = `${x + dx},${y + dy}`;
                if (!this.board.tiles[adjKey]) {
                    emptySpaces.add(adjKey);
                }
            }
        }

        for (const adjKey of emptySpaces) {
            const [x, y] = adjKey.split(",").map(Number);
            const counts = { white: 0, red: 0 };

            const northKey = `${x},${y - 1}`;
            const northTile = this.board.tiles[northKey];
            if (northTile) {
                const conn = northTile.getConnections();
                if (conn.bottom) {
                    counts[conn.bottom]++;
                }
            }

            const eastKey = `${x + 1},${y}`;
            const eastTile = this.board.tiles[eastKey];
            if (eastTile) {
                const conn = eastTile.getConnections();
                if (conn.left) {
                    counts[conn.left]++;
                }
            }

            const southKey = `${x},${y + 1}`;
            const southTile = this.board.tiles[southKey];
            if (southTile) {
                const conn = southTile.getConnections();
                if (conn.top) {
                    counts[conn.top]++;
                }
            }

            const westKey = `${x - 1},${y}`;
            const westTile = this.board.tiles[westKey];
            if (westTile) {
                const conn = westTile.getConnections();
                if (conn.right) {
                    counts[conn.right]++;
                }
            }

            if (counts.white > 2 || counts.red > 2) {
                return true;
            }
        }

        return false;
    }


    checkForcedMoves() {
        let forcedMoveFound = true;

        while (forcedMoveFound) {
            forcedMoveFound = false;

            let emptySpaces = this.findEmptyAdjacentSpaces();

            for (let { x, y } of emptySpaces) {
                let forcedTile = this.findForcedTile(x, y);

                if (forcedTile) {
                    let key = `${x},${y}`;
                    this.board.placeTile(x, y, forcedTile);
                    forcedMoveFound = true;
                    break;
                }
            }
        }
    }

    findEmptyAdjacentSpaces() {
        let emptySpaces = [];
        let boardKeys = Object.keys(this.board.tiles);

        for (let key of boardKeys) {
            let [x, y] = key.split(",").map(Number);

            for (let [dx, dy] of [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0],
            ]) {
                let checkKey = `${x + dx},${y + dy}`;
                if (!this.board.tiles[checkKey]) {
                    emptySpaces.push({ x: x + dx, y: y + dy });
                }
            }
        }

        return [...new Set(emptySpaces.map((space) => JSON.stringify(space)))].map(
            JSON.parse
        );
    }

    findForcedTile(x, y) {
        let adjacentColors = { white: 0, red: 0 };
        let forcedColor = null;

        for (let [dx, dy] of [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ]) {
            let key = `${x + dx},${y + dy}`;
            let tile = this.board.tiles[key];

            if (tile) {
                let connections = tile.getConnections();
                let dir = getDirection(dx, dy);
                let oppDir = oppositeDirection(dir);

                if (connections[oppDir]) {
                    adjacentColors[connections[oppDir]]++;
                }
            }
        }

        if (adjacentColors.white === 2) forcedColor = "white";
        if (adjacentColors.red === 2) forcedColor = "red";

        if (forcedColor) {
            return this.findForcedTileConfiguration(x, y, forcedColor);
        }

        return null;
    }

    findForcedTileConfiguration(x, y, forcedColor) {
        let possibleTiles = [
            { side: "curve", rotation: 0 },
            { side: "curve", rotation: 90 },
            { side: "curve", rotation: 180 },
            { side: "curve", rotation: 270 },
            { side: "cross", rotation: 0 },
            { side: "cross", rotation: 90 },
        ];

        for (let tileConfig of possibleTiles) {
            const tile = new Tile(tileConfig.side, tileConfig.rotation, forcedColor);
            if (this.isValidPlacement(x, y, tile)) {
                return tile;
            }
        }

        return null;
    }


    isValidPlacement(x, y, tile) {
        if (Object.keys(this.board.tiles).length === 0) return true;

        const adjacent = [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ].some(([dx, dy]) => this.board.tiles[`${x + dx},${y + dy}`]);
        if (!adjacent) return false;

        const newConn = tile.getConnections();

        for (let [dx, dy] of [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ]) {
            const adjKey = `${x + dx},${y + dy}`;
            const adjTile = this.board.tiles[adjKey];
            if (adjTile) {
                const adjConn = adjTile.getConnections();
                const dir = getDirection(dx, dy);
                const oppDir = oppositeDirection(dir);

                if (newConn[dir] !== adjConn[oppDir]) {
                    return false;
                }
            }
        }
        return true;
    }

    getTileConnections(tile) {
        return tile.getConnections();
    }

    makeMove(move) {
        let key = `${move.x},${move.y}`;
        const originalKeys = new Set(Object.keys(this.board.tiles));

        this.board.placeTile(move.x, move.y, move.tile);
        this.lastPlayedTile = { x: move.x, y: move.y };
        this.forcedMoveTiles.clear();

        this.checkForcedMoves();

        const newKeys = Object.keys(this.board.tiles).filter((k) => !originalKeys.has(k));
        newKeys.forEach(k => {
            if (k !== key) {
                const [x, y] = k.split(',');
                this.forcedMoveTiles.add(k);
            }
        });

        const hasInvalid = this.checkIllegalMoves(newKeys);
        if (hasInvalid) {
            // Revert the move
            delete this.board.tiles[key];
            this.lastPlayedTile = null;
            this.forcedMoveTiles.clear();
            return false; // Indicate move was invalid
        }

        this.checkWinCondition();
        this.currentPlayer = this.currentPlayer === "white" ? "red" : "white";
        if (this.aiEnabled && this.gameState === "game" && this.currentPlayer === this.aiColor && this.playerColor !== this.aiColor) {
            setTimeout(() => this.aiPlayer.aiMove(), 500);
        }
        return true; // Indicate move was valid
    }
}

class Board {
    constructor(tileSize = 60) {
        this.tiles = {};
        this.tileSize = tileSize;
    }

    clearBoard() {
        this.tiles = {};
    }

    clear() {
        this.tiles = {};
    }

    cloneBoard() {
        const newBoard = new Board(this.tileSize);
        for (const key in this.tiles) {
            if (this.tiles.hasOwnProperty(key)) {
                const tile = this.tiles[key];
                newBoard.tiles[key] = new Tile(tile.side, tile.rotation, tile.color); // Correctly clone Tile objects
            }
        }
        return newBoard;
    }

    draw() {
        for (let key in this.tiles) {
            let [x, y] = key.split(",").map(Number);
            this.drawTile(x, y, this.tiles[key]);
        }
    }

    drawTile(x, y, tile) {
        push();
        translate(width / 2 + x * this.tileSize, height / 2 + y * this.tileSize);

        fill(0);
        stroke(0);
        rect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize);

        push();
        rotate(radians(tile.rotation));
        if (tile.side === "cross") {
            tile.drawCrossTile(this.tileSize);
        } else {
            tile.drawCurveTile(this.tileSize);
        }
        pop();
        pop();
    }

    placeTile(x, y, tile) {
        this.tiles[`${x},${y}`] = tile;
    }

    getTile(x, y) {
        return this.tiles[`${x},${y}`];
    }
}

class Tile {
    constructor(side, rotation, color) {
        this.side = side;
        this.rotation = rotation;
        this.color = color;
    }

    drawCurveTile(tileSize) {
        strokeWeight(8);
        stroke(255);
        arc(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 0, HALF_PI);
        stroke(200, 0, 0);
        arc(tileSize / 2, tileSize / 2, tileSize, tileSize, PI, PI + HALF_PI);
    }

    drawCrossTile(tileSize) {
        strokeWeight(8);
        stroke(255);
        line(-tileSize / 2, 0, tileSize / 2, 0);
        stroke(200, 0, 0);
        line(0, -tileSize / 2, 0, tileSize / 2);
    }


    getConnections() {
        const connections = { top: null, right: null, bottom: null, left: null };
        if (this.side === "cross") {
            switch (this.rotation) {
                case 0:
                case 180:
                    connections.top = connections.bottom = "red";
                    connections.left = connections.right = "white";
                    break;
                case 90:
                case 270:
                    connections.top = connections.bottom = "white";
                    connections.left = connections.right = "red";
                    break;
            }
        } else if (this.side === "curve") {
            switch (this.rotation) {
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
}


class AIPlayer {
    constructor(game, board) {
        this.game = game;
        this.board = board;
        this.aiColor = null;
        this.playerColor = null;
    }

    setAIColor(color) {
        this.aiColor = color;
    }

    setPlayerColor(color) {
        this.playerColor = color;
    }

    aiMove() {
        let emptySpaces = this.game.findEmptyAdjacentSpaces();

        if (Object.keys(this.board.tiles).length === 0) {
            // Special case for the very first AI move (empty board)
            let initialTile = new Tile("curve", 0, this.aiColor); // Default initial tile
            let initialMove = { x: 0, y: 0, tile: initialTile };
            this.game.makeMove(initialMove);
            return; // Exit aiMove after making the initial move
        }

        let bestMove = null;

        bestMove = this.findWinningMove(emptySpaces);
        if (bestMove) {
            this.game.makeMove(bestMove);
            return;
        }

        bestMove = this.findBlockingMove(emptySpaces);
        if (bestMove) {
            this.game.makeMove(bestMove);
            return;
        }

        bestMove = this.findLoopBlockingMove();
        if (bestMove) {
            this.game.makeMove(bestMove);
            return;
        }

        bestMove = this.findSafeRandomMove(emptySpaces);
        if (bestMove) {
            this.game.makeMove(bestMove);
        }
    }


    findWinningMove(emptySpaces) {
        for (let { x, y } of emptySpaces) {
            for (let tileType of ['curve', 'cross']) {
                let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
                for (let rotation of rotations) {
                    let tile = new Tile(tileType, rotation, this.aiColor);
                    if (!this.game.isValidPlacement(x, y, tile)) continue;

                    let originalBoard = this.board.cloneBoard();
                    let key = `${x},${y}`;
                    this.board.placeTile(x, y, tile);
                    this.game.checkForcedMoves();
                    this.game.checkWinCondition();

                    let isWinning = this.game.gameState === "gameOver" &&
                        (this.game.winningPlayer === `${this.aiColor.charAt(0).toUpperCase() + this.aiColor.slice(1)} Loop` || this.game.winningPlayer === `${this.aiColor.charAt(0).toUpperCase() + this.aiColor.slice(1)} Line`);

                    this.board.tiles = originalBoard.tiles;
                    this.game.gameState = "game";
                    this.game.winningPlayer = null;

                    if (isWinning) {
                        return { x, y, tile };
                    }
                }
            }
        }
        return null;
    }

    canOpponentWinNextMove() {
        const opponentColor = this.playerColor;
        let emptySpaces = this.game.findEmptyAdjacentSpaces();

        for (let { x, y } of emptySpaces) {
            for (let tileType of ['curve', 'cross']) {
                let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
                for (let rotation of rotations) {
                    let tile = new Tile(tileType, rotation, opponentColor);
                    if (!this.game.isValidPlacement(x, y, tile)) continue;

                    let originalBoard = this.board.cloneBoard();
                    let key = `${x},${y}`;
                    this.board.placeTile(x, y, tile);
                    this.game.checkForcedMoves();
                    this.game.checkWinCondition();

                    let canWin = this.game.gameState === "gameOver" &&
                        (this.game.winningPlayer === `${opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)} Loop` || this.game.winningPlayer === `${opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)} Line`);

                    this.board.tiles = originalBoard.tiles;
                    this.game.gameState = "game";
                    this.game.winningPlayer = null;

                    if (canWin) {
                        return true;
                    }
                }
            }
        }
        return false;
    }


    findBlockingMove(emptySpaces) {
        if (!this.canOpponentWinNextMove()) return null; // Optimization: If opponent can't win, no need to block


        const opponentColor = this.playerColor;

        for (let { x, y } of emptySpaces) {
            for (let tileType of ['curve', 'cross']) {
                let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
                for (let rotation of rotations) {
                    let tile = new Tile(tileType, rotation, this.aiColor);
                    if (!this.game.isValidPlacement(x, y, tile)) continue;

                    let originalBoard = this.board.cloneBoard();
                    let key = `${x},${y}`;
                    this.board.placeTile(x, y, tile);
                    this.game.checkForcedMoves();

                    let preventsWin = !this.canOpponentWinNextMove();

                    this.board.tiles = originalBoard.tiles;

                    if (preventsWin) {
                        return { x, y, tile };
                    }
                }
            }
        }
        return null;
    }


    findLoopBlockingMove() {
        const opponentColor = this.playerColor;
        let opponentCurves = Object.entries(this.board.tiles)
            .filter(([_, tile]) => tile.side === 'curve' && tile.color === opponentColor)
            .map(([key, tile]) => ({
                key,
                x: parseInt(key.split(',')[0]),
                y: parseInt(key.split(',')[1]),
                connections: tile.getConnections()
            }));

        for (let i = 0; i < opponentCurves.length; i++) {
            for (let j = i + 1; j < opponentCurves.length; j++) {
                let curve1 = opponentCurves[i];
                let curve2 = opponentCurves[j];

                if (this.areConnected(curve1, curve2, opponentColor)) {
                    let blockingPoints = this.findPotentialCompletionPoints(curve1, curve2, opponentColor);

                    for (let point of blockingPoints) {
                        let blockingTile = this.findBestBlockingTile(point.x, point.y);
                        if (blockingTile) {
                            return { x: point.x, y: point.y, tile: blockingTile };
                        }
                    }
                }
            }
        }
        return null;
    }

    findSafeRandomMove(emptySpaces) {
        let safeMoves = [];
        for (let { x, y } of emptySpaces) {
            for (let tileType of ['curve', 'cross']) {
                let rotations = tileType === 'curve' ? [0, 90, 180, 270] : [0, 90];
                for (let rotation of rotations) {
                    let tile = new Tile(tileType, rotation, this.aiColor);
                    if (!this.game.isValidPlacement(x, y, tile)) continue;

                    let originalBoard = this.board.cloneBoard();
                    let key = `${x},${y}`;
                    this.board.placeTile(x, y, tile);
                    this.game.checkForcedMoves();
                    this.game.checkWinCondition();

                    let isSafe = this.game.gameState !== "gameOver" ||
                        !(this.game.winningPlayer === `${this.playerColor.charAt(0).toUpperCase() + this.playerColor.slice(1)} Loop` || this.game.winningPlayer === `${this.playerColor.charAt(0).toUpperCase() + this.playerColor.slice(1)} Line`);

                    this.board.tiles = originalBoard.tiles;
                    this.game.gameState = "game";
                    this.game.winningPlayer = null;

                    if (isSafe) {
                        safeMoves.push({ x, y, tile });
                    }
                }
            }
        }

        return safeMoves.length > 0 ?
            safeMoves[Math.floor(Math.random() * safeMoves.length)] : null;
    }

    areConnected(curve1, curve2, color) {
        let dx = curve2.x - curve1.x;
        let dy = curve2.y - curve1.y;
        let dir = getDirection(dx, dy);
        let oppDir = oppositeDirection(dir);

        return curve1.connections[dir] === color &&
            curve2.connections[oppDir] === color;
    }

    findPotentialCompletionPoints(curve1, curve2, color) {
        let points = [];
        let freeEnds1 = this.getFreeEnds(curve1, color);
        let freeEnds2 = this.getFreeEnds(curve2, color);

        for (let end1 of freeEnds1) {
            for (let end2 of freeEnds2) {
                let potentialPoints = [
                    { x: end1.x, y: end2.y },
                    { x: end2.x, y: end1.y }
                ];

                for (let point of potentialPoints) {
                    let key = `${point.x},${point.y}`;
                    if (!this.board.tiles[key]) {
                        points.push(point);
                    }
                }
            }
        }

        return points;
    }

    getFreeEnds(curve, color) {
        let ends = [];
        for (let [dir, connectionColor] of Object.entries(curve.connections)) {
            if (connectionColor === color) {
                let [dx, dy] = directionToOffset(dir);
                let x = curve.x + dx;
                let y = curve.y + dy;
                let key = `${x},${y}`;
                if (!this.board.tiles[key]) {
                    ends.push({ x, y });
                }
            }
        }
        return ends;
    }

    findBestBlockingTile(x, y) {
        for (let rotation of [0, 90, 180, 270]) {
            let tile = new Tile('curve', rotation, this.aiColor);
            if (this.game.isValidPlacement(x, y, tile)) {
                return tile;
            }
        }

        for (let rotation of [0, 90]) {
            let tile = new Tile('cross', rotation, this.aiColor);
            if (this.game.isValidPlacement(x, y, tile)) {
                return tile;
            }
        }

        return null;
    }
}


class GameRenderer {
    constructor(game, board) {
        this.game = game;
        this.board = board;
    }

    setup() {
        createCanvas(windowWidth, windowHeight);
        textAlign(CENTER, CENTER);
        document.addEventListener("contextmenu", (event) => event.preventDefault());
        strokeCap(SQUARE);
    }

    draw() {
        background(220);

        if (this.game.gameState === "intro") {
            this.drawIntroScreen();
        } else if (this.game.gameState === "game") {
            this.drawBoard();
            this.drawCurrentPlayer();
            this.drawTilePreview();
            this.drawControls();
        } else if (this.game.gameState === "gameOver") {
            this.drawGameOverScreen();
            this.drawBoard();
            this.drawLoop();
            this.drawWinningLine();
        }
    }

    drawGameOverScreen() {
        fill(0);
        textSize(32);
        text(`${this.game.winningPlayer} wins!`, width / 2, 20);

        fill(200);
        rect(width / 2 - 100, height - 80, 200, 50);

        fill(0);
        text("Restart", width / 2, height - 50);
    }

    drawIntroScreen() {
        noStroke();
        fill(0);
        textSize(32);
        text("TRAX", width / 2, height / 4);

        textSize(24);
        text("Choose your color:", width / 2, height / 2 - 50);

        // Red color button
        fill(0);
        text("Red", width / 2 - 50, height / 2 - 70);
        fill(255, 0, 0);
        rect(width / 2 - 75, height / 2 - 25, 50, 50);
        if (this.game.playerColor === "red") { // Highlight for Red selection
            noFill();
            stroke(0, 255, 0); // Green highlight color
            strokeWeight(3);
            rect(width / 2 - 75, height / 2 - 25, 50, 50);
            noStroke(); // Reset stroke for other elements
        }

        // White color button
        fill(0);
        text("White", width / 2 + 50, height / 2 - 70);
        fill(255);
        rect(width / 2 + 25, height / 2 - 25, 50, 50);
        if (this.game.playerColor === "white") { // Highlight for White selection
            noFill();
            stroke(0, 255, 0); // Green highlight color
            strokeWeight(3);
            rect(width / 2 + 25, height / 2 - 25, 50, 50);
            noStroke(); // Reset stroke for other elements
        }

        fill(200);
        rect(width / 2 - 100, height / 2 + 50, 200, 50);
        rect(width / 2 - 100, height / 2 + 125, 200, 50);

        fill(0);
        textSize(24);
        text("2 Player", width / 2, height / 2 + 75);
        text("vs AI", width / 2, height / 2 + 150);
    }

    windowResized() {
        resizeCanvas(windowWidth, windowHeight);
    }

    drawBoard() {
        this.board.draw();
        for (let key in this.game.forcedMoveTiles) {
            if (this.game.forcedMoveTiles.hasOwnProperty(key)) {
                let [x, y] = key.split(",").map(Number);
                this.drawForcedMoveHighlight(x, y, this.board.tileSize);
            }
        }
        if (this.game.lastPlayedTile) {
             this.drawLastPlayedHighlight(this.game.lastPlayedTile.x, this.game.lastPlayedTile.y, this.board.tileSize);
        }
    }

    drawForcedMoveHighlight(x, y, tileSize) {
        push();
        translate(width / 2 + x * tileSize, height / 2 + y * tileSize);
        noFill();
        strokeWeight(2);
        stroke(255, 150, 0);
        rect(-tileSize / 2 + 1, -tileSize / 2 + 1, tileSize - 2, tileSize - 2);
        pop();
    }

    drawLastPlayedHighlight(x, y, tileSize) {
        push();
        translate(width / 2 + x * tileSize, height / 2 + y * tileSize);
        noFill();
        strokeWeight(2);
        stroke(255, 215, 0);
        rect(-tileSize / 2 + 1, -tileSize / 2 + 1, tileSize - 2, tileSize - 2);
        pop();
    }


    drawTilePreview() {
        if (this.game.aiEnabled && this.game.currentPlayer === this.game.aiColor && this.game.playerColor !== this.game.aiColor) return;

        let gridX = round((mouseX - width / 2) / this.board.tileSize);
        let gridY = round((mouseY - height / 2) / this.board.tileSize);

        push();
        translate(width / 2 + gridX * this.board.tileSize, height / 2 + gridY * this.board.tileSize);
        rotate(radians(this.game.selectedRotation));

        fill(0, 150);
        stroke(0, 150);
        rect(-this.board.tileSize / 2, -this.board.tileSize / 2, this.board.tileSize, this.board.tileSize);

        if (this.game.selectedSide === "cross") {
            new Tile(this.game.selectedSide, 0, this.game.currentPlayer).drawCrossTile(this.board.tileSize); // Rotation is already applied by the transform
        } else {
            new Tile(this.game.selectedSide, 0, this.game.currentPlayer).drawCurveTile(this.board.tileSize); // Rotation is already applied by the transform
        }
        pop();
    }

    drawControls() {
        fill(0);
        textSize(16);
        text(`Rotation: ${this.game.selectedRotation}°`, width - 100, 30);
        text(`Tile Type: ${this.game.selectedSide}`, width - 100, 50);
        text("Right-click: Flip tile\nMouse wheel: Rotate", width - 100, 80);
    }

    drawCurrentPlayer() {
        fill(0);
        textSize(24);
        let displayColor = this.game.currentPlayer;
        if (this.game.aiEnabled) {
            displayColor = this.game.playerColor === "white" ? (this.game.currentPlayer === "white" ? "You (White)" : "AI (Red)") : (this.game.currentPlayer === "red" ? "You (Red)" : "AI (White)");
        } else {
            displayColor = `Player ${this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1)}`;
        }
        text(`Current Player: ${displayColor}`, width / 2, 50);
    }

    drawLoop() {
        if (this.game.loopPath.length > 1) {
            this.game.forcedMoveTiles.clear();
            stroke(0, 255, 0);
            strokeWeight(2);
            noFill();
            beginShape();
            for (let key of this.game.loopPath) {
                let [x, y] = key.split(",").map(Number);
                let screenX = width / 2 + x * this.board.tileSize;
                let screenY = height / 2 + y * this.board.tileSize;
                vertex(screenX, screenY);
            }
            endShape(CLOSE);
        }
        noStroke();
    }

    drawWinningLine() {
        if (!this.game.winningLineType || !this.game.winningLineEdges) return;
        this.game.forcedMoveTiles.clear();
        stroke(0, 255, 0);
        strokeWeight(20);
        noFill();

        const start = {
            x: width / 2 + this.game.winningLineEdges.start.x * this.board.tileSize,
            y: height / 2 + this.game.winningLineEdges.start.y * this.board.tileSize,
        };

        const end = {
            x: width / 2 + this.game.winningLineEdges.end.x * this.board.tileSize,
            y: height / 2 + this.game.winningLineEdges.end.y * this.board.tileSize,
        };

        if (this.game.winningLineType === "horizontal") {
            start.x -= this.board.tileSize / 2;
            end.x += this.board.tileSize / 2;
        } else {
            start.y -= this.board.tileSize / 2;
            end.y += this.board.tileSize / 2;
        }

        point(start.x, start.y);
        point(end.x, end.y);

        strokeWeight(2);
        noStroke();
    }
}


// Helper functions (outside of classes as they are utility functions)
function getDirection(dx, dy) {
    if (dx === 0 && dy === -1) return "top";
    if (dx === 1 && dy === 0) return "right";
    if (dx === 0 && dy === 1) return "bottom";
    if (dx === -1 && dy === 0) return "left";
    return null; // Or handle invalid dx, dy combinations
}

function oppositeDirection(dir) {
    return { top: "bottom", right: "left", bottom: "top", left: "right" }[dir];
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


let game;

function setup() {
    game = new Game();
    game.setup();
}

function draw() {
    game.draw();
}

function windowResized() {
    game.windowResized();
}

function mousePressed() {
    game.mousePressed();
}

function mouseWheel(event) {
    game.mouseWheel(event);
    return false;
}
