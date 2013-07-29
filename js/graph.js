
var Graph = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper(this.options.canvas || 'main-canvas', {
			autoRedraw: true
		});

		this.data = [];
		this.padding = 25;

		this.dataView = new DataView({
			data: this.data,
			x: this.padding ,
			y: this.padding ,
			width: this.mainCanvas.canvas.width - this.padding * 2,
			height: this.mainCanvas.canvas.height - this.padding * 2
		});

		this.mainCanvas.add(this.dataView);
		this.start();
	},

	addPoint: function(p) {
		if(typeOf(p) == 'number') {
			this.data.push(p);
		}

		return this;
	},

	newPoint: function() {
		this.addPoint(Math.random() * 100);
	},

	start: function() {
		this.mainCanvas.start();
		this.newPoint.periodical(250, this);
	},

});

var DataView = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.data = this.options.data || [];

		this.x = this.options.x || 0;
		this.y = this.options.y || 0;
		this.width = this.options.width || 200;
		this.height = this.options.height || 100;
		this.pointSpacing = this.options.pointSpacing || 10;
		this.color = this.options.color || '#4096EE';

		this.tempCanvas = document.createElement('canvas');
		this.tempCanvas.width = this.width;
		this.tempCanvas.height = this.height;
		this.tempContext = this.tempCanvas.getContext('2d');
	},

	render: function(context, canvas) {

		// we draw the line etc to a temp canvas, then copy it
		// over to the main one
		this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
		this.tempContext.strokeStyle = this.color;
		this.tempContext.lineWidth = 2;

		var intialIndex = this.initialIndex();
		var ip = this.normalizePoint(intialIndex, this.data[intialIndex]);
		this.tempContext.beginPath();

		this.tempContext.moveTo(ip.x, ip.y);
		for(var i=intialIndex+1; i < this.data.length; i++) {
			var p = this.normalizePoint(i, this.data[i]);
			this.tempContext.lineTo(p.x, p.y);
		}

		this.tempContext.stroke();

		// the temp canvas is complete, so lets copy it over to the display canvas
		context.drawImage(this.tempCanvas, this.x, this.y);

		// now draw the bounding rect for the graph canvas
		context.strokeStyle = '#888';
		context.lineWidth = 1;
		context.strokeRect(this.x, this.y, this.width, this.height);

	},

	initialIndex: function() {
		// we start from the end of the array working out the x
		// position, until we reach the first point that renders
		// *off* the temp canvas. This is our initial point
		for(var i=this.data.length-1; i >= 0; i--) {
			if(this.normalizePoint(i, this.data[i]).x <= 0) {
				return i;
			}
		}

		// not enough points to end up off the canvas, so the initial
		// point is zero
		return 0;
	},

	// the points in the data array should be a number between 0 and 100
	// the index in the array is used to get the x position
	//
	// we want the last point in the data array to always render in the same
	// place at the right of the canvas.
	normalizePoint: function(index, pct) {
		return {
			x: this.width - (this.data.length - index) * this.pointSpacing,
			y: this.height - (this.height * pct / 100)
		};
	}
});
