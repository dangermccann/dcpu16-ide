// https://raw.github.com/gibbed/0x10c-Notes/master/hardware/lem1802.txt
function Monitor(_emulator) {
	this.id = 0x7349f615;
	this.version = 0x1802;
	this.manufacturer = 0x1c6c8b36;
	this.emulator = _emulator;
	
	
	this.defaultFont = this.font = [
		0xB79E, 0x388E, 0x722C, 0x75F4, 0x19BB, 0x7F8F, 0x85F9, 0xB158, 0x242E, 0x2400, 0x082A, 0x0800, 0x0008, 0x0000, 0x0808, 0x0808,
		0x00FF, 0x0000, 0x00F8, 0x0808, 0x08F8, 0x0000, 0x080F, 0x0000, 0x000F, 0x0808, 0x00FF, 0x0808, 0x08F8, 0x0808, 0x08FF, 0x0000,
		0x080F, 0x0808, 0x08FF, 0x0808, 0x6633, 0x99CC, 0x9933, 0x66CC, 0xFEF8, 0xE080, 0x7F1F, 0x0701, 0x0107, 0x1F7F, 0x80E0, 0xF8FE,
		0x5500, 0xAA00, 0x55AA, 0x55AA, 0xFFAA, 0xFF55, 0x0F0F, 0x0F0F, 0xF0F0, 0xF0F0, 0x0000, 0xFFFF, 0xFFFF, 0x0000, 0xFFFF, 0xFFFF,
		0x0000, 0x0000, 0x005F, 0x0000, 0x0300, 0x0300, 0x3E14, 0x3E00, 0x266B, 0x3200, 0x611C, 0x4300, 0x3629, 0x7650, 0x0002, 0x0100,
		0x1C22, 0x4100, 0x4122, 0x1C00, 0x1408, 0x1400, 0x081C, 0x0800, 0x4020, 0x0000, 0x0808, 0x0800, 0x0040, 0x0000, 0x601C, 0x0300,
		0x3E49, 0x3E00, 0x427F, 0x4000, 0x6259, 0x4600, 0x2249, 0x3600, 0x0F08, 0x7F00, 0x2745, 0x3900, 0x3E49, 0x3200, 0x6119, 0x0700,
		0x3649, 0x3600, 0x2649, 0x3E00, 0x0024, 0x0000, 0x4024, 0x0000, 0x0814, 0x2200, 0x1414, 0x1400, 0x2214, 0x0800, 0x0259, 0x0600,
		0x3E59, 0x5E00, 0x7E09, 0x7E00, 0x7F49, 0x3600, 0x3E41, 0x2200, 0x7F41, 0x3E00, 0x7F49, 0x4100, 0x7F09, 0x0100, 0x3E41, 0x7A00,
		0x7F08, 0x7F00, 0x417F, 0x4100, 0x2040, 0x3F00, 0x7F08, 0x7700, 0x7F40, 0x4000, 0x7F06, 0x7F00, 0x7F01, 0x7E00, 0x3E41, 0x3E00,
		0x7F09, 0x0600, 0x3E61, 0x7E00, 0x7F09, 0x7600, 0x2649, 0x3200, 0x017F, 0x0100, 0x3F40, 0x7F00, 0x1F60, 0x1F00, 0x7F30, 0x7F00,
		0x7708, 0x7700, 0x0778, 0x0700, 0x7149, 0x4700, 0x007F, 0x4100, 0x031C, 0x6000, 0x417F, 0x0000, 0x0201, 0x0200, 0x8080, 0x8000,
		0x0001, 0x0200, 0x2454, 0x7800, 0x7F44, 0x3800, 0x3844, 0x2800, 0x3844, 0x7F00, 0x3854, 0x5800, 0x087E, 0x0900, 0x4854, 0x3C00,
		0x7F04, 0x7800, 0x047D, 0x0000, 0x2040, 0x3D00, 0x7F10, 0x6C00, 0x017F, 0x0000, 0x7C18, 0x7C00, 0x7C04, 0x7800, 0x3844, 0x3800,
		0x7C14, 0x0800, 0x0814, 0x7C00, 0x7C04, 0x0800, 0x4854, 0x2400, 0x043E, 0x4400, 0x3C40, 0x7C00, 0x1C60, 0x1C00, 0x7C30, 0x7C00,
		0x6C10, 0x6C00, 0x4C50, 0x3C00, 0x6454, 0x4C00, 0x0836, 0x4100, 0x0077, 0x0000, 0x4136, 0x0800, 0x0201, 0x0201, 0x0205, 0x0200]

	this.defaultPalette = this.palette = [
		0x000000, 0x0000aa, 0x00aa00, 0x00aaaa, 0xaa0000, 0xaa00aa, 0xaa5500, 0xaaaaaa,
		0x555555, 0x5555ff, 0x55ff55, 0x55ffff, 0xff5555, 0xff55ff, 0xffff55, 0xffffff
	];
	
	this.borderColor = 8;
	this.zoom = 2;
	this.memOffset = 0x8000;
	this.drawInterval = 0;
	this.refreshCount = 0;
	
	var _this = this;
	//this.drawInterval = setInterval(function() { _this.refresh() }, 100);
	
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.zoom * 128;
	this.canvas.height = this.zoom * 96;
	this.canvas.style.backgroundColor = "#777777";
	this.canvas.className = "lem1820";
	this.setBorderColor(this.borderColor);
	document.body.appendChild(this.canvas);
	this.context = this.canvas.getContext('2d');
	this.blinkGlyphsOn = true;
	
	this.bootScreen = new Image();
    this.bootScreen.src = "/images/boot-screen.png";
}

Monitor.prototype.init = function() { 
	this.disconnect();
	
	this.context.drawImage(this.bootScreen, 0, 0, this.canvas.width, this.canvas.height);
	var _this = this;
	setTimeout(function() { 
		_this.drawInterval = setInterval(function() { _this.refresh() }, 100);
	}, 1000);
}

Monitor.prototype.interrupt = function() { 
	var aVal = this.emulator.Registers.A.get();
	var bVal = this.emulator.Registers.B.get();
	switch(aVal) {
		case 0:
			if(bVal === 0)
				this.disconnect();
			else
				this.memMapScreen(bVal);
			break;
			
		case 1:
			this.memMapFont(bVal);
			break;
			
		case 2:
			this.memMapPalette(bVal);
			break;
			
		case 3:
			this.setBorderColor(bVal & 0xf);		
			break;
			
		case 4:
			this.memDumpFont(bVal);
			break;
			
		case 5:
			this.memDumpPalette(bVal);
			break;
	}
}

Monitor.prototype.memMapScreen = function(offset) {
	this.memOffset = offset;
}

Monitor.prototype.drawCell = function(x, y, word) {
	var glyph = word & 0x7f;
	var blink = (word & 0x80) >> 7;
	var bg = (word & 0xf00) >> 8;
	var fg = (word & 0xf000) >> 12;
	this.drawGlyph(x, y, glyph, this.palette[fg], this.palette[bg], blink);
}

Monitor.prototype.drawGlyph = function(x, y, glyph, fg, bg, blink) {
	this.context.fillStyle =  Utils.makeColor(bg);
	this.context.fillRect(x * 4 * this.zoom, y * 8 * this.zoom, 4 * this.zoom, 8 * this.zoom);
	
	if(blink && !this.blinkGlyphsOn)
		return;
	
	this.context.fillStyle = Utils.makeColor(fg);
	
	var cols = [];
	glyph *= 2;
	cols[0] = this.font[glyph] >> 8;
	cols[1] = this.font[glyph] & 0xff;
	cols[2] = this.font[glyph+1] >> 8;
	cols[3] = this.font[glyph+1] & 0xff;
	
	for(var row = 0; row < 8; row++) {
		for(var col = 0; col < 4; col++) {
			var bit = (cols[col] >> row) & 0x01;
			if(bit == 1)
				this.context.fillRect((x*4 + col) * this.zoom, (y*8 + row) * this.zoom, this.zoom, this.zoom);
		}
	}
	
}

Monitor.prototype.refresh = function() {
	this.refreshCount++;
	if(this.refreshCount > 10) {
		this.blinkGlyphsOn = !this.blinkGlyphsOn;
		this.refreshCount = 0;
	}

	for(var y = 0; y < 12; y++) {
		for(var x = 0; x < 32; x++) {
			this.drawCell(x, y, this.emulator.RAM[this.memOffset + x + y*32]);
		}
	}
}

Monitor.prototype.disconnect = function() {
	this.context.fillStyle = "#777777";
	this.context.fillRect(0, 0, 128, 96);
	if(this.drawInterval != 0)
		clearInterval(this.drawInterval);
	this.drawInterval = 0;
}

Monitor.prototype.memMapFont = function(offset) {
	if(offset === 0)
		this.font = this.defaultFont;
	else {
		for(var i = 0; i < 256; i++) {
			this.font[i] = this.emulator.RAM[offset+i];
		}
	}
}

Monitor.prototype.memMapPalette = function(offset) {
	if(offset === 0)
		this.palette = this.defaultPalette;
	else {
		for(var i = 0; i < 16; i++) {
			this.palette[i] = this.emulator.RAM[offset+i];
		}
	}
}

Monitor.prototype.memDumpFont = function(offset) {
	for(var i = 0; i < 256; i++) {
		this.emulator.RAM[offset+i] = this.font[i];
	}
	this.emulator.CPU_CYCLE += 256;
}

Monitor.prototype.memDumpPalette = function(offset) {
	for(var i = 0; i < 16; i++) {
		this.emulator.RAM[offset+i] = this.font[i];
	}
	this.emulator.CPU_CYCLE += 16;
}

Monitor.prototype.setBorderColor = function(color) {
	this.borderColor = this.palette[color & 0xf];
	this.canvas.style.border = (4+this.zoom) + "px solid " + Utils.makeColor(this.borderColor);
}

Monitor.prototype.getDOMElement = function() {
	return this.canvas;
}


