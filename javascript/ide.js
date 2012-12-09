var listing;
var emulator;
var editor;
var _debugger;
var LINE_HEIGHT = 14;
var userData;
var readOnly = false;
var mediaDrive;
var delayedAssembleTimeout = null;

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
	$("#settings_button").button({ icons: { primary: "ui-icon-gear" } });
	
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
	
	$("#settings_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 340,
		buttons: { 
			"Close": function() {  
				$(this).dialog("close"); 
				editor.focus();
			}
		} 
	});
	$("#cpu_speed_values").selectable({
		selected: function(event, ui) { 
			emulator.setSpeed(ui.selected.innerHTML);
		}
	});
	$("#cpu_speed_values").children().first().addClass("ui-selected");
	
	
	$("#help_dialog").dialog({ 
		modal: true, 
		autoOpen: false, 
		resizable: false,
		minWidth: 640,
		buttons: { 
			"Close": function() {  
				$(this).dialog("close"); 
				editor.focus();
			}
		} 
	});
	
	
	$("#listing").scroll(updateDebuggerLine);
	$("#memory_container").scroll(updateMemoryWindow);
	updateMemoryWindowHeight();
	
	$(".register-memory-value").click(function() { 
		gotoMemoryLocation($(this).html());
	});
	
	$("#memory_goto_button").click(function() {  
		gotoMemoryLocation($("#memory_goto_input").val());
	});
	
	$("#memory_goto_input").keydown(function(event) { 
		if(event.which == 13) { 
			gotoMemoryLocation($("#memory_goto_input").val());
		}
	});
	$("#collapse_empty_checkbox").change(function() { 
		$("#memory_container").scrollTop(0);
		updateMemoryWindow();
	});
	
	$("#watches_add_button").click(function() {  
		addWatch();
	});
	$("#watches_remove_button").click(function() {  
		removeWatch();
	});
	$("#watches_list").selectable({
		cancel: ":input,option",
		filter: "li",
		selected: function(event, ui) { 
			$("#watches_list").data("selected", ui.selected.id);
		}
	});
	$("#help_button").click(function() { 
		help();
	});

	editor = ace.edit("editor");
	editor.setTheme("ace/theme/monokai");
	var DCPU16Mode = require("ace/mode/dcpu16").Mode;
	editor.getSession().setMode(new DCPU16Mode());
	editor.setHighlightActiveLine(false);
	editor.resize();
	editor.getSession().setUseSoftTabs(true);
	
	editor.getSession().on('change', function() { 
		if(delayedAssembleTimeout)
			clearTimeout(delayedAssembleTimeout);
		delayedAssembleTimeout = setTimeout(function() { 
			assemble();
			delayedAssembleTimeout = null;
		}, 500);
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
	mediaDrive = new HMD2043(emulator);
	document.getElementById("monitor").appendChild(m.getDOMElement());
	document.getElementById("media-drive").appendChild(mediaDrive.getDOMElement());
	
	emulator.devices.push(m);
	emulator.devices.push(new Keyboard(emulator));
	emulator.devices.push(new Clock(emulator));
	emulator.devices.push(mediaDrive);
	
	_debugger = new Debugger(emulator);
	_debugger.onStep = function(location) {
		updateDebugger(location);
	};
	_debugger.onPaused = function(location) {
		updateDebugger(location);
	};
	_debugger.onInstruction = function(location) {
		
	}
	_debugger.onExit = function() {
		programComplete();
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
	userData.watches = userData.watches || [];
	
	
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
	
	$("#toggle_media_button").click(function() {
		if(mediaDrive.media) {
			mediaDrive.eject();
			$("#toggle_media_button").html("Insert Media");
		}
		else {
			mediaDrive.insertBlankMedia();
			$("#toggle_media_button").html("Eject Media");
		}
	})
	
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

function openSettings() {
	$("#settings_dialog").dialog("open");
	_gaq.push(['_trackEvent', "debugger", "settings"]);
}

function randomId() {
	return ((new Date()).getTime() + Math.round((Math.random()*1000000000000))).toString(36);
}

function assemble(data) {
	$("#assembly").empty();

	var input = data || editor.getSession().getValue();
	listing = Assembler.compileSource(input);
	
	var str = "";
	for(var i = 0; i < listing.messages.length; i++) {
		str += "<div class='output_message'>" + listing.messages[i] + "</div>";
	}
	
	if(listing.errors.length == 0) {
		str += "<div class='output_message'>OK</div>";
		$("#assembly").removeClass("failed");
	}
	else {
		$("#assembly").addClass("failed");
		for(var i = 0; i < listing.errors.length; i++) {
			str += "<div onclick='gotoLine("+listing.errors[i].line+")' class='output_error'>";
			str += "Line " + listing.errors[i].line + ": ";
			str += listing.errors[i].message;
			str += "</div>";
		}
	}
	$("#assembly").append(str);
	
	$("#output").html(listing.bytecodeText());
}

function gotoLine(line) {
	editor.gotoLine(line);
	editor.focus();
}

function startDebugger() {
	if(delayedAssembleTimeout) {
		clearTimeout(delayedAssembleTimeout);
		delayedAssembleTimeout = null;
		assemble();
	}

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
	
	// for very large programs, this may fail because we'll exceed the maximum call stack size
	try {
		$("#listing").find(".offset").click(function(evt) {
			var lineNumber = parseInt(this.id.substr("offset_line_".length));
			toggleBreakpoint(lineNumber);
		});
		$("#listing").find(".hexidecimal").click(function(evt) {
			gotoMemoryLocation($(this).text());
		});
		$("#listing").find(".label_ref").click(function(evt) {
			if(evt.ctrlKey) {
				// add label as a watch
				userData.watches.splice(0, 0, $(this).text());
				persist();
				refreshWatches();
			}
			else {
				// goto location in listing
				var offset = listing.labels[$(this).text()];
				var top = getLineTop(calculateLine(offset));
				scrollListingTo(top, true);
			}
		});
		$("#listing").find(".label_ref").mouseenter(function(evt) {
			var offset = listing.labels[$(this).text()];
			if(offset) {
				var tip = $(this).text() + "\n";
				tip += Utils.hex2(offset) + " [" + Utils.hex2(emulator.RAM[offset]) + "]";
				tip += "\n(ctrl-click to add watch)";
				$(this).attr("title", tip);
			}
		});
	}
	catch(e) { 
		console.log(e);
	}
	
	for(var bp in _debugger.breakpoints) {
		$("#offset_line_"+_debugger.breakpoints[bp]).addClass("breakpoint");
	}
	
	$("#editing_windows").hide();
	$("#debugging_windows").show();
	
	emulator.reboot();
	emulator.paused = true;
	emulator.run(listing.bytecode());
	updateRegisterWindow();
	refreshWatches();
	
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
		updateWatches();
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

function programComplete() {
	$("#debugger_line").hide();
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
	return line*LINE_HEIGHT + $("#listing").position().top + 1;
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
	startOffset = Math.min(startOffset, 0xffd0);
	
	var memHtml = "";
	var added = 0;
	var collapse = getCollapseZeros();
	for(var i = 0; added < 10; i++) {
		var offset = startOffset + i*8;
		if(offset > 0xfff8)
			break;
			
		if(collapse) {
			// check for all 0s
			var zeros = true;
			for(var l = 0; l < 8; l++) {
				if((emulator.RAM[startOffset + i*8 + l] || 0) != 0) {
					zeros = false;
					break;
				}
				
			}
			if(zeros) 
				continue;
		}
		
		memHtml += "<div class=\"memory_offset\">" + Utils.hex2(offset) + "</div>";
		memHtml += "<div class=\"memory_line\">";
		
		for(var j = 0; j < 8; j++) {
			var span = "";
			if(offset == emulator.Registers.PC.get())
				span = "<span class=\"PC\">";
			else if(offset == emulator.Registers.SP.get())
				span = "<span class=\"SP\">";
			memHtml += span + Utils.hex2(emulator.RAM[offset] || 0) + " ";
			if(span.length > 0)
				memHtml += "</span>";
			
			offset++;
		}
		memHtml += "</div><div class=\"clear\"></div>";
		added++;
	}
	$("#memory").html(memHtml);
	$("#memory").css("top", ($("#memory_container").scrollTop() + 4) + "px");
}

function gotoMemoryLocation(location) {
	var val = parseInt(location);
	if(isNaN(val)) return;
	$("#memory_container").scrollTop(Math.floor(val / 8) * LINE_HEIGHT);
	updateMemoryWindow();
}

function updateMemoryWindowHeight() {
	$("#memory_sizer").height(0x2003 * LINE_HEIGHT);
}

function getCollapseZeros() {
	return $("#collapse_empty_checkbox").is(':checked');
}

function updateWatches() {
	$("#watches_list").children().each(function(index, elem) {
		var key = $(elem).find(".watch_key").text();
		var memoryLocation = -1;
		if(isNaN(parseInt(key))) {
			// label
			memoryLocation = listing.labels[key] || -1;
		}
		else {
			// numeric
			memoryLocation = parseInt(key);
			
		}
		
		if(memoryLocation >= 0 && memoryLocation < emulator.RAM.length) {
			$(elem).find(".watch_value").html(Utils.hex(emulator.RAM[memoryLocation]));
		}
		else
			$(elem).find(".watch_value").html("[invalid]");
	});
}

function refreshWatches() {
	$("#watches_list").removeData("selected");
	$("#watches_list").empty();
	for(var i = 0; i < userData.watches.length; i++) {
		var val = userData.watches[i];
		var watch = $("#watch_template").clone();
		watch.attr("id", randomId());
		watch.find(".watch_key").html(val);
		watch.show();
		$("#watches_list").append(watch);
	}
	updateWatches();
}

function addWatch() {
	$('#watches_list .ui-selected').removeClass('ui-selected');
	$("#watches_list").removeData("selected");

	function commitWatch(elem) {
		if(elem.val().length > 0) {
			userData.watches.splice(0, 0,elem.val());
			persist();
		}
		elem.remove();
		refreshWatches();
	}
	
	var edit = $("#watch_edit_template").clone();
	edit.attr("id", randomId());
	$("#watches_list").prepend(edit);
	edit.show();
	edit.find("input").focus();
	edit.find("input").blur(function() { 
		commitWatch($(this));
	});
	edit.find("input").keydown(function(event) { 
		if(event.which == 13) { 
			commitWatch($(this));
		}
		else if(event.which == 27) { 
			$(this).val("");
			commitWatch($(this));
		}
	});
	
	_gaq.push(['_trackEvent', "debugger", "addWatch"]);
}

function removeWatch() {
	var id = $("#watches_list").data("selected");
	if(id) {
		var watch = $("#"+id).find(".watch_key").html();
		if(watch && watch.length > 0) {
			var idx = userData.watches.indexOf(watch);
			if(idx > -1) {
				userData.watches.splice(idx, 1);
				persist();
				refreshWatches();
			}
		}
	}
	
	_gaq.push(['_trackEvent', "debugger", "removeWatch"]);
}

lastCycleUpdate = { time: 0, cycle: 0 };
function updateCycles() {
	// bail if we're still on the same cycle
	if(lastCycleUpdate.cycle == emulator.CPU_CYCLE) return;
	
	var val = "";
	
	if(emulator.CPU_CYCLE > 0) {
		val = emulator.CPU_CYCLE;
		if(!emulator.paused) {
			var now = (new Date()).getTime();
			var speed = (emulator.CPU_CYCLE - lastCycleUpdate.cycle) / (now - lastCycleUpdate.time);
			lastCycleUpdate.time = now;
			lastCycleUpdate.cycle = emulator.CPU_CYCLE;
			if(speed >= 1)
				val = Math.round(speed) + " kHz | " + val;
			else 
				val = Math.round(speed*1000) + " Hz | " + val;
		}
	}
	
	$("#cycles").html(val);
}

function about() {
	$("#about_dialog").dialog("open");
	document.activeElement.blur();
	
	_gaq.push(['_trackEvent', "general", "about"]);
}

function help() {
	$("#help_dialog").dialog("open");
	document.activeElement.blur();
	_gaq.push(['_trackEvent', "general", "help"]);
}