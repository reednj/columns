require 'redis'
REDIS = Redis.new

class GameModel
	attr_accessor :game_id
	attr_accessor :score

	def initialize(game_id)
		self.game_id = game_id
	end

	def self.top(n=10)
        data = REDIS.zrevrange "columns:games:score", 0, n-1, :with_scores => true
        data.map do |a| 
            game = self.new a[0]
            game.score = a[1]
            game
        end
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
