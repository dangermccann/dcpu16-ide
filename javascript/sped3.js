// http://dcpu.com/3d-vector-display/
// http://0x10cwiki.com/wiki/SPED-3_Suspended_Particle_Exciter_Display

function SPED3(_emulator) {
	this.id = 0x42babf3c;
	this.version = 0x0003 ;
	this.manufacturer = 0x1eb37e91;
	this.emulator = _emulator;
	this.zoom = 2;
	this.drawInterval = 0;
	this.initCanvas();
}

SPED3.prototype.init = function() { 
	this.memoryOffset = 0;
	this.vertexCount = 0;
	this.targetRotation = 0;
	this.currentRotation = 0;
	this.currentState = SPED3.StateCodes.STATE_NO_DATA;
	this.lastError = SPED3.ErrorCodes.ERROR_NONE;
	
	// define variables here just for clarity
	this.gl = null;
	this.shaderProgram = null;
	this.vertexPositionBuffer = null;
	this.vertexColorBuffer = null;
	
	this.mvMatrix = mat4.create();	// model-view matrix 
	this.pMatrix  = mat4.create(); // projection matrix
	
	
	this.initGL();
	this.initShaders();
	
	if(this.drawInterval != 0)
		clearInterval(this.drawInterval);
		
	var _this = this;
	setTimeout(function() { 
		_this.drawInterval = setInterval(function() { _this.draw() }, 100);
	}, 1000);
}

SPED3.prototype.initCanvas = function() { 
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.zoom * 128;
	this.canvas.height = this.zoom * 96;
	this.canvas.style.backgroundColor = "#000000";
	this.canvas.className = "sped3";
	this.canvas.title="Suspended Particle Exciter Display";
	document.body.appendChild(this.canvas);
}

SPED3.prototype.initGL = function() {
	try {
		this.gl = this.canvas.getContext("experimental-webgl");
		this.gl.viewportWidth = this.canvas.width;
		this.gl.viewportHeight = this.canvas.height;
	} catch (e) {
		if (!this.gl) {
			console.log("Could not initialise WebGL, sorry :-(");
			this.currentState = SPED3.StateCodes.ERROR_BROKEN;
			return;
		}
	}
	
	this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
}

SPED3.prototype.getShader = function(id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = this.gl.createShader(this.gl.VERTEX_SHADER);
	} else {
		return null;
	}

	this.gl.shaderSource(shader, str);
	this.gl.compileShader(shader);

	if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
		console.log(this.gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

SPED3.prototype.initShaders = function() {
	var fragmentShader = this.getShader("shader-fs");
	var vertexShader = this.getShader("shader-vs");

	this.shaderProgram = this.gl.createProgram();
	this.gl.attachShader(this.shaderProgram, vertexShader);
	this.gl.attachShader(this.shaderProgram, fragmentShader);
	this.gl.linkProgram(this.shaderProgram);

	if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
		console.log("Could not initialise shaders");
		this.currentState = SPED3.StateCodes.ERROR_BROKEN;
		return;
	}

	this.gl.useProgram(this.shaderProgram);

	// define shader attributes
	this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
	this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
	
	this.shaderProgram.vertexColorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexColor");
	this.gl.enableVertexAttribArray(this.shaderProgram.vertexColorAttribute);

	// define shader uniforms
	this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
	this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
}

SPED3.prototype.buildBuffers = function() { 
	if(this.memoryOffset > 0 && this.vertexCount > 0) {
		if(this.currentState == SPED3.StateCodes.STATE_NO_DATA)
			this.currentState = SPED3.StateCodes.STATE_RUNNING;
		
		// decode vertex data
		var verticies = [];
		var colors = [];
		for(var i = 0; i < this.vertexCount; i++) {
			var word1 = this.emulator.RAM[this.memoryOffset + 2*i];
			var word2 = this.emulator.RAM[this.memoryOffset + 2*i + 1];
			var vertexData = this.decodeVertex(word1, word2);
			verticies = verticies.concat(vertexData.position);
			colors = colors.concat(vertexData.color);
		}
		
		var resolution = 1;
		var tmpVerticies = [];
		var tmpColors = [];
		var vertexAlphaFactor = (129-this.vertexCount) / 128;
		for(var i = 0; i < this.vertexCount; i++) {
			for(var j = 0; j < resolution; j++) {
				var curVertex = [
					this.interpolateStep(verticies, verticies.length, i, j, resolution, 0),
					this.interpolateStep(verticies, verticies.length, i, j, resolution, 1),
					this.interpolateStep(verticies, verticies.length, i, j, resolution, 2)
				];
				
				if(i > 0) {
					tmpVerticies = tmpVerticies.concat(curVertex);
					tmpColors = tmpColors.concat(this.makeColor(colors, i-1, vertexAlphaFactor));
				}
				
				tmpVerticies = tmpVerticies.concat(curVertex);
				tmpColors = tmpColors.concat(this.makeColor(colors, i, vertexAlphaFactor));
			}
		}
		
		verticies = tmpVerticies;
		colors = tmpColors;

		
		// vertex buffer
		this.vertexPositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticies), this.gl.STATIC_DRAW);
		this.vertexPositionBuffer.itemSize = 3;
        this.vertexPositionBuffer.numItems = verticies.length / 3;
				
		// color buffer
		this.vertexColorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
		this.vertexColorBuffer.itemSize = 4;
        this.vertexColorBuffer.numItems = colors.length / 4;
	}
	else {
		this.currentState = SPED3.StateCodes.STATE_NO_DATA;
	}
}

SPED3.prototype.interpolateStep = function(verticies, numVerticies, index, step, numSteps, off) {
	var start = index * 3;
	var next = ((start + 3) % numVerticies);
	return verticies[start + off] + ((step / numSteps) * (verticies[next + off] - verticies[start + off]));
}

SPED3.prototype.makeColor = function(colors, i, vertexAlphaFactor) {
	var alpha = colors[i*4 + 3] * Math.max(Math.random(), vertexAlphaFactor) * vertexAlphaFactor;
	return [
		colors[i*4], colors[i*4 + 1], colors[i*4 + 2], alpha
	];
}

SPED3.prototype.drawScene = function() { 
	// enable alpha blending
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
	this.gl.enable(this.gl.BLEND);

	// set up viewport and clear it
	this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	
	// bail if we have no verticies to draw
	if(this.currentState == SPED3.StateCodes.STATE_NO_DATA)
		return;

	// set up model-view and perspective matrix transformations
	mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 1000.0, this.pMatrix);

	mat4.identity(this.mvMatrix);
	mat4.translate(this.mvMatrix, [-0.0, -0.0, -319.0]);
	mat4.rotate(this.mvMatrix, this.currentRotation * Math.PI / 180, [0, 1, 0]);
	
	// set shader attributes
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
	this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
	this.gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.vertexColorBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
	
	// set shader uniforms
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	
	// draw lines!
	this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.vertexPositionBuffer.numItems);
}

SPED3.prototype.animate = function() { 
	if(this.currentState == SPED3.StateCodes.STATE_NO_DATA)
		return;
		
	if(this.targetRotation != this.currentRotation) {
		this.currentState = SPED3.StateCodes.STATE_TURNING;
		
		var rotateAmount = 50.0 / 10.0; // 50 degrees per second, assuming tick interval of 100ms
		
		// case for last tick to make sure we don't overrotate
		//if(this.currentRotation + rotateAmount > this.targetRotation)
		//	rotateAmount = this.targetRotation - this.currentRotation;
		
		this.currentRotation += rotateAmount;
	}
	else {
		this.currentState = SPED3.StateCodes.STATE_RUNNING;
	}
}


SPED3.prototype.draw = function() { 
	//this.requestAnimFrame(this.draw);
	this.buildBuffers();
	this.drawScene();
	this.animate();
}

SPED3.prototype.interrupt = function() { 
	var aVal = this.emulator.Registers.A.get();
	if(aVal == SPED3.Operations.POLL_DEVICE) {
		this.emulator.Registers.B.set(this.currentState);
		this.emulator.Registers.C.set(this.lastError);
	}
	else if(aVal == SPED3.Operations.MAP_REGION) {
		this.memoryOffset = this.emulator.Registers.X.get();
		this.vertexCount = this.emulator.Registers.Y.get();
	}
	else if(aVal == SPED3.Operations.ROTATE_DEVICE) {
		this.targetRotation = (this.emulator.Registers.X.get() % 360);
	}
	
}

SPED3.prototype.decodeVertex = function(word1, word2) {
	// First word:  YYYYYYYYXXXXXXXX
	// Second word: 00000ICCZZZZZZZZ
	
	var x = Utils.byteTo32BitSigned(word1 & 0xff);
	var y = Utils.byteTo32BitSigned(word1 >> 8);
	var z = Utils.byteTo32BitSigned(word2 & 0xff);
	var intensity = (word2 >> 10) & 0x01;
	var color = this.decodeColor((word2 >> 8) & 0x03, intensity);
	
	return vertex = {
		position: [ x, y, z ],
		color: color,
	};
	
}

SPED3.prototype.decodeColor = function(cc, intensity) {
	if(cc == 0)
		return [ 0.15, 0.15, 0.15, intensity ? 1 : 0.7 ];		// black
	else if (cc == 1)
		return [ 1.0, 0.0, 0.0, intensity ? 1 : 0.7 ];		// red
	else if (cc == 2)
		return [ 0.0, 1.0, 0.0, intensity ? 1 : 0.7 ];		// green
	else if (cc == 3)
		return [ 0.0, 0.0, 1.0, intensity ? 1 : 0.7 ];		// blue
		
	throw "Invalid color (" + cc + ")";
}

SPED3.prototype.disconnect = function() {
	if(this.drawInterval != 0) {
		clearInterval(this.drawInterval);
		this.drawInterval = 0;
	}
	
	this.currentState = STATE_NO_DATA;
	this.drawScene(); // to clear display
}

SPED3.prototype.getDOMElement = function() {
	return this.canvas;
}

SPED3.prototype.setZoom = function(_zoom) {
	this.zoom = _zoom;
	this.canvas.width = this.zoom * 128;
	this.canvas.height = this.zoom * 96;
	this.canvas.style.borderWidth = (3*this.zoom)  + "px";
}

SPED3.Operations = {
	POLL_DEVICE:	0,
	MAP_REGION: 	1,
	ROTATE_DEVICE:	2
};

SPED3.StateCodes =  {
	STATE_NO_DATA:	0,
	STATE_RUNNING:	1,
	STATE_TURNING:	2
}

SPED3.ErrorCodes =  {
	ERROR_NONE:		0,
	ERROR_BROKEN:	0xffff
}

