require './config/db'
require './lib/filecache'

class GamesDb < Sequel::Database
	def self.connect
		return super(
			:adapter => 'mysql',
			:user => AppConfig.db.username,
			:host => AppConfig.db.host,
			:database => AppConfig.db.database,
			:password=>AppConfig.db.password
		)
	end
end

class Sequel::Database
	@ext = nil
	def ext
		@ext = DbExtensions.new(self) if @ext == nil
		return @ext
	end
end

class DbExtensions

	def initialize(db)
		@db = db
	end

	def set_cell(x, y, color)
		if @db[:cell].where(:x => x, :y => y).count == 0
			@db[:cell].insert(
				:x => x,
				:y => y,
				:color => color
			)

			return true
		else
			return false
		end
	end
end

class GitVersion
	def self.current(gitdir='./.git')
		return FileCache.new.cache('git.version', 3600 * 24 * 7) { `git --git-dir=#{gitdir} describe --long --always` }
	end
end
