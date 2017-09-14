require 'sinatra'
require 'sinatra/json'
require "sinatra/reloader" if development?
require 'json'
require 'redis'

Dir["./lib/**/*.rb"].each {|f| require f }

use Rack::Deflater
set :version, '1.0'

REDIS = Redis.new

get '/' do
	erb :columns
end

get '/game/id' do
	GameModel.start.game_id
end

get '/game/incr/:id/:n' do |game_id, n|
	GameModel[game_id].incr(n)
	"ok"
end

class GameModel
	attr_accessor :game_id

	def initialize(game_id)
		self.game_id = game_id
	end

	def self.start
		g = self.new String.random(28)
		g.redis.zadd "columns:games:start", Time.now.to_i, g.game_id
		return g
	end

	def self.[](game_id)
		g = self.new game_id
		g.exist!
		return g
	end

	def incr(n)
		self.redis.zincrby "columns:games:score", n.to_i, game_id
	end

	def exist?
		!self.redis.zrank("columns:games:start", game_id).nil?
	end

	def exist!
		raise 'game does not exist' unless exist?
	end

	def redis
		REDIS
	end
end
