

if(typeof Browser.Platform.windowsphone === 'undefined') {
	Browser.Platform.windowsphone = navigator.userAgent.toLowerCase().contains('windows phone');
}

if(typeof Browser.Platform.mobile === 'undefined') {
	Browser.Platform.mobile = Browser.Platform.ios || Browser.Platform.android || Browser.Platform.windowsphone;
}

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// https://gist.github.com/paulirish/1579671
//
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
//
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

// The global game options object is defined here so we don't get undefined
// errors for some other class if it is not used by the application
if(typeof GameOptions == 'undefined') {
	var GameOptions = {};
}

// CanvasHelper
//
// Helper class to handle html5 cavnases and render subobjects in an
// easy way
//
// It can be run in one of two modes - with autoRedraw or not turned on. With autoRedraw
// the canvas will be redraw as often as possible, using requestAnimationFrame (which aims
// for about 60fps). With it off, the parent will need to call refresh() manually to redraw
// the canvas.
//
// Everytime the canvas is redraw, the render(context, canvas) method is called for every
// object in the render queue. Add objects to the queue using the startRendering(o) method
// The only thing is object is required to have is a render method to paint its self to the
// canvas.
//
// The redraw loop has to be explicitly started with start when the helper is created
//
// Options:
//    - autoRedraw (bool) 		- when true the next frame will be requested immediately after the previous
//    - onRedraw (event fn())	- this event is triggered after the frame is cleared, but before the draw
//
// Example:
//		var helper = new CanvasHelper('canvas-id', {autoRedraw: true});
//
//		// squareThing.render(context, canvas) gets called at each frame
//		helper.startRendering(squareThing);
//
//		// starts the draw loop.
//		helper.start();
//
// In order to change the order of the rendering, set a zIndex property on the object that is
// passed to add/startRendering. If the zIndex is missing is it assumed to be 1
//
var CanvasHelper = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		this.tick = 0;
		this.waitingForFrame = false;

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
		if(this.waitingForFrame === false) {
			requestAnimationFrame(this.redraw.bind(this));

			// the waiting for frame flag makes sure that the frame will only be redrawn once
			// if mulitple requests are made on the same canvas before it gets a chance to draw
			this.waitingForFrame = true;
		}
		return this;
 	},

	stop: function() {
		this.options.autoRedraw = false;
		return this;
	},

	redraw: function() {
		this.tick++;
		this.waitingForFrame = false;

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

	add: function(o) {
		return this.startRendering(o);
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

		// now we need to sort the render queue by zindex to make sure it is rendered in the same order
		this.renderQueue.sort(function(a, b) { return (a.zIndex || 1) - (b.zIndex || 1); });

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

// CavnasText - helper class for rendering text with animations.
//
// The main thing this class provides is methods to animate the text
// pulsating it in and out, or fading the text. When calling fade, the
// text is automatically removed from the rendering queue when it
// disappears
//
var CanvasText = new Class({
	initialize: function(options) {
		this.options = options;
		this.renderingFinished = false;

		this.text = this.options.text || '';
		this.font = this.options.font || '12pt Arial';
		this.color = this.options.color || '#888';
		this.opacity = 1.0;
		this.align = this.options.align || 'center';

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;

		this.state = 'normal'; // pulse and fade are the other states
		this.animateStep = -0.01;
	},

	setText: function(text) {
		if(typeOf(text) == 'string' || text.toString) {
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
		context.textAlign = this.align;
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

// Moveable - base class for objects that move across the canvas
//
//
// This is a base class, when extending it you must implement the 'render' method
// so it knows how to draw itself.
//
// A Moveable has a position and a velocity. Everytime move() or update() is called
// the location is updated according to the velocity. It also contains a number of
// other methods for calculating the objets speed and distance from other objects etc
//
// Options:
//	x (number)	- x coord
//	y (number)	- y coord
//	xv (number)	- x velocity. This gets added to the location with every update()
//	yv (number)	- y velocity. This gets added to the location with every update()
//
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


var DraggableCanvas = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		

		var emptyFn = function() {};

		// should we use the mouse events or the touch events?
		this.options.useTouch = this.options.useTouch === true? true : (Browser.Platform.mobile || Browser.Platform.ios);

		// only detect dragging with the right mouse button
		this.options.rightClickOnly = (this.options.rightClickOnly === true)? true : false;
		
		// isDragging means the button has been clicked, draggingStarted means
		// it has actually moved. The dragstart event doesn't trigger until
		// there is actual movement
		this.isDragging = false;
		this.draggingStarted = false;
		this.startPos = null;

		this.options.onDragStart = this.options.onDragStart || emptyFn;
		this.options.onDragEnd = this.options.onDragEnd || emptyFn;
		this.options.onDragging = this.options.onDragging || emptyFn;

		var startEventName = (this.options.useTouch)? 'touchstart' : 'mousedown';
		var moveEventName = (this.options.useTouch)? 'touchmove' : 'mousemove';
		var endEventName = (this.options.useTouch)? 'touchend' : 'mouseup';

		if(this.options.rightClickOnly === true) {
			window.addEvent('contextmenu', function(e) {
				return false;
			});
		}

		this.element.addEvent(startEventName, function(e) {
			if(!this.isDragging) {
				if(this.options.rightClickOnly === true && !e.rightClick) {
					return false;
				}

				this.startPos = this.getLocalCoords(e.client.x, e.client.y);
				this.isDragging = true;
			}
		}.bind(this));


		this.element.addEvent(moveEventName, function(e) {
			if(this.isDragging) {
				if(!this.draggingStarted) {
					this.draggingStarted = true;
					this.onDragStart(e);
				}

				this.onDragging(e);

				if(this.options.useTouch) {
					// when we are dealing with the touch events, we need to disable to default, or
					// it will cause the page to rubber band and fuck things up
					e.preventDefault();
				}
			}
		}.bind(this));

		var endDrag = function(e) {
			if(this.isDragging) {
				this.isDragging = false;
				this.onDragEnd(e);
				this.startPos = null;
				this.draggingStarted = false;

				e.stop();
			}
		}.bind(this);

		this.element.addEvent(endEventName, endDrag);
		this.element.addEvent('mouseout', endDrag);
	},

	onDragStart: function(e) {
		e.dragStart = this.startPos;
		this.options.onDragStart(e);
	},

	onDragEnd: function(e) {
		e.dragStart = this.startPos;
		e.dragEnd = this.getLocalCoords(e.client.x, e.client.y);
		this.options.onDragEnd(e);
	},

	onDragging: function(e) {
		e.dragStart = this.startPos;
		e.dragEnd = this.getLocalCoords(e.client.x, e.client.y);
		this.options.onDragging(e);
	},

	getLocalCoords: function(clientX, clientY) {
		return {
			x: clientX - this.element.offsetLeft,
			y: clientY - this.element.offsetTop
		};
	}
});

var ScaleConverter = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.blockWidth = this.options.blockWidth || 10;
		this.blockHeight = this.options.blockHeight || 10;
		this.offsetX =  this.options.offsetX || 0;
		this.offsetY =  this.options.offsetY || 0;
		
		if(this.options.offsetCentered === true) {
			// this means we want the center of the 0,0 block to
			// be 0,0 in world coords. Instead of 0,0 world being the
			// top left corner of the 0,0 block (which is the default)
			this.offsetX = (this.blockWidth / 2).floor()
			this.offsetY = (this.blockHeight / 2).floor()
		}
	},
	
	blocksInRect: function(x, y, width, height) {
		var blocks = [];
		var start = this.worldToBlock(x, y);
		var end = this.worldToBlock(x + width, y + height);

		for(var bx=start.bx; bx <= end.bx; bx++) {
			for(var by=start.by; by <= end.by; by++) {
				blocks.push({
					bx: bx, 
					by: by, 
					width: this.blockWidth, 
					height: this.blockHeight 
				});
			}
		}
			
		return blocks;
	},
	
	worldToBlock: function(x, y) {
		return {
			bx: ((x + this.offsetX) / this.blockWidth).floor(),
			by: ((y + this.offsetY) / this.blockHeight).floor()
		};
	},
	
	blockToWorld: function(bx, by) {
		return {
			x: bx * this.blockWidth - this.offsetX,
			y: by * this.blockHeight - this.offsetY,
			width: this.blockWidth,
			height: this.blockHeight
		};
	},

	blockRect: function(bx, by) {
		return this.blockToWorld(bx, by);
	}
});

var ImageDataHelper = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.context = this.options.context || null;
		this.width = this.options.width || 0;
		this.height = this.options.height || 0;
		this.imageData = this.context.createImageData(this.width, this.height);
	},

	setPixel: function(x, y, color) {
		
		if(typeOf(color) == 'string') {
			colorData = this.toColorArray(color);
		} else if(typeOf(color) == 'array') {
			colorData = color;
		}

		this.setPixelRed(x, y, colorData[0]);
		this.setPixelGreen(x, y, colorData[1]);
		this.setPixelBlue(x, y, colorData[2]);
		this.setPixelAlpha(x, y, 255);
		return this;
	},

	setPixelRed: function(x, y, colorByte) {
		this.imageData.data[this.pixelIndex(x, y)] = colorByte;
		return this;
	},

	setPixelGreen: function(x, y, colorByte) {
		this.imageData.data[this.pixelIndex(x, y) + 1] = colorByte;
		return this;
	},

	setPixelBlue: function(x, y, colorByte) {
		this.imageData.data[this.pixelIndex(x, y) + 2] = colorByte;
		return this;
	},

	setPixelAlpha: function(x, y, alpha) {
		this.imageData.data[this.pixelIndex(x, y) + 3] = alpha;
		return this;
	},

	pixelIndex: function(x, y) {
		return (x + y * this.width) * 4;
	},

	toColorArray: function(colorString) {
		return colorString.hexToRgb(true);
	},

	toGrayscale: function(colorArray) {
		var tient = colorArray[0] * 0.299 + colorArray[1] * 0.587 + colorArray[2] * 0.114;
		return [tient, tient, tient];
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
