var listing;
var emulator;
var editor;
var _debugger;

$(document).ready(function(){	
	init();

});

function init() {
	$("#assemble_button").button({ icons: { primary: "ui-icon-link" } });
	$("#debug_button").button({ icons: { primary: "ui-icon-radio-on" } });
	
	$("#run_button").button({ icons: { primary: "ui-icon-play" } }).hide();
	$("#step_button").button({ icons: { primary: "ui-icon-arrowreturnthick-1-e" } }).hide();
	$("#pause_button").button({ icons: { primary: "ui-icon-pause" } }).hide();
	$("#stop_button").button({ icons: { primary: "ui-icon-stop" } }).hide();
	$("#reset_button").button({ icons: { primary: "ui-icon-arrowrefresh-1-s" } }).hide();
	$("#about_button").button({ icons: { primary: "ui-icon-help" } });
	
	$("#about_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 350,
		buttons: { "Ok": function() { $(this).dialog("close"); } } 
	});
	
	$("#listing").scroll(updateDebuggerLine);
	

	editor = ace.edit("editor");
	editor.setTheme("ace/theme/monokai");
	var DCPU16Mode = require("ace/mode/dcpu16").Mode;
	editor.getSession().setMode(new DCPU16Mode());
	editor.setHighlightActiveLine(false);
	editor.resize();
	editor.getSession().setUseSoftTabs(true);
	editor.getSession().on('change', function() { 
		assemble();
	});
	/*
	editor.on("guttermousedown", function(e){
		console.log(e);
		var target = e.domEvent.target;
		if (target.className.indexOf("ace_gutter-cell") == -1)
			return;
		if (!editor.isFocused())
			return;
		if (e.clientX > 25 + target.getBoundingClientRect().left)
			return;

		var row = e.getDocumentPosition().row
		e.editor.session.setBreakpoint(row)
		e.stop()
	});
	*/
	
	emulator = new Emulator();
	emulator.async = true;
	emulator.verbose = false;
	emulator.paused = true;
	var m = new Monitor(emulator);
	document.getElementById("monitor").appendChild(m.getDOMElement());
	
	emulator.devices.push(m);
	emulator.devices.push(new Keyboard(emulator));
	
	_debugger = new Debugger(emulator);
	_debugger.onStep = function(location) {
		console.log("onStep");
		updateDebugger(location);
	};
	_debugger.onPaused = function(location) {
		console.log("onPaused");
		updateDebugger(location);
	};
	_debugger.onInstruction = function(location) {
		//updateDebuggerLine();
		//updateRegisterWindow();
	}
	
	
	$.ajax({
		url: 			"/programs/tetris.asm",
		context:		this,
		dataType: 		"text",
		success: 		function(data) { 
			editor.getSession().setValue(data);
		}
	});
	
	
	//$("#source-dialog").resizable( { autoHide: true, handles: "s" });
	//$("#assembly-dialog").resizable( { autoHide: true, handles: "n" });
}

function assemble() {
	var tokenized = Tokenizer.tokenize(editor.getSession().getValue());
	listing = Assembler.compile(tokenized.lines);
	
	var errors = (new Array()).concat(tokenized.errors, listing.errors);
	
	//$("#assembly").html(listing.htmlFormat());
	
	if(errors.length == 0) {
		$("#assembly").html("OK");
		$("#assembly").css("background", "none");
	}
	else {
		$("#assembly").css("background", "#bc3329");
		var str = "";
		for(var i = 0; i < errors.length; i++) {
			str += "<div onclick='gotoLine("+errors[i].line+")' style='padding: 4px; margin-bottom: 3px; cursor: pointer;'>";
			str += "Line " + errors[i].line + ": ";
			str += errors[i].message;
			str += "</div>";
		}
		$("#assembly").html(str);
	}
	
	$("#output").html(listing.bytecodeText());
}

function gotoLine(line) {
	editor.gotoLine(line);
	editor.focus();
}

function startDebugger() {
	$("#assemble_button").hide();
	$("#debug_button").hide();

	$("#run_button").show();
	$("#step_button").show();
	$("#pause_button").show();
	$("#stop_button").show();
	$("#reset_button").show();
	
	$("#listing").find(".offset").unbind();
	$("#listing").html(listing.htmlFormat());
	$("#listing").find(".offset").click(function(evt) {
		var lineNumber = parseInt(this.id.substr("offset_line_".length));
		console.log("Breakpoint on " + lineNumber);
		
		// only allow breakpoints on lines that have actual commands
		if(listing.lines[lineNumber].bytecode.length > 0) {
			$(this).toggleClass("breakpoint");
			_debugger.toggleBreakpoint(parseInt($(this).text()), lineNumber);
		}
	});
	
	for(var bp in _debugger.breakpoints) {
		$("#offset_line_"+_debugger.breakpoints[bp]).addClass("breakpoint");
	}
	
	$("#editing_windows").hide();
	$("#debugging_windows").show();
	
	emulator.reboot();
	emulator.paused = true;
	emulator.run(listing.bytecode());
	updateRegisterWindow();
}

function stopDebugger() {
	emulator.reboot();

	$("#assemble_button").show();
	$("#debug_button").show();

	$("#run_button").hide();
	$("#step_button").hide();
	$("#pause_button").hide();
	$("#stop_button").hide();
	$("#reset_button").hide();
	
	$("#editing_windows").show();
	$("#debugging_windows").hide();
}

function pauseDebugger() {
	_debugger.pause();
}

function run() {
	_debugger.run();
	updateDebugger();
}

function step() {
	_debugger.step();
}

function reset() {
	emulator.reboot();
	emulator.paused = true;
	emulator.run(listing.bytecode());
}


function updateDebugger() {
	console.log("updateDebugger");
	if(emulator.paused) {
		$("#debugger_line").show();
		
		ensureDebuggerLineVisible();
		updateDebuggerLine();
		
		updateRegisterWindow();
		updateMemoryWindow();
		
		$("#pause_button").hide();
		$("#step_button").show();
		$("#run_button").show();
	}
	else {
		$("#pause_button").show();
		$("#step_button").hide();
		$("#run_button").hide();
	}
}

function calculateDebuggerLine() {
	// find line from memory offset
	var location = emulator.PC.get();
	var line = 0;
	for(line = 0; line < listing.lines.length; line++) {
		if(listing.lines[line].offset >= location) {
			location = listing.lines[line].offset;
			break;
		}
	}
	// skip lines that are noops
	while(line < listing.lines.length && listing.lines[line].offset == location) {
		line++;
	}
	line--;
	
	return line;
}

function getDebuggerLineTop(line) {
	var lineHeight= 14;
	return line*lineHeight + $("#listing").position().top + 2;
}

function updateDebuggerLine() {
	var top = getDebuggerLineTop(calculateDebuggerLine()) - $("#listing").scrollTop()
	$("#debugger_line").css("top", top + "px");
}

function ensureDebuggerLineVisible() {
	var top = getDebuggerLineTop(calculateDebuggerLine());
	console.log("ensureDebuggerLineVisible | current: " + $("#listing").scrollTop() + " | dest: " + top);
	if(top > $("#listing").scrollTop() + $("#listing").height() - 14 || top < $("#listing").scrollTop()) {
		$("#listing").scrollTop(Math.max(top - $("#listing").height()/2, 0));
	}
}


function updateRegisterWindow() {
	for(var reg in emulator.Registers) {
		var val = Utils.hex2(emulator.Registers[reg].get());
		val += "&nbsp;&nbsp;"
		val += "[" + Utils.hex2(emulator.RAM[emulator.Registers[reg].get()] || 0) + "]";
		
		var div = $("#register-" + reg).find(".register-value");
		if(div.html() != val)
			div.addClass("changed");
		else
			div.removeClass("changed");
		div.html(val);
	}
}

function updateMemoryWindow() {
	var startOffset = 0; //
	
	var memHtml = "";
	for(var i = 0; i < 64; i++) {
		memHtml += "<div class=\"memory_offset\">" + Utils.hex2(startOffset + i*8) + "</div>";
		memHtml += "<div class=\"memory_line\">"
		for(var j = 0; j < 8; j++) {
			memHtml += Utils.hex2(emulator.RAM[startOffset + i*8 + j] || 0) + " ";
		}
		memHtml += "</div><div class=\"clear\"></div>";
	}
	$("#memory").html(memHtml);
}

function about() {
	$("#about_dialog").dialog("open");
	document.activeElement.blur();
}