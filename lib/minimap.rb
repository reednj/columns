require 'sequel'
require 'chunky_png'

class PaintMiniMap
	@db = nil


	def initialize(db)
		@db = db
		@block_width = 200
		@block_height = 100
	end

	def get_filename(bx, by)
		'thumb.' + bx.to_s + '.' + by.to_s + '.png'
	end

	def get_path(bx, by)
		File.join('public', 'map', self.get_filename(bx, by))
	end

	def save_png(bx, by)
		self.generate_png(bx, by).save(self.get_path bx, by)
	end

	def generate_png(bx, by)
		grid = self.block_to_grid(bx, by)
		png = ChunkyPNG::Image.new(grid.width, grid.height, ChunkyPNG::Color::TRANSPARENT)
		
		@db[:cell].where('x >= ? && y >= ? && x < ? && y < ?', grid.x, grid.y, grid.x + grid.width, grid.y + grid.height).each do |cell|
			image_x = cell[:x].to_i - grid.x
			image_y = cell[:y].to_i - grid.y

			gray = ColorHelper.from_string(cell[:color]).grayscale_teint
			png[image_x, image_y] = ChunkyPNG::Color.grayscale(gray) 
		end

		return png
	end

	def block_to_grid(bx, by)
		OpenStruct.new({
			:x => (bx * @block_width) - @block_width / 2,
			:y => (by * @block_height) - @block_height / 2,
			:width => @block_width,
			:height => @block_height
		})
	end
end

class ColorHelper
	attr_accessor :r, :g, :b

	def self.from_string(str)
		ch = ColorHelper.new
		color = ColorHelper.normalize(str)
		ch.r = Integer(color[1, 2], 16)
		ch.g = Integer(color[3, 2], 16)
		ch.b = Integer(color[5, 2], 16)
		return ch
	end

	def self.normalize(str)
		if str.length == 4
			return str[1] + str[1] + str[2] + str[2] + str[3] + str[3]
		else 
			return str
		end
	end

	def grayscale_teint
		return (0.299 * self.r + 0.587 * self.g + 0.114 * self.b).round.to_i
	end
end