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

var JSONSocket = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.options.url = this.options.url || null;
		this.options.onOpen = this.options.onOpen || function() {};
		this.options.onClose = this.options.onClose || function() {};
		
		this.ws = new WebSocket(this.options.url);
		this.ws.onopen = this.onOpen.bind(this)
		this.ws.onclose = this.onClose.bind(this);
		this.ws.onmessage = function(e) {
			this.onMessage(JSON.decode(e.data));
		}.bind(this);
	},
	
	onOpen: function() {
		this.options.onOpen(this, this.ws);
	},
	
	onClose: function() {
		this.options.onClose(this, this.ws);
	},
	
	onMessage: function(msg) {
		if(msg.event && typeOf(msg.event) == 'string') {
			(this.eventNameToFunction(msg.event))(msg.data);
		}
	},
	
	send: function(eventType, data) {
		var str = JSON.encode({event: eventType, data: data})
		this.ws.send(str);
	},

	eventNameToFunction: function(eventType) {
		if(eventType) {
			var fnName = 'on' + eventType.capitalize();
			return this.options[fnName] || function() {};
		}
	},

	isConnected: function() {
		return this.ws.readyState == WebSocket.OPEN;
	}
});

var PalettePicker = new Class({
	initialize: function(element, options) {
		this.element = $(element);
		this.options = options || {};
		this.options.colors = this.options.colors || ['#000', '#222', '#444', '#666', '#888', '#aaa', '#ccc', '#ddd', '#fff'];
		this.options.onSelect = this.options.onSelect || function() {};
		this.options.previewElement = $(this.options.previewElement) || null;
		this.options.initialColor = this.options.initialColor || this.options.colors[0] || '#000';

		this.selectedElement = null;

		this.initElement();
		this.setColor(this.options.initialColor);
		this.options.onSelect(this.options.initialColor);
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
	initialize: function(options) {
		this.options = options || {};
		this.options.debug = this.options.debug === true? true : false;

		this.mainCanvas = new CanvasHelper('main-canvas', {autoRedraw: false});
		this.mapCanvas = new CanvasHelper('map-canvas', {autoRedraw: false});
		this.canvas = this.mainCanvas.canvas;
		this.squareSize = 20;
		

		this.setCanvasSize();

		// configure the main grid
		this.grid = new CanvasGrid({
			debug: this.options.debug,
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
			colors: [
				"#356AA0","#4096EE","#C3D9FF",
				"#FFFF88", "#FF7400",
				"#6BBA70", "#006E2E", 
				"#000000","#888","#FFFFFF"
			],
			initialColor: this.loadColor(),
			previewElement: 'picker-preview',
			onSelect: function(color) {
				if(this.grid) {
					this.grid.setColor(color);
					this.saveColor(color);
				}
			}.bind(this)
		});

		this.initEvents();

		this.minimap = new MiniMap({
			center: this.grid.getCenter(),
			onImageLoad: function() {
				this.mapCanvas.refresh();
			}.bind(this)
		});
		this.mapCanvas.add(this.minimap);
		this.mainCanvas.add(this.grid);

		this.grid.loadInitialData();

		// connect to the game server with a websocket
		this.gameSocket = new JSONSocket({
			url: 'ws://' + document.location.hostname + ':' + (document.location.port || '80') + '/paint/api/ws',
			onOpen: function() {
				console.log('websocket connected')
			},
			onClose: function() {
				console.log('websocket disconnected')
			},
			onSetCell: function(cell) {
				console.log('cell update from server: [' + cell.x + ', ' + cell.y + ', ' + cell.color +']');
				this.grid.setCell(cell.x, cell.y, cell.color);
				this.mainCanvas.refresh();
			}.bind(this)
		});

		this.mapCanvas.refresh();
		this.mainCanvas.refresh();

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

		range.format = 'small';

		new Request.JSON({
			url: '/paint/api/cell',
			onSuccess: function(response) {
				if(response.result != 'ok') {
					alert('data load failed');
					return;
				}

				this.grid.addCells(response.data);
				this.mainCanvas.refresh();
			}.bind(this)
		}).get(range);
	},

	setCell: function(gx, gy, color) {
		var data = {x: gx, y: gy, color: color};

		// if we are connected to the websocket, then send the data through
		// there, otherwise fall back to basic ajax to set the cells
		if(this.gameSocket && this.gameSocket.isConnected()) {
			this.gameSocket.send('setCell', data);
		} else {
			new Request.JSON({url: '/paint/api/cell'}).post(data);
		}
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
				this.mapCanvas.refresh();
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

	loadColor: function	(){
		return JSON.decode(Cookie.read('color') || 'null')
	},

	saveColor: function(color) {
		Cookie.write('color', JSON.encode(color), {duration: 128});
	},

	saveLocation: function() {
		Cookie.write('location', JSON.encode(this.grid.gridOrigin), {duration: 128});
	},

	loadLocation: function() {
		return JSON.decode(Cookie.read('location') || 'null')
	}

});

var MiniMap = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.width = this.options.width || 200;
		this.height = this.options.height || 100;
		this.options.center = this.options.center || { gx: (this.width/2).floor(),  gy: (this.height/2).floor() };
		this.gx = this.options.gx || this.options.center.gx - (this.width / 2).floor();
		this.gy = this.options.gy || this.options.center.gy - (this.height / 2).floor();
		
		// when one of the images has completed loading, we probably want to refresh the
		// canvas, so that it shows up
		this.options.onImageLoad = this.options.onImageLoad || function() {};

		// this has to match the image sizes generated on the server, otherwise we won't be
		// able to properly calculate which images to load
		this.blockWidth = 200;
		this.blockHeight = 100;

		this.img = new Image() 
		this.img.src = this.imagePath(0,0);

		this.blocks = {};
	},

	// sets the center of the mini map to be the given gx, gy coords. This is useful instead of setting
	// the topleft position, because we want the center of the mini map to line with the center of the
	// actual grid
	setCenter: function(gx, gy) {
	},

	// this is the position in the game world (ie the grid coords) of the 0,0 point on the 
	// canvas
	setPosition: function(gx, gy) {
		if(typeOf(gx) == 'number' && typeOf(gy) == 'number') {
			this.gx = gx;
			this.gy = gy;
		}
	},

	render: function(context, canvas) {
		context.save();
		context.translate(-this.gx, -this.gy);

		this.requiredBlocks().each(function(b) {
			var grid = this.blockToGrid(b.bx, b.by);
			var imageBlock = this.blocks[this.getBlockID(b.bx, b.by)];
			
			if(!imageBlock) {
				imageBlock = this.addImage(b.bx, b.by);
			}

			context.drawImage(imageBlock.image, grid.x, grid.y);
		}.bind(this));

		context.restore();

		// now we draw the viewport rectangle..
		context.strokeStyle = '#ffff00';
		var viewport = {width: 71, height: 33 };
		context.strokeRect((canvas.width - viewport.width) / 2, (canvas.height - viewport.height) / 2, viewport.width, viewport.height);
	},

	addImage: function(bx, by) {
		var id = this.getBlockID(bx, by);

		if(!this.blocks[id]) {
			 var b = {bx: bx, by: by, image: new Image() };
			 b.image.addEvent('load', function() { this.options.onImageLoad(); }.bind(this));
			 b.image.src = this.imagePath(bx, by);
			 this.blocks[id] = b;
		}

		return this.blocks[id];
	},

	getBlockID: function(bx, by) {
		return bx + ':' + by;
	},

	requiredBlocks: function() {
		var cornerList = [
			this.topLeft(),
			{gx: this.topLeft().gx + this.width, gy: this.topLeft().gy},
			{gx: this.topLeft().gx, gy: this.topLeft().gy + this.height},
			{gx: this.topLeft().gx + this.width, gy: this.topLeft().gy + this.height}
		];

		var blockList = {};
		cornerList.each(function(c) {
			var block = this.gridToBlock(c.gx, c.gy);
			blockList[block.bx + ':' + block.by] = block;
		}.bind(this));

		return Object.values(blockList);
	},

	requiredImages: function() {
		return this.requiredBlocks().map(function(b) { return this.imagePath(b.bx, b.by); }.bind(this));
	},

	imagePath: function(bx, by) {
		return '/paint/api/map?x=' + bx + '&y=' + by;
	},

	topLeft: function() {
		return {gx: this.gx, gy: this.gy};
	},

	gridToBlock: function(gx, gy) {
		return {
			bx: ((gx + this.blockWidth / 2) / this.blockWidth).floor(),
			by: ((gy + this.blockHeight / 2) / this.blockHeight).floor()
		};
	},

	blockToGrid: function(bx, by) {
		return {
			x: (bx * this.blockWidth) - this.blockWidth / 2,
			y: (by * this.blockHeight) - this.blockHeight / 2
		}
	}

});

var CanvasGrid = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.squareSize = this.options.squareSize || 30;
		this.canvas = $(this.options.canvas) || $('main-canvas');
		this.rows = this.options.rows || (this.canvas.height / this.squareSize).floor();
		this.columns = this.options.columns || (this.canvas.width / this.squareSize).floor();

		this.data = {};
		this.offset = {x: 0, y: 0};
		this.gridOrigin = this.options.initialPosition || {x:0, y:0};
		this.topLeft = this.toGrid(0, 0);
		this.options.onCellSet = this.options.onCellSet || function() {};
		this.options.onDataRequired = this.options.onDataRequired || function() {};
		this.options.debug = (this.options.debug === true) ? true : false;

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

	// given a second data array, merge it into the existing one. This is the sort
	// of data we get from the sever in the 'small' format, which allows the client
	// to processes the new cells about 30% faster
	addCells: function(newData) {
		if(newData && typeOf(newData) == 'object') {
			Object.append(this.data, newData);
		}
		return this;
	},

	setCell: function(gx, gy, color, withEvents) {
		color = color || '#222'
		this.data[this.getCellID(gx, gy)] = color;

		if(withEvents === true) {
			this.options.onCellSet(gx, gy, color);
		}
	},

	getCellID: function(gx, gy) {
		return gx.toString(16) + ':' + gy.toString(16);
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

		for(var gx=renderStart.gx - 1; gx < renderStart.gx + this.columns + 2; gx++) {
			for(var gy = renderStart.gy - 1; gy < renderStart.gy + this.rows + 2; gy++) {
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

		if(this.options.debug) {
			context.fillStyle = '#888';
			context.fillText(canvas.width + 'x' + canvas.height + 'px', 20, 20);
			context.fillText(this.columns + 'x' + this.rows + 'sq', 20, 35);
			context.fillText(this.topLeft.gx + ', ' + this.topLeft.gy, 20, 50);
		}
	},

	renderGridLines: function(context, canvas) {
		var extra = 10;
		context.lineWidth = 1;
		context.strokeStyle = 'rgba(150, 150, 150, 0.5)';

		for(var i=-extra; i < this.rows + extra; i++) {
			context.beginPath();
			context.moveTo(this.squareSize*-extra, i * this.squareSize + 0.5);
			context.lineTo(canvas.width + this.squareSize*extra, i * this.squareSize + 0.5);
			context.stroke();
		}

		for(var i=-extra; i < this.columns + extra; i++) {
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
	},

	getCenter: function() {
		return {
			gx: this.topLeft.gx + (this.columns / 2).floor(),
			gy: this.topLeft.gy + (this.rows / 2).floor()
		};
	}

});
