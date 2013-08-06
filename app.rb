require 'sinatra'
require 'sequel'
require 'json'
require 'sinatra-websocket'

require './config/db'
require './lib/simpledb'
require './lib/websocket'

# pretty sure tihs needs to go last in order for the other
# included files to reload properly
require "sinatra/reloader" if development?

# important - the cell data requests are large, but compress by about 90%
use Rack::Deflater

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

get '/paint/api/setcell' do

	s = SimpleDb.new
	if s.db[:cell].where(:x => params[:x], :y => params[:y]).count == 0
		s.db[:cell].insert(:x => params[:x].to_i, :y => params[:y].to_i, :color => params[:color])
	end

	return 200
end

get '/paint/api/cell' do
	content_type 'application/json'

	sx = params[:sx].to_i
	sy = params[:sy].to_i
	ex = params[:ex].to_i
	ey = params[:ey].to_i

	s = SimpleDb.new
	data = s.db[:cell].where('x >= ? && y >= ? && x < ? && y < ?', sx, sy, ex, ey).limit(20000).all
	{:result => 'ok', :data => data}.to_json

end

class PaintWebSocket < WebSocketHelper
	@username = nil

	def on_set_cell(data)

		s = SimpleDb.new
		if s.db[:cell].where(:x => data[:x], :y => data[:y]).count == 0
			s.db[:cell].insert(
				:x => data[:x].to_i,
				:y => data[:y].to_i,
				:color => data[:color]
			)
		end

	end

end