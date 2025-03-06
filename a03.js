/*
 This file is a template for a05 CS433/533
 
 Author: Amir Mohammad Esmaieeli Sikaroudi
 Email: amesmaieeli@email.arizona.edu
 Date: March, 2022
 
 Sources uses for this template:
 First Obj parser:
 https://webglfundamentals.org/
 Second Obj parser:
 https://github.com/WesUnwin/obj-file-parser
 The library for decoding PNG files is from:
 https://github.com/arian/pngjs
 The library for GIF is from:
 https://github.com/antimatter15/jsgif
*/

var input = document.getElementById("load_scene");
input.addEventListener("change", readScene);
var dummy_canvas = document.getElementById('dummy_canvas');// For showing the texture
var ctx = dummy_canvas.getContext('2d');
var resultCanvas = document.getElementById('resultCanvas');// This canvas is for creating GIF animation
var resctx = resultCanvas.getContext('2d');

var renderingCanvas = document.getElementById('canvas');
resultCanvas.setAttribute("width", renderingCanvas.width);
resultCanvas.setAttribute("height", renderingCanvas.height);
var gl = renderingCanvas.getContext("webgl",{preserveDrawingBuffer: true});
var previousFrameTime = 0;
var modelRotationRadians = degToRad(0);

var saveGIFButton = document.getElementById("save_gif");
saveGIFButton.addEventListener("click", createGif);

var modelMatrix;

var currentScene;//Current rendering scene

var doneLoading=false;//Checks if the scene is done loading to prevent renderer draw premuturly.
var doneProgramming=false;
var filesToRead=[];//List of files to be read
var imageData;//The image contents are stored separately here
var scene;//The code can save multiple scenes but no HTML element is made to give user option of switching scenes without selecting file agail. By default the firt scene is shown and the other selected scenes are just stored.
var objParsed;

var billboardProgram;
var objProgram;
var phongExp=5;

var objX = document.getElementById('objXID');//Slider for obj position
var objY = document.getElementById('objYID');//Slider for obj position
var objZ = document.getElementById('objZID');//Slider for obj position
var pexp = document.getElementById('pexpID');//Slider for phong

var camX = document.getElementById('camXID');//Slider for cam position
var camY = document.getElementById('camYID');//Slider for cam position
var camZ = document.getElementById('camZID');//Slider for cam position

var camTX = document.getElementById('camTXID');//Slider for cam target position
var camTY = document.getElementById('camTYID');//Slider for cam target position
var camTZ = document.getElementById('camTZID');//Slider for cam target position

var isShowDepth = document.getElementById('isDepthBuffer');//checkbox to show depth buffer

camX.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.position.x=Number(camX.value);
		var camXLabel = document.getElementById("camXLabelID");
		camXLabel.innerHTML = camX.value;
		camX.label = "Cam X: "+camX.value;//refresh camX text
	}
},false);
camY.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.position.y=Number(camY.value);
		var camYLabel = document.getElementById("camYLabelID");
		camYLabel.innerHTML = camY.value;
		camY.label = "Cam Y: "+camY.value;//refresh camY text
	}
},false);
camZ.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.position.z=Number(camZ.value);
		var camZLabel = document.getElementById("camZLabelID");
		camZLabel.innerHTML = camZ.value;
		camZ.label = "Cam Z: "+camZ.value;//refresh camZ text
	}
},false);

camTX.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.target.x=Number(camTX.value);
		var camTXLabel = document.getElementById("camTXLabelID");
		camTXLabel.innerHTML = camTX.value;
		camTX.label = "Cam target X: "+camTX.value;//refresh camTX text
	}
},false);
camTY.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.target.y=Number(camTY.value);
		var camTYLabel = document.getElementById("camTYLabelID");
		camTYLabel.innerHTML = camTY.value;
		camTY.label = "Cam target Y: "+camTY.value;//refresh camTY text
	}
},false);
camTZ.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.camera.target.z=Number(camTZ.value);
		var camTZLabel = document.getElementById("camTZLabelID");
		camTZLabel.innerHTML = camTZ.value;
		camTZ.label = "Cam target Z: "+camTZ.value;//refresh camTZ text
	}
},false);

objX.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.obj.position[0]=Number(objX.value);
		var objXLabel = document.getElementById("objXLabelID");
		objXLabel.innerHTML = objX.value;
		objX.label = "Obj X: "+objX.value;//refresh objX text
	}
},false);
objY.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.obj.position[1]=Number(objY.value);
		var objYLabel = document.getElementById("objYLabelID");
		objYLabel.innerHTML = objY.value;
		objY.label = "Obj Y: "+objY.value;//refresh objY text
	}
},false);
objZ.addEventListener("input", function(evt) {
	if(doneLoading==true){
		currentScene.obj.position[2]=Number(objZ.value);
		var objZLabel = document.getElementById("objZLabelID");
		objZLabel.innerHTML = objZ.value;
		objZ.label = "Obj Z: "+objZ.value;//refresh objZ text
	}
},false);
pexp.addEventListener("input", function(evt) {
	if(doneLoading==true){
		phongExp=Number(pexp.value);
		var objZLabel = document.getElementById("pexpLabelID");
		objZLabel.innerHTML = pexp.value;
		pexp.label = "Phong exponent: "+pexp.value;//refresh pexp text
	}
},false);

var isSavingGif=false;
var gifT=0;
var encoder;

function readScene()//This is the function that is called after user selects multiple files of images and scenes
{
	if (input.files.length > 0) {
		if(doneLoading==true)//This condition checks if this is the first time user has selected a scene or not. If doneLoading==true, then the user has selected a new scene while rendering
		{
			newSceneRequested=true;
			filesToRead=[];//List of files to be read
			imageData=[];//The image contents are stored separately here
			objsData=[];
			scenes=[];//List of scenes
		}
		doneLoading=false;
		for(var i=0;i<input.files.length;i++)
		{
			var file = input.files[i];
			var reader = new FileReader();
			filesToRead[i]=true;
			reader.onload = (function(f,index) {
				return function(e) {
					//Get the file name
					let fileName = f.name;
					//Get the file Extension 
					let fileExtension = fileName.split('.').pop();
					if(fileExtension=='ppm')
					{
						var file_data = this.result;
						let img=parsePPM(file_data,fileName);//Parse image
						imageData.push(img);
						filesToRead[index]=false;
					}else if(fileExtension=='js')
					{
						var file_data = this.result;
						scene=parseScene(file_data);//Parse scene
						filesToRead[index]=false;
					}else if(fileExtension=='json')
					{
						var file_data = this.result;
						scene=parseScene(file_data);//Parse scene
						filesToRead[index]=false;
					}else if(fileExtension=='obj')
					{
						var file_data = this.result;
						objParsed=parseOBJ(file_data);//Parse obj to almost buffer-ready Float32Array arrays.
						//Todo: For gouraud shading you may need to edit the normals of the object.
						//For your convenience another parser is provided. In this parser more details are stored.
						//You are free to use your own parser or any of the provided parsers.
						const objFile = new OBJFile(file_data);
						const output = objFile.parse();
						
						//Todo: You may call a function to calculate new normal for each vertex.
						
						filesToRead[index]=false;
					}else if(fileExtension=='png')
					{
						var file_data = this.result;
						
						var pngImage = new PNGReader(file_data);
						
						pngImage.parse(function(err, png){
							if (err) throw err;
							
							let img = parsePNG(png,fileName);
							
							let width=img.width;
							let height=img.height;
							document.getElementById("dummy_canvas").setAttribute("width", img.width);
							document.getElementById("dummy_canvas").setAttribute("height", img.height);
							let showCaseData = ctx.createImageData(width, height);
							for(var i = 0; i < img.data.length; i+=1){
								showCaseData.data[i*4]=img.data[i].r;
								showCaseData.data[i*4+1]=img.data[i].g;
								showCaseData.data[i*4+2]=img.data[i].b;
								showCaseData.data[i*4+3]=img.data[i].a;
							}
							ctx.putImageData(showCaseData, dummy_canvas.width/2 - width/2, dummy_canvas.height/2 - height/2);
							
							let imageRead=ctx.getImageData(0, 0, dummy_canvas.width, dummy_canvas.height);
							imageData=imageRead;
							filesToRead[index]=false;
						});
					}
				};
			})(file,i);
			let fileName = file.name;
			let fileExtension = fileName.split('.').pop();
			if(fileExtension=='ppm' || fileExtension=='js' || fileExtension=='json' || fileExtension=='obj')
			{
				reader.readAsBinaryString(file);
			}else if(fileExtension=='png'){
				reader.readAsArrayBuffer(file);
			}
			
		}
		drawScene();//Enter the drawing loop();
	}
}

// Draw the scene.
function drawScene(now) {
	if(doneLoading==false)
	{
		var isReaminingRead=false;
		for(let j=0;j<filesToRead.length;j++)
		{
			if(filesToRead[j]==true)//Check if each file is read
			{
				isReaminingRead=true;//If one is not read, then make sure drawing scene will wait for files to be read
			}
		}
		if(isReaminingRead==false)//If all files are read
		{
			currentScene=scene;
			currentScene.billboard.img=imageData;
			
			doneLoading=true;
		}
	}else if(doneLoading==true)//If scene is completely read
	{
		if(doneProgramming==false){
			programAll();
			preprocessBuffers();
			doneProgramming=true;
			
			// Support for Alpha
			gl.enable(gl.BLEND)
			gl.colorMask(true, true, true, true);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		}else{
			renderingFcn(now);
		}
	}
	
	// Call drawScene again next frame with delay to give user chance of interacting GUI
	requestAnimationFrame(drawScene);
}

function linearInterpolate(x0,x1,t){
	return xf=x1*t+x0*(1-t);
}

function renderingFcn(now){
	if(isSavingGif==true){
		let iEyeX=linearInterpolate(currentScene.camera.posAnimation[0][0],currentScene.camera.posAnimation[1][0],gifT);
		let iEyeY=linearInterpolate(currentScene.camera.posAnimation[0][1],currentScene.camera.posAnimation[1][1],gifT);
		let iEyeZ=linearInterpolate(currentScene.camera.posAnimation[0][2],currentScene.camera.posAnimation[1][2],gifT);
		let tarX=linearInterpolate(currentScene.camera.targetAnimation[0][0],currentScene.camera.targetAnimation[1][0],gifT);
		let tarY=linearInterpolate(currentScene.camera.targetAnimation[0][1],currentScene.camera.targetAnimation[1][1],gifT);
		let tarZ=linearInterpolate(currentScene.camera.targetAnimation[0][2],currentScene.camera.targetAnimation[1][2],gifT);
		currentScene.camera.position.x=iEyeX;
		currentScene.camera.position.y=iEyeY;
		currentScene.camera.position.z=iEyeZ;
		currentScene.camera.target.x=tarX;
		currentScene.camera.target.y=tarY;
		currentScene.camera.target.z=tarZ;
	}

	// Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	webglUtils.resizeCanvasToDisplaySize(gl.canvas);
	
	gl.clearColor(0, 0, 1, 0.5);
	gl.colorMask(true, true, true, true);
	
	// Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	renderScene(now);

	if(isSavingGif==true){
		const pixels = new Uint8ClampedArray(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
			gl.readPixels(
  			0,
  			0,
  			gl.drawingBufferWidth,
  			gl.drawingBufferHeight,
  			gl.RGBA,
  			gl.UNSIGNED_BYTE,
  			pixels,
		);
		let tempImg=ctx.createImageData(gl.drawingBufferWidth, gl.drawingBufferHeight);
		let flippedPixels = new Uint8ClampedArray(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);

		// Flip the rows manually
		for (let row = 0; row < gl.drawingBufferHeight; row++) {
  			let sourceStart = row * gl.drawingBufferWidth * 4;
  			let destStart = (gl.drawingBufferHeight - row - 1) * gl.drawingBufferWidth * 4;
  			flippedPixels.set(pixels.subarray(sourceStart, sourceStart + gl.drawingBufferWidth * 4), destStart);
		}
		tempImg.data.set(flippedPixels);
		resctx.putImageData(tempImg, 0,0);
		encoder.addFrame(resctx);
		gifT=gifT+0.1;
		if(gifT>1){
			isSavingGif=false;
			gifT=0;
			let iEyeX=linearInterpolate(currentScene.camera.posAnimation[0][0],currentScene.camera.posAnimation[1][0],gifT);
			let iEyeY=linearInterpolate(currentScene.camera.posAnimation[0][1],currentScene.camera.posAnimation[1][1],gifT);
			let iEyeZ=linearInterpolate(currentScene.camera.posAnimation[0][2],currentScene.camera.posAnimation[1][2],gifT);
			let tarX=linearInterpolate(currentScene.camera.targetAnimation[0][0],currentScene.camera.targetAnimation[1][0],gifT);
			let tarY=linearInterpolate(currentScene.camera.targetAnimation[0][1],currentScene.camera.targetAnimation[1][1],gifT);
			let tarZ=linearInterpolate(currentScene.camera.targetAnimation[0][2],currentScene.camera.targetAnimation[1][2],gifT);
			currentScene.camera.position.x=iEyeX;
			currentScene.camera.position.y=iEyeY;
			currentScene.camera.position.z=iEyeZ;
			currentScene.camera.target.x=tarX;
			currentScene.camera.target.y=tarY;
			currentScene.camera.target.z=tarZ;
			encoder.finish();
			encoder.download("download.gif");
		}
	}
}

function createGif(){
	resultCanvas.width=500;
	resultCanvas.height=500;
	gifT=0;
	isSavingGif=true;
	encoder = new GIFEncoder();
	encoder.setRepeat(0); //0  -> loop forever
	encoder.setDelay(500); //go to next frame every n milliseconds
	encoder.start();
}

function renderScene(now){
	renderObj(now);
	renderBillboard();
}

function Float32Concat(first, second)
{
    var firstLength = first.length,
        result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

function renderBillboard(){
	gl.disable(gl.CULL_FACE);
	
	// Tell it to use our program (pair of shaders)
    gl.useProgram(billboardProgram.program);
	
	//Todo: Here you can activate and bind any attribute you need in shader.
    // Turn on the position attribute
    gl.enableVertexAttribArray(billboardProgram.positionLocationAttrib);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.billboard.positionBuffer);
	
	// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        billboardProgram.positionLocationAttrib, size, type, normalize, stride, offset);
		
	
	// Turn on the texture coord attribute
    gl.enableVertexAttribArray(billboardProgram.textureLocationAttrib);

    // Bind the text coord buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.billboard.textureBuffer);
	
	// Tell the texture coord attribute how to get data out of textcoodBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next normal
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        billboardProgram.textureLocationAttrib, size, type, normalize, stride, offset);
	

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(degToRad(currentScene.camera.fov), aspect, currentScene.camera.near, currentScene.camera.far);

	var cameraMatrix;
	cameraMatrix = m4.lookAt([currentScene.camera.position.x,currentScene.camera.position.y,currentScene.camera.position.z], [currentScene.camera.target.x,currentScene.camera.target.y,currentScene.camera.target.z], [currentScene.camera.up.x,currentScene.camera.up.y,currentScene.camera.up.z]);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
	
	//Todo: You may need to input light direction as uniform to the shader program. Also here you can input any other uniform variable to shader.
    // Set the viewProjectionMatrix.
	gl.uniformMatrix4fv(billboardProgram.worldViewProjectionUniformLocation, false, viewProjectionMatrix);
	
	// Tell the shader to use texture unit 0 for u_texture
    gl.uniform1i(billboardProgram.textureUniformLocation, 0);

	
	if(isShowDepth.checked == true){// Get checkbox value
		// get the uniform
		isDBUniformLocation = gl.getUniformLocation(billboardProgram.program, "u_isDepthBuffer");
		// Send data to float uniform
		gl.uniform1f(isDBUniformLocation, 1);
	}else{
		// get the uniform
		isDBUniformLocation = gl.getUniformLocation(billboardProgram.program, "u_isDepthBuffer");
		// Send phong exp uniform
		gl.uniform1f(isDBUniformLocation, 0);
	}
	
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function renderObj(now){
	gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
	
	// Convert to seconds
    now *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = now - previousFrameTime;
    // Remember the current time for the next frame.
    previousFrameTime = now;
	
	// Model rotation angle
	modelRotationRadians += 2.1 * deltaTime;

    // Tell it to use our program (pair of shaders)
    gl.useProgram(objProgram.program);
	
	//Todo: Here you can activate and bind any attribute you need in shader.
    // Turn on the position attribute
    gl.enableVertexAttribArray(objProgram.positionLocationAttrib);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, currentScene.obj.positionBuffer);
	
	// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        objProgram.positionLocationAttrib, size, type, normalize, stride, offset);
	

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(degToRad(currentScene.camera.fov), aspect, currentScene.camera.near, currentScene.camera.far);

	var cameraMatrix;
	cameraMatrix = m4.lookAt([currentScene.camera.position.x,currentScene.camera.position.y,currentScene.camera.position.z], [currentScene.camera.target.x,currentScene.camera.target.y,currentScene.camera.target.z], [currentScene.camera.up.x,currentScene.camera.up.y,currentScene.camera.up.z]);
	
    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);
	
	var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
	
	// To do: Model matrix should be used to translate the model. It needs to be sent to the shader code. The file "m4.js" provides some math functions for you.
	// Translation is not implemented in the given file. You need to implement it yourself.
	modelMatrix = m4.identity();
	m4.scale(modelMatrix,1,1,1,modelMatrix);
	m4.translate(modelMatrix,currentScene.obj.position[0],currentScene.obj.position[1],currentScene.obj.position[2],modelMatrix);
	m4.yRotate(modelMatrix,modelRotationRadians,modelMatrix);
	
	var worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, modelMatrix);
	
	gl.uniformMatrix4fv(objProgram.worldUniformLocation, false, modelMatrix);

	//Todo: You may need to inputs such as light direction and phong as uniforms to the shader program. Also here you can input any other uniform variable to shader.
    // Set the viewProjectionMatrix.
	gl.uniformMatrix4fv(objProgram.worldViewProjectionUniformLocation, false, worldViewProjectionMatrix);
	
	// Set the fixed color
	gl.uniform3fv(objProgram.colorUniformLocation, new Float32Array([1.0,0.1,0.1]));
	
	// Here we can access the uniforms in an inefficient way i.e. instead of getting the uniform addresses and store them in a class, we can get the uniform location
	// and send the data. Since, we are sending 3 float variables (one is treated as a boolean), it doesn't have impact on performance.
	if(isShowDepth.checked == true){// Get checkbox value
		// get the uniform
		isDBUniformLocation = gl.getUniformLocation(objProgram.program, "u_isDepthBuffer");
		// Send data to float uniform
		gl.uniform1f(isDBUniformLocation, 1);
	}else{
		// get the uniform
		isDBUniformLocation = gl.getUniformLocation(objProgram.program, "u_isDepthBuffer");
		// Send phong exp uniform
		gl.uniform1f(isDBUniformLocation, 0);
	}
	
	gl.drawArrays(gl.TRIANGLES, 0, currentScene.obj.numVertices);
}

function programAll(){
	programObj();
	programBillboard();
}

function preprocessBuffers(){
	makeObjBuffers();
	makeBillboardBuffers();
}

function makeBillboardBuffers(){
	let sceneBillboard=currentScene.billboard;
	
	// Create a buffer for positions
    let billboardPositionBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardPositionBuffer);
    // Put the positions in the buffer
    setBillboardGeometry(gl,sceneBillboard);
	
    // provide texture coordinates for the rectangle.
    let billboardTextcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardTextcoordBuffer);
    // Set Texcoords.
    setBillboardTexcoords(gl,sceneBillboard);
	
	// Create a texture.
	var billboardTextureBuffer = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, billboardTextureBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, imageData);
    gl.generateMipmap(gl.TEXTURE_2D);
  
    sceneBillboard.setBuffers(billboardPositionBuffer,billboardTextcoordBuffer,billboardTextureBuffer);
}

function makeObjBuffers(){
	let sceneObj=currentScene.obj;
	sceneObj.setParsedObj(objParsed);
	let parsedObj=sceneObj.parsedObj;
	
	// Create a buffer for positions
    let objPositionBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, objPositionBuffer);
    // Put the positions in the buffer
    setGeometryPositionBuffer(gl,parsedObj);
	
    // provide texture coordinates for the rectangle.
    let objTextcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objTextcoordBuffer);
    // Set Texcoords.
    setTextureCoordBuffer(gl,parsedObj);
  
    // Create a buffer to put normals in
    let billboardNormalBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = normalBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, billboardNormalBuffer);
    // Put normals data into buffer
    setNormalBuffer(gl,parsedObj);
  
    sceneObj.setBuffers(objPositionBuffer,objTextcoordBuffer,billboardNormalBuffer);
}

function programObj(){
	//Todo: Change the shader programs to support diffuse and specular (graduates) shading. For gouraud shading you need to calculate new normals when processing the OBJ file.
	var vShaderObj = "attribute vec4 a_position;\n"+
				"uniform mat4 u_worldViewProjection;\n"+
				"uniform mat4 u_world;\n"+
				"void main() {\n"+
					"// Multiply the position by the matrix.\n"+
					"gl_Position = u_worldViewProjection * a_position;\n"+
				"}";
	var fShaderObj = 	"precision mediump float;\n"+
					"varying vec3 v_normal;\n"+
					"uniform vec3 u_color;\n"+
					"uniform float u_isDepthBuffer;\n"+
					"void main() {\n"+
						"if(u_isDepthBuffer==1.0){\n"+
							"float z = gl_FragCoord.z;  // depth value [0,1]\n"+
							"float ndcZ = 2.0*z - 1.0;  // [-1,1]\n"+
							"gl_FragColor = vec4(vec3(ndcZ), 1.0);\n"+
						"}else{\n"+
							"gl_FragColor = vec4(u_color,1.0);\n"+
						"}\n"+
					"}";
	let programObject = webglUtils.createProgramFromSources(gl, [vShaderObj,fShaderObj])
	
	//Todo: Add new varialbes for linking to the shader program.
	//The attribute variables from the shader program can be obtained as below.
	// look up where the vertex data needs to go.
    let positionLocationAttrib = gl.getAttribLocation(programObject, "a_position");
	
	//Todo: Add new varialbes for linking to the shader program.
	//The uniform variables from the shader program can be obtained as below.
	// lookup uniforms
    let colorUniformLocation = gl.getUniformLocation(programObject, "u_color");
	let worldViewProjectionUniformLocation = gl.getUniformLocation(programObject, "u_worldViewProjection");
	let worldUniformLocation = gl.getUniformLocation(programObject, "u_world");
	
	//Todo: You can store the variable addresses into a class similar to what is shown below so that in the rendering loop you don't get the variables each time.
	objProgram=new ObjProgram(programObject,positionLocationAttrib,colorUniformLocation,worldViewProjectionUniformLocation,worldUniformLocation);
}

class ObjProgram{
	constructor(program,positionLocationAttrib,colorUniformLocation,worldViewProjectionUniformLocation,worldUniformLocation){
		this.program=program;
		this.positionLocationAttrib=positionLocationAttrib;
		this.colorUniformLocation=colorUniformLocation;
		this.worldViewProjectionUniformLocation=worldViewProjectionUniformLocation;
		this.worldUniformLocation=worldUniformLocation;
	}
}

class BillboardProgram{
	constructor(program,positionLocationAttrib,textureLocationAttrib,textureUniformLocation,worldViewProjectionUniformLocation){
		this.program=program;
		this.positionLocationAttrib=positionLocationAttrib;
		this.textureLocationAttrib=textureLocationAttrib;
		this.textureUniformLocation=textureUniformLocation;
		this.worldViewProjectionUniformLocation=worldViewProjectionUniformLocation;
	}
}

function programBillboard(){
	//Todo: Change the shader programs to support diffuse and specular (graduates) shading. For gouraud shading you need to calculate new normals when processing the OBJ file.
	var vShaderObj = "attribute vec4 a_position;\n"+
				"attribute vec2 a_texcoord;\n"+
				"varying vec2 v_texcoord;\n"+
				"uniform mat4 u_worldViewProjection;\n"+
				"void main() {\n"+
					"// Pass the texcoord to the fragment shader.\n"+
					"v_texcoord = a_texcoord;\n"+
					"// Multiply the position by the matrix.\n"+
					"gl_Position = u_worldViewProjection * a_position;\n"+
				"}";
	var fShaderObj = 	"precision mediump float;\n"+
					"varying vec2 v_texcoord;\n"+
					"uniform sampler2D u_texture;\n"+
					"uniform float u_isDepthBuffer;\n"+
					"void main() {\n"+
						"if(u_isDepthBuffer==1.0){\n"+
							"float z = gl_FragCoord.z;  // depth value [0,1]\n"+
							"float ndcZ = 2.0*z - 1.0;  // [-1,1]\n"+
							"gl_FragColor = vec4(vec3(ndcZ), 1.0);\n"+
						"}else{\n"+
							"gl_FragColor = texture2D(u_texture, v_texcoord);\n"+
						"}\n"+
					"}";
	let programBill = webglUtils.createProgramFromSources(gl, [vShaderObj,fShaderObj])
	
	//Todo: Add new varialbes for linking to the shader program.
	//The attribute variables from the shader program can be obtained as below.
	// look up where the vertex data needs to go.
    let positionLocationAttrib = gl.getAttribLocation(programBill, "a_position");
	let textureLocationAttrib = gl.getAttribLocation(programBill, "a_texcoord");
	
	//Todo: Add new varialbes for linking to the shader program.
	//The uniform variables from the shader program can be obtained as below.
	// lookup uniforms
    let textureUniformLocation = gl.getUniformLocation(programBill, "u_texture");
	let worldViewProjectionUniformLocation = gl.getUniformLocation(programBill, "u_worldViewProjection");
	
	//Todo: You can store the variable addresses into a class similar to what is shown below so that in the rendering loop you don't get the variables each time.
	billboardProgram=new BillboardProgram(programBill,positionLocationAttrib,textureLocationAttrib,textureUniformLocation,worldViewProjectionUniformLocation);
}

//The function for parsing PNG is done for you. The output is a an array of RGBA instances.
function parsePNG(png,fileName){
	let rawValues = png.getRGBA8Array();
	let width = png.getWidth();
	let height = png.getHeight();
	var readImageValues=[];//Array of RGBA instances
	var counterMain=0;//It is used for array of RGBAValue instances.
	for(var i = 0; i < rawValues.length; i++){
		let r=rawValues[i*4];
		let g=rawValues[i*4+1];
		let b=rawValues[i*4+2];
		let a=rawValues[i*4+3];
		readImageValues[counterMain]=new RGBAValue(r,g,b,a);
		counterMain=counterMain+1;
	}
	return new PNGImage(readImageValues,width,height,fileName);
}

class PNGImage{
	constructor(data,width,height,fileName){
		this.data=data;// The 1D array of RGBA pixel instances
		this.fileName=fileName;// Filename is useful to connect this image to appropriate Billboard after all materials are read.
		this.width=width;// Width of image
		this.height=height;// Height of image
	}
}

class RGBAValue{
	constructor(r,g,b,a)
	{
		this.r=r;
		this.g=g;
		this.b=b;
		this.a=a;
	}
}

function radToDeg(r) {
	return r * 180 / Math.PI;
}

function degToRad(d) {
	return d * Math.PI / 180;
}

// A utility function to convert a javascript Floar32Array to a buffer. This function must be called after the buffer is bound.
function setGeometryPositionBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.position), gl.STATIC_DRAW);
}

// A utility function to convert a javascript Floar32Array to a buffer. This function must be called after the buffer is bound.
function setTextureCoordBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.texcoord), gl.STATIC_DRAW);
}

// A utility function to convert a javascript Floar32Array to a buffer. This function must be called after the buffer is bound.
function setNormalBuffer(gl,obj) {
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.geometries[0].data.normal), gl.STATIC_DRAW);
}

//This is a utility function to set vertex colors by random numbers just for showing you how it can be done
function setColorBuffer(gl,obj) {
	var numVertices=obj.geometries[0].data.position.length;
	var colors = new Float32Array(numVertices*3);
	var myrng = new Math.seedrandom('123');
	for(let i=0;i<numVertices*3;i++){
		colors[i]=0.4+myrng()/2;
	}
	gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

// This function with counter clock-wise vertices of the billboard. The billboard should be made of two triangles.
function setBillboardGeometry(gl,billboard) {
	var positions = new Float32Array([
	billboard.UpperLeft.x, billboard.UpperLeft.y, billboard.UpperLeft.z,  // first triangle
    billboard.LowerLeft.x, billboard.LowerLeft.y, billboard.LowerLeft.z,
    billboard.UpperRight.x, billboard.UpperRight.y, billboard.UpperRight.z,
    billboard.UpperRight.x,  billboard.UpperRight.y, billboard.UpperRight.z,  // second triangle
    billboard.LowerLeft.x,  billboard.LowerLeft.y, billboard.LowerLeft.z,
    billboard.LowerRight.x,  billboard.LowerRight.y, billboard.LowerRight.z
	]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setBillboardTexcoords(gl,billboard) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([	  
	  0,0,
	  0,1,
	  1,0,
	  1,0,
	  0,1,
	  1,1
	  ]),
      gl.STATIC_DRAW);
}

// Utility to set normal for billboard
function setBillboardNormals(gl,billboard) {
  let vec1=Vector3.minusTwoVectors(billboard.UpperLeft,billboard.LowerLeft);
  let vec2=Vector3.minusTwoVectors(billboard.LowerRight,billboard.LowerLeft);
  var normalVector=Vector3.crossProduct(vec2,vec1);//billboard normal vector
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([	  
	  normalVector.x,normalVector.y,normalVector.z,
	  normalVector.x,normalVector.y,normalVector.z,
	  normalVector.x,normalVector.y,normalVector.z,
	  normalVector.x,normalVector.y,normalVector.z,
	  normalVector.x,normalVector.y,normalVector.z,
	  normalVector.x,normalVector.y,normalVector.z
	  ]),
      gl.STATIC_DRAW);
}

//This function is given to you for parsing the OBJ file.
// TODO: You need to calculate average normals by either changing this function or making a new function to do it.
function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

//Extra math functions. This can not be used in shader program. GLSL has its own math functions.
class Vector3{
	constructor(x,y,z){
		this.x=x;
		this.y=y;
		this.z=z;
	}
	static multiplyVectorScalar(vec,scalar){
		return new Vector3(vec.x*scalar,vec.y*scalar,vec.z*scalar);
	}
	static sumTwoVectors(vec1,vec2){
		return new Vector3(vec1.x+vec2.x,vec1.y+vec2.y,vec1.z+vec2.z);
	}
	static minusTwoVectors(vec1,vec2){
		return new Vector3(vec1.x-vec2.x,vec1.y-vec2.y,vec1.z-vec2.z);
	}
	static normalizeVector(vec){
		let sizeVec=Math.sqrt(Math.pow(vec.x,2)+Math.pow(vec.y,2)+Math.pow(vec.z,2));
		return new Vector3(vec.x/sizeVec,vec.y/sizeVec,vec.z/sizeVec);
	}
	static crossProduct(vec1,vec2){
		return new Vector3(vec1.y * vec2.z - vec1.z * vec2.y,vec1.z * vec2.x - vec1.x * vec2.z,vec1.x * vec2.y - vec1.y * vec2.x);
	}
	static negate(vec){
		return new Vector3(-vec.x,-vec.y,-vec.z);
	}
	static dotProduct(vec1,vec2){
		var result = 0;
		result += vec1.x * vec2.x;
		result += vec1.y * vec2.y;
		result += vec1.z * vec2.z;
		return result;
	}
	static distance(p1,p2){
		return Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2)+Math.pow(p1.z-p2.z,2));
	}
	static getMagnitude(vec){
		return Math.sqrt(Math.pow(vec.x,2)+Math.pow(vec.y,2)+Math.pow(vec.z,2));
	}
}


class Billboard{
	constructor(UpperLeft,LowerLeft,UpperRight,LowerRight,imgFile,img,ambient){
		this.UpperLeft=UpperLeft;
		this.LowerLeft=LowerLeft;
		this.UpperRight=UpperRight;
		this.LowerRight=LowerRight;
		this.imgFile=imgFile;
		this.img=img;
		this.ambient=ambient;
	}
	
	setBuffers(positionBuffer,textureBuffer,billboardTextureBuffer){
		this.positionBuffer=positionBuffer;
		this.textureBuffer=textureBuffer;
		this.billboardTextureBuffer=billboardTextureBuffer;
	}
}

class Object3D{
	constructor(position,fileName){
		this.position=position;
		this.fileName=fileName;
	}
	
	setParsedObj(parsedObj){
		this.parsedObj=parsedObj;
		this.numVertices=parsedObj.geometries[0].data.position.length/3;
	}
	
	setBuffers(positionBuffer,textureBuffer,normalBuffer){
		this.positionBuffer=positionBuffer;
		this.textureBuffer=textureBuffer;
		this.normalBuffer=normalBuffer;
	}
}

class SunLight{//Light source
	constructor(locationPoint){
		this.locationPoint=locationPoint;
	}
}

class Camera{
	constructor(position,posAnimation,target,targetAnimation,up,fov,far,near,DefaulColor){
		this.position=position;
		this.posAnimation=posAnimation;
		this.target=target;
		this.targetAnimation=targetAnimation;
		this.up=up;
		this.fov=fov;//IMPORTANT: It is assumed that FOV is the angle between the center vector and edge of the frustum (half pyramid) but not the entire frustum (full pyramid).
		this.far=far;
		this.near=near;
		this.DefaulColor=DefaulColor;
	}
	setVectors(w,nw,u,v){
		this.w=w;
		this.nw=nw;
		this.u=u;
		this.v=v;
	}
}

class Scene{//This object technically stores everything required for a scene
	constructor(light,billboard,obj,camera){
		this.light=light;
		this.billboard=billboard;
		this.camera=camera;
		this.obj=obj;
	}
}

function parseScene(file_data)//A simple function to read JSON and put the data inside a scene class and return the read scene
{
	var sceneFile = JSON.parse(file_data);
	let pos=new Vector3(sceneFile.eyeLocations[0][0],sceneFile.eyeLocations[0][1],sceneFile.eyeLocations[0][2]);
	let posAnimation=sceneFile.eyeLocations;
	let lookat=new Vector3(sceneFile.lookatLocations[0][0],sceneFile.lookatLocations[0][1],sceneFile.lookatLocations[0][2]);
    let lookatAnimation=sceneFile.lookatLocations;
	let up=new Vector3(sceneFile.up[0],sceneFile.up[1],sceneFile.up[2]);
	let fov=sceneFile.fov_angle;
	let near=sceneFile.near;
	let far=sceneFile.far;
	let DefaulColor=sceneFile.DefaulColor;
	var camera=new Camera(pos,posAnimation,lookat,lookatAnimation,up,fov,far,near,DefaulColor);
	let light=new SunLight(new Vector3(sceneFile.SunLocation[0],sceneFile.SunLocation[1],sceneFile.SunLocation[2]));
	var billboard;
	if ('billboard' in sceneFile) {//If billboard exists in scene
		let upperLeft=new Vector3(sceneFile.billboard.UpperLeft[0],sceneFile.billboard.UpperLeft[1],sceneFile.billboard.UpperLeft[2]);
		let lowerLeft=new Vector3(sceneFile.billboard.LowerLeft[0],sceneFile.billboard.LowerLeft[1],sceneFile.billboard.LowerLeft[2]);
		let upperRight=new Vector3(sceneFile.billboard.UpperRight[0],sceneFile.billboard.UpperRight[1],sceneFile.billboard.UpperRight[2]);
		let billboardHeight=upperLeft.y-lowerLeft.y;
		let lowerRight=new Vector3(upperRight.x,upperRight.y-billboardHeight,upperRight.z);
		
		billboard=new Billboard(upperLeft,lowerLeft,upperRight,lowerRight,sceneFile.billboard.filename,null,null);//Image is assigned to billboard later
	}
	var obj=null;
	if ('obj' in sceneFile) {//If obj exists in scene
		let position=sceneFile.obj.position;
		let fileName=sceneFile.obj.filename;
		obj=new Object3D(position,fileName);
	}
	return new Scene(light,billboard,obj,camera);
}