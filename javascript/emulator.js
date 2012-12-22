
// http://pastebin.com/raw.php?i=Q4JvQvnM
// https://github.com/gibbed/0x10c-Notes

function Register(_name, _value, _emulator) {
	this.name = _name;
	this.value = _value;
	this.emulator = _emulator;
	this.contents = 0;
}
Register.prototype.getA = Register.prototype.getB = Register.prototype.get = function() { return this.contents; }
Register.prototype.set = function(val) { this.contents = val; }

function RegisterValue(_register) {
	this.register = _register;
	this.emulator = _register.emulator;
}
RegisterValue.prototype.getA = RegisterValue.prototype.getB = RegisterValue.prototype.get = function() { 
	return this.emulator.RAM[this.register.get()] || 0; 
}
RegisterValue.prototype.set = function(val) { 
	this.emulator.RAM[this.register.get()] = val; 
}

function RegisterPlusNextWord(_register) {
	this.register = _register;
	this.emulator = _register.emulator;
	this.cachedResult = null;
}
RegisterPlusNextWord.prototype.getB = RegisterPlusNextWord.prototype.getA = RegisterPlusNextWord.prototype.get = function() { 
	var nw = this.emulator.nextWord();
	if(nw == 0xffff) nw = -1;	// TODO: why is this like this???? (required for '99 bottles' to work...)
	this.cachedResult = this.register.get() + nw;
	return this.emulator.RAM[this.cachedResult] || 0; 
}
RegisterPlusNextWord.prototype.set = function(val) { 
	this.emulator.RAM[this.cachedResult] = val; 
}


function StackPointerValue(_emulator) { 
	this.emulator = _emulator
}
StackPointerValue.prototype.get = StackPointerValue.prototype.getB = function() {
	return this.emulator.Registers.SP.get();
}

StackPointerValue.prototype.getA =  function() {
	return this.emulator.Registers.SP.pop();
}
StackPointerValue.prototype.set = function(val) {
	this.emulator.Registers.SP.push(val);
}

function Literal(_value) {
	this.value = _value;
}
Literal.prototype.getA = Literal.prototype.getB = Literal.prototype.get = function() { return this.value; }
Literal.prototype.set = function(val) {  }
Literals = { };

function Op(_emulator, _name, _value, _cycles, __exec, _set) {
	this.emulator = _emulator;
	this.name = _name;
	this.value = _value;
	this.cycles = _cycles;
	this._exec = __exec;
	_set = _set || this.emulator.OpSet;
	_set[this.value] = this;
}
Op.prototype.exec = function(a, b) { 
	var valA = this.emulator.getParamValue(a);
	var valB = this.emulator.getParamValue(b);
	
	if(!valA) throw new Error("Invalid 'a' value " + a);
	if(!valB) throw new Error("Invalid 'b' value " + b);
	
	this._exec(valA, valB); 
	this.emulator.CPU_CYCLE += this.cycles; 
};

// literals
for(var i = 0x20, literalVal = -1; i < 0x40; i++, literalVal++) {
	Literals["L_" + literalVal] = i;
}

// convenience constants
Values = { };
Values.REGISTER_VALUE_OFFSET = 0x08;
Values.REGISTER_NEXT_WORD_OFFSET = 0x10;
Values.SP_OFFSET = 0x18;
Values.NEXT_WORD_VALUE = 0x1e;
Values.NEXT_WORD_LITERAL = 0x1f;
Values.SP = 0x1b;
Values.PC = 0x1c;
Values.EX = 0x1d;

REGISTER_A = 0x00;
REGISTER_B = 0x01;
REGISTER_C = 0x02;
REGISTER_X = 0x03;
REGISTER_Y = 0x04;
REGISTER_Z = 0x05;
REGISTER_I = 0x06;
REGISTER_J = 0x07;
REGISTER_SP = 0x1b;
REGISTER_PC = 0x1c;
REGISTER_EX = 0x1d;

OPERATION_SET = 0x01;
OPERATION_ADD = 0x02;
OPERATION_SUB = 0x03;
OPERATION_MUL = 0x04;
OPERATION_MLI = 0x05;
OPERATION_DIV = 0x06;
OPERATION_DVI = 0x07;
OPERATION_MOD = 0x08;
OPERATION_MDI = 0x09;
OPERATION_AND = 0x0a;
OPERATION_BOR = 0x0b;
OPERATION_XOR = 0x0c;
OPERATION_SHR = 0x0d;
OPERATION_ASR = 0x0e;
OPERATION_SHL = 0x0f;

OPERATION_IFB = 0x10;
OPERATION_IFC = 0x11;
OPERATION_IFE = 0x12;
OPERATION_IFN = 0x13;
OPERATION_IFG = 0x14;
OPERATION_IFA = 0x15;
OPERATION_IFL = 0x16;
OPERATION_IFU = 0x17;

OPERATION_ADX = 0x1a;
OPERATION_SBX = 0x1b;

OPERATION_STI = 0x1e;
OPERATION_STD = 0x1f;

OPERATION_JSR = 0x01;
OPERATION_INT = 0x08;
OPERATION_IAG = 0x09;
OPERATION_IAS = 0x0a;
OPERATION_RFI = 0x0b;
OPERATION_IAQ = 0x0c;

OPERATION_HWN = 0x10;
OPERATION_HWQ = 0x11;
OPERATION_HWI = 0x12;



Utils = { 
	to32BitSigned: function(val) {
		if((val & 0x8000) > 0) {
			return (((~val) + 1) & 0xffff) * -1;	// two's complement
		}
		return val;
	},
	
	to16BitSigned: function(val) {
		if(val < 0) {
			//return ((~val) + 1) & 0xffff;	// two's complement
			return ((val & 0x7fff) | 0x8000);
		}
		return val & 0xffff;
	},
	
	byteTo32BitSigned: function(val) {
		if((val & 0x80) > 0) {
			return (((~val) + 1) & 0xff) * -1;	// two's complement
		}
		return val;
	},
	
	roundTowardsZero: function(val) {
		if(val < 0)
			val = Math.ceil(val);
		else
			val = Math.floor(val);
		return val;
	},
	
	makeInstruction: function(opcode, a, b) {
		var instruction = opcode;
		instruction |= (b << 5);
		instruction |= (a << 10);
		return instruction;
	},
	
	makeSpecialInstruction: function(opcode, a) {
		var instruction = 0;
		instruction |= (a << 10);
		instruction |= (opcode << 5);
		return instruction;
	},
	
	parseInstruction: function(instruction) {
		return { 
			opcode: instruction & 0x001f,
			b: (instruction & 0x03e0) >> 5,
			a: (instruction & 0xfc00) >> 10
		}
	},
	
	parseSpecialInstruction: function(instruction) {
		return { 
			a: (instruction & 0xfc00) >> 10,
			opcode: (instruction & 0x03e0) >> 5,
			b: 0
		}
	},
	
	hex: function(num) {
		return "0x" + Utils.to16BitSigned(num).toString(16);
	},
	
	hex2: function(num) {
		//var str = Utils.to16BitSigned(num).toString(16);
		var str = (num).toString(16);
		return "0x" + "0000".substr(str.length) + str;
	},
	
	makeVideoCell: function(glyph, blink, bg, fg) {
		var result = glyph & 0x7f;
		result |= (blink & 0x1) << 7;
		result |= (bg & 0xf) << 8;
		result |= (fg & 0xf) << 12;
		return result;
	},
	
	color16To32: function(c) {
		var r = (((c & 0xf00) >> 8) * 16) << 16;
		var g = (((c & 0x0f0) >> 4) * 16) << 8;
		var b = (c & 0x00f) * 16;
		return Utils.makeColor(r | g | b);
		
	},
	
	makeColor: function(d) {
		var hex = Number(d).toString(16);
		hex = "000000".substr(0, 6 - hex.length) + hex; 
		return "#" + hex;
	},
	
	createImage: function(src) {
		var img = new Image();
		img.src = src;
		return img;
	}

};

Speeds = {
	"100 kHz": { "delayFrequency": 1000, "delayTime": 1 },
	"100 Hz": { "delayFrequency": 10, "delayTime": 100 },
	"10 Hz": { "delayFrequency": 1, "delayTime": 100 },
};

/**
 * Emulator constructor.
 *
 * @constructor
 * @this {Emulator}
 */
function Emulator() { 

	this.async = true;
	this.verbose = false;
	this.currentSpeed = Speeds["100 kHz"];

	this.CPU_CYCLE = 0;
	this.RAM = [];

	this.OpSet = { };
	this.SpecialOpSet = { };
	this.Registers = { 
		A: new Register("A", REGISTER_A, this),
		B: new Register("B", REGISTER_B, this),
		C: new Register("C", REGISTER_C, this),
		X: new Register("X", REGISTER_X, this),
		Y: new Register("Y", REGISTER_Y, this),
		Z: new Register("Z", REGISTER_Z, this),
		I: new Register("I", REGISTER_I, this),
		J: new Register("J", REGISTER_J, this),
		SP: new Register("SP", REGISTER_SP, this),
		PC: new Register("PC", REGISTER_PC, this),
		EX: new Register("EX", REGISTER_EX, this),
		IA: new Register("IA", 0xffff, this),
	};


	this.Registers.PC.inc = function() {
		var v = this.get();
		this.set(v+1);
		return v;
	};
	this.PC = this.Registers.PC;

	this.Registers.SP.push = function(val) {
		this.contents =  Utils.to16BitSigned(this.contents - 1);
		this.emulator.RAM[this.contents] = val;
	};
	this.Registers.SP.pop = function() {
		if(this.contents == 0) 
			console.log("Warning: stack underflow");
			
		var val = this.emulator.RAM[this.contents] || 0;
		this.emulator.RAM[this.contents] = 0;	// TODO: should the emualtor alter the memory location when it is POPed?
		this.contents = (this.contents + 1) & 0xffff;
		return val;
	};

	
	this.Values = { }
	this.Values[0x00] = this.Registers.A;
	this.Values[0x01] = this.Registers.B;
	this.Values[0x02] = this.Registers.C;
	this.Values[0x03] = this.Registers.X;
	this.Values[0x04] = this.Registers.Y;
	this.Values[0x05] = this.Registers.Z;
	this.Values[0x06] = this.Registers.I;
	this.Values[0x07] = this.Registers.J;
	this.Values[0x08] = new RegisterValue(this.Registers.A);
	this.Values[0x09] = new RegisterValue(this.Registers.B);
	this.Values[0x0a] = new RegisterValue(this.Registers.C);
	this.Values[0x0b] = new RegisterValue(this.Registers.X);
	this.Values[0x0c] = new RegisterValue(this.Registers.Y);
	this.Values[0x0d] = new RegisterValue(this.Registers.Z);
	this.Values[0x0e] = new RegisterValue(this.Registers.I);
	this.Values[0x0f] = new RegisterValue(this.Registers.J);
	this.Values[0x10] = new RegisterPlusNextWord(this.Registers.A);
	this.Values[0x11] = new RegisterPlusNextWord(this.Registers.B);
	this.Values[0x12] = new RegisterPlusNextWord(this.Registers.C);
	this.Values[0x13] = new RegisterPlusNextWord(this.Registers.X);
	this.Values[0x14] = new RegisterPlusNextWord(this.Registers.Y);
	this.Values[0x15] = new RegisterPlusNextWord(this.Registers.Z);
	this.Values[0x16] = new RegisterPlusNextWord(this.Registers.I);
	this.Values[0x17] = new RegisterPlusNextWord(this.Registers.J);
	this.Values[0x18] = new StackPointerValue(this);
	this.Values[0x19] = new RegisterValue(this.Registers.SP);
	this.Values[0x1a] = new RegisterPlusNextWord(this.Registers.SP);
	this.Values[0x1b] = this.Registers.SP;
	this.Values[0x1c] = this.Registers.PC;
	this.Values[0x1d] = this.Registers.EX;
	this.Values[0x1e] = { // next word value
		emulator: this,
		getA: function() { return this.get(); },
		getB: function() { return this.get(); },
		get: function() { 
			this.cachedResult = this.emulator.nextWord();
			return this.emulator.RAM[this.cachedResult] || 0; 
		},
		set: function(val) { 
			this.emulator.RAM[this.cachedResult] = val; 
		}
	};	
	this.Values[0x1f] = { // next word literal	
		emulator: this,
		getA: function() { return this.get(); },
		getB: function() { return this.get(); },
		get: function() { return this.emulator.nextWord(); },
		set: function(val) { }
	};
	
	this.Values[0x20] = new Literal(0xffff);	// -1
	for(var i = 0x21, literalVal = 0; i < 0x40; i++, literalVal++) {
		this.Values[i] = new Literal(literalVal);
	}


	this.BasicOperations = {
		SET: new Op(this, "SET", OPERATION_SET, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(aVal);
			
			// TODO: some applications assume that setting PC to itself should terminate the application
			//if(a == this.emulator.Registers.PC && b == this.emulator.Registers.PC) {
			//	this.emulator.Registers.PC.contents = Number.MAX_VALUE;
			//}
		}),
		
		ADD: new Op(this, "ADD", OPERATION_ADD, 2, function(a, b) { 
			var res = a.getA() + b.getB();
			b.set(res & 0xffff);
			if((res & 0xffff0000) > 0)
				this.emulator.Registers.EX.set(0x0001);
			else
				this.emulator.Registers.EX.set(0);
		}),
		
		SUB: new Op(this, "SUB", OPERATION_SUB, 2, function(a, b) { 
			var aVal = a.getA();
			var res = b.getB() - aVal;
			b.set(res & 0xffff);
			if((res) < 0)
				this.emulator.Registers.EX.set(0xffff);
			else
				this.emulator.Registers.EX.set(0);
			
		}),
		
		MUL: new Op(this, "MUL", OPERATION_MUL, 2, function(a, b) { 
			var res = a.getA() * b.getB();
			b.set(res & 0xffff);
			this.emulator.Registers.EX.set((res >> 16) & 0xffff);
		}),
		
		MLI: new Op(this, "MLI", OPERATION_MLI, 2, function(a, b) { 
			var aVal = Utils.to32BitSigned(a.getA()), bVal = Utils.to32BitSigned(b.getB());
			var res = bVal * aVal;
			b.set(Utils.to16BitSigned(res));
			this.emulator.Registers.EX.set((res >> 16) & 0xffff);
		}),
		
		DIV: new Op(this, "DIV", OPERATION_DIV, 3, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(aVal === 0) {
				b.set(0);
				this.emulator.Registers.EX.set(0);
			}
			else {			
				var res = Math.floor(bVal / aVal);
				b.set(res & 0xffff);
				this.emulator.Registers.EX.set(Math.floor(((bVal << 16) / aVal)) & 0xffff);
			}
		}),
		
		DVI: new Op(this, "DVI", OPERATION_DVI, 3, function(a, b) { 
			var aVal = Utils.to32BitSigned(a.getA()), bVal = Utils.to32BitSigned(b.getB());
			if(aVal === 0) {
				b.set(0);
				this.emulator.Registers.EX.set(0);
			}
			else {			
				var res = Utils.roundTowardsZero(bVal / aVal);
				b.set(Utils.to16BitSigned(res));
				this.emulator.Registers.EX.set(Utils.roundTowardsZero(((bVal << 16) / aVal)) & 0xffff);
			}
		}),
		
		MOD: new Op(this, "MOD", OPERATION_MOD, 3, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(aVal === 0)
				b.set(0);
			else 
				b.set(bVal % aVal);
		}),
		
		MDI: new Op(this, "MDI", OPERATION_MDI, 3, function(a, b) { 
			var aVal = Utils.to32BitSigned(a.getA()), bVal = Utils.to32BitSigned(b.getB());
			if(aVal === 0)
				b.set(0);
			else 
				b.set(Utils.to16BitSigned(bVal % aVal));
		}),
		
		AND: new Op(this, "AND", OPERATION_AND, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(bVal & aVal);
		}),
		
		BOR: new Op(this, "BOR", OPERATION_BOR, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(bVal | aVal);
		}),
		
		XOR: new Op(this, "XOR", OPERATION_XOR, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(bVal ^ aVal);
		}),
		
		SHR: new Op(this, "SHR", OPERATION_SHR, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(bVal >>> aVal);
			this.emulator.Registers.EX.set(((bVal << 16 ) >> aVal) & 0xffff);
		}),
		
		ASR: new Op(this, "ASR", OPERATION_ASR, 1, function(a, b) { 
			var aVal = a.getA(), bVal = Utils.to32BitSigned(b.getB());
			b.set((bVal >> aVal) & 0xffff);
			this.emulator.Registers.EX.set(((bVal << 16) >>> aVal) & 0xffff);
		}),
		
		SHL: new Op(this, "SHL", OPERATION_SHL, 1, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set((bVal << aVal) & 0xffff);
			this.emulator.Registers.EX.set(((bVal << aVal) >> 16) & 0xffff);
		}),
		
		IFB: new Op(this, "IFB", OPERATION_IFB, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if((bVal & aVal) != 0) { }
			else this.emulator.skipInstruction();
			
		}),
		
		IFC: new Op(this, "IFC", OPERATION_IFC, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if((bVal & aVal) === 0) { }
			else this.emulator.skipInstruction();
			
		}),
		
		IFE: new Op(this, "IFE", OPERATION_IFE, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(bVal === aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		IFN: new Op(this, "IFN", OPERATION_IFN, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(bVal !== aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		IFG: new Op(this, "IFG", OPERATION_IFG, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(bVal > aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		IFA: new Op(this, "IFA", OPERATION_IFA, 2, function(a, b) { 
			var aVal = Utils.to32BitSigned(a.getA()), bVal = Utils.to32BitSigned(b.getB());
			if(bVal > aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		IFL: new Op(this, "IFL", OPERATION_IFL, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			if(bVal < aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		IFU: new Op(this, "IFU", OPERATION_IFU, 2, function(a, b) { 
			var aVal = Utils.to32BitSigned(a.getA()), bVal = Utils.to32BitSigned(b.getB());
			if(bVal < aVal) { }
			else this.emulator.skipInstruction();
		}),
		
		
		ADX: new Op(this, "ADX", OPERATION_ADX, 3, function(a, b) { 
			var res = a.getA() + b.getB() + this.emulator.Registers.EX.get();
			b.set(res & 0xffff);
			this.emulator.Registers.EX.set(res > 0xffff ? 1 : 0);
		}),
		
		SBX: new Op(this, "SBX", OPERATION_SBX, 3, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			var res = bVal - aVal + this.emulator.Registers.EX.get();
			b.set(res & 0xffff);
			this.emulator.Registers.EX.set(res < 0 ? 0xffff : 0);
		}),
		
		STI: new Op(this, "STI", OPERATION_STI, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(aVal);
			//a.set(bVal);
			this.emulator.Registers.I.set((this.emulator.Registers.I.get() + 1) &  0xffff);
			this.emulator.Registers.J.set((this.emulator.Registers.J.get() + 1) &  0xffff);
		}),
		
		STD: new Op(this, "STD", OPERATION_STD, 2, function(a, b) { 
			var aVal = a.getA(), bVal = b.getB();
			b.set(aVal);
			//a.set(bVal);
			this.emulator.Registers.I.set((this.emulator.Registers.I.get() - 1) &  0xffff);
			this.emulator.Registers.J.set((this.emulator.Registers.J.get() - 1) &  0xffff);
		}),
		
		JSR: new Op(this, "JSR", OPERATION_JSR, 3, function(a) { 
			var aVal = a.getA();
			this.emulator.Registers.SP.push(this.emulator.Registers.PC.get());
			this.emulator.Registers.PC.set(aVal);
		}, this.SpecialOpSet),
		
		INT: new Op(this, "INT", OPERATION_INT, 4, function(a) { 
			var aVal = a.getA();
			this.emulator.interruptQueue.push(aVal);
		}, this.SpecialOpSet),
		
		IAG: new Op(this, "IAG", OPERATION_IAG, 1, function(a) { 
			var aVal = a.getA();
			a.set(this.emulator.Registers.IA.get());
		}, this.SpecialOpSet),
		
		IAS: new Op(this, "IAS", OPERATION_IAS, 1, function(a) { 
			this.emulator.Registers.IA.set(a.getA());
		}, this.SpecialOpSet),
		
		RFI: new Op(this, "RFI", OPERATION_RFI, 3, function(a) { 
			var aVal = a.getA();
			this.emulator.interruptQueueingEnabled = false;
			this.emulator.Registers.A.set(this.emulator.Registers.SP.pop());
			this.emulator.Registers.PC.set(this.emulator.Registers.SP.pop());
			
		}, this.SpecialOpSet),
		
		IAQ: new Op(this, "IAQ", OPERATION_IAQ, 2, function(a) { 
			var aVal = a.getA();
			if(aVal === 0)
				this.emulator.interruptQueueingEnabled = false;
			else
				this.emulator.interruptQueueingEnabled = true;
		}, this.SpecialOpSet),
		
		HWN: new Op(this, "HWN", OPERATION_HWN, 2, function(a) { 
			var aVal = a.getA();
			a.set(this.emulator.devices.length);
		}, this.SpecialOpSet),
		
		HWQ: new Op(this, "HWQ", OPERATION_HWQ, 4, function(a) { 
			var dev = this.emulator.devices[a.getA()];
			if(dev) {
				this.emulator.Registers.A.set(dev.id & 0xffff);
				this.emulator.Registers.B.set((dev.id >> 16) & 0xffff);
				this.emulator.Registers.C.set(dev.version & 0xffff);
				this.emulator.Registers.X.set(dev.manufacturer & 0xffff);
				this.emulator.Registers.Y.set((dev.manufacturer >> 16) & 0xffff);
			}
			
		}, this.SpecialOpSet),
		
		HWI: new Op(this, "HWI", OPERATION_HWI, 4, function(a) { 
			var dev = this.emulator.devices[a.getA()];
			if(dev)
				dev.interrupt();
		}, this.SpecialOpSet),
	};


	this.boot= function() {
		console.log("--- DCPU-16 Emulator ---");
	
		this.program =  null;
		this.PC.set(0);
		this.CPU_CYCLE = 0;
		this.RAM = new Array(0x10000);
		this.asyncSteps = 1;
		
		this.interruptQueueingEnabled = false;
		this.interruptQueue = [];
		
		for(var r in this.Registers) {
			this.Registers[r].set(0);
		}
		//this.Registers.SP.set(0xffff);
		
		for(var i = 0; i < this.devices.length; i++) {
			this.devices[i].init();
		}
	};
	
	this.reboot= function() { this.boot(); };

	/**
	 * Run the program specified.  
	 * @ _program the program you want to run, as an array of bytes.
	 */
	this.run = function(_program) {
		this.program = _program;
		
		console.log("Running program (" + this.program.length + " words)" );
		
		// load program into RAM
		for(var i = 0; i < this.program.length; i++) {
			this.RAM[i] = this.program[i];
		}
		
		if(!this.async) {
			while(this.step()) { }
			this.exit();
		}
		else
			this.stepAsync();
		
	};
	
	this.step = function() {
		if(this.PC.get() < this.program.length) {
			this.nextInstruction();
			
			if(this.attachedDebugger && this.paused)
				this.attachedDebugger.onStep(this.PC.get());
			
			// process one interrupt if we have one
			if(this.interruptQueueingEnabled == false && this.interruptQueue.length > 0) {
				this.processInterrupt(this.interruptQueue.pop());
			}
			
			return true;
		}
		else return false;
	};
	
	var _this = this;
	this.paused = false;
	
	this.runAsync = function() {
		while(true) {
			if(Math.floor(_this.CPU_CYCLE / _this.currentSpeed.delayFrequency) > _this.asyncSteps) {
				_this.asyncSteps++;
				setTimeout(_this.runAsync, _this.currentSpeed.delayTime);
				break;
			}
			else {
				if(!_this.stepAsync())
					break;
			}
		}
	}
	
	this.stepAsync = function() {
		if(this.program == null)	// break if we have rebooted
			return false;
		
		if(this.paused) {
			if(this.attachedDebugger) {
				this.attachedDebugger.onPaused(this.PC.get());
				return false;
			}
		}
		else {
			if(this.attachedDebugger) {
				if(this.attachedDebugger.breakpoints[""+this.PC.get()]) {
					this.paused = true;
					this.attachedDebugger.onPaused(this.PC.get());
					return false;
				}
			}
		
			var res = this.step();
			if(!res)
				this.exit();
			return res;
			
		}	
	};
	
	this.nextInstruction = function() {
		var data = this.program[this.PC.inc()];
		var instruction = Utils.parseInstruction(data);
		var op; 
		if(instruction.opcode === 0) {
			instruction = Utils.parseSpecialInstruction(data);
			op = this.SpecialOpSet[instruction.opcode];
		}
		else
			op = this.OpSet[instruction.opcode];
		
		
		
		if(!op) {
			var err = "Invalid opcode " + instruction.opcode;
			console.warn(err);
			throw err;
		}
		
		if(this.verbose) {
			console.log(
				Utils.hex(this.Registers.PC.get()) + "\t" + 
				op.name + "\t(" + 
				Utils.hex(instruction.a) + ",\t" + 
				Utils.hex(instruction.b) + ")"
			);
		}
		op.exec(instruction.a, instruction.b);
		
		if(this.attachedDebugger)
			this.attachedDebugger.onInstruction(this.PC.get());
	};
	
	this.nextWord = function() {
		this.CPU_CYCLE++;
		return this.program[this.Registers.PC.inc()];
	};
	
	this.getParamValue = function(val) {
		return this.Values[new String(val)];
	};
	
	this.skipInstruction = function() {
		var instruction = Utils.parseInstruction(this.program[this.PC.inc()]);
		this.CPU_CYCLE++;
		
		// skip "next word" values by invoking get() on the params
		this.getParamValue(instruction.a).get();
		if(instruction.opcode != 0)
			this.getParamValue(instruction.b).get();
		
		if(instruction.opcode >= OPERATION_IFB && instruction.opcode <= OPERATION_IFU) {
			// if we have skipped a conditional instruction, skip additional instruction 
			// at cost of an additional cycle.  continue until a non-conditional instruction
			// has been skipped
			this.skipInstruction();
		}
		
	};
	
	this.processInterrupt = function(message) {
		if(this.Registers.IA.get() != 0) {
			this.interruptQueueingEnabled = true;
			this.Registers.SP.push(this.Registers.PC.get());	// push PC onto the stack
			this.Registers.SP.push(this.Registers.A.get());		// followed by pusing A to the stack
			this.Registers.PC.set(this.Registers.IA.get());		// set PC to IA
			this.Registers.A.set(message);						// set A to the interrupt message
		}
		else {
		}
	};
	
	this.interrupt = function(message) {
		this.interruptQueue.push(message);
		
		if(this.interruptQueue.length > 256) {
			// catch fire?
			console.warn("DCUP-16 is on fire");
			throw "Too many interrupts";
		}
	};
	
	this.exit = function() {
		console.log("Program completed in " + this.CPU_CYCLE + " cycles");
		
		if(this.attachedDebugger)
			this.attachedDebugger.onExit();
	};
	
	this.attachedDebugger = null;
	this.attachDebugger = function(_debugger) {
		this.attachedDebugger = _debugger;
	};
	
	this.setSpeed = function(newSpeed) {
		var speed = Speeds[newSpeed];
		if(!speed) { 
			console.log("invalid speed " + newSpeed); 
			return; 
		}
		emulator.currentSpeed = speed;
		emulator.asyncSteps = emulator.CPU_CYCLE / emulator.currentSpeed.delayFrequency;
	}
	
	this.devices = [];
	
	this.boot();
};

// generic device used for unit tests
function Device(_id, _version, _manufacturer, _emulator) {
	this.id = _id;
	this.version = _version;
	this.manufacturer = _manufacturer;
	this.emulator = _emulator;
};
Device.prototype.interrupt = function() { };
Device.prototype.init = function() { };


function Debugger(_emulator) {
	if(!_emulator.async) throw "Emulator must be in asynchronous mode to use a debugger with it.";
	this.emulator = _emulator;
	this.breakpoints = {};
	
	this.emulator.attachDebugger(this);
}
Debugger.prototype.getBreakpoints = function() {
	return this.breakpoints;
};
Debugger.prototype.toggleBreakpoint = function(location, lineNumber) {
	location += "";	// convert to string
	if(this.breakpoints[location])
		delete this.breakpoints[location];
	else
		this.breakpoints[location] = lineNumber;
};
Debugger.prototype.run = function() { 
	if(this.emulator.paused) {
		this.emulator.paused = false;
		this.emulator.runAsync();
	}
};
Debugger.prototype.step = function() { 
	if(this.emulator.paused) {
		if(!this.emulator.step())
			this.emulator.exit();
	}
};
Debugger.prototype.pause = function() { 
	this.emulator.paused = true;
};

// events
Debugger.prototype.onStep = function(location) { };
Debugger.prototype.onPaused = function(location) { };
Debugger.prototype.onInstruction = function(location) { };
Debugger.prototype.onExit = function() { };


