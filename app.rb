require 'sinatra'
require "sinatra/reloader" if development?
require 'json'

use Rack::Deflater
set :version, '1.0'

get '/' do
	erb :columns
end
