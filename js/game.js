
var GameOptions = {
	squareSize: 20
};

var GameState = {
	start: 0,
	gameOver: 1,
	falling: 2,
	fading: 3
};

var ColumnsGame = new Class({
	initialize: function() {
		this.gameState = GameState.start;

		this.mainCanvas = new CanvasHelper('main-canvas', {onRedraw: this.update.bind(this) });
		this.backCanvas = new CanvasHelper('back-canvas', {autoRedraw: false });
		this.prevCanvas = new CanvasHelper('preview-canvas', {autoRedraw: false });
		this.canvas = this.mainCanvas.canvas;

		this.squareSize = GameOptions.squareSize || 20;
		this.gridWidth = this.canvas.width / this.squareSize;
		this.gridHeight = this.canvas.height / this.squareSize;

		this.gameGrid = new GameGrid({ gridWidth: this.gridWidth, gridHeight: this.gridHeight });
		this.prevBlock = new BlockPreview();

		this.initText();
		this.initKeys();
		this.resetBoard();

		this.prevCanvas.startRendering(this.prevBlock);
		this.backCanvas.startRendering(this.gameGrid);
		this.backCanvas.refresh();
		this.prevCanvas.refresh();
		this.mainCanvas.start();

	},

	resetBoard: function() {

		this.fadeQueue = [];

		this.gameGrid.grid = [];
		this.gameGrid.initGrid();

		this.points = 0;
		this.blocksRemoved = 0;
		this.level = 1;

		$('points').innerHTML = this.points;
		$('level').innerHTML = 'Level ' + this.level;

		this.backCanvas.refresh();
		this.prevCanvas.refresh();
	},

	start: function() {
		this.gameState = GameState.falling;
		this.titleText.fade();
		this.subtitleText.fade();
		this.prevBlock.renewBlock();
		this.initFalling();
	},

	initText: function() {
		this.titleText = new CanvasText({
			text: 'press space to start',
			color: '#ccc',
			font: 'bold 16pt Arial',
			x: this.canvas.width / 2,
			y: this.canvas.height / 2.5
		});

		this.subtitleText = new CanvasText({
			text: 'press space to restart',
			color: '#ccc',
			font: '12pt Arial',
			x: this.canvas.width / 2,
			y: this.canvas.height / 2.5 + 20
		});

		this.titleText.pulse();
		this.mainCanvas.startRendering(this.titleText);
	},

	initKeys: function() {
		window.addEvent('keydown', function(e) {
			if(e.key == 'left') {
				this.leftKey();
			} else if(e.key == 'right') {
				this.rightKey();
			} else if(e.key == 'down'){
				this.rotateDownKey();
			} else if(e.key == 'up'){
				this.rotateUpKey();
			} else if(e.key == 'space') {

				if(this.gameState == GameState.falling) {
					this.fallfastKey();
				} else if(this.gameState == GameState.start || this.gameState == GameState.gameOver) {
					this.startKey();
				}
			}
		}.bind(this));
	},

	initFalling: function() {
		if(this.falling) {
			this.falling.stopRendering();
		}

		this.falling = this.prevBlock.block;
		this.falling.x = (this.gridWidth /2).floor() * this.squareSize;
		this.falling.y = 0;
		this.falling.yv = this.blockSpeed();

		this.prevBlock.renewBlock();
		this.prevCanvas.refresh();

		this.mainCanvas.startRendering(this.falling);
		return this.falling;
	},

	update: function() {

		if(this.gameState == GameState.falling) {
			if(this.falling == null) {
				// we are about to create a new peice at the top of
				// the board, but just before lets check to see if the
				// game is over
				if(this.isGameOver()) {
					this.gameState = GameState.gameOver;
					this.gameOver();
					return;
				}

				this.initFalling();
			}

			this.falling.update();

			if(this.isAtBottom()) {
				this.fallingHit();
			}
		} else if(this.gameState == GameState.fading) {

			if(this.fadeQueue.length > 0) {
				this.fadeQueue.each(function(f){ f.update(); });
				this.fadeQueue = this.fadeQueue.filter(function(f){ return f.renderingFinished == false; });
			} else {
				var hasRun = this.disappearBlocks();

				if(hasRun) {
					this.gameState = GameState.fading;
				} else {
					this.pointsIncrement = 1;
					this.gameState = GameState.falling;
				}
			}

		}
	},



	leftKey: function() {
		if(!this.falling) {
			return;
		}

		// if there are peices next to the falling p. already in the
		// grid, we can't move through them. So we check that the peice
		// immediately to the left of the bottom falling peice square
		// is empty
		var gc = this.falling.gridCoordinates();
		if(gc.x == 0 || this.gameGrid.grid[gc.y + this.falling.grid.length][gc.x - 1] != 0) {
			return;
		}

		this.falling.moveX(-1);
	},

	rightKey: function() {
		if(!this.falling) {
			return;
		}

		var gc = this.falling.gridCoordinates();
		if(gc.x == this.gameGrid.grid[0].length-1 || this.gameGrid.grid[gc.y + this.falling.grid.length][gc.x + 1] != 0) {
			return;
		}

		this.falling.moveX(1);
	},

	rotateDownKey: function() {
		if(!this.falling) {
			return;
		}

		this.falling.rotateDown();
	},

	rotateUpKey: function() {
		if(!this.falling) {
			return;
		}

		this.falling.rotateUp();
	},

	fallfastKey: function() {
		if(this.falling && this.falling.yv < 7.0) {
			this.falling.yv = 7.0;
		}
	},

	startKey: function() {
		if(this.gameState == GameState.gameOver) {
			this.resetBoard();
		}

		this.start();
	},

	fadeBlocks: function(blocks) {
		blocks.each(function(b){
			this.fadeBlock(b.x, b.y);
		}.bind(this))
	},

	fadeBlock: function(x, y) {
		var f = new FadeBlock({x:x, y:y, duration: 300 });
		this.mainCanvas.startRendering(f);
		this.fadeQueue.push(f);
		return f;
	},

	fallingHit: function() {
		this.gameGrid.moveToGrid(this.falling);
		this.falling.stopRendering();
		this.falling = null;

		var hasRun = this.disappearBlocks();

		if(hasRun) {
			this.gameState = GameState.fading;
		} else {
			this.gameState = GameState.falling;
		}

	},

	isAtBottom: function() {
		var bottomY = this.falling.y + this.falling.grid.length * this.squareSize;
		var gx = (this.falling.x / this.squareSize).floor();
		var gy = (bottomY / this.squareSize).floor();

		return gy >= this.gridHeight || this.gameGrid.grid[gy][gx] != 0;
	},

	disappearBlocks: function() {
		var hasRun = false;
		while(this.gameGrid.collapseGrid()) {}

		var runList = this.gameGrid.getRuns();
		if(runList.length > 0) {
			hasRun = true;
			this.gameGrid.setBlocks(runList, 0);
			this.fadeBlocks(runList);
			this.addPoints(runList.length);
		}

		this.backCanvas.redraw();
		return hasRun;
	},

	// check to see if any peices have reached to top of the grid
	// if they have, then the game is over
	isGameOver: function() {
		var gx = (this.gridWidth / 2).floor();
		return this.gameGrid.grid[0][gx] != 0;
	},

	gameOver: function() {
		this.titleText.setText('GAME OVER').pulse();
		this.subtitleText.pulse();
		this.mainCanvas.startRendering(this.titleText);
		this.mainCanvas.startRendering(this.subtitleText);
	},

	addPoints: function(blocksRemoved) {
		var blocksPerLevel = 50;
		this.blocksRemoved += blocksRemoved;
		this.points += (blocksRemoved * this.level);
		$('points').innerHTML = this.points;

		if(blocksPerLevel * this.level < this.blocksRemoved) {
			this.levelUp();
		}
	},

	levelUp: function() {
		this.level++;
		var levelText = 'Level ' + this.level;
		$('level').innerHTML = levelText;

		// flash the level on the screen
		this.titleText.setText(levelText).fade(-0.02);
		this.mainCanvas.startRendering(this.titleText);
	},

	blockSpeed: function() {
		var maxSpeed = 4.0;
		return (0.5 + this.level * 0.25).limit(1.0, maxSpeed);
	}

});


var GameGrid = new Class({
	initialize: function(options) {
		this.options = options || {};

		this.grid = null;
		this.gridHeight = this.options.gridHeight || 10;
		this.gridWidth = this.options.gridWidth || 10;
		this.squareSize = GameOptions.squareSize || 20;
		this.initGrid();
	},

	initGrid: function() {
		this.grid = [];
		var colorCode = 0;

		for(var y=0; y < this.gridHeight; y++) {
			var row = [];
			for(var x=0; x < this.gridWidth; x++) {
				row.push(colorCode);
			}
			this.grid.push(row);
		}
	},

	getRow: function(row) {
		return this.grid[row];
	},

	getColumn: function(col) {
		var result = null;

		if(col < this.gridWidth) {
			result = [];
			for(var i=0; i < this.grid.length; i++) {
				result.push(this.grid[i][col]);
			}
		}

		return result;
	},

	// moves the falling block into the grid to be redered normally
	moveToGrid: function(fallingBlock) {
		var gx = (fallingBlock.x / this.squareSize).floor();
		var gy = (fallingBlock.y / this.squareSize).floor();

		fallingBlock.grid.each(function(colorCode, i) {
			this.grid[gy + i][gx] = colorCode;
		}.bind(this));
	},

	setBlocks: function(blockArray, colorCode) {
		blockArray.each(function(block) {
			this.grid[block.y][block.x] = colorCode;
		}.bind(this));
	},

	// this function gets the list of squares of the same color that are lined up
	// and returns them. They are then eliminated from the grid, and we run the
	// process again, until there are no more left.
	//
	// the way we do this here is actually pretty inefficient, because we need to
	// convert each column into an array each time we check. But it is fast enough
	// and the code is much easier to understand than the alternative.
	getRuns: function() {
		var runList = [];

		for(var row=0; row < this.gridHeight; row++) {
			var runs = this.getRunsForArray(this.getRow(row)).map(function(r) { return {x:r, y:row }; });
			runList.append(runs);
		}

		for(var col=0; col < this.gridWidth; col++) {
			var runs = this.getRunsForArray(this.getColumn(col)).map(function(r) { return {x: col, y:r }; });
			runList.append(runs);
		}

		return runList;
	},

	// given an array, returns a list of indexes that form runs (ie consuctive items with the same value)
	// greater in length that minLength. Anything with the value 'ignore' doesn't count when getting the
	// runs.
	getRunsForArray: function(data) {
		var ignore = 0;
		var minLength = 3;
		var runArray = null;
		var result = [];

		for(var i=0; i < data.length; i++) {
			var current = data[i];
			var next = data[i+1];

			if(current == ignore) {
				continue;
			}

			if(current == next) {
				if(!runArray) {
					runArray = [i, i+1];
				} else {
					runArray.push(i+1);
				}
			} else if(current != next) {
				if(runArray) {
					// we are the the end of a run. If it is above the min length
					// then add it to the list
					if(runArray.length >= minLength) {
						result.append(runArray);
					}
					runArray = null;
				}
			}
		}

		return result;
	},

	// collspases the grid veritcally, after blocks with something above them have been
	// zeroed out. No animation at this stage
	collapseGrid: function() {
		var hasChanged = false;
		// we want to loop through each column from bottom to top
		for(var gx=0; gx < this.gridWidth; gx++) {
			for(var gy=this.gridHeight - 1; gy >= 0 ; gy--) {
				// if the current square is empty and the one above isn't,
				// then move things down one
				var curBlock = this.grid[gy][gx];
				var blockAbove = (gy > 0)? this.grid[gy - 1][gx] : 0;

				if(curBlock == 0 && blockAbove != 0) {
					this.grid[gy][gx] = blockAbove;

					if(gy != 0) {
						this.grid[gy - 1][gx] = 0;
					}

					hasChanged = true;
				}
			}
		}

		return hasChanged;
	},

	render: function(context, canvas) {

		for(var y=0; y < this.gridHeight; y++) {
			for(var x=0; x < this.gridWidth; x++) {
				var colorCode = this.grid[y][x];

				if(colorCode != 0) {
					context.fillStyle = ColumnColors[colorCode];
					context.fillRect(x * this.squareSize, y * this.squareSize, this.squareSize, this.squareSize);
				}

				// this is actually a v. bad way to draw a grid
				// but it doesn't happen very often, so will leave it in for now
				context.strokeStyle = '#333';
				context.strokeRect(x * this.squareSize, y * this.squareSize, this.squareSize, this.squareSize);
			}
		}

	}

});

// FadeBlock
//
// A gridsquare that changes color and fades out. These are used for effect
// when the player gets 3 blocks and a row, and we need to make those blocks
// disappear.
//
// This is some old code, it could probably take some tips from the way things
// are done with CanvasText
//
var FadeBlock = new Class({
	initialize: function(options) {
		this.options = options || {};

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;
		this.duration = this.options.duration || 1000;
		this.squareSize = this.options.squareSize || GameOptions.squareSize || 20;
		this.renderingFinished = false;

		this.currentShade = 0xff;
		this.endShade = 0x22;
		this.shadeStep = (this.endShade - this.currentShade) / (this.options.duration / 20);
		this.shadeStep = this.shadeStep.floor();
	},

	render: function(context, canvas) {
		var c = this.currentShade.toString(16);
		context.fillStyle = [c,c,c].hexToRgb();
		context.strokeStyle = '#333';
		context.fillRect(this.x* this.squareSize, this.y * this.squareSize, this.squareSize, this.squareSize);
		context.strokeRect(this.x * this.squareSize, this.y * this.squareSize, this.squareSize, this.squareSize);
	},

	update: function() {
		this.currentShade += this.shadeStep;

		if((this.shadeStep > 0&& this.currentShade >= this.endShade)
		  || (this.shadeStep < 0&& this.currentShade <= this.endShade)) {
			this.currentShade = this.endShade;
			this.stopRendering();
		}
	},

	stopRendering: function() {
		this.renderingFinished = true;
	}
});

// BlockPreview
//
// Using the normal fallingblock class with a zero velocity to render the next block
// in a smaller grid next to the main one.
//
// The block is not automatically created and displayed when the object is created
// you must explicited call renewBlock()
//
var BlockPreview = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.squareSize = GameOptions.squareSize || 20;
	},

	renewBlock: function() {
		return this.initBlock();
	},

	initBlock: function() {
		var gx = 1;
		var gy = 1;

		this.block = new FallingBlock({yv: 0});
		this.block.x = 1 * this.squareSize;
		this.block.y = 1 * this.squareSize;
		return this.block;
	},

	render: function(context, canvas) {
		this.gridHeight = canvas.height / this.squareSize;
		this.gridWidth = canvas.width / this.squareSize;;

		for(var y=0; y < this.gridHeight; y++) {
			for(var x=0; x < this.gridWidth; x++) {
				this.renderSquare(context, x, y);
			}
		}

		if(this.block) {
			this.block.render(context, canvas);
		}
	},

	renderSquare: function(context, gx, gy) {
		context.strokeStyle = '#333';
		context.strokeRect(gx * this.squareSize, gy * this.squareSize, this.squareSize, this.squareSize);
	}
});

var FallingBlock = new Class({
	Extends: Moveable,
	initialize: function(options) {
		this.parent(options);

		this.yv = this.options.yv || 1.5;
		this.grid = [0, 0, 0];
		this.squareSize = GameOptions.squareSize || 20;
		this.initGrid();

	},

	initGrid: function() {
		for(var i=0; i < this.grid.length; i++) {
			var colorCode = (Math.random() * (ColumnColors.length - 1)).floor() + 1;
			this.grid[i] = colorCode;
		}

		return this.grid;
	},

	render: function(context, canvas) {
		this.grid.each(function(colorCode, i) {
			context.fillStyle = ColumnColors[colorCode];
			context.strokeStyle = '#333';
			context.fillRect(this.x, (this.y + i * this.squareSize), this.squareSize, this.squareSize);
			context.strokeRect(this.x, (this.y + i * this.squareSize), this.squareSize, this.squareSize);
		}.bind(this));
	},

	moveX: function(gridDistance) {
		this.x += (gridDistance * this.squareSize);
		this.x = this.x.limit(0, this.canvas.width - this.squareSize);
	},

	// we want to move all the blocks up one space
	// and move the one in hte last position to the front
	rotateDown: function() {
		var b = this.grid[0];

		for(var i=1; i < this.grid.length; i++) {
			this.grid[i-1] = this.grid[i];
		}

		this.grid[this.grid.length - 1] = b;
	},

	rotateUp: function() {
		var b = this.grid[this.grid.length - 1];

		for(var i=this.grid.length-2; i >= 0; i--) {
			this.grid[i+1] = this.grid[i];
		}

		this.grid[0] = b;
	},

	gridCoordinates: function() {
		return {x: (this.x / this.squareSize).floor(), y: (this.y / this.squareSize).floor()};
	}

});

var ColumnColors = [
	'#000',
	'#FF3040',
	'#006E2E',
	'#4096EE',
	'#FF8',
	'#FF7400',
	'#40ffee'
];
