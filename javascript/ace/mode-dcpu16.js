define('ace/mode/dcpu16', function(require, exports, module) {

	var oop = require("pilot/oop");
	var TextMode = require("ace/mode/text").Mode;
	var Tokenizer = require("ace/tokenizer").Tokenizer;
	var DCPU16HighlightRules = require("ace/mode/dcpu16_highlight_rules").DCPU16HighlightRules;

	var Mode = function() {
		this.$tokenizer = new Tokenizer(new DCPU16HighlightRules().getRules());
	};
	oop.inherits(Mode, TextMode);

	(function() {
		// Extra logic goes here. (see below)
	}).call(Mode.prototype);

	exports.Mode = Mode;
});
	

define('ace/mode/dcpu16_highlight_rules', function(require, exports, module) {

	var oop = require("pilot/oop");
	var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

	var DCPU16HighlightRules = function() {

		//this.$rules = new TextHighlightRules().getRules();
		this.$rules = {
			start: [ 
				{ token: "comment", 			regex: "(;.*)" },
				{ token: "preprocessor", 		regex: "([\\.|#].*)" },
				{ token: "constant.hex",		regex: "\\b(0x[0-9A-Fa-f]+)\\b" },
				{ token: "constant.numeric",	regex: "\\b(0b[0|1]+)\\b" },
				{ token: "constant.numeric",	regex: "\\b([0-9]+)\\b" },
				{ token: "string", 				regex: "(\".*\")" },
				{ token: "constant.library",	regex: "(:[0-9A-Za-z_]+)" },
				{ token: "keyword", 			regex: "\\b(POP|PUSH|PEEK|DAT)\\b" },
				{ token: "keyword", 			regex: "\\b(SET|ADD|SUB|MUL|MLI|DIV|DVI|MOD|MDI|AND|BOR|XOR|SHR|ASR|SHL|IFB|IFC|IFE|IFN|IFG|IFA|IFL|IFU|ADX|SBX|STI|STD|JSR|INT|IAG|IAS|RFI|IAQ|HWN|HWQ|HWI)\\b" },
				{ token: "variable", 			regex: "\\b([ABCXYZIJ]|SP|PC|EX)\\b" }
			]
		};
		
	}

	oop.inherits(DCPU16HighlightRules, TextHighlightRules);

	exports.DCPU16HighlightRules = DCPU16HighlightRules;
});