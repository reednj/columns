
var ColumnsGame = new Class({
	initialize: function() {

		this.mainCanvas = new CanvasHelper('main-canvas', {onRedraw: this.update.bind(this) });
		this.backCanvas = new CanvasHelper('back-canvas', {autoRedraw: false });
		this.prevCanvas = new CanvasHelper('preview-canvas', {autoRedraw: false });
		this.canvas = this.mainCanvas.canvas;

		this.squareSize = 20;
		this.gridWidth = this.canvas.width / this.squareSize;
		this.gridHeight = this.canvas.height / this.squareSize;

		this.gameState = 'start';
		this.prevBlock = new BlockPreview();

		this.resetBoard();

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

		this.initKeys();

		this.mainCanvas.startRendering(this.titleText);
		this.prevCanvas.startRendering(this.prevBlock);
		this.backCanvas.startRendering(this);

		this.backCanvas.refresh();
		this.prevCanvas.refresh();
		this.mainCanvas.start();

	},

	resetBoard: function() {
		this.grid = [];
		this.fadeQueue = [];

		this.initGrid();

		this.points = 0;
		this.blocksRemoved = 0;
		this.level = 1;

		$('points').innerHTML = this.points;
		$('level').innerHTML = 'Level ' + this.level;

		this.backCanvas.refresh();
		this.prevCanvas.refresh();
	},

	start: function() {
		this.gameState = 'falling';
		this.titleText.fade();
		this.subtitleText.fade();
		this.prevBlock.renewBlock();
		this.initFalling();
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

				if(this.gameState == 'falling') {
					this.fallfastKey();
				} else if(this.gameState == 'start' || this.gameState == 'gameover') {
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
		this.falling.x = this.canvas.width / 2 - this.squareSize / 2;
		this.falling.y = 0;
		this.falling.yv = this.blockSpeed();

		this.prevBlock.renewBlock();
		this.prevCanvas.refresh();

		this.mainCanvas.startRendering(this.falling);
		return this.falling;
	},

	initGrid: function() {
		var colorCode = 0;
		for(var y=0; y < this.gridHeight; y++) {
			var row = [];
			for(var x=0; x < this.gridWidth; x++) {
				row.push(colorCode);
			}
			this.grid.push(row);
		}
	},

	render: function(context, canvas) {

		for(var y=0; y < this.gridHeight; y++) {
			for(var x=0; x < this.gridWidth; x++) {
				var colorCode = this.grid[y][x];

				if(colorCode != 0) {
					this.drawSquare(context, x, y, colorCode)
				}

				// this is actually a v. bad way to draw a grid
				// but it doesn't happen very often, so will leave it in for now
				context.strokeStyle = '#333';
				context.strokeRect(x * this.squareSize, y * this.squareSize, this.squareSize, this.squareSize);
			}
		}

	},

	update: function() {

		if(this.gameState == 'falling') {
			if(this.falling == null) {
				// we are about to create a new peice at the top of
				// the board, but just before lets check to see if the
				// game is over
				if(this.isGameOver()) {
					this.gameState = 'gameover';
					this.gameOver();
					return;
				}

				this.initFalling();
			}

			this.falling.update();

			if(this.isAtBottom()) {
				this.fallingHit();
			}
		} else if(this.gameState == 'fading') {

			if(this.fadeQueue.length > 0) {
				this.fadeQueue.each(function(f){ f.update(); });
				this.fadeQueue = this.fadeQueue.filter(function(f){ return f.renderingFinished == false; });
			} else {
				var hasRun = this.disappearBlocks();

				if(hasRun) {
					this.gameState = 'fading'
				} else {
					this.pointsIncrement = 1;
					this.gameState = 'falling'
				}
			}

		}
	},

	drawSquare: function(context, gx, gy, colorCode) {
		context.fillStyle = ColumnColors[colorCode];
		context.fillRect(gx * this.squareSize, gy * this.squareSize, this.squareSize, this.squareSize);
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
		if(gc.x == 0 || this.grid[gc.y + this.falling.grid.length][gc.x - 1] != 0) {
			return;
		}

		this.falling.moveX(-1);
	},

	rightKey: function() {
		if(!this.falling) {
			return;
		}

		var gc = this.falling.gridCoordinates();
		if(gc.x == this.grid[0].length-1 || this.grid[gc.y + this.falling.grid.length][gc.x + 1] != 0) {
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
		if(this.gameState == 'gameover') {
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
		this.moveToGrid();
		this.falling.stopRendering();
		this.falling = null;

		var hasRun = this.disappearBlocks();

		if(hasRun) {
			this.gameState = 'fading';
		} else {
			this.gameState = 'falling';
		}

	},

	isAtBottom: function() {
		var bottomY = this.falling.y + this.falling.grid.length * this.squareSize;
		var gx = (this.falling.x / this.squareSize).floor();

		var columnTop = this.canvas.height;
		for(var y=0; y < this.grid.length; y++) {
			if(this.grid[y][gx] != 0) {
				columnTop = y * this.squareSize;
				break;
			}
		}

		return bottomY >= columnTop;
	},

	disappearBlocks: function() {
		var hasRun = false;
		while(this.collapseGrid()) {}

		var runList = this.getRuns();
		if(runList.length > 0) {
			hasRun = true;
			this.setBlocks(runList, 0);
			this.fadeBlocks(runList);

			this.addPoints(runList.length);
		}

		this.backCanvas.redraw();
		return hasRun;
	},

	// check to see if any peices have reached to top of the grid
	// if they have, then the game is over
	isGameOver: function() {
		var gx = ((this.canvas.width / this.squareSize) / 2).floor();
		return this.grid[0][gx] != 0;
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
		var maxSpeed = 5.0;
		return (0.5 + this.level * 0.5).limit(1.0, maxSpeed);
	},

	// moves the falling block into the grid to be redered normally
	moveToGrid: function() {
		var gx = (this.falling.x / this.squareSize).floor();
		var gy = (this.falling.y / this.squareSize).floor();

		this.falling.grid.each(function(colorCode, i) {
			this.grid[gy + i][gx] = colorCode;
		}.bind(this));

	},

	setBlocks: function(blockArray, colorCode) {
		blockArray.each(function(block) {
			this.grid[block.y][block.x] = colorCode;
		}.bind(this));
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

	// this function gets the list of squares of the same color that are lined up
	// and returns them. They are then eliminated from the grid, and we run the
	// process again, until there are no more left.
	getRuns: function() {

		var runList = [];

		var direction = 'across';
		for(var gy=0; gy < this.gridHeight; gy++) {

			var runLength = 0;
			var state = 'out';


			for(var gx=0; gx < this.gridWidth; gx++) {
				var curBlock = this.grid[gy][gx];

				// nextblock will be undef when we get to the end of the row
				// this is what we want, cause it will cause the current run
				// to get terminated
				var nextBlock = this.grid[gy][gx+1];

				if(curBlock == 0) {
					state = 'out';
					continue;
				}

				if(state == 'out') {
					if(curBlock == nextBlock) {
						runLength = 2;
						state = 'in';
					}
				} else if(state == 'in') {
					if(curBlock == nextBlock) {
						runLength++;
					} else {
						if(runLength >= 3) {
							runList.push(this.addRun(gx, gy, runLength, direction));
						}

						runLength = 0;
						state = 'out'
					}
				}
			}
		}

		var direction = 'up';
		for(var gx=0; gx < this.gridWidth; gx++) {

			runLength = 0;
			state = 'out';

			for(var gy=0; gy < this.gridHeight; gy++) {
				var curBlock = this.grid[gy][gx];

				// nextblock will be undef when we get to the end of the row
				// this is what we want, cause it will cause the current run
				// to get terminated
				var nextBlock = (this.grid[gy + 1])?this.grid[gy + 1][gx] : null;

				if(curBlock == 0) {
					state = 'out';
					continue;
				}

				if(state == 'out') {
					if(curBlock == nextBlock) {
						runLength = 2;
						state = 'in';
					}
				} else if(state == 'in') {
					if(curBlock == nextBlock) {
						runLength++;
					} else {
						if(runLength >= 3) {
							runList.push(this.addRun(gx, gy, runLength, direction));
						}

						runLength = 0;
						state = 'out'
					}
				}
			}
		}

		return runList.flatten();
	},

	addRun: function(endX, endY, runLength, direction) {
		var result = [];
		for(var i=0; i < runLength; i++) {
			if(direction == 'across') {
				result.push({x: endX - i, y:endY });
			} else {
				result.push({x: endX, y:endY - i });
			}
		}
		return result;
	}
});

var FadeBlock = new Class({
	initialize: function(options) {
		this.options = options || {};

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;
		this.duration = this.options.duration || 1000;
		this.squareSize = this.options.squareSize || 20;
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

var BlockPreview = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.squareSize = 20;
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
		this.squareSize = 20;
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
			context.fillRect(this.x.floor(), (this.y + i * this.squareSize).floor(), this.squareSize, this.squareSize);
			context.strokeRect(this.x.floor(), (this.y + i * this.squareSize).floor(), this.squareSize, this.squareSize);
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
