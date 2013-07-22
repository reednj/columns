
var GameOptions = {

};

var Game = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: true, onRedraw: this.update.bind(this)});


		this.walls = [
			new Wall({x: 300, y: 0, direction: 'v', length: 500}),
			new Wall({x: 0, y: 250, length: 300, direction: 'h'}),
			new Wall({x: 600, y: 450, direction: 'h', isBuilding: true}),
			new Wall({x: 500, y: 500, direction: 'v', isBuilding: true}),
		];

		this.balls = [];
		this.addBall(10, 10);

		this.walls.each(function(w) {
			this.mainCanvas.add(w);
		}.bind(this));


		this.mainCanvas.start();

		this.mainCanvas.canvas.addEvent('click', function(e) {
			var x = e.client.x - this.mainCanvas.canvas.offsetLeft;
			var y = e.client.y - this.mainCanvas.canvas.offsetTop;

			this.addBall(x, y);

		}.bind(this));
	},

	stop: function() {
		this.mainCanvas.stop();
	},

	addBall: function(x, y) {
		var b = new Ball({
			x: x,
			y: y,
			xv: 1,
			yv: 1
		});

		this.balls.push(b);
		this.mainCanvas.add(b);

		if(this.areBallsSeparate()) {
			$('sep').innerHTML = 'SEPARATE';
		} else {
			$('sep').innerHTML = 'JOINED';
		}
	},

	update: function() {
		this.bounceBalls();
		this.checkWalls();
	},

	bounceBalls: function() {
		// we need to make the bal bounce off the added walls. the ball object itself takes care
		// of the bouncing off the edges of the canvas
		for(var i=0; i < this.balls.length; i++){
			var b = this.balls[i];
			for(j=0; j < this.walls.length; j++) {
				var w = this.walls[j];

				if(w.getDirection() == 'v') {
					if((b.x - w.x).abs() < b.size && w.inBounds(b)) {
						b.xv = -b.xv;
					}
				} else {
					if((b.y - w.y).abs() < b.size && w.inBounds(b)) {
						b.yv = -b.yv;
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
			}
		}
	}


});

var Ball = new Class({
	Extends: Moveable,
	initialize: function(options) {
		this.parent(options);
		this.size = this.options.size || 8;

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

		if(this.x >= canvas.width) {
			this.x = canvas.width - 1;
			this.xv = -this.xv;
		} else if(this.x <= 0) {
			this.x = 1;
			this.xv = -this.xv;
		}

		if(this.y >= canvas.height) {
			this.y = canvas.height - 1;
			this.yv = -this.yv;
		} else if(this.y <= 0) {
			this.y = 1;
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
			if(wall.separates(this, ball)) {
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

		this.buildSpeed = 1;
		this.isBuilding = this.options.isBuilding === true? true : false;

		if(this.isBuilding) {
			this.length = 0;
		}
	},

	render: function(context, canvas) {
		if(this.isBuilding) {
			this.build();
		}

		context.lineWidth = 8;
		context.strokeStyle = '#888';

		var p = this.endPoint();
		context.beginPath();
		context.moveTo(this.x, this.y);
		context.lineTo(p.x, p.y);
		context.stroke();
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

		for(var i=0; i < walls.length; i++) {
			var wall = walls[i];

			if(wall.getDirection() != this.getDirection()) {
				var p = this.endPoint();
				var distance = (wall.getDirection() == 'v')? (p.x - wall.x).abs() : (p.y - wall.y).abs();

				if(wall.inBounds(p) && distance < 5) {
					result = true;
					break;
				}
			}
		}

		return result;
	},

	stopBuilding: function() {
		this.isBuilding = false;
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
	}
});