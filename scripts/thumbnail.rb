require 'rubygems'
require 'chunky_png'
require 'sequel'

Dir.chdir '..'
require './lib/simpledb'
require './lib/minimap'


class App
	@@db = GamesDb.connect

	def self.main
		PaintMiniMap.new(@@db).save_png(0, 0)
	end

end




App.main