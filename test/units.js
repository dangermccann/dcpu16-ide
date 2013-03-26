function units() {

	module("opcodes Module");
	
	test("SET Bad Programs", function() { 
		var e = new Emulator();
		e.async = false;
		
		raises(function() {
			e.run([ 0x18 ]);
		}, "Test bad op code");
		
	});
	
	test("SET Test", function() { 
		//expect(8);
		
		var program = [
			// register tests
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_10, REGISTER_B),
			Utils.makeInstruction(OPERATION_MUL, Literals.L_10, REGISTER_B),
			Utils.makeInstruction(OPERATION_SET, REGISTER_B, REGISTER_C),
			
			// register + RAM tests
			Utils.makeInstruction(OPERATION_SET, Literals.L_3, REGISTER_B + Values.REGISTER_VALUE_OFFSET),
			Utils.makeInstruction(OPERATION_SET, REGISTER_B + Values.REGISTER_VALUE_OFFSET, REGISTER_I),
			
			// register + RAM + next word tests
			Utils.makeInstruction(OPERATION_SET, Literals.L_4, REGISTER_A + Values.REGISTER_NEXT_WORD_OFFSET), 0x03,
			Utils.makeInstruction(OPERATION_SET, REGISTER_A + Values.REGISTER_NEXT_WORD_OFFSET, REGISTER_J), 0x03,
			
			// next word tests
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x2222,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_VALUE, REGISTER_Y), 0x64,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, Values.NEXT_WORD_VALUE), 0x3333, 0x0b
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.A.get(), 2, "Register A set correctly");
		equal(e.Registers.B.get(), 100, "Register B set correctly");
		equal(e.Registers.C.get(), 100, "Register C set to value of B");
		
		equal(e.RAM[0x64], 3, "RAM at location 100 set to value of 3");
		equal(e.Registers.I.get(), e.RAM[0x64], "Register I set to RAM at location 100");
		
		equal(e.RAM[0x05], 4, "RAM at location 5 set to value of 4");
		equal(e.Registers.J.get(), e.RAM[0x05], "Register J set to RAM at location 5");
		
		equal(e.Registers.X.get(), 0x2222, "Register X set to NEXT_WORD_LITERAL");
		equal(e.Registers.Y.get(), 3, "Register Y set to NEXT_WORD_VALUE");
		equal(e.RAM[0x0b], 0x3333, "RAM at NEXT_WORD_VALUE set to NEXT_WORD_LITERAL");
		
	});
	
	test("SP Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Literals.L_5, Values.SP_OFFSET),		// push 5
			Utils.makeInstruction(OPERATION_SET, Literals.L_4, Values.SP_OFFSET),		// push 4
			Utils.makeInstruction(OPERATION_SET, Literals.L_3, Values.SP_OFFSET),		// push 3
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, Values.SP_OFFSET),		// push 2
			Utils.makeInstruction(OPERATION_SET, Literals.L_1, Values.SP_OFFSET),		// push 1
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, Values.SP_OFFSET),		// push 0
			Utils.makeInstruction(OPERATION_SET, Literals["L_-1"], Values.SP_OFFSET),	// push -1
			
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET, REGISTER_A),		// pop -1
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET+1, REGISTER_B),		// peak 0
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET+2, REGISTER_C),	0x3,// pick 3
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET, REGISTER_I),		// pop 0
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET, REGISTER_J),		// pop 1
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(Utils.to32BitSigned(e.Registers.A.get()), -1, "Register A is -1");
		equal(e.Registers.B.get(), 0, "Register B is 0");
		equal(e.Registers.C.get(), 3, "Register C is 3");
		equal(e.Registers.I.get(), 0, "Register I is 0");
		equal(e.Registers.J.get(), 1, "Register J is 1");
		equal(e.Registers.SP.get(), 0xfffc, "Register SP is 0xfffc");
	});
	
	
	
	test("ADD Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_4, REGISTER_B),
			Utils.makeInstruction(OPERATION_ADD, REGISTER_A, REGISTER_B),
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x8800,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0x8801,
			Utils.makeInstruction(OPERATION_ADD, REGISTER_X, REGISTER_Y)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 6, "Register B is sum of A and B");
		equal(e.Registers.Y.get(), 0x1001, "Register Y is sum of 0x8800 and 0x8801");
		equal(e.Registers.EX.get(), 1, "Register EX shows overflow");
	});
	
	
	test("SUB Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_4, REGISTER_B),
			Utils.makeInstruction(OPERATION_SUB, REGISTER_A, REGISTER_B),
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x8801,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0x4800,
			Utils.makeInstruction(OPERATION_SUB, REGISTER_X, REGISTER_Y)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 2, "Register B is difference of B and A");
		equal(e.Registers.Y.get(), 0xbfff, "Register Y is difference of 0x4800 and 0x8801");
		equal(e.Registers.EX.get(), 0xffff, "Register EX shows overflow");
	});
	
	test("MUL Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_4, REGISTER_B),
			Utils.makeInstruction(OPERATION_MUL, REGISTER_A, REGISTER_B),
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x1010,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0x0408,
			Utils.makeInstruction(OPERATION_MUL, REGISTER_X, REGISTER_Y)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 8, "Register B is product of B and A");
		equal(e.Registers.Y.get(), 0xc080, "Register Y is product of 0x1010 and 0x0400");
		equal(e.Registers.EX.get(), 0x0040, "Register EX shows overflow");
	});
	
	test("MLI Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0xFFFB,	// -5
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x02,
			Utils.makeInstruction(OPERATION_MLI, REGISTER_A, REGISTER_B),							// B = -10
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0xD8F0,	// -10,000
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0xEB20,	// -5,344
			Utils.makeInstruction(OPERATION_MLI, REGISTER_X, REGISTER_Y)							// X = 0x6E00, EX=0x32F
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xFFF6, "Register B is product of B and A");
		equal(e.Registers.Y.get(),  0x6E00, "Register Y is product of 0xD8F0 and 0xEB20");
		equal(e.Registers.EX.get(), 0x32F, "Register EX shows overflow");
	});
	
	test("DIV Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x03,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x2c,		// 44
			Utils.makeInstruction(OPERATION_DIV, REGISTER_A, REGISTER_B),							// B = 14
			Utils.makeInstruction(OPERATION_SET, REGISTER_EX, REGISTER_I),
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x0332,	
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0xF445,	// 
			Utils.makeInstruction(OPERATION_DIV, REGISTER_X, REGISTER_Y)							// X = 0x4c, EX=0x723a
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x0e, "Register B is quotient of B and A");
		equal(e.Registers.I.get(), 0xAAAA, "Register I shows overflow from first operation");
		equal(e.Registers.Y.get(),  0x4c, "Register Y is quotient of 0xD8F0 and 0xEB20");
		//equal(e.Registers.EX.get(), 0x723a, "Register EX shows overflow");
	});
	
	test("DVI Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0xFFFD,	// -3
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x2c,		// 44
			Utils.makeInstruction(OPERATION_DVI, REGISTER_A, REGISTER_B),							// B = -14
			Utils.makeInstruction(OPERATION_SET, REGISTER_EX, REGISTER_I),
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x0332,	
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0xF445,	// 
			Utils.makeInstruction(OPERATION_DVI, REGISTER_X, REGISTER_Y)							// X = 0x4c, EX=0x723a
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xFFF2, "Register B is quotient of B and A");
		equal(e.Registers.I.get(), 0x5556, "Register I shows overflow from first operation");
		equal(e.Registers.Y.get(),  0xFFFD, "Register Y is quotient of 0xD8F0 and 0xEB20");
		//equal(e.Registers.EX.get(), 0x723a, "Register EX shows overflow");
	});
	
	test("MOD Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,		
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x0f,		// 15
			Utils.makeInstruction(OPERATION_MOD, REGISTER_A, REGISTER_B),							// B = 3
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0x13,		// 
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0x3452,	// 
			Utils.makeInstruction(OPERATION_MOD, REGISTER_X, REGISTER_Y)							// X = 0x12
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 3, "Register B is result of B % A");
		equal(e.Registers.Y.get(),  0x12, "Register Y 0x3452 % 0x13");
	});
	
	test("MDI Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x10,		// -7	
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xFFF9,	// 16
			Utils.makeInstruction(OPERATION_MDI, REGISTER_A, REGISTER_B),							// B = -7
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xFFF9, "Register B is result of B % A");
	});
	
	test("AND Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0xff44,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x44ff,
			Utils.makeInstruction(OPERATION_AND, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x4444, "Register B is result of B & A");
	});
	
	test("BOR Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x4444,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x3333,
			Utils.makeInstruction(OPERATION_BOR, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x7777, "Register B is result of B | A");
	});
	
	test("XOR Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x3434,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x1111,
			Utils.makeInstruction(OPERATION_XOR, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x2525, "Register B is result of B ^ A");
	});
	
	test("SHR Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xFF11,
			Utils.makeInstruction(OPERATION_SHR, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x0FF1, "Register B is result of B >>> A");
		equal(e.Registers.EX.get(), 0x1000, "Register EX shows overflow");
	});
	
	test("ASR Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xFF11,
			Utils.makeInstruction(OPERATION_ASR, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xFFF1, "Register B is result of B >> A");
		equal(e.Registers.EX.get(), 0x1000, "Register EX shows overflow");
	});
	
	test("SHL Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xFF11,
			Utils.makeInstruction(OPERATION_SHL, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xF110, "Register B is result of B << A");
		equal(e.Registers.EX.get(), 0x0f, "Register EX shows overflow");
	});
	
	// branching operations
	test("IFB Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x01,
			Utils.makeInstruction(OPERATION_IFB, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
			
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xffee, "B is 0xffee, instruction was skipped");
	});
	
	test("IFC Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_IFC, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
			
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xffee, "B is 0xffee, instruction was skipped");
	});
	
	test("IFE Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_X),
			Utils.makeInstruction(OPERATION_IFE, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B),
			Utils.makeInstruction(OPERATION_SET, Literals.L_1, REGISTER_I),
			Utils.makeInstruction(OPERATION_IFE, Literals.L_4, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_2, REGISTER_J),
			Utils.makeInstruction(OPERATION_IFE, Literals.L_5, REGISTER_A),
			Utils.makeInstruction(OPERATION_IFE, Literals.L_6, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_7, REGISTER_X)
			
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xffee, "B is 0xffee, instruction was skipped");
		equal(e.Registers.I.get(), 1, "I is 1, instruction was not skipped");
		equal(e.Registers.J.get(), 2, "J is 2, instruction was not skipped");
		equal(e.Registers.X.get(), 0, "X is 0, instruction was skipped");
	});
	
	test("IFN Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0xffee,
			Utils.makeInstruction(OPERATION_IFN, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B),
			Utils.makeInstruction(OPERATION_IFN, Literals.L_5, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_7, REGISTER_J)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xffee, "B is 0xffee, instruction was skipped");
		equal(e.Registers.J.get(), 7, "J is 7, instruction was not skipped");
	});
	
	test("IFG Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_IFG, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0xffee, "B is 0xffee, instruction was skipped");
	});
	
	test("IFA Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0xffee,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_IFA, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0, "B is 0, instruction was not skipped");
	});
	
	test("IFL Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x03,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_IFL, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x03, "B is 0x03, instruction was skipped");
	});
	
	test("IFU Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0xff43,
			Utils.makeInstruction(OPERATION_IFU, REGISTER_B, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_B)
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0, "B is 0, instruction was not skipped");
	});
	
	test("ADX Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x05,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_EX), 0x06,
			Utils.makeInstruction(OPERATION_ADX, REGISTER_A, REGISTER_B),						
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0xee55,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0xff44,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_EX), 0x06,
			Utils.makeInstruction(OPERATION_ADX, REGISTER_X, REGISTER_Y),					
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x0f, "Register B is result of A + B + EX");
		equal(e.Registers.Y.get(), 0xED9F, "Register Y is result of X + Y + EX");
		equal(e.Registers.EX.get(), 0x01, "Register EX shows overflow");
	});
	
	test("SBX Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x05,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_EX), 0x06,
			Utils.makeInstruction(OPERATION_SBX, REGISTER_A, REGISTER_B),						
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_X), 0xff44,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_Y), 0xee55,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_EX), 0x06,
			Utils.makeInstruction(OPERATION_SBX, REGISTER_X, REGISTER_Y),					
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x07, "Register B is result of B - A + EX");
		equal(e.Registers.Y.get(), 0xEF17, "Register Y is result of Y - X + EX");
		equal(e.Registers.EX.get(), 0xffff, "Register EX shows underflow");
	});
	
	test("STI Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x05,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_I), 0x06,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_J), 0x07,
			Utils.makeInstruction(OPERATION_STI, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x04, "Register B is set to A");
		equal(e.Registers.I.get(), 0x07, "Register I has been incremented");
		equal(e.Registers.J.get(), 0x08, "Register J has been incremented");
	});
	
	test("STD Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x05,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_I), 0x06,
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_J), 0x00,
			Utils.makeInstruction(OPERATION_STD, REGISTER_A, REGISTER_B),						
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.B.get(), 0x04, "Register B is set to A");
		equal(e.Registers.I.get(), 0x05, "Register I has been decremented");
		equal(e.Registers.J.get(), 0xffff, "Register J has been decremented");
	});
	
	test("JSR Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x04,
			Utils.makeSpecialInstruction(OPERATION_JSR, Values.NEXT_WORD_LITERAL), 0x08,		//  jump to 0x8
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x05,
			Utils.makeInstruction(OPERATION_IFE, Literals.L_5, REGISTER_A),
			Utils.makeInstruction(OPERATION_SET, Literals.L_16, REGISTER_PC),					// exit
			
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_A), 0x03,	// 0x8
			Utils.makeInstruction(OPERATION_SET, Values.SP_OFFSET, REGISTER_PC)				// return
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.A.get(), 0x05, "Register A is set to 5");
	});
	
	test("Interrupt Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeInstruction(OPERATION_SET, Values.NEXT_WORD_LITERAL, REGISTER_B), 0x06,
			Utils.makeSpecialInstruction(OPERATION_IAS, REGISTER_B), 
			Utils.makeSpecialInstruction(OPERATION_INT, Values.NEXT_WORD_LITERAL), 0x08,
			Utils.makeInstruction(OPERATION_SET, Literals.L_16, REGISTER_PC),				// exit
			Utils.makeInstruction(OPERATION_SET, Literals.L_0, REGISTER_C),				// 0x06
			Utils.makeSpecialInstruction(OPERATION_IAG, REGISTER_Y), 						// Y = 6
			Utils.makeSpecialInstruction(OPERATION_IAS, REGISTER_C), 						// IA = 0
			Utils.makeInstruction(OPERATION_SET, REGISTER_A, REGISTER_X),					// X = 8 (INT message)
			Utils.makeSpecialInstruction(OPERATION_RFI, Literals.L_0),						// return
			
		];
		
		var e = new Emulator();
		e.async = false;
		e.run(program);
		
		equal(e.Registers.IA.get(), 0x00, "Register IA is set to 0");
		equal(e.Registers.X.get(), 0x08, "Register X is set to 8");
		equal(e.Registers.Y.get(), 0x06, "Register Y is set to 6");
	});
	
	test("Hardware Test", function() { 
		//expect(1);
		
		var program = [
			Utils.makeSpecialInstruction(OPERATION_HWN, REGISTER_I), 
			Utils.makeSpecialInstruction(OPERATION_HWQ, Literals.L_0), 
			Utils.makeSpecialInstruction(OPERATION_HWI, Literals.L_0), 
		];
		
		var e = new Emulator();
		e.async = false;
		e.devices.push(new Device(0xdeadbeef, 0x21, 0xfeeddeee));
		e.run(program);
		
		equal(e.Registers.I.get(), 1, "Register I is set to 1");
		equal(e.Registers.A.get(), 0xbeef, "Register A is set to 0xbeef");
		equal(e.Registers.B.get(), 0xdead, "Register B is set to 0xdead");
		equal(e.Registers.C.get(), 0x21, "Register C is set to 0x21");
		equal(e.Registers.X.get(), 0xdeee, "Register X is set to 0xdeee");
		equal(e.Registers.Y.get(), 0xfeed, "Register Y is set to 0xfeed");
		
	});
	
	module("Tokenizer Module");
	
	test("Basic Tokens Test", function() { 
		var input = "; some comment for the code \n" +
					 "ADD A, 0x1234\n" +
					 ":my_label dat 1234 0x9876\n" +
					 "  SUB [ 4 * 4 ] ; do some math \n" +
					 "JSR imy_label\n" +
					 "dat \"my string\", 0\n" +
					 "SET B, 0b01101";
		
		var lines = Tokenizer.tokenize(input).lines;
		equal(lines.length, 7, "7 lines tokenized");
		equal(lines[0][0].type, "comment", "Line 1 comment");
		equal(lines[1][0].type, "command", "Line 2 command");
		equal(lines[1][2].type, "register", "Line 2 register");
		equal(lines[1][3].type, "comma", "Line 2 comma");
		equal(lines[1][5].type, "hexidecimal", "Line 2 hexidecimal");
		equal(lines[2][0].type, "label_def", "Line 3 label_def");
		equal(lines[2][2].type, "reserved_word", "Line 3 reserved_word");
		equal(lines[2][4].type, "decimal", "Line 3 decmial");
		equal(lines[3][1].type, "command", "Line 4 command");
		equal(lines[3][3].type, "open_bracket", "Line 4 open_bracket");
		equal(lines[3][7].type, "operator", "Line 4 operator");
		equal(lines[3][11].type, "close_bracket", "Line 4 close_bracket");
		equal(lines[3][13].type, "comment", "Line 4 comment");
		equal(lines[4][2].type, "label_ref", "Line 5 label_ref");
		equal(lines[5][2].type, "string", "Line 6 string");
		equal(lines[5][3].type, "comma", "Line 6 comma");
		equal(lines[6][5].type, "binary", "Line 7 binary");
		
	});
	
	test("Invalid Token Test", function() { 
		equal(Tokenizer.tokenize("(*&^%$#HDBGFDAS").errors.length, 1);
	});
	
	module("Assembler Module");
	
	test("Expression Evaluaton Test", function() { 
		var input, result;
		
		input =  "1 + 1";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 2);
		
		input =  "2 + 2 * 5";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 12);
		
		input =  "25 - 2 - 5 + 3 * 3";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 27);
		
		input =  "25 / 5 + 4*2";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 13);
		
		input =  "199 % 17";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 12);
		
		input =  "3 * (14-2) * 2";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 72);
		
		input =  "2 * (6 + 3 + (5%3+1))";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 24);
		
		input =  "0x10 | 0x01";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0x11);
		
		input =  "0xee & 0x77";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0x66);
		
		input =  "0xee ^ 0x77";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0x99);
		
		input =  "0xee >> 3";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0x1D);
		
		input =  "0xee << 3";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0x770);
		
		input =  "0b0011 + 0b1100";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0xf);
		
		input =  "-2";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, Utils.to16BitSigned(-2));
		
		input =  "~1";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 0xfffe);
		
		input =  "5^2";
		result = Assembler.evaluateExpression(Tokenizer.tokenize(input).lines[0], 0, 1);
		equal(result[0].lexeme, 7);
	});
	
	
	
	test("Assembly Test 1", function() { 
		var input = "; test app #1\n" + 
					 "SET A, B\n" + 
					 "ADD [I], [J]\n" + 
					 "SUB C, 0x5\n" + 
					 "MLI X, 0x555\n" + 
					 "DIV [Y+3], [Z]\n" + 
					 "MOD [Z+0x555], [A+0x111]\n" +
					 "SHR I, 1+2+3+4\n" + 
					 "SHL J, 5*99-2\n";
		
		var output = [ 0x0401, 0x3dc2, 0x9843, 0x7c65, 
						0x0555, 0x3686, 0x0003, 0x42a8, 
						0x0111, 0x0555, 0xaccd, 0x7cef, 
						0x01ed ];
						
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Assembly Test 2", function() { 
		var input = "; test app #2\n" + 
					 "SET PUSH, A\n" +
					 "SET J, PUSH\n" +
					 "ADD Z, PEEK\n" +
					 ":label1 ; asdf \n" +
					 "SET PUSH, A\n" +
					 "SET PC, 1\n" +
					 "IFE B, [3+A]\n" +
					 "SET PC, label1\n";
		
		var output = [ 0x0301, 0x60e1, 0x64a2, 0x0301, 
						0x8b81, 0x4032, 0x0003, 0x7f81, 
						0x0003   ];
						
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Assembly Test 3 (stack)", function() { 
		var input = "; test app #3\n" + 
					 "SET PUSH, 1\n" +
					 "SET A, POP\n" +
					 "ADD Z, PEEK\n" +
					 "ADD Y, PICK\n" +
					 "DAT 1\n";
		
		var output = [ 0x8b01, 0x6001, 0x64a2, 0x6882, 0x0001 ];
						
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	module("Preprocessor Module");
	test("Test Define", function() { 
		var input = ".define ABC 123\n" +
					"SET A, [ABC]\n" +
					".define ABC 456\n" +
					"SET B, [ABC]\n";
		
		var output = [ 0x7801, 0x007b, 0x7821, 0x01c8 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test Undefine", function() { 
		var input = ".define ABC 123\n" +
					".undef ABC\n" +
					".ifdef ABC\n" +
					"SET A, [ABC]\n" +
					".end\n" +
					".define ABC 456\n" +
					"DAT ABC\n";
		
		var output = [ 0x01c8 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test Expressions", function() { 
		var input = ".define ABC 8\n" +
					".define XYZ 5\n" +
					".define TTT (ABC+4) << 2 + XYZ\n" +
					"DAT TTT\n";
		
		var output = [ 0x0600 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test Conditionals 1", function() { 
		var input = ".define ABC 0\n" +
					".define XYZ 1\n" +
					".if ABC\n" +
					".define TTT 1\n" +
					".elseif XYZ\n" +
					".define TTT 2\n" +
					".else\n" +
					".define TTT 3\n" +
					".end\n" +
					"DAT TTT\n";
		
		var output = [ 0x0002 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test Conditionals 2", function() { 
		var input = ".define ABC 0\n" +
					".define XYZ 0\n" +
					".if ABC\n" +
					".define TTT 1\n" +
					".elseif XYZ\n" +
					".define TTT 2\n" +
					".else\n" +
					".define TTT 3\n" +
					".end\n" +
					"DAT TTT\n";
		
		var output = [ 0x0003 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test .org", function() { 
		var input = ".org 4\n" +
					"DAT 1\n";
		var output = [ 0x0000, 0x0000, 0x0000, 0x0000, 0x0001 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test .dw", function() { 
		var input = ".dw 1, 2, 3, 4\n"
		var output = [ 0x0001, 0x0002, 0x0003, 0x0004 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test .dp", function() { 
		var input = ".dp 1, 2, 3, 4\n"
		var output = [ 0x0102, 0x0304 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	test("Test .fill", function() { 
		var input = ".fill 4, 2\n" +
					".fill 2\n";
		var output = [ 0x0002, 0x0002, 0x0002, 0x0002, 0x0000, 0x0000 ];
		var actual = Assembler.compileSource(input).bytecode();
		ok(compareArrays(output, actual), "Output is correct");
	});
	
	
	module("Hardware Module");
	test("HMD2043 test", function() { 
		expect(1);
		stop();
	
		var randomData = new Array(2048);
		for(var i = 0; i < randomData.length; i++) {
			randomData[i] = Math.floor(Math.random() * 0xffff);
		}
	
		var e = new Emulator();		
		e.async = false;
		var drive = new HMD2043(e);
		e.devices.push(drive);
		e.reboot();
		drive.insertBlankMedia("unit test");
		
		
		var offset = 0x100;
		for(var i = 0; i < randomData.length; i++) {
			e.RAM[offset + i] = randomData[i];
		}
		
		drive.write(550, randomData.length / drive.media.wordsPerSector, offset, function() {
			for(var i = 0; i < randomData.length; i++) {
				e.RAM[offset + i] = 0;
			}
		
			drive.read(550, randomData.length / drive.media.wordsPerSector, offset, function() {
				for(var i = 0; i < randomData.length; i++) {
					if(e.RAM[offset + i] != randomData[i]) {
						ok(false, "The data was not the same after reading");
						start();
						return;
					}
				}
				
				drive.media.erase();
				
				ok(true, "The data was written and read correctly");
				start();
			});
		});
	});
	
	
	
	function compareArrays(ary1, ary2) {
		if(ary1.length != ary2.length)
			return false;
		for(var i = 0; i < ary1.length; i++) {
			if((ary1[i] || 0) !== (ary2[i] || 0))
				return false;
		}
		return true;
	}
};


