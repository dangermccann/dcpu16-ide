var listing;
var emulator;
var editor;
var _debugger;
var LINE_HEIGHT = 14;
var userData;
var readOnly = false;

urlParams = {};
(function () {
	var e,
		a = /\+/g,  // Regex for replacing addition symbol with a space
		r = /([^&=]+)=?([^&]*)/g,
		d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
		q = window.location.search.substring(1);

	while (e = r.exec(q))
	   urlParams[d(e[1])] = d(e[2]);
})();

$(document).ready(function(){	
	init();
});

function init() {
	$("#debug_button").button({ icons: { primary: "ui-icon-play" } });
	$("#save_button").button({ icons: { primary: "ui-icon-disk" } });
	$("#open_button").button({ icons: { primary: "ui-icon-folder-open" } });
	$("#new_button").button({ icons: { primary: "ui-icon-document" } });
	$("#post_button").button({ icons: { primary: "ui-icon-extlink" } });
	
	$("#run_button").button({ icons: { primary: "ui-icon-play" } }).hide();
	$("#step_button").button({ icons: { primary: "ui-icon-arrowreturnthick-1-e" } }).hide();
	$("#pause_button").button({ icons: { primary: "ui-icon-pause" } }).hide();
	$("#stop_button").button({ icons: { primary: "ui-icon-stop" } }).hide();
	$("#reset_button").button({ icons: { primary: "ui-icon-arrowrefresh-1-s" } }).hide();
	$("#clone_button").button({ icons: { primary: "ui-icon-copy" } }).hide();
	$("#about_button").button({ icons: { primary: "ui-icon-help" } });
	
	$("#about_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 350,
		buttons: { "Ok": function() { $(this).dialog("close"); editor.focus(); } } 
	});
	
	$("#save_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 300,
		buttons: { 
			"Ok": function() {  
				doSave($("#file_name").val());
				$(this).dialog("close"); 
				editor.focus();
			},
			"Cancel": function() { $(this).dialog("close"); editor.focus(); }
		} 
	});
	
	$("#open_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 400,
		buttons: { 
			"Ok": function() {  
				openFile($("#selectable_file_list").data("selected"));
				persist();
				$(this).dialog("close"); 
				editor.focus();
			},
			"Cancel": function() { $(this).dialog("close"); editor.focus(); }
		} 
	});
	$("#selectable_file_list").selectable({
		selected: function(event, ui) { 
			$("#selectable_file_list").data("selected", event.srcElement.innerHTML);
		}
	});
	
	
	$("#listing").scroll(updateDebuggerLine);
	$("#memory_container").scroll(updateMemoryWindow);
	
	$(".register-memory-value").click(function() { 
		gotoMemoryLocation(parseInt($(this).html()));
	});
	

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
	
	editor.renderer.on("gutterclick", function(e){
		//console.log("gutterclick", e);
		var target = e.htmlEvent.target;
		if (target.className.indexOf("ace_gutter-cell") == -1)
			return;
		if (!editor.isFocused())
			return;
		if (e.clientX > 25 + target.getBoundingClientRect().left)
			return;

		toggleBreakpoint(e.row);
	});
	
	emulator = new Emulator();
	emulator.async = true;
	emulator.verbose = false;
	emulator.paused = true;
	var m = new Monitor(emulator);
	document.getElementById("monitor").appendChild(m.getDOMElement());
	
	emulator.devices.push(m);
	emulator.devices.push(new Keyboard(emulator));
	emulator.devices.push(new Clock(emulator));
	
	_debugger = new Debugger(emulator);
	_debugger.onStep = function(location) {
		updateDebugger(location);
	};
	_debugger.onPaused = function(location) {
		updateDebugger(location);
	};
	_debugger.onInstruction = function(location) {
		
	}
	
	setInterval(realtimeUpdate, 50);
	
	// load userData
	//clearUserData();
	var data = localStorage.getItem('userData');
	if(data != null && data.length > 0) {
		userData = JSON.parse(data);
	}
	if(userData == null) {
		userData = { 
			fileSaved: false,
			files: { },
			last: null
		};
	}
	
	
	if(urlParams["program"]) {
		if(!urlParams["clone"])
			readOnly = true;
	
		// load specified program if an ID was provided
		load(urlParams["program"]).success(function(data) { 
			editor.getSession().setValue(data)
			assemble(data);
			
			if(readOnly) 
				startDebugger();
		});
	}
	else if(userData.last == null || !openFile(userData.last)) {
		// load default file if we couldn't fine one to open
		$.ajax({
			url: 			"/programs/diagnostics.asm",
			context:		this,
			dataType: 		"text",
			success: 		function(data) { 
				editor.getSession().setValue(data);
			}
		});
	}
	
	if(!readOnly)
		editor.focus();
	
	
	//$("#source-dialog").resizable( { autoHide: true, handles: "s" });
	//$("#assembly-dialog").resizable( { autoHide: true, handles: "n" });
}

function save() {
	if(!userData.fileSaved)
		$("#save_dialog").dialog("open");
	else {
		doSave(userData.last);
		editor.focus();
	}
	_gaq.push(['_trackEvent', "editor", "save"]);
}

function doSave(filename) {
	if(filename == null || filename.length == 0)
		return;
	userData.last = filename;
	userData.fileSaved = true;
	userData.files[filename] = editor.getSession().getValue();
	$("#editor_file_name").html(filename);
	
	persist();
}

function persist() {
	localStorage.setItem('userData', JSON.stringify(userData));
}

function _open() {
	var str = "";
	for(var f in userData.files) {
		str += "<li class='ui-widget-content'>";
		str += f;
		//str += "<div style='margin-top: -3px;' class='right ui-icon ui-icon-trash'></div>";
		str += "</li>";
	}
	if(str.length == 0)
		str = "Nothing to open.  You haven't saved any files yet!";
	$("#selectable_file_list").html(str);
	$("#selectable_file_list").data("selected", null);
	
	$("#selectable_file_list").find(".ui-icon-trash").mousedown(function(evt) { 
		evt.preventDefault();
		console.log($(this).parent().text());
		
	});
	
	$("#open_dialog").dialog("open");
	_gaq.push(['_trackEvent', "editor", "open"]);
}

function openFile(filename) {
	if(filename == null || filename.length == 0)
		return false;
	
	var f = userData.files[filename];
	if(f) {
		userData.last = filename;
		userData.fileSaved = true;
		editor.getSession().setValue(f);
		$("#editor_file_name").html(filename);
	}
		
	return (f != null);
}

function _new() {
	userData.fileSaved = false;
	userData.last = null;
	editor.getSession().setValue("");
	$("#editor_file_name").html("Source");
	
	editor.focus();
	_gaq.push(['_trackEvent', "editor", "new"]);
}

function clearUserData() {
	localStorage.setItem('userData', null);
}

function post() {
	var id = randomId();
	_gaq.push(['_trackEvent', "editor", "post", id]);
	var data  = "program_id=" + id + "&program=" + encodeURIComponent(editor.getSession().getValue());
	var win = window.open("about:blank", '_blank');
	return $.ajax({
		url: 			"/program",
		context:		this,
		type:			"POST",
		data:			data,
		dataType: 		"text",
		success: 		function(data) { }
	}).then(function(result) { 
		console.log("Posted successfully to ID: " + id);
		win.location = "/?program=" + id;
		_gaq.push(['_trackEvent', "editor", "postComplete", id]);

	});
}

function load(programId) {
	return $.ajax({
		url: 			"/program/" + programId,
		context:		this,
		dataType: 		"text"
	});
	_gaq.push(['_trackEvent', "editor", "load", programId]);
}

function clone() {
	var programId = urlParams["program"];
	window.open("/?program=" + programId + "&clone=true", '_blank');
	_gaq.push(['_trackEvent', "editor", "clone", programId]);
}

function randomId() {
	return ((new Date()).getTime() + Math.round((Math.random()*1000000000000))).toString(36);
}

function assemble(data) {
	var tokenized = Tokenizer.tokenize(data || editor.getSession().getValue());
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
	if(userData.fileSaved)
		save();

	$("#debug_button").hide();
	$("#save_button").hide();
	$("#open_button").hide();
	$("#new_button").hide();
	$("#post_button").hide();

	$("#run_button").show();
	$("#step_button").show();
	$("#pause_button").show();
	if(!readOnly)
		$("#stop_button").show();
	else
		$("#clone_button").show();
	$("#reset_button").show();
	
	$("#listing").find(".offset").unbind();
	$("#listing").find(".hexidecimal").unbind();
	$("#listing").find(".label_ref").unbind();
	
	$("#listing").html(listing.htmlFormat());
	
	$("#listing").find(".offset").click(function(evt) {
		var lineNumber = parseInt(this.id.substr("offset_line_".length));
		toggleBreakpoint(lineNumber);
	});
	$("#listing").find(".hexidecimal").click(function(evt) {
		gotoMemoryLocation(parseInt($(this).text()));
	});
	$("#listing").find(".label_ref").click(function(evt) {
		var offset = listing.labels[$(this).text()];
		var top = getLineTop(calculateLine(offset));
		scrollListingTo(top, true);
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
	
	_gaq.push(['_trackEvent', "debugger", "start"]);
}

function stopDebugger() {
	emulator.reboot();

	$("#debug_button").show();
	$("#save_button").show();
	$("#open_button").show();
	$("#new_button").show();
	$("#post_button").show();

	$("#run_button").hide();
	$("#step_button").hide();
	$("#pause_button").hide();
	$("#stop_button").hide();
	$("#reset_button").hide();
	$("#clone_button").hide();
	
	$("#editing_windows").show();
	$("#debugging_windows").hide();
	
	editor.focus();
	
	_gaq.push(['_trackEvent', "debugger", "stop"]);
}

function pauseDebugger() {
	_debugger.pause();
	
	_gaq.push(['_trackEvent', "debugger", "pause"]);
}

function run() {
	_debugger.run();
	updateDebugger();
	
	_gaq.push(['_trackEvent', "debugger", "run"]);
}

function step() {
	_debugger.step();
}

function reset() {
	emulator.reboot();
	emulator.paused = true;
	emulator.run(listing.bytecode());
	
	_gaq.push(['_trackEvent', "debugger", "reset"]);
}


function updateDebugger() {
	//console.log("updateDebugger");
	if(emulator.paused) {
		$("#debugger_line").show();
		
		ensureDebuggerLineVisible();
		updateDebuggerLine();
		updateRegisterWindow();
		updateMemoryWindow();
		updateCycles();
		
		$("#pause_button").hide();
		$("#step_button").show();
		$("#run_button").show();
	}
	else {
		//$("#debugger_line").hide();
		$("#pause_button").show();
		$("#step_button").hide();
		$("#run_button").hide();
	}
}

function realtimeUpdate() {
	if(!listing)  return;
	if(emulator.paused) return;
		
	updateDebuggerLine();
	updateRegisterWindow();
	updateMemoryWindow();
	updateCycles();
}

function toggleBreakpoint(lineNumber) {
	console.log("Toggle breakpoint on line " + lineNumber);
		
	// only allow breakpoints on lines that have actual commands
	if(listing.lines[lineNumber].bytecode.length > 0) {
		$("#offset_line_"+lineNumber).toggleClass("breakpoint");
		_debugger.toggleBreakpoint(listing.lines[lineNumber].offset, lineNumber);
		
		
		if(editor.session.getBreakpoints()[lineNumber])
			editor.session.clearBreakpoint(lineNumber);
		else
			editor.session.setBreakpoint(lineNumber);
	}
	
	_gaq.push(['_trackEvent', "debugger", "toggleBreakpoint"]);
}

function calculateCurrentDebuggerLine() {
	return calculateLine(emulator.PC.get());
}

function calculateLine(location) {
	// find line from memory offset
	
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

function getLineTop(line) {
	return line*LINE_HEIGHT + $("#listing").position().top + 2;
}

function updateDebuggerLine() {
	var top = getLineTop(calculateCurrentDebuggerLine()) - $("#listing").scrollTop();
	$("#debugger_line").css("top", top + "px");
}

function ensureDebuggerLineVisible() {
	var top = getLineTop(calculateCurrentDebuggerLine());
	//console.log("ensureDebuggerLineVisible | current: " + $("#listing").scrollTop() + " | dest: " + top);
	scrollListingTo(top);
}

function scrollListingTo(top, force) {
	if(force ||
		(top > $("#listing").scrollTop() + $("#listing").height() - LINE_HEIGHT) || 
		top < $("#listing").scrollTop()) {
		$("#listing").scrollTop(Math.max(top - $("#listing").height()/2, 0));
	}
}


function updateRegisterWindow() {
	for(var reg in emulator.Registers) {
		var val = Utils.hex2(emulator.Registers[reg].get());
		var memoryVal = Utils.hex2(emulator.RAM[emulator.Registers[reg].get()] || 0);
		
		var div = $("#register-" + reg).find(".register-value");
		if(div.html() != val) {
			div.addClass("changed");
			div.html(val);
		}
		else
			div.removeClass("changed");
			
		div = $("#register-" + reg).find(".register-memory-value");
		if(div.html() != memoryVal) {
			div.addClass("changed");
			div.html(memoryVal);
		}
		else
			div.removeClass("changed");
	}
}

function updateMemoryWindow() {
	
	var startOffset = Math.floor($("#memory_container").scrollTop() / LINE_HEIGHT) * 8;
	startOffset = Math.min(startOffset, 0xffb0);
	
	var memHtml = "";
	for(var i = 0; i < 10; i++) {
		memHtml += "<div class=\"memory_offset\">" + Utils.hex2(startOffset + i*8) + "</div>";
		memHtml += "<div class=\"memory_line\">"
		for(var j = 0; j < 8; j++) {
			memHtml += Utils.hex2(emulator.RAM[startOffset + i*8 + j] || 0) + " ";
		}
		memHtml += "</div><div class=\"clear\"></div>";
	}
	$("#memory").html(memHtml);
	$("#memory").css("top", ($("#memory_container").scrollTop() + 4) + "px");
}

function gotoMemoryLocation(location) {
	$("#memory_container").scrollTop(Math.floor(location / 8) * LINE_HEIGHT);
	updateMemoryWindow();
}

lastCycleUpdate = { time: 0, cycle: 0 };
function updateCycles() {
	var val = "";
	
	if(emulator.CPU_CYCLE > 0) {
		val = emulator.CPU_CYCLE;
		if(!emulator.paused) {
			var now = (new Date()).getTime();
			var speed = (emulator.CPU_CYCLE - lastCycleUpdate.cycle) / (now - lastCycleUpdate.time);
			lastCycleUpdate.time = now;
			lastCycleUpdate.cycle = emulator.CPU_CYCLE;
			val = Math.round(speed) + " kHz | " + val;
		}
	}
	
	$("#cycles").html(val);
}

function about() {
	$("#about_dialog").dialog("open");
	document.activeElement.blur();
	
	_gaq.push(['_trackEvent', "general", "about"]);
}