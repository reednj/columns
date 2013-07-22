
var GameOptions = {

};

var Game = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: true});


		this.walls = [
			new Wall({x: 300, y: 0})
		];

		this.walls.each(function(w) {
			this.mainCanvas.startRendering(w);
		}.bind(this));


		this.mainCanvas.startRendering(new Ball({xv: 1, yv: 1}));
		this.mainCanvas.start();
	},

	stop: function() {
		this.mainCanvas.stop();
	}
});

var Ball = new Class({
	Extends: Moveable,
	initialize: function(options) {
		this.parent(options);
		this.size = this.options.size || 8;

	},

	render: function(context, canvas) {
		this.move();

		context.fillStyle = '#888';
		context.beginPath();
		context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		context.closePath();
		context.fill();

	}
});

var Wall = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.position = { x: this.options.x || 100, y: this.options.y };
		this.length = this.options.length || null;
	},

	render: function(context, canvas) {
		context.lineWidth = 8;
		context.strokeStyle = '#888';

		context.beginPath();
		context.moveTo(this.position.x, this.position.y);

		if(this.getDirection() == 'v') {
			context.lineTo(this.position.x, this.length || canvas.height);
		} else {
			context.lineTo(this.length || canvas.width, this.position.y);
		}

		context.stroke();
	},

	getDirection: function() {
		return this.position.x == 0 ? 'h' : 'v';
	}
});