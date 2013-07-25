
var GameOptions = {
	borderWidth: 20,
	wallWidth: 20,
	hintSize: 20
};

var GameState = {
	start: 0,
	running: 1
};

var Game = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: true, onRedraw: this.update.bind(this)});
		this.canvas = this.mainCanvas.canvas;

		this.borderWidth = GameOptions.borderWidth || 0;
		this.wallWidth = GameOptions.wallWidth || this.borderWidth || 10;
		this.gameState = GameState.start;

		this.tick = 0;
		this.level = 1;
		this.walls = [];
		this.balls = [];
		this.board = new GameBoard();

		this.titleText = new CanvasText({
			x: this.canvas.width / 2,
			y: this.canvas.height / 2,
			color: '#222',
			font: '24pt Arial',
			text: 'click to start'
		});

		this.titleText.pulse();

		this.mainCanvas.add(this.board);
		this.mainCanvas.add(this.titleText);
		this.mainCanvas.start();
		this.initEvents();
	},

	initEvents: function() {
		this.mainCanvas.canvas.addEvent('click', function(e) {
			if(this.gameState == GameState.running) {
				var x = e.client.x - this.mainCanvas.canvas.offsetLeft;
				var y = e.client.y - this.mainCanvas.canvas.offsetTop;
				this.addWall(x, y);
			} else if(this.gameState == GameState.start) {
				this.gameState = GameState.running;
				this.titleText.fade();
				this.startLevel();
			}
		}.bind(this));

		this.mainCanvas.canvas.addEvent('mousemove', function(e) {

			var x = e.client.x - this.mainCanvas.canvas.offsetLeft;
			var y = e.client.y - this.mainCanvas.canvas.offsetTop;

			if(this.board.isBorder(x, y, 40)) {
				this.board.showHint(x, y);
			} else {
				this.board.hideHint();
			}
		}.bind(this));

		this.mainCanvas.canvas.addEvent('mouseout', function(){
			this.board.hideHint();
		}.bind(this));

	},

	stop: function() {
		this.mainCanvas.stop();
	},

	resetBoard: function() {
		this.walls.each(function(w) {
			w.stopRendering();
		});

		this.balls.each(function(b) {
			b.stopRendering();
		});

		this.walls = [];
		this.balls = [];
	},

	startLevel: function() {

		for(var i=0; i < this.level + 1; i++) {
			this.addBall(this.canvas.width / 2, this.canvas.height / 2);
		}
	},

	addWall: function(x, y) {
		var direction = null;
		var edgeCount = 0;
		var hintSize = GameOptions.hintSize || 20;

		if(x < this.borderWidth + hintSize) {
			x = 0;
			direction = 'h';
			edgeCount++;
		} else if(x > (this.canvas.width - this.borderWidth - hintSize)) {
			x = this.canvas.width;
			direction = 'h';
			edgeCount++;
		}

		if(y < this.borderWidth + hintSize) {
			y = 0;
			direction = 'v';
			edgeCount++;
		} else if(y > (this.canvas.height - this.borderWidth - hintSize)) {
			y = this.canvas.height;
			direction = 'v';
			edgeCount++;
		}

		if(direction == 'v' && (x < this.borderWidth + this.wallWidth / 2 || x > this.canvas.width - this.borderWidth - this.wallWidth/2)) {
			return;
		} else if(direction == 'h' && (y < this.borderWidth + this.wallWidth / 2 || y > this.canvas.height - this.borderWidth - this.wallWidth/2)){
			return;
		}

		// now we want to check existing walls of the same type, and make sure we are not trying to
		// build over the top of then
		if(direction != null) {
			for(var i=0; i < this.walls.length; i++) {
				var w = this.walls[i];
				if(w.getDirection() == direction && (
					(direction == 'v' && (w.x - x).abs() < this.wallWidth) ||
					(direction == 'h' && (w.y - y).abs() < this.wallWidth)
				)) {
					return;
				}
			}
		}

		// we need to make sure that the user clicked on the border, and that they
		// didn't click on a corner
		if(direction != null && edgeCount <= 1) {

			var w = new Wall({
				x: x,
				y: y,
				direction: direction
			});

			this.walls.push(w);
			this.mainCanvas.add(w);
		}
	},

	addBall: function(x, y) {
		var b = new Ball({
			x: x,
			y: y,
			xv: Math.random() * 3 - 1.5,
			yv: Math.random() * 3 - 1.5
		});

		this.balls.push(b);
		this.mainCanvas.add(b);
	},

	update: function() {
		this.tick++;

		if(this.tick % 2 == 0) {
			this.bounceBalls();
			this.checkWalls();
		}
	},

	bounceBalls: function() {
		// we need to make the ball bounce off the added walls. the ball object itself takes care
		// of the bouncing off the edges of the canvas
		for(var i=0; i < this.balls.length; i++){
			var b = this.balls[i];
			for(j=0; j < this.walls.length; j++) {
				var w = this.walls[j];

				if(w.distance(b) < b.size + (w.width / 2) && w.inBounds(b)) {
					if(w.getDirection() == 'v') {
						b.xv = -b.xv;
						b.x += b.xv;
					} else {
						b.yv = -b.yv;
						b.y += b.yv;
					}

					if(w.inBuildBounds(b)) {
						this.gameOverHit();
					}
				}

			}
		}
	},

	areBallsSeparate: function() {
		var result = true;

		if(this.balls.length <= 1) {
			return true;
		}

		for(var i=0; i < this.balls.length; i++){
			for(var j=i+1; j < this.balls.length; j++){
				if(!this.balls[i].isSeparated(this.balls[j], this.walls)) {
					result = false;
					break;
				}
			}
		}

		return result;
	},

	checkWalls: function() {
		for(var i=0; i < this.walls.length; i++) {
			var wall = this.walls[i];

			if(wall.isBuilding && wall.wallHit(this.walls)) {
				wall.stopBuilding();
				this.wallComplete(wall);
			}
		}
	},

	wallComplete: function(wall) {
		var levelComplete = this.areBallsSeparate();

		if(levelComplete) {
			this.levelUp();
		}
	},

	gameOverHit: function(ball, wall) {
		this.resetBoard();
		this.startLevel();
	},

	levelUp: function() {
		this.level++;
		this.resetBoard();
		this.startLevel();
	},


});

var GameBoard = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.borderWidth = this.options.borderWidth || GameOptions.borderWidth;
		this.borderColor = '#222';
		this.canvas = this.options.canvas || $('main-canvas');
		this.wallHint = {x: 0, y: 0, width: 20, height: 20, visible: false };
	},

	render: function(context, canvas) {
		context.strokeStyle = this.borderColor;
		context.lineWidth = this.borderWidth;
		context.strokeRect(this.borderWidth/2, this.borderWidth/2, canvas.width - this.borderWidth, canvas.height - this.borderWidth);

		if(this.wallHint.visible) {
			context.fillStyle = this.borderColor;
			context.fillRect(this.wallHint.x, this.wallHint.y, this.wallHint.width, this.wallHint.height);
		}
	},

	isBorder: function(x, y, width) {
		width = width || this.borderWidth;

		return x <= width ||
			x >= this.canvas.width - width ||
			y <= width ||
			y >= this.canvas.height - width;
	},

	normalizeHintBox: function(mouseX, mouseY) {
		var x = 0;
		var y = 0;
		var width = 20;
		var height = 20;

		if(mouseX <= this.borderWidth + width) {
			y = mouseY - width/2;
			x = this.borderWidth
		} else if(mouseX >= this.canvas.width - this.borderWidth - width) {
			y = mouseY - width / 2;
			x = this.canvas.width - this.borderWidth - width;
		} else if(mouseY <= this.borderWidth + height) {
			y = this.borderWidth;
			x = mouseX - width/2;
		} else if(mouseY >= this.canvas.height - this.borderWidth - height) {
			y = this.canvas.height - this.borderWidth - height;
			x = mouseX - width/2;
		} else {
			return null;
		}

		return {x: x, y: y };
	},

	showHint: function(x, y) {
		var h = this.normalizeHintBox(x, y);
		this.wallHint.x = h.x;
		this.wallHint.y = h.y;
		this.wallHint.visible = true;
		return this;
	},

	hideHint: function() {
		this.wallHint.visible = false;
		return this;
	}
});

var Ball = new Class({
	Extends: Moveable,
	initialize: function(options) {
		this.parent(options);
		this.size = this.options.size || 8;
		this.borderWidth = GameOptions.borderWidth || 0;

	},

	render: function(context, canvas) {
		this.move(canvas);

		context.fillStyle = '#888';
		context.beginPath();
		context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		context.closePath();
		context.fill();

	},

	move: function(canvas) {
		this.parent();

		if(this.x + this.size >= canvas.width - this.borderWidth) {
			this.x = canvas.width - this.borderWidth - this.size;
			this.xv = -this.xv;
		} else if(this.x - this.size <= this.borderWidth) {
			this.x = this.borderWidth + this.size;
			this.xv = -this.xv;
		}

		if(this.y + this.size >= canvas.height - this.borderWidth) {
			this.y = canvas.height - this.borderWidth - this.size;
			this.yv = -this.yv;
		} else if(this.y - this.size <= this.borderWidth) {
			this.y = this.borderWidth + this.size;
			this.yv = -this.yv;
		}

	},

	isSeparated: function(ball, walls) {
		var result = false;

		if(this == ball) {
			return true;
		}

		// we need to check to make sure that there is at least one wall between
		// this and the ball that was passed in. Between means that
		// b1.x < w.x < b2.x for vertical walls, and within the y bounds of the wall
		for(var i=0; i < walls.length; i++) {
			var wall = walls[i];
			if(!wall.isBuilding && wall.separates(this, ball)) {
				result = true;
				break;
			}
		}

		return result;

	}
});

var Wall = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.x = this.options.x || 0;
		this.y = this.options.y || 0;
		this.length = this.options.length || 0;
		this.direction = this.options.direction || 'v';
		this.buildDirection = this.initBuildDirection();
		this.color = '#222';
		this.borderWidth = this.options.borderWidth || GameOptions.borderWidth || 10;
		this.width = this.options.width || 20;
		this.renderingFinished = false;

		this.isFading = false;
		this.fadeStep = 0;

		this.buildSpeed = 1;
		this.isBuilding = this.options.isBuilding === true || this.length == 0? true : false;

		this.canvas = this.options.canvas || $('main-canvas') || document.getElement('canvas');

		if(this.isBuilding) {
			this.length = GameOptions.borderWidth + 20 || 0;
		}
	},

	render: function(context, canvas) {
		var style = this.color;
		var p = this.endPoint();

		if(this.isBuilding || this.isFading) {
			if(this.isBuilding) {
				this.build();
			}

			var gradLength = 40;
			var endColor = '#f57777';

			if(this.length - this.borderWidth - gradLength < 0) {
				gradLength = this.length - this.borderWidth;
			}

			if(this.isFading) {
				this.fadeStep += 0.05
				endColor = ColorHelper.colorStep('#f57777', this.color, this.fadeStep);

				if(this.fadeStep > 1) {
					this.isFading = false;
				}
			}

			if(gradLength > 0) {
				var s = (this.getDirection() == 'v')? {x: p.x, y: p.y - gradLength * this.buildDirection} : {x: p.x - gradLength * this.buildDirection, y: p.y };
				var g = context.createLinearGradient(s.x, s.y, p.x, p.y);
				g.addColorStop(0.0, this.color);
				g.addColorStop(1.0, endColor);
				style = g;
			}

		}

		context.lineWidth = this.width;
		context.strokeStyle = style;

		context.beginPath();
		context.moveTo(this.x, this.y);
		context.lineTo(p.x, p.y);
		context.stroke();
	},

	stopRendering: function() {
		this.renderingFinished = true;
		return this;
	},

	build: function() {
		this.length += this.buildSpeed;
	},

	getDirection: function() {
		return this.direction;
	},

	// returns either 1 or -1
	initBuildDirection: function() {
		if(this.getDirection() == 'v') {
			return (this.y == 0) ? 1 : -1;
		} else {
			return (this.x == 0) ? 1 : -1;
		}
	},

	wallHit: function(walls) {
		var result = false;
		var endPoint = this.endPoint();

		// first check to see if we hit the end of the canvas
		if(this.getDirection() == 'v') {
			if((this.buildDirection == 1 && endPoint.y >= this.canvas.height - this.borderWidth) || (this.buildDirection == -1 && endPoint.y <= this.borderWidth)) {
				return true;
			}
		} else {
			if((this.buildDirection == 1 && endPoint.x >= this.canvas.width - this.borderWidth) || (this.buildDirection == -1 && endPoint.x <= this.borderWidth)) {
				return true;
			}
		}

		// check the other walls to see if we hit one of them
		for(var i=0; i < walls.length; i++) {
			var wall = walls[i];

			if(wall.getDirection() != this.getDirection()) {
				if(wall.inBounds(endPoint) && wall.distance(endPoint) <= this.width /2) {
					result = true;
					break;
				}
			}
		}

		return result;
	},

	stopBuilding: function() {
		this.isBuilding = false;
		this.isFading = true;
		return this;
	},

	endPoint: function() {
		return (this.getDirection() == 'v')? {x: this.x, y: this.y + (this.length * this.buildDirection)} : {x: this.x + (this.length * this.buildDirection), y: this.y};
	},

	separates: function(ball1, ball2) {
		if(!this.inBounds(ball1) || !this.inBounds(ball2)) {
			// both balls have to be in the bounds of the wall for it to separate them
			// so if thats not the case, we can just return false right now
			return false;
		}

		// if we get this far, then we know that both balls are in the bounds
		// so all we need to check it that the the balls are on oppisite sides of the
		// wall, in whatever direction it goes. If they are, then the wall separates
		// the balls
		if(this.getDirection() == 'v') {
			var side1 = (this.x - ball1.x) / (this.x - ball1.x).abs();
			var side2 = (this.x - ball2.x) / (this.x - ball2.x).abs();
			return side1 != side2;
		} else {
			var side1 = (this.y - ball1.y) / (this.y - ball1.y).abs();
			var side2 = (this.y - ball2.y) / (this.y - ball2.y).abs();;
			return side1 != side2;
		}

	},

	distance: function(p) {
		return (this.getDirection() == 'v')? (p.x - this.x).abs() : (p.y - this.y).abs();
	},

	// for the ball to be in bounds of the wall means that it is within the lengthways coordinates of the wall
	// that means, for a horizontal wall, a vertical line could be drawn from some point on the wall and it
	// would intersect the ball.
	inBounds: function(point) {
		var start = {x: this.x, y: this.y};
		var end = this.endPoint();

		if(this.buildDirection == -1) {
			// if the build direction is -ve then we need to swap the start and end point
			// for the comparision to work. The start point must always be up and to the left
			// of the end point
			var tmp = start;
			start = end;
			end = tmp;
		}

		return (this.getDirection() == 'v') ? point.y >= start.y && point.y <= end.y : point.x >= start.x && point.x <= end.x;
	},

	inBuildBounds: function(point) {
		if(!this.isBuilding) {
			// a wall that isn't building has no build bounds
			return false;
		}

		var gradLength = 40;
		var end = this.endPoint();
		var start = (this.getDirection() == 'v')? {x: end.x, y: end.y - gradLength * this.buildDirection} : {x: end.x - gradLength * this.buildDirection, y: end.y };

		if(this.buildDirection == -1) {
			var tmp = start;
			start = end;
			end = tmp;
		}

		return (this.getDirection() == 'v') ? point.y >= start.y && point.y <= end.y : point.x >= start.x && point.x <= end.x;
	}
});


Array.implement({

  subtractArray: function(a) {
    return this.addArray(a.map(function(item) { return -item; }));
  },

  addArray: function(a) {
    if(typeOf(a) == 'array' && this.length == a.length) {
      return this.map(function(item, i) {
        return this[i] + a[i];
      }.bind(this));
    } else {
      return this;
    }
  }

});

var ColorHelper = {
  colorStep: function(c1, c2, ratio) {
    ratio = ratio.limit(0, 1);
    c1 = ColorHelper.normalizeColor(c1);
    c2 = ColorHelper.normalizeColor(c2);
    change = c2.subtractArray(c1).map(function(i) { return i * ratio; });
    result = c1.addArray(change).map(function(i) {return i.round(); });
    return result.rgbToHex();
  },

  normalizeColor: function(c) {
    if(typeOf(c) == 'array') {
      return c;
    } else if(typeOf(c) == 'string') {
      return c.hexToRgb(true);
    }
  }
}
