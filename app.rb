require 'sinatra'
require 'sinatra/json'
require "sinatra/reloader" if development?
require 'json'
require 'redis'

Dir["./lib/**/*.rb"].each {|f| require f }

use Rack::Deflater
set :version, '1.0'

get '/' do
	erb :columns
end

get '/game/id' do
	json({ :id => GameModel.start.game_id })
end

post '/game/incr/:id/:n' do |game_id, n|
	GameModel[game_id].incr(n)
	"ok"
end

