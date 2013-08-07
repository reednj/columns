require 'sinatra'
require 'sequel'
require 'json'
require 'sinatra-websocket'

require './lib/simpledb'
require './lib/websocket'

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

get '/paint/api/cell' do
	content_type 'application/json'

	sx = params[:sx].to_i
	sy = params[:sy].to_i
	ex = params[:ex].to_i
	ey = params[:ey].to_i

	db = GamesDb.connect
	data = db[:cell].where('x >= ? && y >= ? && x < ? && y < ?', sx, sy, ex, ey).limit(20000).all
	{:result => 'ok', :data => data}.to_json

end

class PaintWebSocket < WebSocketHelper
	
	def initialize(ws)
		super(ws)
		@username = nil
		@db = GamesDb.connect
	end

	def on_set_cell(data)
	
		if @db[:cell].where(:x => data[:x], :y => data[:y]).count == 0
			@db[:cell].insert(
				:x => data[:x].to_i,
				:y => data[:y].to_i,
				:color => data[:color]
			)

			self.send_others('setCell', data)
		end

	end

end