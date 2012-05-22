
Tokenizer = {

	tokens: [
		{ pattern: /^(;.*)/,						type: "comment"			},
		{ pattern: /^\b(0x[0-9ABCDEF]+)\b/i,		type: "hexidecimal"		},
		{ pattern: /^\b([0-9]+)\b/,					type: "decimal"			},
		{ pattern: /^(\".*\")/,						type: "string"			},
		{ pattern: /^(:[0-9A-Za-z_]+)/,				type: "label_def"		},
		{ pattern: /^\b(POP|PUSH|PEEK|DAT)\b/i,		type: "reserved_word"	},		
		{ pattern: /^\b(SET|ADD|SUB|MUL|MLI|DIV|DVI|JSR)\b/i,
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
					tokenizedLine.push( { lexeme: lexeme, type: token.type } );
					
					line = line.substr(lexeme.length)
				}
				else {
					throw ("Invlid token '" + line + "' on line " + (i+1));
					line = null;
				}
			}
			if(tokenizedLine.length > 0)
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
				html += this.formatToken(token);
			}
			html += "<br/>";
		}
		return html;
	},
	
	formatToken: function(token) {
		var str = token.lexeme.replace(/ /g, "&nbsp;");
		return "<span class='" + token.type + "'>" + str + "</span>";
	}
	
}