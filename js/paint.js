

var Game = new Class({
	initialize: function() {
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: false});
		this.canvas = this.mainCanvas.canvas;
		this.squareSize = 30;

		this.grid = new CanvasGrid({
			squareSize: this.squareSize,
			rows: this.canvas.height / this.squareSize,
			columns: this.canvas.width / this.squareSize
		});

		this.mainCanvas.add(this.grid);
		this.mainCanvas.refresh();

		this.initEvents();

	},

	initEvents: function() {
		this.dg = new DraggableCanvas(this.canvas, {
			onDragEnd: function(e) {
				this.grid.resetOrigin();
				this.mainCanvas.refresh();
			}.bind(this),

			onDragging: function(e) {
				this.grid.setOffset(
					e.dragEnd.x - e.dragStart.x,
					e.dragEnd.y - e.dragStart.y
				);
				this.mainCanvas.refresh();
			}.bind(this)
		});
	}

});

var DraggableCanvas = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		var emptyFn = function() {};

		this.isDragging = false;
		this.startPos = null;

		this.options.onDragStart = this.options.onDragStart || emptyFn;
		this.options.onDragEnd = this.options.onDragEnd || emptyFn;
		this.options.onDragging = this.options.onDragging || emptyFn;

		this.element.addEvent('mousedown', function(e) {
			if(!this.isDragging) {
				this.isDragging = true;
				this.onDragStart(e);
			}
		}.bind(this));

		this.element.addEvent('mousemove', function(e) {
			if(this.isDragging) {
				this.onDragging(e);
			}
		}.bind(this));

		var endDrag = function(e) {
			if(this.isDragging) {
				this.isDragging = false;
				this.onDragEnd(e);
				this.startPos = null;
			}
		}.bind(this);

		this.element.addEvent('mouseup', endDrag);
		this.element.addEvent('mouseout', endDrag);
	},

	onDragStart: function(e) {
		this.startPos = this.getLocalCoords(e.client.x, e.client.y);
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

var CanvasGrid = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.squareSize = this.options.squareSize || 30;
		this.rows = this.options.rows || 0;
		this.columns = this.options.columns || 0;

		this.offset = {x: 0, y: 0};
		this.gridOrigin = {x:0,y:0};
		this.topLeft = this.toGrid(0, 0);
	},

	// transfer the offset information into the origin, and start rendering
	// from that point again, instead of translating the entire grid
	resetOrigin: function() {
		this.gridOrigin = {
			x: this.offset.x + this.gridOrigin.x,
			y: this.offset.y + this.gridOrigin.y
		};

		this.offset = {x: 0, y: 0};
		this.topLeft = this.toGrid();
	},

	setOffset: function(x, y) {
		this.offset.x = x;
		this.offset.y = y;
	},

	render: function(context, canvas) {
		var extra = 10;
		context.save();
		context.strokeStyle = '#ccc';
		context.translate(this.offset.x + this.gridOrigin.x % this.squareSize, this.offset.y + this.gridOrigin.y % this.squareSize);

		for(var i=-extra; i < (canvas.height / this.squareSize) + extra; i++) {
			context.beginPath();
			context.moveTo(this.squareSize*-extra, i * this.squareSize);
			context.lineTo(canvas.width + this.squareSize*extra, i * this.squareSize);
			context.stroke();
		}

		for(var i=-extra; i < (canvas.width / this.squareSize) + extra; i++) {
			context.beginPath();
			context.moveTo(i * this.squareSize,  this.squareSize*-extra);
			context.lineTo( i * this.squareSize, canvas.height +  this.squareSize*extra);
			context.stroke();
		}

		context.font = '7pt Arial';
		context.textAlign = 'center';

		for(var gx=this.topLeft.gx-1; gx < this.topLeft.gx + this.columns + 1; gx++) {
			for(var gy = this.topLeft.gy - 1; gy < this.topLeft.gy + this.rows + 1; gy++) {
				var t = this.fromGrid(gx, gy);
				context.fillText(gx + ',' + gy, t.x, t.y + 4);
			}
		}

		context.restore();
	},

	toGrid: function(x, y) {
		x = x || 0;
		y = y || 0;

		return {
			gx: ((x - this.gridOrigin.x) / this.squareSize).floor(),
			gy: ((y - this.gridOrigin.y) / this.squareSize).floor()
		};
	},

	// returns the x, y position on the canvas of center the gx/gy gridsquare
	//
	// is it s bit complicated how it does this. this.pos is the top right of the
	// 0,0 grid square.
	fromGrid: function(gx, gy) {
		return {
			x: (this.gridOrigin.x - this.gridOrigin.x % this.squareSize) + gx * this.squareSize + this.squareSize / 2,
			y: (this.gridOrigin.y - this.gridOrigin.y % this.squareSize) + gy * this.squareSize + this.squareSize / 2
		};
	}

});
