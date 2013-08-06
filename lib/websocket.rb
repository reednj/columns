
#
#
#
class WebSocketHelper
	def initialize(ws)
		# the sockets list is the list of all other WebSocketHelper classes
		# for all other connections. This makes it easy to send a message to 
		# all connected clients
		@sockets = SharedList.list
		@ws = ws

		@ws.onopen { self.on_open }
		@ws.onclose { self.on_close }
		@ws.onmessage { |msg|
			d = JSON.parse(msg)
			if d != nil && d['event'] != nil
				self.on_message(d['event'], d['data'])
			end
		 }
	end

	def on_open
		@sockets.push self
	end

	def on_message(event, data)
		event_method = 'on_' + event.underscore
		method(event_method).call(data) if self.respond_to? event_method
	end
	
	def on_close
		@sockets.delete(self)
	end

	def send(event, data)
		@ws.send({:event => event, :data => data}.to_json)
	end
	
	def send_all(event, data)
		EM.next_tick {
			@sockets.each do |s|
				s.send(event, data) 
			end
		}
	end

	def send_others(event, data)
		EM.next_tick {
			@sockets.each do |s|
				s.send(event, data) if s != self
			end
		}
	end
end

class String
	def underscore
		self.gsub(/::/, '/').
		gsub(/([A-Z]+)([A-Z][a-z])/,'\1_\2').
		gsub(/([a-z\d])([A-Z])/,'\1_\2').
		tr("-", "_").
		downcase
	end
end

class SharedList
	@@data = nil
	def self.list
		@@data = [] if @@data == nil
		return @@data
	end
end