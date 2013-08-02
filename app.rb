
require 'sinatra'
require "sinatra/reloader" if development?
require 'sequel'
require 'json'

require './config/db'
require './lib/simpledb'

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