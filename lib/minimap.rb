require 'sequel'
require 'chunky_png'

class PaintMiniMap

	def initialize(db)
		@db = db
		@block_width = 200
		@block_height = 100
		@dir = 'map'

		if !File.directory?(self.dir_path)
			Dir.mkdir(self.dir_path)
		end
	end

	def get_filename(bx, by)
		"thumb.#{bx}.#{by}.png"
	end

	def get_path(bx, by)
		File.join('public', @dir, self.get_filename(bx, by))
	end

	def dir_path
		File.join 'public', @dir
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

	def initialize
		self.r = 0
		self.g = 0
		self.b = 0
	end

	def self.from_string(str)
		ch = ColorHelper.new
		color = ColorHelper.normalize(str)

		if color.class == String && color.length == 7
			ch.r = Integer('0x' + color[1..2])
			ch.g = Integer('0x' + color[3..4])
			ch.b = Integer('0x' + color[5..6])
		end

		return ch
	end

	def self.normalize(str)
		if str.length == 4
			return "#{str[1]}#{str[1]}#{str[2]}#{str[2]}#{str[3]}#{str[3]}"
		else 
			return str
		end
	end

	def grayscale_teint
		return (0.299 * self.r + 0.587 * self.g + 0.114 * self.b).round.to_i
	end
end