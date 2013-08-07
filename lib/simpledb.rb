require './lib/filecache'

class SimpleDb
	def initialize
		@db = nil
	end

	def connect
		@db = Sequel.connect(
			:adapter => 'mysql',
			:user => AppConfig.db.username,
			:host => AppConfig.db.host,
			:database => AppConfig.db.database,
			:password=>AppConfig.db.password
		)
	end

	def db
		if @db != nil
			return @db
		else
			self.connect
			return @db
		end
	end
end

class GitVersion
	def self.current(gitdir='./.git')
		return FileCache.new.cache('git.version', 3600 * 24 * 7) { `git --git-dir=#{gitdir} describe --long --always` }
	end
end
