

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
