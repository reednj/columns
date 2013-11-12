require 'sinatra'
require 'json'

# pretty sure tihs needs to go last in order for the other
# included files to reload properly
require "sinatra/reloader" if development?

# important - the cell data requests are large, but compress by about 90%
use Rack::Deflater
set :version, '1.0'

get '/' do
	redirect to('/columns')
end

get '/columns' do
	erb :columns
end

get '/wall' do
	erb :wall
end
