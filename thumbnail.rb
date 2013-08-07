require 'chunky_png'
require 'sequel'
require './lib/simpledb'

class ColorHelper
	attr_accessor :r, :g, :b

	def self.from_string(str)
		ch = ColorHelper.new

		if str.length == 4
			ch.r = Integer(str[1] + str[1], 16) / 255.0
			ch.g = Integer(str[2] + str[2], 16) / 255.0
			ch.b = Integer(str[3] + str[3], 16) / 255.0
		elsif str.length == 7
			ch.r = Integer(str[1, 2], 16) / 255.0
			ch.g = Integer(str[3, 2], 16) / 255.0
			ch.b = Integer(str[5, 2], 16) / 255.0
		end
		
		return ch
	end

	def intensity
		return 0.299 * self.r + 0.587 * self.g + 0.114 * self.b
	end
end

class App
	@@db = GamesDb.connect

	def self.main

		
		board_size = 500
		w = board_size
		h = board_size
		

		data = get_blocks(board_size)
		png = ChunkyPNG::Image.new(w, h, ChunkyPNG::Color::TRANSPARENT)

		data.each_with_index  do |row, y|
			row.each_with_index  do |intensity, x|
				color = (intensity * 255).round
				png[x, y] = ChunkyPNG::Color.rgb(color, color, color)
			end			
		end

		

		png.save('test.png')
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
