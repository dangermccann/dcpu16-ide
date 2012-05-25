
Tokenizer = {

	tokens: [
		{ pattern: /^(;.*)/,						type: "comment"			},
		{ pattern: /^\b(0x[0-9ABCDEF]+)\b/i,		type: "hexidecimal"		},
		{ pattern: /^\b([0-9]+)\b/,					type: "decimal"			},
		{ pattern: /^(\".*\")/,						type: "string"			},
		{ pattern: /^(:[0-9A-Za-z_]+)/,				type: "label_def"		},
		{ pattern: /^\b(POP|PUSH|PEEK|DAT)\b/i,		type: "reserved_word"	},		
		{ pattern: /^\b(SET|ADD|SUB|MUL|MLI|DIV|DVI|MOD|MDI|AND|BOR|XOR|SHR|ASR|SHL|IFB|IFC|IFE|IFN|IFG|IFA|IFL|IFU|ADX|SBX|STI|STD|JSR|INT|IAG|IAS|RFI|IAQ|HWN|HWQ|HWI)\b/i,
													type: "command"			},
		{ pattern: /^\b([ABCXYZIJ]|SP|PC|EX)\b/i,	type: "register"		},
		{ pattern: /^\b([0-9A-Za-z_]+)\b/,			type: "label_ref"		},
		{ pattern: /^(\[)/,							type: "open_bracket"	},
		{ pattern: /^(\])/,							type: "close_bracket"	},		
		{ pattern: /^(,)/,							type: "comma"			},
		{ pattern: /^(\+|\-|\*)/,					type: "operator"		},
		{ pattern: /^([\s]+)/,						type: "space" 			},
	],
	
	tokenize: function(input) {
		
		var lines = input.split("\n");
		var tokenizedLines = [];
		for(var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var tokenizedLine = [];
			
			while(line != null && line.length > 0) {
				
				//console.log("tokenizing ", line);
				
				var lexeme = null;
				var match = null;
				var token = null;
			
				for(var p = 0; p < this.tokens.length; p++) {
					token = this.tokens[p];
					match = token.pattern.exec(line);
					if(match) break;
				}
			
				if(match && match[1].length > 0) {
					//console.log("token", match);
					
					lexeme = match[1];
					if(token.type == "command" || token.type == "reserved_word" || token.type == "register")
						lexeme = lexeme.toUpperCase();
						
					tokenizedLine.push( { lexeme: lexeme, type: token.type } );
					
					line = line.substr(lexeme.length)
				}
				else {
					throw ("Invlid token '" + line + "' on line " + (i+1));
					line = null;
				}
			}
			
			tokenizedLines.push(tokenizedLine);
		}
		return tokenizedLines;
	},
	
	htmlFormatTokens: function(tokenizedLines) {
		var html = "";
		for(var i = 0; i < tokenizedLines.length; i++) {
			var tokenizedLine = tokenizedLines[i];
			for(var j = 0; j < tokenizedLine.length; j++) {
				var token = tokenizedLine[j];
				html += this.htmlFormatToken(token);
			}
			html += "<br/>";
		}
		return html;
	},
	
	htmlFormatToken: function(token) {
		var str = token.lexeme.replace(/ /g, "&nbsp;");
		return "<span class='" + token.type + "'>" + str + "</span>";
	}
}

Assembler =  {
	compile: function(tokenizedLines) {
		
		// perform a first pass to estimate the offset associated with each label
		var offset = 0;
		var labels = {};
	
		for(var i = 0; i < tokenizedLines.length; i++) {
			var line = tokenizedLines[i];
			
			var command = null;
			var dat = null;
			var bracket = null;
			var operators = 0;
			var params = 0;
			var openBracketCount = 0, closeBracketCount = 0;
			
			for(var j = 0; j < line.length; j++) {
				var token = line[j];
				
				if(token.type == "command") {
					command = token;
					offset++;
				}
				else if(token.type == "reserved_word") {
					if(token.lexeme == "DAT") {
						if(dat != null || command != null) this.throwInvalid(i, token);
						dat = token;
					}
					else {
						if(command == null) this.throwInvalid(i, token);
					}
				}
				else if(token.type == "register") {
					if(command == null) this.throwInvalid(i, token);
				}
				else if(token.type == "operator") {
					if(command == null) this.throwInvalid(i, token);
					
					// if this is the first operator, increment offset by 2, otherwise by 1
					offset++;
					if(operators == 0)
						offset++;
					operators++;
				}
				else if(token.type == "comma") {
					if(command == null && dat == null) this.throwInvalid(i, token);
					
					// make sure there are no more than two parameters passed to a command
					if(command != null) {
						if(params > 1) this.throwInvalid(i, token);
					
						params++;
						operators = 0;
					}
				}
				else if(token.type == "decimal" || token.type == "hexidecimal") {
					if(command == null && dat == null) this.throwInvalid(i, token);
					
					// increase offset because we'll use "next word literal" for command
					// parameters, and each DAT element takes up one word
					offset++;
					
					// TODO: support literals for small values
				}
				else if(token.type == "open_bracket" || token.type == "close_bracket") {
					if(command == null) this.throwInvalid(i, token);
					
					if(token.type == "open_bracket")
						openBracketCount++;
					else
						closeBracketCount++;
						
				}
				else if(token.type == "string") {
					if(dat == null) this.throwInvalid(i, token);
					offset += token.lexeme.length;
				}
				else if(token.type == "label_def") {
					if(command != null || dat !=  null) this.throwInvalid(i, token);
					labels[token.lexeme.substr(1)] = offset;
				}
				else if(token.type == "label_ref") {
					if(command == null) this.throwInvalid(i, token);
					
					// increase offset because labels use "next word literal"
					offset++;
				}
			}
			
			if(openBracketCount != closeBracketCount) 
				throw "Mismatched brackets on line " + i;
		}
		
		var output = new Listing();
		offset = 0;
		
		// perform second pass to generate bytecode
		for(var i = 0; i < tokenizedLines.length; i++) {
			var line = tokenizedLines[i];
			var opcode = 0;
			var paramIdx = 0;
			var params = [];
			var dat = [];
			
			for(var j = 0; j < line.length; j++) {
				var token = line[j];
				
				if(token.type == "command") {
					opcode = eval("OPERATION_"+token.lexeme);
					if(opcode === 0) this.throwInvalid(i, token);
				}
				else if(token.type == "comma") {
					if(opcode !== 0)
						paramIdx++;
				}
				else if(token.type == "register") {
					params[paramIdx] = params[paramIdx] || new AssemblerParam();
					params[paramIdx].operands.push(token);
				}
				else if(token.type == "decimal" || token.type == "hexidecimal") {
					if(opcode !== 0) {
						params[paramIdx] = params[paramIdx] || new AssemblerParam();
						params[paramIdx].operands.push(token);
					}
					else {
						// DAT value
						dat.push(parseInt(token.lexeme));
					}
				}
				else if(token.type == "label_ref") {
					if(!labels[token.lexeme]) throw "Invalid label " + token.lexeme + " on line " + i;
				
					params[paramIdx] = params[paramIdx] || new AssemblerParam();
					params[paramIdx].operands.push(token);
				}
				else if(token.type == "operator") {
					params[paramIdx] = params[paramIdx] || new AssemblerParam();
					params[paramIdx].operators.push(token);
				}
				else if(token.type == "open_bracket") {
					params[paramIdx] = params[paramIdx] || new AssemblerParam();
					params[paramIdx].memoryTarget = true;
				}
				else if(token.type == "string") {
					// remove quotes 
					var str = token.lexeme.substr(1, token.lexeme.length-2);
					
					// push each character onto the program array
					for(var c = 0; c < str.length; c++) {
						dat.push(parseInt(str.charCodeAt(c)));
					}
				}
				else if(token.type == "reserved_word") {
					if(token.lexeme != "DAT") {
						params[paramIdx] = params[paramIdx] || new AssemblerParam();
						params[paramIdx].operands.push(token);
					}
				}
			}
			
			var bytes = [];
			
			if(opcode != 0) {
				if(params.length == 0) throw "One or more parameters are required on line " + i;
				if(params.length > 2) throw "Too many parameters on line " + i;
				
				
				var param1 = this.makeParam(params[0], labels);
				var param2 = (params.length > 1) ? this.makeParam(params[1], labels) : { };
				
				//additionalInstructions
				
				if(params.length == 1) 
					bytes.push(Utils.makeSpecialInstruction(opcode, param1.value));
				else {
					bytes.push(Utils.makeInstruction(opcode, param2.value, param1.value));
				}
				
				if(param2.nextWord != null)
					bytes.push(param2.nextWord);
				
				if(param1.nextWord != null)
					bytes.push(param1.nextWord);
				
			}
			else {
				for(var k = 0; k < dat.length; k++) {
					bytes.push(dat[k]);
				}
			}
			
			output.addLine(offset, line, bytes);
			offset += bytes.length;
			
		}
		
		return output;
		
	},
	
	makeParam: function(param, labels) {
		var val = 0, nextWord = null, additionalInstructions = [];
		
		if(param.operands.length > 1) {
			// make expression
		}
		else {
			var token = param.operands[0];
			if(token.type == "register") 
				val = eval("REGISTER_" + token.lexeme) + (param.memoryTarget ? Values.REGISTER_VALUE_OFFSET : 0);
			else if(token.type == "decimal" || token.type == "hexidecimal") {
				val = param.memoryTarget ? Values.NEXT_WORD_VALUE : Values.NEXT_WORD_LITERAL;
				nextWord = parseInt(token.lexeme);
			}
			else if(token.type == "label_ref") {
				val = param.memoryTarget ? Values.NEXT_WORD_VALUE : Values.NEXT_WORD_LITERAL;
				nextWord = labels[token.lexeme];
			}
			else if(token.type == "reserved_word") {
				if(token.lexeme == "POP")
					val = Values.SP_OFFSET;
				else if(token.lexeme == "PUSH")
					val = Values.SP_OFFSET;
				else if(token.lexeme == "PEAK")
					val = Values.SP_OFFSET + 1;
			}
		}
		return { "value": val, "nextWord": nextWord, "additionalInstructions": additionalInstructions };
	},
	
	throwInvalid: function(line, token) {
		throw "Invalid synxax on line " + i + " near " + token.lexeme;
	}
}

function AssemblerParam() {
	this.operands = [];
	this.operators = [];
	this.memoryTarget = false;	// whether the paramater references a RAM location
}

function Listing() {
	this.lines = [];

	this.addLine = function(offset, tokens, bytecode) {
		this.lines.push({ "offset": offset, "tokens": tokens, "bytecode": bytecode });
	}
	
	this.bytecode = function() {
		var output = [];
		for(var i = 0; i < this.lines.length; i++) {
			for(var j = 0; j < this.lines[i].bytecode.length; j++) {
				output.push(this.lines[i].bytecode[j]);
			}
		}
		return output;
	}
	
	this.htmlFormat = function() {
		var html = "";
		
		for(var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i];
			html += "<div class='offset'>" + Utils.hex2(line.offset) + "</div>";
			
			html += "<div class='bytecode'>";
			for(var j = 0; j < line.bytecode.length; j++) {
				html += Utils.hex2(line.bytecode[j]) + " ";
			}
			html += "</div>";
			
			html += "<div class='tokens'>";
			for(var j = 0; j < line.tokens.length; j++) {
				html += Tokenizer.htmlFormatToken(line.tokens[j]);
			}
			html += "</div>";
			
			html += "<div class='clear'></div>";
		}
		
		return html;
	}
	
	this.bytecodeText = function() {	
		var bytecode = this.bytecode();
		var output = "";
		for(var i = 0; i < bytecode.length; i++) {
			output += Utils.hex2(bytecode[i]) + " ";
		}
		return output;
	}
}


