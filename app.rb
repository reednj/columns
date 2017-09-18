require 'sinatra'
require 'sinatra/json'
require "sinatra/reloader" if development?
require 'json'
require 'redis'

Dir["./lib/**/*.rb"].each {|f| require f }

configure :development do 
	Dir["./lib/**/*.rb"].each {|f| also_reload f  }
end

use Rack::Deflater
set :version, `git describe`

get '/' do
	erb :columns
end

get '/game/id' do
	json({ :id => GameModel.start.game_id })
end

get '/game/top' do
	erb :_top_games, :locals => {
		:scores => GameModel.top
	}
end

post '/game/incr/:id/:n' do |game_id, n|
	GameModel[game_id].incr(n)
	"ok"
end

