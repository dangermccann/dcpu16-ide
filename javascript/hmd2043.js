// https://raw.github.com/gist/2495578/8a002b8095b91178a08ac14539780255dd23a154/HIT_HMD2043.txt

function HMD2043(_emulator) {
	this.id = 0x74fa4cae;
	this.version = 0x07c2;
	this.manufacturer = 0x21544948;	// HAROLD_IT
	this.emulator = _emulator;
	this.fullStrokeTime = 200;	// ms
	this.spindleSpeed = 0.005;	// revolutions per millisecond
}

HMD2043.prototype.init = function() { 
	this.deviceFlags = 0;
	this.media = null;
	this.lastInterruptType = HMD2043.InterruptType.NONE;
	this.lastInterruptStatus = HMD2043.Status.ERROR_NONE;
	this.interruptMessage = 0xFFFF;
	this.operationPending = false;
	this.currentSector = 0;
}

HMD2043.prototype.interrupt = function() { 
	var aVal = this.emulator.Registers.A.get();
	var bVal = this.emulator.Registers.B.get();
	
	if(aVal == HMD2043.Operations.QUERY_MEDIA_PRESENT) { 
		this.emulator.Registers.B.set(this.media ? 1 : 0);
		this.setStatus(HMD2043.Status.ERROR_NONE);
	}
	else if(aVal == HMD2043.Operations.QUERY_MEDIA_PARAMETERS) { 
		if(this.media) { 
			this.emulator.Registers.B.set(this.media.wordsPerSector);
			this.emulator.Registers.C.set(this.media.numSectors);
			this.emulator.Registers.X.set(this.media.writeLocked ? 1 : 0);
			this.setStatus(HMD2043.Status.ERROR_NONE);
		}
		else { 
			this.setStatus(HMD2043.Status.ERROR_NO_MEDIA);
		}
	}
	else if(aVal == HMD2043.Operations.QUERY_DEVICE_FLAGS) { 
		this.emulator.Registers.B.set(this.deviceFlags);
		this.setStatus(HMD2043.Status.ERROR_NONE);
	}
	else if(aVal == HMD2043.Operations.UPDATE_DEVICE_FLAGS) { 
		this.deviceFlags = bVal;
		this.setStatus(HMD2043.Status.ERROR_NONE);
	}
	else if(aVal == HMD2043.Operations.QUERY_INTERRUPT_TYPE) { 
		this.emulator.Registers.B.set(this.lastInterruptType);
		this.emulator.Registers.A.set(this.lastInterruptStatus);
	}
	else if(aVal == HMD2043.Operations.SET_INTERRUPT_MESSAGE) { 
		this.interruptMessage = bVal;
		this.setStatus(HMD2043.Status.ERROR_NONE);
	}
	else if(aVal == HMD2043.Operations.READ_SECTORS || aVal == HMD2043.Operations.WRITE_SECTORS) { 
		this.mediaOperation(aVal, bVal, 
			this.emulator.Registers.C.get(), 
			this.emulator.Registers.X.get());
	}
	else if(aVal == HMD2043.Operations.QUERY_MEDIA_QUALITY) { 
		if(this.media) { 
			this.emulator.Registers.B.set(this.media.quality);
			this.setStatus(HMD2043.Status.ERROR_NONE);
		}
		else {
			this.setStatus(HMD2043.Status.ERROR_NO_MEDIA);
		}
	}
}

HMD2043.prototype.insertBlankMedia = function(label) {
	this.insertMedia(new HMU1440(label));
}

HMD2043.prototype.insertMedia = function(_media) {
	this.media = _media;
	this.currentSector = 0;
	this.mediaStatusChanged();
}

HMD2043.prototype.eject = function() { 
	this.media = null;
	this.mediaStatusChanged();
}

HMD2043.prototype.mediaStatusChanged = function() {
	if(this.getMediaStatusInterrupt()) {
		this.lastInterruptType = HMD2043.InterruptType.MEDIA_STATUS;
		this.lastInterruptStatus = HMD2043.Status.ERROR_NONE;
		this.emulator.interrupt(this.interruptMessage);
	}
}

HMD2043.prototype.setStatus = function(status) {
	this.emulator.Registers.A.set(status);
}

HMD2043.prototype.isValidSector = function(sector) { 
	if(!this.media) return false;
	return (sector >= 0 && sector < this.media.numSectors);
}

HMD2043.prototype.getNonBlocking = function() { 
	return (this.deviceFlags & 0x1);
}

HMD2043.prototype.getMediaStatusInterrupt = function() { 
	return (this.deviceFlags & 0x2) >> 1;
}

HMD2043.prototype.mediaOperation = function(operation, startSector, numSectors, offset, callback) { 
	if(this.operationPending) {
		this.setStatus(HMD2043.Status.ERROR_PENDING);
	}
	else if(this.media) { 
		this.operationPending = true;
		var _this = this;
		if(this.isValidSector(startSector) && this.isValidSector(startSector+numSectors-1)) {
			
			this.seek(startSector, function() { 
				var opTime = Math.round(1 / (_this.spindleSpeed * _this.media.sectorsPerTrack) * numSectors);
				setTimeout(function() {  
					if(operation == HMD2043.Operations.READ_SECTORS) { 
						var result = _this.media.read(startSector, numSectors);
						for(var i = 0; i < result.length; i++) {
							_this.emulator.RAM[offset+i] = result[i];
						}
						_this.lastInterruptType = HMD2043.InterruptType.READ_COMPLETE;
					}
					else if(operation == HMD2043.Operations.WRITE_SECTORS) { 
						var data = [];
						var numWords = numSectors * _this.media.wordsPerSector;
						for(var i = 0; i < numWords; i++) {
							data[i] = _this.emulator.RAM[offset+i];
						}
						_this.media.write(startSector, numSectors, data);
						_this.lastInterruptType = HMD2043.InterruptType.WRITE_COMPLETE;
					}
					
					_this.lastInterruptStatus = HMD2043.Status.ERROR_NONE;
					_this.setStatus(HMD2043.Status.ERROR_NONE);
					_this.emulator.interrupt(_this.interruptMessage);
					_this.operationPending = false;
					
					if(callback)
						callback();
				}, opTime);
			});
		
			
		}
		else this.setStatus(HMD2043.Status.ERROR_INVALID_SECTOR);
	}
	else {
		this.setStatus(HMD2043.Status.ERROR_NO_MEDIA);
	}
}

HMD2043.prototype.seek = function(sector, callback) {
	var seekTime = Math.floor( Math.abs(sector - this.currentSector)
			/ this.media.sectorsPerTrack )
			* this.fullStrokeTime / (this.media.numTracks - 1);
	seekTime = Math.round(seekTime);
	console.log("seeking to sector " + sector + " in " + seekTime + "ms");
		
	setTimeout(function() { callback(); }, Math.max(seekTime, 1));
}

HMD2043.prototype.read = function(startSector, numSectors, offset, callback) { 
	this.mediaOperation(HMD2043.Operations.READ_SECTORS, startSector, numSectors, offset, callback);
}

HMD2043.prototype.write = function(startSector, numSectors, offset, callback) { 
	this.mediaOperation(HMD2043.Operations.WRITE_SECTORS, startSector, numSectors, offset, callback);
}

HMD2043.prototype.mediaOperationCallback = function() { 
}

HMD2043.Operations = {
	QUERY_MEDIA_PRESENT: 0,
	QUERY_MEDIA_PARAMETERS: 1,
	QUERY_DEVICE_FLAGS: 2,
	UPDATE_DEVICE_FLAGS: 3,
	QUERY_INTERRUPT_TYPE: 4,
	SET_INTERRUPT_MESSAGE: 5,
	READ_SECTORS: 0x10,
	WRITE_SECTORS: 0x11,
	QUERY_MEDIA_QUALITY: 0xffff
};

HMD2043.Status = { 
	ERROR_NONE: 0,
	ERROR_NO_MEDIA: 1,
	ERROR_INVALID_SECTOR: 2,
	ERROR_PENDING: 3
}

HMD2043.InterruptType = { 
	NONE: 0,
	MEDIA_STATUS: 1,
	READ_COMPLETE: 2,
	WRITE_COMPLETE: 3
};

HMD2043.DeviceFlags = { 
	NON_BLOCKING: 0,
	MEDIA_STATUS_INTERRUPT: 1
};

function HMU1440(label) {
	this.numSectors = 1440;
	this.wordsPerSector = 512;
	this.writeLocked = false;
	this.quality = 0x7FFF;
	this.sectorsPerTrack = 18;
	this.numTracks = 80;
	this.volumeLabel = label || "[unnamed media]";
	this.sectors = localStorage.getItem('HMD2043-'+this.volumeLabel);
	if(!this.sectors || this.sectors.length)
		this.sectors = new Array(this.numSectors);
}

HMU1440.prototype.read = function(startSector, numSectors) {
	var data = new Array(numSectors * this.wordsPerSector);
	for(var i = 0; i < numSectors; i++) {
		for(var j = 0; j < this.wordsPerSector; j++) {
			data[i * this.wordsPerSector + j] = this.sectors[startSector + i][j];
		}
	}
	return data;
}
HMU1440.prototype.write = function(startSector, numSectors, data) {
	for(var i = 0; i < numSectors; i++) {
		this.sectors[startSector + i] = new Array(this.wordsPerSector);
		for(var j = 0; j < this.wordsPerSector; j++) {
			this.sectors[startSector + i][j] = data[i * this.wordsPerSector + j];
		}
	}
	this.flush();
}

HMU1440.prototype.erase = function() {
	this.sectors = null;
	this.flush();
}

HMU1440.prototype.flush = function() {
	localStorage.setItem('HMD2043-'+this.volumeLabel, JSON.stringify(this.sectors));
}

