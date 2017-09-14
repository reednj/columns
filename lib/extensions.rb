
class Object
	def is_a!(t, name = nil)
		if !is_a? t
			if name.nil?
				raise "expected #{t} but got #{self.class}"
			else
				raise "#{name} requires #{t} but got #{self.class}"
			end
		end
	end
end


class File
	def self.append(path, data)
		File.open(path, 'a:UTF-8') do |file| 
			file.write data 
		end
	end
end

class Time
	def age_in_words(t=nil)
		t ||= Time.now
		result = (t - self).abs.time_in_words
		return t > self ? result + ' ago' : result + ' to go'
	end

	def age
		(Time.new - self)
	end

	def day_name
		self.strftime '%A'
	end

	def beginning_of_month
		Time.parse(self.strftime("%Y-%m-01"))
	end
end

class Numeric
	def limit(range)
		range.is_a! Range

		if self < range.min
			result = range.min 
		elsif  self > range.max
			result = range.max 
		else
			return self
		end

		if self.class == Fixnum
			result.to_i
		elsif self.class == Float
			return result.to_f
		else
			return result
		end
	end

	def to_pct(decimals = 1)
		(self * 100).round(decimals).to_s + ' %'
	end

	def to_usd(precision=2)
		s = '$' + ("%.#{precision}f" % self.abs)
		s = '-' + s if self < 0
		return s
	end

	def to_n0
		self.round.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
	end


	def to_s_with_si
		return (self / 1000.0).round(2).to_s + 'k' if self > 1000
		return (self / (1000.0 * 1000.0)).round(2).to_s + 'm' if self > 1000 * 1000
		return self
	end

	def stopwatch_time
		seconds = self.abs.floor % 60
		minutes = (self.abs / 60).floor;
		return "#{minutes.pad}:#{seconds.pad}"
	end

	def pad
		s = self.to_s
		s.length == 1 ? '0'+s : s
	end

	def time_in_words
		if self < 1.minute
			number = self.round
			type = 'sec'
		elsif self < 1.hour
			number = (self / 1.minute).round
			type = 'min'
		elsif self < 1.day
			number = (self / 1.hour).round
			type = 'hour'
		elsif self < 2.weeks
			number = (self / 1.day).round
			type = 'day'
		elsif self < 5.weeks
			number = (self / 1.week).round
			type = 'week'
		elsif self < 52.weeks
			number = (self / 30.days).round 1
			type = 'month'
		else
			number = (self / 365.days).round 1
			type = 'year'
		end

		type += 's' if number != 1
		"#{number.to_s} #{type}"
	end

	def to_human(len = 3)

		unit = ''
		n = self
		n = self.to_f unless n.is_a? Numeric

		if n > 1100
			n /= 1000.0
			unit = 'k'
		end

		if n > 1100
			n /= 1000.0
			unit = 'm'
		end

		if n > 1100
			n /= 1000.0
			unit = 'T'
		end

		# now we have the unit and the number we want to format it in a 
		# nice way so there is a consistant number of characters
		s = n.to_s
		if s.length > len
			s = s[0..len]
			s.chop! if s[-1] == '.'
		end

		"#{s}#{unit}"
	end
end

class Fixnum
	def to_one_odds?
		rand() < (1.0 / self.to_f)
	end

	def ago
		Time.now - self
	end

	def from_now
		Time.now + self
	end

	def seconds
		self
	end

	def minutes
		self * 60
	end

	def hours
		self * 60.minutes
	end

	def days
		self * 24.hours
	end

	def weeks
		self * 7.days
	end

	alias minute minutes
	alias hour hours
	alias day days
	alias week weeks
end


class String
	def self.random(len = 8)
		rand(36**len).to_s(36)
	end

	def sha1
		require 'digest/sha1' if !defined? Digest::SHA1
		Digest::SHA1.hexdigest self
	end

	def truncate(max_len, options=nil)
		options ||= {}
		return self if self.length <= max_len
		return self[0..max_len-1] + (options[:append] || '')
	end

	def alpha?
		!!match(/^[[:alnum:]]+$/)
	end
end

class Array
	def rand
		self[Object.send(:rand, self.length)]
	end
end

class Hash
	def compact
		self.select { |k, value| !value.nil? }
	end

  def downcase_key
    keys.each do |k|
      store(k.downcase, Array === (v = delete(k)) ? v.map(&:downcase_key) : v)
    end
    self
  end
end
