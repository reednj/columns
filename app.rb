
require 'sinatra'
require "sinatra/reloader" if development?
require 'sequel'
require 'json'

get '/' do
	redirect to('/columns')
end

get '/columns' do
	erb :columns
end

get '/wall' do
	erb :wall
end

get '/paint' do
	erb :paint
end