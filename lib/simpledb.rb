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

	def set_cell(x, y, color, username = nil)
		if @db[:cell].where(:x => x, :y => y).count == 0
			@db[:cell].insert(
				:x => x,
				:y => y,
				:color => color,
				:username => username
			)

			return true
		else
			return false
		end
	end

	# removes the last action for that particular user
	# this function assumes that the user is already validated in terms of un/pw
	def delete_last(username)
		puts @db[:cell].where(:username => username).reverse_order(:created_date).limit(1).delete
	end

end

class GitVersion
	def self.current(gitdir='./.git')
		return `git --git-dir=#{gitdir} describe --long --always`
	end
end
