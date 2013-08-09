require 'sinatra'
require 'sequel'
require 'json'
require 'sinatra-websocket'

require './lib/simpledb'
require './lib/websocket'
require './lib/minimap'

# pretty sure tihs needs to go last in order for the other
# included files to reload properly
require "sinatra/reloader" if development?

# important - the cell data requests are large, but compress by about 90%
use Rack::Deflater

set :gitdir, development? ? './.git' : '/home/reednj/code/columns.git/.git'
set :version, GitVersion.current(settings.gitdir)

get '/' do
	redirect to('/columns')
end

get '/columns' do
	erb :columns
end

get '/wall' do
	erb :wall
end

# everything below here has to do with the paint game
# will probably need to be moved out to its own project at some point

get '/test/timer' do
	erb :'test/timer'
end

get '/paint' do
	erb :paint
end

get '/paint/api/ws' do
	if !request.websocket?
		'websockets only'
	else
		request.websocket { |ws| PaintWebSocket.new(ws) }
	end
end

get '/paint/api/map' do
	bx = params[:x].to_i
	by = params[:y].to_i
	path = nil

	GamesDb.connect do |db|
		mini_map = PaintMiniMap.new(db)
		path = mini_map.get_path(bx, by)
		filename = mini_map.get_filename(bx, by)

		# the minimap images are kind of expensive to generate, so I only want to
		# do every so often. we check the image on disk, and only regenerate it if it
		# is older than a minute. It is ok for them to be a little out of date.
		if !FileCache.new(mini_map.dir_path).cache_valid?(filename, 60)
			mini_map.save_png(bx, by)
		end
	end

	return 500 if path == nil
	send_file path
end

post '/paint/api/cell' do
	GamesDb.connect do |db|
		db.ext.set_cell(params[:x].to_i, params[:y].to_i, params[:color])
	end

	return 200
end

get '/paint/api/cell' do
	content_type 'application/json'

	sx = params[:sx].to_i
	sy = params[:sy].to_i
	ex = params[:ex].to_i
	ey = params[:ey].to_i
	format = 'normal'

	if params[:format] != nil
		format = params[:format]
	end


	GamesDb.connect do |db|
		data = db[:cell].where('x >= ? && y >= ? && x < ? && y < ?', sx, sy, ex, ey).limit(20000).all
		
		# the small format puts the data directly into the format needed by the
		# client in its data array. The json is about 20% the size, and it processes
		# in about 70% the time. The gzipped size is about the same though, so
		# we don't really save any bandwidth
		if format == 'small'
			result = {}
			data.each do |cell|
				id = cell[:x].to_s(16) + ':' + cell[:y].to_s(16)
				result[id] = cell[:color]
			end
			data = result
		end

		{:result => 'ok', :data => data}.to_json
	end

end

class PaintWebSocket < WebSocketHelper
	
	def initialize(ws)
		super(ws)
		@username = nil
		@db = GamesDb.connect
	end

	def on_set_cell(data)
	
		if @db.ext.set_cell(data[:x].to_i, data[:y].to_i, data[:color])
			self.send_others('setCell', data)
		end

	end

end