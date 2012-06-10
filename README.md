DCPU-16 IDE
===========
This project is a Javascript assembler, emulator and debugger for the DCPU-16 processor.  

Assembler
---------

The DCPU-16 assembler supports all op codes defined in the DCPU-16 version 1.7 specification.  Basic assembly
syntax and expressions can be used.

* Use a <code>:</code> to define a label.  Forward labels can be referenced.
* Use a <code>;</code> to create a comment.
* Expressions can be used, as long as they evaluate to a numeric literal.  Labels can be used in expressions.
* The following operators can be used in expressions: +, -, *, /, %, &, |, ^, << and >>.
* Data blocks can be created with the <code>DAT</code> keywprd.  Data blocks can contain a combination of comma seprated numeric 
values and strings (surrounded in double quotes).

To use the assembler include <code>javascript/assembler.js</code>.  The following functions are exposed:

	Assembler.compileSource(source)
Accepts a string of assembly code and returns a compiled <code>Listing</code> object (see below).

	Assembler.compile(tokenizedLines)
Accepts an array of tokenized lines (an array of arrays of Token objects, one array for each line of assembly) and returns a compiled <code>Listing</code> object (see below).

	Tokenizer.tokenize(source)
Accepts a string of assembly code and returns a <code>TokenizerResult</code> object (see below).


### Listing object
	Listing {
		ListingLine[] lines // an array of ListingLine objects, one for each line of assembly
		AssemblyError[] errors // an array of AssemblyError objects
		
		byte[] bytecode()	// returns an array of bytes of the entire program
		String bytecodeText() 	// returns a string representation of the program bytes
		String htmlFormat()	// returns a formatted HTML representation of the Listing
	}

### ListingLine object
	ListingLine {
		Integer offset	// the offset of the listing line in the program
		Token[] tokens	// an array of Token objects for this line of the listing
		byte[] bytecode	// the compiled output of the line of the listing
	}
	
	
### TokenizerResult object
	TokenizerResult {
		Token[][] lines // an array of arrays of Token objects, one for each line of assembly
		errors[] // an array of AssemblyError objects
	}

### Token object
	Token {
		String type // the token type (see below for list of types)
		String lexeme // the value of the token
	}

### AssemblyError object
	AssemblyError {
		String message // a human readable error message
		Integer line // the line the error occurred on
	}

The list of token types is as follows:
* comment
* hexidecimal
* decimal
* string
* label_def
* reserved_word
* command (all op codes)
* register 
* label_ref
* open_bracket
* close_bracket
* comma
* operator
* space

Emulator
--------
TODO

Debugger
--------
TODO
	

TODO
----
* Support for RESERVE keyword and #defines in assembler
* better error messages for assembly exceptions
* load code from POST body
* maybe a way to save files?  use reddis? :)
* set breakpoints in editor

Thanks
------

Special thanks to the following libraries that helped me put this together.  

* [Ace](https://github.com/ajaxorg/ace)
* [JQuery-UI](http://jqueryui.com/)
* [QUnit](http://docs.jquery.com/QUnit)
