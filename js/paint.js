Array.implement({
	// returns the first element where fn(elem) === true
	// if no function, then just return the first item in the
	// array;
	getFirst: function(fn) {
		if(!fn || typeOf(fn) != 'function') {
			return this[0];
		}

		var result = null;

		for(var i=0; i < this.length; i++) {
			if(fn(this[i]) === true) {
				result = this[i];
				break;
			}
		}

		return result;
	}
});

var PalettePicker = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		this.options.colors = this.options.colors || ['#000', '#222', '#444', '#666', '#888', '#aaa', '#ccc', '#ddd', '#fff'];
		this.options.onSelect = this.options.onSelect || function() {};
		this.options.previewElement = $(this.options.previewElement) || null;

		this.selectedElement = null;

		this.initElement();
		this.setColor(this.options.colors[0]);
	},

	initElement: function() {
		this.options.colors.each(function(c) {
			new Element('span', {
				'data-color': c.toLowerCase(),
				styles: {
					backgroundColor: c
				},
				events: {
					click: function(e) {
						this.onSelect(e.target);
					}.bind(this)
				}
			}).inject(this.element);
		}.bind(this));
	},

	onSelect: function(elem) {
		if(elem && elem.get('data-color')) {
			this.setColor(elem);
			this.options.onSelect(elem.get('data-color'));
		}
	},

	// color can either be the color code, or it can be one of the span elements
	// from the picker
	setColor: function(color) {
		var colorElement = null;

		if(!color) {
			return;
		}

		// we want to normalize the 'arguments' here. At the end of this color should be the
		// color string, and colorElement should be the span elem from the picker
		if(typeOf(color) == 'string') {
			color = color.toLowerCase();
			colorElement = this.element.getElements('span').getFirst(function(elem) {
				return elem.get('data-color') == color;
			});
		} else if(typeOf(color) == 'element') {
			colorElement = color;
			color = colorElement.get('data-color');
		}

		if(colorElement) {

			if(this.selectedElement) {
				this.selectedElement.removeClass('selected');
			}

			if(this.options.previewElement) {
				this.options.previewElement.setStyle('background-color', color);
			}

			colorElement.addClass('selected');
			this.selectedElement = colorElement;
		}
	},

	getColor: function() {
		if(this.selectedElement) {
			return this.selectedElement.get('data-color');
		}
	}

});

var Game = new Class({
	initialize: function() {
		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: false});
		this.canvas = this.mainCanvas.canvas;
		this.squareSize = 20;

		this.setCanvasSize();



		// configure the main grid
		this.grid = new CanvasGrid({
			squareSize: this.squareSize,
			initialPosition: this.loadLocation(),
			onCellSet: function(gx, gy, color) {
				this.setCell(gx, gy, color);
				this.mainCanvas.refresh();
			}.bind(this),

			onDataRequired: function(sectionGrid) {
				var range = {
					sx: sectionGrid.gx,
					sy: sectionGrid.gy,
					ex: sectionGrid.gx + sectionGrid.width,
					ey: sectionGrid.gy + sectionGrid.height
				};

				this.loadCells(range);
			}.bind(this)
		});

		// set up the color picker
		var p = new PalettePicker('picker', {
			colors:  [
				"#FFFF88", "#FF7400",
				"#6BBA70", "#006E2E", "#C3D9FF", "#4096EE",
				"#356AA0", "#FFFFFF", "#888", "#000000"
			],
			previewElement: 'picker-preview',
			onSelect: function(color) {
				if(this.grid) {
					this.grid.setColor(color);
				}
			}.bind(this)
		});

		this.initEvents();

		this.mainCanvas.add(this.grid);
		this.mainCanvas.refresh();

		this.grid.loadInitialData();

	},

	setCanvasSize: function(width, height) {
		if(this.canvas) {
			if(!width || !height) {
				var footerHeight = 100;
				var viewport = this.canvas.getParent('.viewport');
				var viewPortHeight = window.innerHeight - footerHeight;

				viewport.setStyle('height', viewPortHeight + 'px');
				width = viewport.offsetWidth;
				height = viewport.offsetHeight;
			}

			this.canvas.width = width;
			this.canvas.height = height;
		}
	},

	loadCells: function(range) {
		if(!range) {
			return;
		}

		new Request.JSON({
			url: 'api/getcells.php',
			onSuccess: function(response) {
				if(response.result != 'ok') {
					alert('data load failed');
					return;
				}

				(response.data || []).each(function(cell) {
					this.grid.setCell(cell.x, cell.y, cell.color);
				}.bind(this));

				this.mainCanvas.refresh();

			}.bind(this)
		}).get(range);
	},

	setCell: function(gx, gy, color) {
		var data = {x: gx, y: gy, color: color};

		new Request.JSON({
			'url': 'api/setcell.php'
		}).get(data);
	},

	initEvents: function() {
		this.dg = new DraggableCanvas(this.canvas, {

			onDragStart: function() {
				this.grid.isDragging = true;
			}.bind(this),

			onDragEnd: function(e) {
				// for small moves we want to set the isdragging thing
				// to false, so that the click event is not supressed
				if((e.dragStart.x - e.dragEnd.x).abs() <= 5 && (e.dragStart.x - e.dragEnd.x).abs() <= 5) {
					this.grid.isDragging = false;
				}

				this.grid.resetOrigin();
				this.saveLocation();
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
	},

	saveLocation: function() {
		Cookie.write('location', JSON.encode(this.grid.gridOrigin), {duration: 128});
	},

	loadLocation: function() {
		return JSON.decode(Cookie.read('location') || 'null')
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
		this.gridOrigin = this.options.initialPosition || {x:0, y:0};
		this.topLeft = this.toGrid(0, 0);
		this.options.onCellSet = this.options.onCellSet || function() {};
		this.options.onDataRequired = this.options.onDataRequired || function() {};

		this.currentColor = this.options.color || '#222';

		// the section size is in grid squares, not px
		this.sectionSize = 100;
		this.sections = {};

		this.isDragging = false;

		this.canvas.addEvent('click', function(e) {
			if(this.isDragging == true) {
				this.isDragging = false;
				return;
			}

			var c = this.getCanvasCoords(e.client.x, e.client.y);
			var g = this.toGrid(c.x, c.y);


			if(!this.getCell(g.gx, g.gy)) {
				this.setCell(g.gx, g.gy, this.currentColor, true);
			}

		}.bind(this));
	},

	loadInitialData: function() {
		this.requestRequiredData();
	},

	setColor: function(color) {
		this.currentColor = color;
	},

	getCell: function(gx, gy) {
		return this.data[this.getCellID(gx, gy)];
	},

	setCell: function(gx, gy, color, withEvents) {
		color = color || '#222'
		this.data[this.getCellID(gx, gy)] = color;

		if(withEvents === true) {
			this.options.onCellSet(gx, gy, color);
		}
	},

	getCellID: function(gx, gy) {
		return gx.toString(16) + '-' + gy.toString(16);
	},

	getSectionID: function(sx, sy) {
		// for the moment the section ids are generated in exactly the same way as the
		// cell ids
		return this.getCellID(sx, sy);
	},

	isSectionLoaded: function(sx, sy) {
		return this.sections[this.getSectionID(sx, sy)] === true;
	},

	setSectionLoaded: function(sx, sy) {
		this.sections[this.getSectionID(sx, sy)] = true;
		return this;
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

		this.requestRequiredData();
	},

	requestRequiredData: function() {
		// now we need to check here if we need more data.
		this.dataRequiredFor().each(function(section) {
			var sectionGrid = this.sectionToGrid(section.sx, section.sy);
			this.options.onDataRequired(sectionGrid);

			// we are actually only flagging here that the load has been requested
			// not that the data has actually been set. Maybe this will cause problems
			// in the future, but it is ok for now. If it causes problems, we can always
			// change the this.sections hash so that is stores state, not just true/undef
			this.setSectionLoaded(section.sx, section.sy);
			console.log('loading section: [' + section.sx + ', ' + section.sy + ']');
		}.bind(this));

	},

	dataRequiredFor: function() {
		// check if any part of the view port sits in a section we don't have data for
		// returns a list of section sx/sy objects
		var cornerList = [
			this.topLeft,
			{gx: this.topLeft.gx + this.columns, gy: this.topLeft.gy},
			{gx: this.topLeft.gx, gy: this.topLeft.gy + this.rows},
			{gx: this.topLeft.gx + this.columns, gy: this.topLeft.gy + this.rows}
		];

		var sectionList = {};
		cornerList.each(function(corner) {
			var section = this.gridToSection(corner.gx, corner.gy);
			if(!this.isSectionLoaded(section.sx, section.sy)) {
				// yes, this will involve overwriting the same section mulitple times
				// probably, but I don't really care. It is the easiest way to get
				// a unique list of sections later on
				sectionList[this.getSectionID(section.sx, section.sy)] = section;
			}
		}.bind(this));

		return Object.values(sectionList);
	},

	setOffset: function(x, y) {
		this.offset.x = x;
		this.offset.y = y;
	},

	render: function(context, canvas) {

		context.save();
		context.translate(this.offset.x + this.gridOrigin.x % this.squareSize, this.offset.y + this.gridOrigin.y % this.squareSize);

		// calculate the offset in grid squares so that we can render the grid properly
		// while actually dragging. This involves rendering a slightly bigger canvas, but
		// oh well
		var offset = {
			gx: (this.offset.x / this.squareSize).floor(),
			gy: (this.offset.y / this.squareSize).floor()
		};

		var renderStart = {
			gx: this.topLeft.gx - offset.gx,
			gy: this.topLeft.gy - offset.gy
		};

		for(var gx=renderStart.gx - 1; gx < renderStart.gx + this.columns + 1; gx++) {
			for(var gy = renderStart.gy - 1; gy < renderStart.gy + this.rows + 1; gy++) {
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
		context.strokeStyle = 'rgba(150, 150, 150, 0.5)';

		for(var i=-extra; i < (canvas.height / this.squareSize) + extra; i++) {
			context.beginPath();
			context.moveTo(this.squareSize*-extra, i * this.squareSize + 0.5);
			context.lineTo(canvas.width + this.squareSize*extra, i * this.squareSize + 0.5);
			context.stroke();
		}

		for(var i=-extra; i < (canvas.width / this.squareSize) + extra; i++) {
			context.beginPath();
			context.moveTo(i * this.squareSize + 0.5,  this.squareSize*-extra);
			context.lineTo( i * this.squareSize + 0.5, canvas.height +  this.squareSize*extra);
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
	},

	sectionToGrid: function(sx, sy) {
		return {
			gx: sx * this.sectionSize - this.sectionSize / 2,
			gy: sy * this.sectionSize - this.sectionSize / 2,
			width: this.sectionSize,
			height: this.sectionSize
		};
	},

	gridToSection: function(gx, gy) {
		return {
			sx: ((gx + this.sectionSize / 2) / this.sectionSize).floor(),
			sy: ((gy + this.sectionSize / 2) / this.sectionSize).floor()
		}
	}

});
