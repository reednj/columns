
var GameOptions = {

};


var Game = new Class({
	initialize: function(options) {
		this.options = options || {};
		this.mainCanvas = new CanvasHelper('main-canvas');
	}
}
