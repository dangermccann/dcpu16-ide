// https://raw.github.com/gibbed/0x10c-Notes/master/hardware/clock.txt
function Clock(_emulator) {
	this.id = 0x12d0b402;
	this.version = 1;
	this.manufacturer = 0x90099009;
	this.emulator = _emulator;
	
	this.interruptsOn = false;
	this.elapsed = 0;
	this.interval = 0;
	this.interruptMessage = 0;
};

Clock.prototype.interrupt = function() { 
	var aVal = this.emulator.Registers.A.get();
	var bVal = this.emulator.Registers.B.get();
	switch(aVal) {
		case 0:
			if(bVal != 0)
				this.start(Math.round(bVal / 60 * 1000));	
			else
				this.stop();
			break;
		
		case 1:
			this.emulator.Registers.C.set(this.elapsed);
			break;
		
		case 2:
			if(bVal != 0) {
				this.interruptsOn = true;
				this.interruptMessage = bVal;
			}
			else {
				this.interruptsOn = false;
			}
			break;
	}
	
};

Clock.prototype.init = function() { 
	this.stop();
}
Clock.prototype.start = function(duration) { 
	this.stop();
	this.elapsed = 0;
	var _this = this;
	this.interval = setInterval(function() { _this.tick() }, duration);
}

Clock.prototype.stop = function() {
	if(this.interval != 0) {
		clearInterval(this.interval);
		this.interval = 0;
	}
}

Clock.prototype.tick = function() {
	this.elapsed = (this.elapsed + 1) & 0xffff;
	
	if(this.interruptsOn)
		this.emulator.interrupt(this.interruptMessage);
}