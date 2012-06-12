// https://raw.github.com/gibbed/0x10c-Notes/master/hardware/keyboard.txt
function Keyboard(_emulator) {
	this.id = 0x30cf7406;
	this.version = 1;
	this.manufacturer = 0x90099009;
	this.emulator = _emulator;
	
	var _this = this;
	document.body.onkeydown = function(event) { _this.keyDown(event);  }
	document.body.onkeyup = function(event)  { _this.keyUp(event);  }
}
Keyboard.prototype.init = function() { 
	this.interruptsOn = false;
	this.interruptMessage = 0;
	this.keys = [];
	this.downKeys = {};
}

Keyboard.prototype.keyDown = function(event) {
	if(this.emulator.paused)
		return;
		
	var code = this.convert(event.keyCode);
	this.downKeys[""+code] = true;

	// TODO: some apps seem to assume that key input should go to this magical address...
	this.emulator.RAM[0x9000 + this.keys.length % 0xf] = code;
	
	this.keys.push(code);
	
	
	if(this.interruptsOn)
		this.emulator.interrupt(this.interruptMessage);
}

Keyboard.prototype.keyUp = function(event) {
	var code = this.convert(event.keyCode);
	this.downKeys[""+code] = false;
}

Keyboard.prototype.convert = function(code) {
	// TODO: convert key codes
	switch(code) {
		// backspace
		case 8:
			return 0x10;
		// return
		case 13:
			return 0x11;
		// insert
		case 45:
			return 0x12;
		// delete
		case 46:
			return 0x13;
		// up arrow
		case 38:
			return 0x80;
		// down arrow
		case 40:
			return 0x81;
		// left arrow
		case 37:
			return 0x82;
		// right arrow
		case 39:
			return 0x83;
		// shift
		case 16:
			return 0x90;
		//ctrl
		case 17:
			return 0x91;
		// space
		case 32:
			return 0x20;
			
		default:
			if(code >= 0x20 && code <= 0x7f)
				return code;
		
		return 0;
		
	}
	return code;
}

Keyboard.prototype.interrupt = function() { 
	var aVal = this.emulator.Registers.A.get();
	switch(aVal) {
		case 0:
			this.keys = [];
			break;
		
		case 1:
			var val = 0;
			if(this.keys.length > 0)
				val = this.keys[0];
				this.keys.splice(0, 1);
			this.emulator.Registers.C.set(val);
			break;
		
		case 2:
			if(this.downKeys[""+bVal])
				this.emulator.Registers.C.set(1);
			else
				this.emulator.Registers.C.set(0);
			break;
		
		case 3: {
			var bVal = this.emulator.Registers.B.get();
			if(bVal != 0) {
				this.interruptsOn = true;
				this.interruptMessage = bVal;
			}
			else {
				this.interruptsOn = false;
			}
			break;
		}
	}
	
};

