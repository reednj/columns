
var GameOptions = {

};

var Game = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: true, onRedraw: this.update.bind(this)});


		this.walls = [
			new Wall({x: 300, y: 0})
		];

		this.balls = [
			new Ball({xv: 1, yv: 1})
		];

		this.walls.each(function(w) {
			this.mainCanvas.add(w);
		}.bind(this));


		this.mainCanvas.add(this.balls[0]);
		this.mainCanvas.start();
	},

	stop: function() {
		this.mainCanvas.stop();
	},

	update: function() {
		this.bounceBalls();
	},

	bounceBalls: function() {
		// we need to make the bal bounce off the added walls. the ball object itself takes care
		// of the bouncing off the edges of the canvas
		for(var i=0; i < this.balls.length; i++){
			var b = this.balls[i];
			for(j=0; j < this.walls.length; j++) {
				var w = this.walls[j];

				if(w.getDirection() == 'v') {
					if((b.x - w.x).abs() < b.size && b.y >= w.y && b.y <= w.y + w.length) {
						b.xv = -b.xv;
					}
				} else {
					if((b.y - w.y).abs() < b.size && b.x >= w.x && b.x <= w.x + w.length) {
						b.yv = -b.yv;
					}
				}
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

	}
});

var Wall = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.x = this.options.x || 100;
		this.y = this.options.y || 0;
		this.length = this.options.length || 600;
	},

	render: function(context, canvas) {
		context.lineWidth = 8;
		context.strokeStyle = '#888';

		context.beginPath();
		context.moveTo(this.x, this.y);

		if(this.getDirection() == 'v') {
			context.lineTo(this.x, this.length || canvas.height);
		} else {
			context.lineTo(this.length || canvas.width, this.y);
		}

		context.stroke();
	},

	getDirection: function() {
		return this.x == 0 ? 'h' : 'v';
	}
});