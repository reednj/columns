
var CanvasHelper = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		this.tick = 0;

		this.options.autoRedraw = this.options.autoRedraw === false? false : true;
		this.options.onRedraw = this.options.onRedraw || function() {};

		this.renderQueue = [];

		this.canvas = this.element;
		this.context = this.canvas.getContext('2d');

	},

	start: function() {
		this.options.autoRedraw = true;
		return this.refresh();
	},

	refresh: function() {
		requestAnimationFrame(this.redraw.bind(this));
		return this;
 	},

	stop: function() {
		this.options.autoRedraw = false;
		return this;
	},

	redraw: function() {
		this.tick++;
		this.clear();

		// call the redraw event, so that the position of objects etc can be updated
		this.options.onRedraw();

		// after the redraw event there might be some objects we dont want to render
		// anymore. So we get a list of them, and remove them from the render queue
		this.stopRendering(this.renderQueue.filter(function(o) {return o.renderingFinished === true; }));

		this.renderQueue.each(function(o) {
			o.render(this.context, this.canvas);
		}.bind(this));

		if(this.options.autoRedraw === true) {
			requestAnimationFrame(this.redraw.bind(this));
		}
	},

	startRendering: function(o) {
    	if(!o) {
    		return;
    	}

    	if(typeOf(o) == 'array') {
      		o.each(function(renderObj) {
				this.startRendering(renderObj);
			}.bind(this));
			return;
		}

		// the object has to have a render function for it to be added to the queue
		if(!o.render || typeOf(o.render) != 'function') {
			return;
		}

		if(o.renderingFinished === true) {
			o.renderingFinished = false;
		}

		this.renderQueue.push(o);
		return this;
	},

	stopRendering: function(o) {
		if(!o) {
    		return;
    	}

		if(typeOf(o) == 'array') {
			o.each(function(renderObj) {
				this.stopRendering(renderObj);
			}.bind(this));
			return;
		}

		this.renderQueue.erase(o)
	},

	clear: function() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
});

var CanvasText = new Class({
	initialize: function(options) {
		this.options = options;
		this.renderingFinished = false;

		this.text = this.options.text || '';
		this.font = this.options.font || '12pt Arial';
		this.color = this.options.color || '#888';
		this.opacity = 1.0;

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;

		this.state = 'normal'; // pulse and fade are the other states
		this.animateStep = -0.01;
	},

	setText: function(text) {
		if(typeOf(text) == 'string') {
			this.text = text;
		}
		return this;
	},

	setFont: function(family, size) {
		this.font = size + 'pt ' + family;
		return this;
	},

	setColor: function(color) {
		if(typeOf(color) == 'string') {
			this.color = color;
		}
		return this;
	},

	render: function(context, cavnas) {
		if(this.state == 'fade') {
			this.fadeStep();
			context.fillStyle = this.rgbaColor();
		} else if(this.state == 'pulse') {
			this.pulseStep();
			context.fillStyle = this.rgbaColor();
		} else {
			context.fillStyle = this.color;
		}

		context.font = this.font;
		context.textAlign = 'center';
		context.fillText(this.text, this.x, this.y);
	},

	pulse: function(animateStep) {
		this.animateStep = animateStep || -0.01;
		this.opacity = 1.0;
		this.state = 'pulse';
		return this;
	},

	fade: function(animateStep) {
		this.animateStep = animateStep || -0.05;
		this.opacity = 1.0;
		this.state = 'fade';
		return this;
	},

	normal: function() {
		this.state = 'normal';
		return this;
	},

	pulseStep: function() {
		this.opacity += this.animateStep;
		if(this.opacity <= 0.3 || this.opacity > 1.0) {
			this.animateStep = -this.animateStep;
		}
	},

	fadeStep: function() {
		this.opacity += this.animateStep;
		if(this.opacity <= 0.0) {
			this.stopRendering();
		}
	},

	rgbaColor: function() {
		var colorArray = this.color.hexToRgb(true);
		colorArray.push(this.opacity.round(2).toString());
		return 'rgba(' + colorArray.join() + ')'
	},

	stopRendering: function() {
		this.renderingFinished = true;
		return this;
	}
});

var Moveable = new Class({
  	initialize: function(options) {
		this.options = options || {};

		this.canvas = this.options.canvas || document.getElement('canvas');
		this.context = this.canvas.getContext('2d');

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;
		this.xv = this.options.xv || 0;
		this.yv = this.options.yv || 0;

		this.renderingFinished = false;
	},

	update: function() {
		this.move();
	},

	move: function() {
		this.x += this.xv;
		this.y += this.yv;
	},

	speed: function() {
		return Math.sqrt(Math.pow(this.xv, 2) + Math.pow(this.yv, 2));
	},

	distanceFrom: function(o) {
		return Math.sqrt(Math.pow(this.x - o.x, 2) + Math.pow(this.y - o.y, 2));
	},

	stop: function() {
		this.xv = 0;
		this.yv = 0;
	},

	stopRendering: function() {
		this.renderingFinished = true;
		return this;
	}
});

Array.implement({
	sum: function() {
		var sum = 0;
		for(var i=0; i < this.length; i++) {
			if(typeOf(this[i]) == 'number') {
				sum += this[i];
			}
		}
		return sum;
	},

	average: function() {
		return this.sum() / this.length;
	},

	join: function(str) {
		str = str || ', ';
		var result = '';

		for(var i=0; i < this.length; i++) {
			if(i != this.length - 1) {
				result += (this[i] + str);
			} else {
				result += this[i];
			}
		}

		return result;
	}
});
