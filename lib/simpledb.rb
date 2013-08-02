
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

