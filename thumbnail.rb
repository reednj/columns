require 'chunky_png'
require 'sequel'
require './lib/simpledb'

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

	def save_png(bx, by)
		self.generate_png(bx, by).save(self.get_filename bx, by)
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

class App
	@@db = GamesDb.connect

	def self.main
		PaintMiniMap.new(@@db).save_png(0, 0)
	end

	# gets a list of blocks for a square centered around the
	# origin of size +total_size+
	def self.get_blocks(total_size)
		sx =  0 - total_size / 2
		sy =  0 - total_size / 2
		ex = total_size + sx
		ey = total_size + sy

		result = []
		
		(sy..ey-1).each do |y|
			result.push []
			(sx..ex-1).each do |x|
				result[-1].push 0
			end
		end


		@@db[:cell].where('x >= ? && y >= ? && x < ? && y < ?', sx, sy, ex, ey).each do |cell|
			x = cell[:x].to_i
			y = cell[:y].to_i 
			result[y - sy][x - sx] = 1 - ColorHelper.from_string(cell[:color]).intensity
		end

		return result

	end

end




App.main
