
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
		{ pattern: /^(\+|\-|\*|\/|%|\(|\)|\&|\||\^|>>|<<)/,		
													type: "operator"		},
		{ pattern: /^([\s]+)/,						type: "space" 			},
	],
	
	tokenize: function(input) {
		
		var lines = input.split("\n");
		var tokenizedLines = [];
		var errors = [];
		for(var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var tokenizedLine = [];
			
			try {
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
						throw { 
							name: "AssemblyError", 
							message: "Invalid token near " + line,
							line: (i+1)
						};
						line = null;
					}
				}
			}
			catch(err) { 
				errors.push(err);
			}
			
			tokenizedLines.push(tokenizedLine);
		}
		return { lines: tokenizedLines, errors: errors };
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
	},
	
	logTokens: function(tokens, start) {
		var str = "";
		for(var l = start; l < tokens.length; l++) {
			str += tokens[l].lexeme;
		}
		console.log(str);
	}
}

function AssemblerArgument() {
	this.expressionValue = null;
	this.expressionRegister = null;
	this.memoryTarget = false;
	this.value = null;
	this.nextWord = null;
	this.tokenCount = 0;
}

Assembler =  {
	getLabelValue: function(token, labels, lineNumber) {
		if(labels != null) {
			var labelVal = labels[token.lexeme.toLowerCase()];
			if(labelVal == null) this.throwInvalid(lineNumber, token, "Undefined label " + token.lexeme);
			return labelVal;
		}
		else return 0x100; // placeholder -- TODO: what if this gets reduced to a literal next time through?
		
	},
	
	getRegisterValue: function(register, value, valuePlusNextWord) { 
		var val = eval("REGISTER_" + register);
		
		if(register != "SP") {
			if(value) 
				val += Values.REGISTER_VALUE_OFFSET;
			if(valuePlusNextWord) 
				val += Values.REGISTER_NEXT_WORD_OFFSET;
		}
		else {
			if(value)
				val = Values.SP_OFFSET + 1;	// 0x19
			if(valuePlusNextWord)
				val = Values.SP_OFFSET + 2;	// 0x1a
		}
		return val;
		
	},

	evaluateExpression: function(tokens, start, lineNumber, labels) {
		var k;
		var expressionStr = "";
		var expressionStart = -1, expressionEnd = 0xffffff;
		
		
		// build string representation of the expression.  only works if all operands are literals
		for(k = start; k < tokens.length; k++) {
			var token = tokens[k];
			
			if(token.type === "space") { }
			else if(token.type == "comma" || token.type == "comment") { 
				break;
			}
			else if(token.type === "operator") {
				expressionStr += token.lexeme;
			}
			else if(token.type === "label_ref") {
				expressionStr += this.getLabelValue(token, labels, lineNumber);
				if(expressionStart === -1)
					expressionStart = k;
				expressionEnd = k;
			}
			else if(token.type === "decimal" || token.type === "hexidecimal" ) {
				expressionStr += parseInt(token.lexeme);
				
				if(expressionStart === -1)
					expressionStart = k;
				expressionEnd = k;
			}
			else if(token.type === "register") {
				expressionStr = "";	// can't evalute expressions containing variables
				break;
			}
		}
		
		if(expressionStr.length > 0 && expressionStart != expressionEnd) {
			// check for operator at end of expression
			if(tokens[expressionEnd].type === "operator") this.throwInvalid(lineNumber, null, "Invalid expression near " + tokens[expressionStart].lexeme);
		
			// duplicate token array so we can modify it
			var dupe = [];
			for(k = 0; k < tokens.length; k++) {
				dupe.push(tokens[k]);
			}
			tokens = dupe;
		
			// evaluate the expression
			var expressionResult;
			try {
				expressionResult = eval(expressionStr) & 0xffff;
			}
			catch(e) {
				this.throwInvalid(lineNumber, null, "Invalid expression near " + tokens[expressionStart].lexeme);
			}
			
			// put the result back in the token array as a numeric literal
			var newToken = { lexeme: expressionResult, type: "decimal" };
			tokens.splice(expressionStart, expressionEnd-expressionStart+1, newToken);
		}
		return tokens;
	},

	compileArgument: function(tokens, start, lineNumber, labels) {
		var argument = new AssemblerArgument();
		var k;
		var openBracketCount = 0, closeBracketCount = 0, netBracketCount = 0;
		var lastOperator = null;
		var originalLength = tokens.length;
		
		tokens = this.evaluateExpression(tokens, start, lineNumber, labels);
		
		for(k = start; k < tokens.length; k++) {
			var token = tokens[k];
			
			if(token.type == "space") { }
			else if(token.type == "comma" || token.type == "comment") { 
				break;
			}
			else if(token.type == "decimal" || token.type == "hexidecimal" || token.type == "label_ref") {
				if(argument.expressionRegister != null && argument.expressionValue != null) this.throwInvalid(lineNumber, token);
				
				var val;
				if(token.type == "label_ref") {
					val = this.getLabelValue(token, labels);
				}
				else val = parseInt(token.lexeme);
				
				if(lastOperator != null && argument.expressionValue != null) {
					this.throwInvalid(lineNumber, token);
				}
				else argument.expressionValue = val;
				
				if(argument.memoryTarget) {
					if(argument.expressionRegister != null) {
						if(lastOperator == null) this.throwInvalid(lineNumber, token, "Missing operator");
						if(lastOperator != "+") this.throwInvalid(lineNumber, token, "The " + lastOperator + " operator can not be used when referencing a register");
						
						argument.value = this.getRegisterValue(argument.expressionRegister, false, true);
						argument.nextWord = argument.expressionValue;
						lastOperator = null;
					}
					else {
						argument.value  = Values.NEXT_WORD_VALUE;
						argument.nextWord = argument.expressionValue;
					}
				}
				else {
					if(argument.expressionRegister != null && lastOperator != null) this.throwInvalid(lineNumber, token, "Expressions can not contain registers unless using 'register plus next word'.");
				
					// literal
					var val32 = Utils.to32BitSigned(argument.expressionValue);
					if(val32 >= -1 && val32 <= 30 && token.type != "label_ref") {
						argument.value = Literals["L_"+val32];
						argument.nextWord = null;
					}
					else {
						argument.value = Values.NEXT_WORD_LITERAL;
						argument.nextWord = argument.expressionValue;
					}
				}
			}
			else if(token.type == "register") {
				if(argument.expressionValue == null) {
					argument.value = this.getRegisterValue(token.lexeme, argument.memoryTarget, false);
					argument.expressionRegister = token.lexeme;
				}
				else {
					if(!argument.memoryTarget) this.throwInvalid(lineNumber, token);
					if(argument.expressionRegister) this.throwInvalid(lineNumber, token);
					if(lastOperator != "+") this.throwInvalid(lineNumber, token);
					
					argument.value = this.getRegisterValue(token.lexeme, false, true);
					argument.nextWord = argument.expressionValue;
					argument.expressionRegister = token.lexeme;
					lastOperator = null;
				}
			}
			else if(token.type == "reserved_word" && token.lexeme != "DAT") {
				if(argument.expressionValue != null || lastOperator != null) this.throwInvalid(lineNumber, token);
				
				if(token.lexeme == "POP")
					argument.value = Values.SP_OFFSET;
				else if(token.lexeme == "PUSH")
					argument.value = Values.SP_OFFSET;
				else if(token.lexeme == "PEEK")
					argument.value = Values.SP_OFFSET + 1;
			}
			else if(token.type == "open_bracket") {
				argument.memoryTarget = true;
				openBracketCount++;
				netBracketCount++;
				if(netBracketCount > 1) this.throwInvalid(lineNumber, null, "Unexpected [");
			}
			else if(token.type == "close_bracket") {
				if(lastOperator != null) this.throwInvalid(lineNumber, token);
				closeBracketCount++;
				netBracketCount--;
				if(netBracketCount < 0) this.throwInvalid(lineNumber, null, "Unexpected ]");
			}
			else if(token.type == "operator") {
				if(lastOperator != null) this.throwInvalid(lineNumber, token);
				lastOperator = token.lexeme;
			}
			else {
				this.throwInvalid(lineNumber, token);
			}
		}
		
		if(openBracketCount != closeBracketCount) this.throwInvalid(lineNumber, null, "Mismatched brackets");
		
		argument.tokenCount = k - start + (originalLength - tokens.length);
		return argument;
	},
	
	compile: function(tokenizedLines) {
		
		var offset = 0;
		var output = new Listing();
		var errorMap = {};
	
		// perform a first pass to estimate the offset associated with each label
		for(var i = 0; i < tokenizedLines.length; i++) {
			var line = tokenizedLines[i];
			
			var command = null;
			var dat = null;
			
			try {
			
				for(var j = 0; j < line.length; j++) {
					var token = line[j];
					
					// handle initial operation
					if(command == null && dat == null) {
						if(token.type == "space" || token.type == "comment") { }
						else if(token.type == "command") {
							command = token;
							offset++;
						}
						else if(token.type == "label_def") {
							var labelName = token.lexeme.substr(1).toLowerCase();
							if(output.labels[labelName] != null) this.throwInvalid(j, token, "Duplicate label definition (" + labelName + ")");
							
							output.labels[labelName] = offset;
						}
						else if(token.type == "reserved_word" && token.lexeme == "DAT") {
							dat = token;
						}
						else {
							this.throwInvalid(i+1, token);
						}
					}
					// handle arguments
					else {
						if(command != null) {
							var arg = this.compileArgument(line, j, i+1, null);
							if(arg.nextWord != null) 
								offset++;
							j += arg.tokenCount;
						}
						else if(dat != null) {
							// data blocks
							if(token.type == "decimal" || token.type == "hexidecimal") {
								offset++;
							}
							else if(token.type == "string") {
								// remove quotes
								var str = token.lexeme.substr(1, token.lexeme.length-2);
								offset += str.length;
							}
						}
					}
				}
			}
			catch(e) {
				output.errors.push(e);
				errorMap[""+i] = e;
			}
		}
		
		offset = 0;
		
		// perform second pass to generate bytecode
		for(var i = 0; i < tokenizedLines.length; i++) {
			var line = tokenizedLines[i];
		
			// skip line if there is an error on it
			if(errorMap[""+i]) {
				output.addLine(offset, line, []);
				continue;
			}	

			var opcode = 0;
			var command = null;
			var arguments = [];
			var dat = null;
			var bytes = [];
			
			try {
				for(var j = 0; j < line.length; j++) {
					var token = line[j];
					
					// handle initial operation
					if(command == null && dat == null) {
						if(token.type == "space" || token.type == "comment") { }
						else if(token.type == "command") {
							command = token;
							opcode = eval("OPERATION_"+token.lexeme);
						}
						else if(token.type == "label_def") { }
						else if(token.type == "reserved_word" && token.lexeme == "DAT") {
							dat = [];
						}
						else {
							this.throwInvalid(i+1, token);
						}
					}
					// handle arguments
					else {
						if(command != null) {
							var arg = this.compileArgument(line, j, i+1, output.labels);
							if(arg.value != null)
								arguments.push(arg);
							j += arg.tokenCount;
						}
						else if(dat != null) {
							// data blocks
							if(token.type == "decimal" || token.type == "hexidecimal") {
								dat.push(parseInt(token.lexeme));
							}
							else if(token.type == "string") {
								// remove quotes 
								var str = token.lexeme.substr(1, token.lexeme.length-2);

								// push each character onto the program array
								for(var c = 0; c < str.length; c++) {
									dat.push(parseInt(str.charCodeAt(c)));
								}
							}
						}
					}
				}
				
				if(opcode != 0) {
					if(arguments.length == 0) 
						this.throwInvalid(i+1, null, "One or more parameters are required");
					if(arguments.length > 2) 
						this.throwInvalid(i+1, null, "Too many arguments");
					
					
					var param1 = arguments[0];
					var param2 = (arguments.length > 1) ? arguments[1] : { };
					
					//additionalInstructions
					
					if(arguments.length == 1) 
						bytes.push(Utils.makeSpecialInstruction(opcode, param1.value));
					else {
						bytes.push(Utils.makeInstruction(opcode, param2.value, param1.value));
					}
					
					if(param2.nextWord != null)
						bytes.push(param2.nextWord);
					
					if(param1.nextWord != null)
						bytes.push(param1.nextWord);
					
				}
				else if(dat != null) {
					for(var k = 0; k < dat.length; k++) {
						bytes.push(dat[k]);
					}
				}
			}
			catch(e) { 
				output.errors.push(e);
			}
			
			output.addLine(offset, line, bytes);
			offset += bytes.length;
			
		}
		
		return output;
		
	},
	
	compileSource: function(source) {
		return this.compile(Tokenizer.tokenize(source).lines);
	},
	
	throwInvalid: function(line, token, message) {
		message = message || ("Invalid syntax on line " + line + " near " + token.lexeme);
		console.log(message);
		throw { 
			name: "AssemblyError", 
			message: message,
			line: line
		};
	}
}

function Listing() {
	this.lines = [];
	this.errors = [];
	this.labels = {};

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
			html += "<div class='listing_line'>";
			html += "<span class='offset' id='offset_line_"+i+"'>" + Utils.hex2(line.offset) + "</span>";
			
			html += "<span class='tokens'>";
			for(var j = 0; j < line.tokens.length; j++) {
				html += Tokenizer.htmlFormatToken(line.tokens[j]);
			}
			html += "</span>";
			
			html += "</div>";
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

function AssemblyError(message, line) {
    this.name = "AssemblyError";
    this.message = (message || "");
	this.line = line;
}
AssemblyError.prototype = Error.prototype;


