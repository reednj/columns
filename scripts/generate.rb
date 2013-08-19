# change back into the root, because thats the only location
# that all the require dirs work from. probably I am doing this wrong
# and there is a better way, but oh well
Dir.chdir '..'

require 'rubygems'
require 'sequel'
require './lib/simpledb'

class App
	@@db = GamesDb.connect

	def self.main
		start_pos = { :x => 500, :y => 540 }
		end_pos = {:x => 560, :y=> 560 }
		colors = ["#356AA0","#4096EE","#C3D9FF","#FFFF88", "#FF7400", "#6BBA70", "#006E2E", "#000000","#888","#FFFFFF"];

		(start_pos[:x]..end_pos[:x]).each { |x|
			(start_pos[:y]..end_pos[:y]).each { |y|
				db.ext.set_cell x, y, colors.rand

				if x % 10 == 0  && y == start_pos[:y]
					puts x
				end
			}
		}

	end

	def self.db
		@@db
	end

end

class Array
	alias global_rand rand
	def rand
		self[global_rand(self.length)]
	end
end



App.main
