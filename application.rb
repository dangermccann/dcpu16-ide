require 'sinatra'
require 'aws-sdk'
require 'json'

set :public_folder, File.dirname(__FILE__)

get '/' do
  send_file 'index.html'
end

post '/program' do
	program = params[:program]
	program_id = params[:program_id]
	if !program.nil? && !program_id.nil?
		programs().items.put(
			:program_id => program_id, 
			:program => params[:program], 
			:hardware => params[:hardware]
		)
		return "OK"
	else
		return [400, "You did not specify a program or a program_id"]
	end
end

get '/program/:id' do
	return programs().items[params[:id]].attributes[:program]
end

get '/program.json/:id' do
	program = programs().items[params[:id]]
	return { 
		:program => program.attributes[:program], 
		:program_id => program.attributes[:program_id], 
		:hardware => program.attributes[:hardware]
	}.to_json
end

def programs
	dynamo_db = AWS::DynamoDB.new(
                :access_key_id => ENV['AWS_ACCESS_KEY_ID'],
                :secret_access_key => ENV['AWS_SECRET_ACCESS_KEY'])
        programs = dynamo_db.tables['dcpu16_programs']
        programs.hash_key = [:program_id, :string]
	return programs
end

if ENV['AWS_ACCESS_KEY_ID'].nil? 
	$stderr.puts "You forgot to set AWS_ACCESS_KEY_ID!"
end
if ENV['AWS_SECRET_ACCESS_KEY'].nil? 
	$stderr.puts "You forgot to set AWS_SECRET_ACCESS_KEY!"
end

