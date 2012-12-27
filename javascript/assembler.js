
Tokenizer = {

	tokens: [
		{ pattern: /^(;.*)/,						type: "comment"			},
		{ pattern: /^([\.#].*)/,					type: "preprocessor"	},
		{ pattern: /^\b(0x[0-9ABCDEF]+)\b/i,		type: "hexidecimal"		},
		{ pattern: /^\b(0b[0-1]+)\b/i,				type: "binary"			},
		{ pattern: /^\b([0-9]+)\b/,					type: "decimal"			},
		{ pattern: /^(\".*\")/,						type: "string"			},
		{ pattern: /^(:[0-9A-Za-z_\.]+)/,			type: "label_def"		},
		{ pattern: /^([0-9A-Za-z_\.]+:)/,			type: "label_def"		},
		{ pattern: /^\b(POP|PUSH|PEEK|DAT)\b/i,		type: "reserved_word"	},		
		{ pattern: /^\b(SET|ADD|SUB|MUL|MLI|DIV|DVI|MOD|MDI|AND|BOR|XOR|SHR|ASR|SHL|IFB|IFC|IFE|IFN|IFG|IFA|IFL|IFU|ADX|SBX|STI|STD|JSR|INT|IAG|IAS|RFI|IAQ|HWN|HWQ|HWI)\b/i,
													type: "command"			},
		{ pattern: /^\b([ABCXYZIJ]|SP|PC|EX)\b/i,	type: "register"		},
		{ pattern: /^\b([0-9A-Za-z_\.]+)\b/,		type: "label_ref"		},
		{ pattern: /^(\[)/,							type: "open_bracket"	},
		{ pattern: /^(\])/,							type: "close_bracket"	},		
		{ pattern: /^(,)/,							type: "comma"			},
		{ pattern: /^(\+|\-|\*|\/|%|\(|\)|\&|\||\^|>>|<<|~|\^)/,		
													type: "operator"		},
		{ pattern: /^([\s]+)/,						type: "space" 			},
	],
	
	preprocessorTokens: [
		{ pattern: /^\b(include|incbin|def|define|equ|undef|dw|dp|fill|ascii|org|macro|end|rep|if|elif|elseif|else|ifdef|ifndef|error|align|echo)\b/i,
													type: "directive"		},
		{ pattern: /^\b(0x[0-9ABCDEF]+)\b/i,		type: "hexidecimal"		},
		{ pattern: /^\b([0-9]+)\b/,					type: "decimal"			},
		{ pattern: /^(\".*\")/,						type: "string"			},
		{ pattern: /^\b([0-9A-Za-z_\.]+)\b/,		type: "identifier"		},	
		{ pattern: /^(,)/,							type: "comma"			},
		{ pattern: /^(\+|\-|\*|\/|%|\(|\)|\&|\||\^|>>|<<|~|\^)/,		
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
							
						tokenizedLine.push( new Token(lexeme, token.type) );
						
						line = line.substr(lexeme.length);
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
				console.log(err);
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

function Token(lexeme, type) {
	this.lexeme = lexeme;
	this.type = type;
	
	this.isNumericLiteral = function() { 
		return (this.type === "decimal" || this.type === "hexidecimal" || this.type === "binary");
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

Preprocessor = { 
	preprocess: function(input) {
		var messages = [];
		var errors = [];
		
		// split and tokenize lines
		var lines = input.split("\n");
		var tokenizedLines = [];
		
		for(var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if(line.length == 0)
				tokenizedLines.push([ new Token("", "general") ]);
			
			for(var j = 0; j < line.length; j++) {
				if(line[j] == ';') {
					// comment line
					tokenizedLines.push([ new Token(line, "general") ]);
					break;
				}
				else if(line[j] == '#' || line[j] == '.') {
					var start = line[j];
				
					// tokenize preprocessor directive
					try {
						tokenizedLines.push(this.tokenizeLine(line.substr(line.indexOf(start)+1), i));
					}
					catch(err) {
						console.log(err);
						errors.push(err);
					}
					break;
				}
				else if(line[j] != ' ' && line[j] != '\t') {
					// not a preprocessor directive
					tokenizedLines.push([ new Token(line, "general") ]);
					break;
				}
			}
		}
		
		var defines = {};
		var conditionals = [];
		var output = "";
		
		// process directives on each line
		for(var i = 0; i < tokenizedLines.length; i++) {
			
			var directive = null;
			var define = null;
			var includeInOutput = true;
			
			for(var j = 0; j < tokenizedLines[i].length; j++) {
				var token = tokenizedLines[i][j];
				
				if(token.type == "directive") {
					directive = token.lexeme;
				}
				else if(token.type == "general") {				
					// replace preprocessor defines in non-preprocessor commands
					for(var key in defines) {
						var regex = new RegExp("\\b" + key + "\\b", "g");
						token.lexeme = token.lexeme.replace(regex, defines[key]);
					}
					
				}
			}
			
			for(var j = 0; j < conditionals.length; j++) {
				// omit lines from output inside failed conditionals
				if(!conditionals[j]) {
					includeInOutput = false;
					break;
				}
			}
			
			if(directive != null) {
			
				var replaceAfter = 0;
				
				// these directives will have a first argument that we do not want to substitute for its 
				// defined value
				if(directive == "def" || directive == "define" || directive == "equ" || directive == "undef"
					|| directive == "ifdef" || directive == "ifndef") {
					replaceAfter = 1;
				}
				
				
				var args;
				try {
					args = this.getArguments(tokenizedLines[i], 1, i+1, defines, replaceAfter);
				} catch(e) {
					errors.push(e);
				}
				
				if(directive == "end") {
					if(conditionals.length > 0)
						conditionals.pop();
					else
						errors.push({ name: "PreprocessorError", message: "Unexpected 'end'", line: (i+1) });
				}
				else if(directive == "else") {
					if(conditionals.length > 0) 
						conditionals.push(!conditionals.pop());
					else
						errors.push({ name: "PreprocessorError", message: "Unexpected 'else'", line: (i+1) });
				}
				else if(directive == "if") {
					if(args.length > 0) {
						if(typeof args[0] == "string")
							conditionals.push(false);
						else conditionals.push(args[0]);
					}
					else
						errors.push({ name: "PreprocessorError", message: "Invalid if expression", line: (i+1) });
				}
				else if(directive == "ifdef" || directive == "ifndef") {
					var next = args.length > 0 ? args[0] : null;
					if(next)
						conditionals.push( (directive == "ifdef") ? defines[next] != null : defines[next] == null );
					else
						errors.push({ name: "PreprocessorError", message: "Invalid " + directive, line: (i+1) });
				}
				else if(directive == "elif" || directive == "elseif") {
					// TODO: this is wrong
					var cond;
					if(conditionals.length > 0)
						cond = conditionals.pop();
					else
						errors.push({ name: "PreprocessorError", message: "Unexpected '"+directive+"'", line: (i+1) });
						
					if(args.length > 0) {
						if(cond || typeof args[0] == "string")
							conditionals.push(false);
						else conditionals.push(args[0]);
					}
					else
						errors.push({ name: "PreprocessorError", message: "Invalid "+directive+" expression", line: (i+1) });
				}
				
				
				if(includeInOutput) {
					if(directive == "echo" || directive == "error") {
						if(args.length > 0) {
							var msg = (typeof args[0] == "string") ? removeQuotes(args[0]) : args[0];
							console.log(msg);
							if(directive == "echo")
								messages.push(msg);
							else
								errors.push({ name: "error", message: msg, line: (i+1) });
						}
					}
					else if(directive == "def" || directive == "define" || directive == "equ") {
						
						// TODO: this doesn't allow previously defined identifiers to be re-defined
						
						if(args.length > 0)
							defines[args[0]] = args.length > 1 ? args[1] : 1;
						else
							errors.push({ name: "PreprocessorError", message: "Invalid " + directive, line: (i+1) });
					}
					else if(directive == "undef") {
						// TODO: this doesn't work because the identifier has already been replaced
					
						if(args.length > 0)
							delete defines[args[0]];
						else
							errors.push({ name: "PreprocessorError", message: "Invalid undef", line: (i+1) });
					}
					// we'll deal with these when creating the bytecode
					else if(directive == "org" || directive == "dw" || directive == "dp" || directive == "fill") { 
					}	
					// we've already handled conditionals
					else if(directive == "if" || directive == "else" || directive == "elif" || directive == "elseif" 
						|| directive == "end" || directive == "ifdef" || directive == "ifndef") { }	
					else
						errors.push({ name: "PreprocessorError", message: "Sorry, this preprocessor doesn't support '" + directive + "'", line: (i+1) });
					
				}
			}
			
			// reconstruct the program from eacn line
			for(var j = 0; j < tokenizedLines[i].length; j++) {
				if(!includeInOutput) continue;
				
				if(tokenizedLines[i][j].type == "directive")
					output += ".";
				output += tokenizedLines[i][j].lexeme;
			}
			output += "\n";
		}
		
		if(conditionals.length > 0)
			errors.push({ name: "PreprocessorError", message: "Expected '.end'", line: tokenizedLines.length });
			

		
		//console.log(output)
		
		return { output: output, messages: messages, errors: errors };
	},
	
	tokenizeLine: function(line, i) {
		var tokenizedLine = [];
			
		while(line != null && line.length > 0) {
			
			//console.log("tokenizing ", line);
			
			var lexeme = null;
			var match = null;
			var token = null;
		
			for(var p = 0; p < Tokenizer.preprocessorTokens.length; p++) {
				token = Tokenizer.preprocessorTokens[p];
				match = token.pattern.exec(line);
				if(match) break;
			}
		
			if(match && match[1].length > 0) {
				//console.log("token", match);
				
				lexeme = match[1];
				if(token.type == "directive")
					lexeme = lexeme.toLowerCase();
				tokenizedLine.push( new Token(lexeme, token.type) );
				
				line = line.substr(lexeme.length);
			}
			else {
				throw { 
					name: "PreprocessorError", 
					message: "Invalid token near " + line,
					line: (i+1)
				};
				line = null;
			}
		}
		return tokenizedLine;
	},
	
	getArguments: function(tokens, start, lineNumber, defines, replaceAfter) {
		var args = [];
		var j;
		
		// indicates how many arguments to *NOT* perform identifier substitutions on
		replaceAfter = replaceAfter || 0; 
		var skipCount = 0;
		
		for(j = start; j < tokens.length; j++) {
			if(tokens[j].type == "space" || tokens[j].type == "directive"  || tokens[j].type == "comma")
				continue;
				
			if(tokens[j].type == "identifier" && skipCount >= replaceAfter) {
				tokens[j] = this.replaceIdentifier(tokens[j], defines);
			}
			else
				skipCount++;
		}

		for(j = start; j < tokens.length; j++) {
			if(tokens[j].type == "space" || tokens[j].type == "directive"  || tokens[j].type == "comma")
				continue;
				
			var t;
			if(tokens[j].type == "identifier")
				t = tokens[j];
			else {
				tokens = Assembler.evaluateExpression(tokens, j, lineNumber, {});
				t = tokens[j];
			}
				
			if(t.isNumericLiteral())
				args.push(parseNumericLiteral(t.lexeme));
			else
				args.push(t.lexeme);
			
		}
		
		return args;
	},
	
	org: function(preLine, line) {
		var org = Preprocessor.nextNonSpace(preLine, 1);
		if(org != null && org.isNumericLiteral()) {
			var orgVal = parseNumericLiteral(org.lexeme);
			if(orgVal >= 0 && orgVal <= 0xffff)
				return orgVal;
			else this.throwInvalid(line+1, null, "Invalid use of .org");
		}
		else {
			this.throwInvalid(line+1, null, "Invalid use of .org");
		}
	},
	
	nextNonSpace: function(ary, start) {
		for(var i = start; i < ary.length; i++) {
			if(ary[i].type != "space")
				return ary[i];
		}
	},
	
	replaceIdentifier: function(token, defines) {
		
		if(defines[token.lexeme]) {
			var val = defines[token.lexeme];
			return new Token(val, (typeof val == "string") ? "string" : "decimal");
		}
		else return token;
	}
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
			
			if(token.type === "space") { 
				continue;
			}
			else if(token.type == "comma" || token.type == "comment" || token.type == "preprocessor") { 
				break;
			}
			else if(token.type === "register") {
				expressionStr = "";	// can't evalute expressions containing variables
				break;
			}
			else if(token.type === "operator") {
				expressionStr += token.lexeme;
			}
			else if(token.type === "label_ref") {
				expressionStr += this.getLabelValue(token, labels, lineNumber);
			}
			else if(token.isNumericLiteral()) {
				expressionStr += parseNumericLiteral(token.lexeme);
			}
			else {
				continue;
			}
			
			if(expressionStart === -1)
				expressionStart = k;
			expressionEnd = k;
		}
		
		if(expressionStr.length > 0 && expressionStart != expressionEnd) {
		
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
			var newToken = new Token(expressionResult, "decimal");
			tokens.splice(expressionStart, expressionEnd-expressionStart+1, newToken);
		}
		return tokens;
	},

	compileArgument: function(tokens, start, lineNumber, labels, argumentIndex) {
		var argument = new AssemblerArgument();
		var k;
		var openBracketCount = 0, closeBracketCount = 0, netBracketCount = 0;
		var lastOperator = null;
		var originalLength = tokens.length;
		
		tokens = this.evaluateExpression(tokens, start, lineNumber, labels);
		
		for(k = start; k < tokens.length; k++) {
			var token = tokens[k];
			
			if(token.type == "space") { }
			else if(token.type == "comma" || token.type == "comment" || token.type == "preprocessor") { 
				break;
			}
			else if(token.isNumericLiteral() || token.type == "label_ref") {
				if(argument.expressionRegister != null && argument.expressionValue != null) this.throwInvalid(lineNumber, token);
				
				var val;
				if(token.type == "label_ref") {
					val = this.getLabelValue(token, labels, lineNumber);
				}
				else val = parseNumericLiteral(token.lexeme);
				
				if(lastOperator != null && argument.expressionValue != null) {
					this.throwInvalid(lineNumber, token);
				}
				else argument.expressionValue = val;
				
				if(argument.memoryTarget) {
					if(argument.expressionRegister != null) {
						if(lastOperator == null) this.throwInvalid(lineNumber, token, "Missing operator");
						if(lastOperator != "+") this.throwInvalid(lineNumber, token, "The " + lastOperator + " operator can not be used when referencing a register");
						if(argument.expressionRegister == "PC") this.throwInvalid(lineNumber, token, "DCPU-16 does not allow addressing relative to PC");
						
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
					
					// we can use the "shorthand" literal representation only if this is an 'a' value and
					// not a label reference
					if(val32 >= -1 && val32 <= 30 && token.type != "label_ref" && argumentIndex > 0) {
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
		var argumentCount = 0;
	
		// perform a first pass to estimate the offset associated with each label
		for(var i = 0; i < tokenizedLines.length; i++) {
			var line = tokenizedLines[i];
			
			var command = null;
			var dat = null;
			argumentCount = 0;
			
			try {
			
				for(var j = 0; j < line.length; j++) {
					var token = line[j];
					
					// handle initial operation
					if(command == null && dat == null) {
						if(token.type == "space" || token.type == "comment") { }
						
						else if(token.type == "preprocessor") {
							// handle preprocessor .org
							var preLine = Preprocessor.tokenizeLine(token.lexeme.substr(1), i);
							var directive = preLine[0].lexeme;
							if(directive == "org") {
								offset = Preprocessor.org(preLine, i);
							}
						}
						
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
							var arg = this.compileArgument(line, j, i+1, null, argumentCount);
							argumentCount++;
							if(arg.nextWord != null) 
								offset++;
							j += arg.tokenCount;
						}
						else if(dat != null) {
							// data blocks
							if(token.isNumericLiteral()) {
								offset++;
							}
							else if(token.type == "label_ref") {
								offset++;
							}
							else if(token.type == "string") {
								var str = removeQuotes(token.lexeme);
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
			argumentCount = 0;
			
			try {
				for(var j = 0; j < line.length; j++) {
					var token = line[j];
					
					// handle initial operation
					if(command == null && dat == null) {
						if(token.type == "space" || token.type == "comment") { }
						else if(token.type == "preprocessor") {
							// handle preprocessor data insertion and .org
							var preLine = Preprocessor.tokenizeLine(token.lexeme.substr(1), i);
							var directive = preLine[0].lexeme;
							if(directive == "org") {
								offset = Preprocessor.org(preLine, i);
							}
							else if(directive == "dw") {
								dat = Preprocessor.getArguments(preLine, 1, j+1, {});
							}
							else if(directive == "dp") {
								dat = [];
								var dpIdx = 1;	// first value goes in high octet, so start at 1 and decrement to 0
								var dpVal = 0;
								var args = Preprocessor.getArguments(preLine, 1, j+1, {});
								
								for(var k = 0; k < args.length; k++) {
									dpVal |= args[k] << (dpIdx*8);
									if(dpIdx == 0) {
										dat.push(dpVal);
										dpIdx = 1;
										dpVal = 0;
									}
									else
										dpIdx--;
									
								}
								// in case there were an odd number of values
								if(dpIdx == 0)
									dat.push(dpVal);
							}
							else if(directive == "fill") {
								dat = [];
								var args = Preprocessor.getArguments(preLine, 1, j+1, {});
								var fillCount = args[0];
								var fillValue = args.length > 1 ? args[1] : 0;
								
								for(var k = 0; k < fillCount; k++) {
									dat.push(fillValue);
								}
							}
						}
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
							var arg = this.compileArgument(line, j, i+1, output.labels, argumentCount);
							argumentCount++;
							if(arg.value != null)
								arguments.push(arg);
							j += arg.tokenCount;
						}
						else if(dat != null) {
							// data blocks
							if(token.isNumericLiteral()) {
								dat.push(parseNumericLiteral(token.lexeme));
							}
							else if(token.type == "label_ref") {
								dat.push(this.getLabelValue(token, output.labels, i+1));
							}
							else if(token.type == "string") {
								var str = removeQuotes(token.lexeme);

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
		var preOutput = Preprocessor.preprocess(source);
		var tokenized = Tokenizer.tokenize(preOutput.output);
		var _listing = this.compile(tokenized.lines);
		_listing.errors = preOutput.errors.concat(tokenized.errors, _listing.errors);
		_listing.messages = preOutput.messages.concat(_listing.messages);
		return _listing;
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
	this.messages = [];
	this.labels = {};

	this.addLine = function(offset, tokens, bytecode) {
		this.lines.push({ "offset": offset, "tokens": tokens, "bytecode": bytecode });
	}
	
	this.bytecode = function() {
		var output = [];
		for(var i = 0; i < this.lines.length; i++) {
			for(var j = 0; j < this.lines[i].bytecode.length; j++) {
				output[this.lines[i].offset+j] = this.lines[i].bytecode[j];
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
			output += Utils.hex2(bytecode[i] || 0) + " ";
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

function parseNumericLiteral(val) {
	if(val.toString().indexOf("0b") === 0)
		return parseInt(val.substr(2), 2);
	else if(val.toString().indexOf("0x") === 0)
		return parseInt(val);
	else
		return parseInt(val, 10);
}

function removeQuotes(str) {
	if(str.length > 2)
		return str.substr(1, str.length-2);
	return str;
}

