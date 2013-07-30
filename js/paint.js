

var Game = new Class({
	initialize: function() {
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: false});
		this.canvas = this.mainCanvas.canvas;
		this.squareSize = 30;

		this.grid = new CanvasGrid({
			squareSize: this.squareSize,
			onCellSet: function() {
				this.mainCanvas.refresh();
			}.bind(this)
		});

		this.mainCanvas.add(this.grid);
		this.mainCanvas.refresh();

		this.initEvents();

	},

	initEvents: function() {
		this.dg = new DraggableCanvas(this.canvas, {

			onDragStart: function() {
				this.grid.isDragging = true;
			}.bind(this),

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

var CanvasGrid = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.squareSize = this.options.squareSize || 30;
		this.canvas = $(this.options.canvas) || $('main-canvas');
		this.rows = this.options.rows || this.canvas.height / this.squareSize;
		this.columns = this.options.columns || this.canvas.width / this.squareSize;

		this.data = {};
		this.offset = {x: 0, y: 0};
		this.gridOrigin = {x:0,y:0};
		this.topLeft = this.toGrid(0, 0);
		this.options.onCellSet = this.options.onCellSet || function() {};

		this.isDragging = false;

		this.canvas.addEvent('click', function(e) {
			//alert(this.isDragging);
			if(this.isDragging == true) {
				this.isDragging = false;
				return;
			}

			var c = this.getCanvasCoords(e.client.x, e.client.y);
			var g = this.toGrid(c.x, c.y);
			this.setCell(g.gx, g.gy);

		}.bind(this));
	},

	getCell: function(gx, gy) {
		return this.data[this.getCellID(gx, gy)];
	},

	setCell: function(gx, gy, color) {
		this.data[this.getCellID(gx, gy)] = color || '#222';
		this.options.onCellSet(gx, gy, color);
	},

	getCellID: function(gx, gy) {
		return gx.toString(16) + '-' + gy.toString(16);
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

		context.save();
		context.translate(this.offset.x + this.gridOrigin.x % this.squareSize, this.offset.y + this.gridOrigin.y % this.squareSize);

		for(var gx=this.topLeft.gx - 1; gx < this.topLeft.gx + this.columns + 1; gx++) {
			for(var gy = this.topLeft.gy - 1; gy < this.topLeft.gy + this.rows + 1; gy++) {
				if(!this.getCell(gx, gy)) {
					continue;
				}

				var rectOrigin = this.fromGrid(gx, gy);
				context.fillStyle = this.getCell(gx, gy);
				context.fillRect(rectOrigin.x, rectOrigin.y, this.squareSize, this.squareSize);
			}
		}

		this.renderGridLines(context, canvas);

		context.restore();
	},

	renderGridLines: function(context, canvas) {
		var extra = 10;
		context.strokeStyle = '#ccc';

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
			x: (this.gridOrigin.x - this.gridOrigin.x % this.squareSize) + gx * this.squareSize,
			y: (this.gridOrigin.y - this.gridOrigin.y % this.squareSize) + gy * this.squareSize
		};
	},

	getCellCenter: function(gx, gy) {
		var p = this.fromGrid(gx, gy);
		return {
			x: p.x + this.squareSize / 2,
			y: p.y + this.squareSize / 2
		};
	},

	getCanvasCoords: function(clientX, clientY) {
		return {
			x: clientX - this.canvas.offsetLeft,
			y: clientY - this.canvas.offsetTop
		};
	}

});
