require './config/db'
require './lib/filecache'

class GamesDb < Sequel::Database
	def self.connect
		@ext = DbExtensions.new(self)

		return super(
			:adapter => 'mysql',
			:user => AppConfig.db.username,
			:host => AppConfig.db.host,
			:database => AppConfig.db.database,
			:password=>AppConfig.db.password
		)
	end
end

class DbExtensions
	def initialize(db)
		@db = db
	end
end

class GitVersion
	def self.current(gitdir='./.git')
		return FileCache.new.cache('git.version', 3600 * 24 * 7) { `git --git-dir=#{gitdir} describe --long --always` }
	end
end
