//A game by Brian MacIntosh

bmacSdk =
{
	//Used to ignore large frame delta after focusin
	_eatFrame: false,
	
	isFocused: true,
	domAttached: false,
	deltaSec: 0,
	engines: []
};
bmacSdk.Engine = function(canvasDiv)
{
	bmacSdk.engines.push(this);
	this.objects = [];
	this.canvasDivName = canvasDiv;
};

window.onblur = document.onfocusout = function()
{
	bmacSdk.isFocused = false;
};
window.onfocus = document.onfocusin = function()
{
	bmacSdk.isFocused = true;
	bmacSdk._eatFrame = true;
};
bmacSdk._attachDom = function()
{
	this.domAttached = true;
	
	for (var c = 0; c < bmacSdk.engines.length; c++)
		bmacSdk.engines[c]._attachDom();
	
	this._lastFrame = Date.now();
	this._animate();
};

/*
Object System:
Objects get these methods called if they have them:

void added();
- Called when the object is added to the scene
void removed();
- Called when the object is removed from the scene
void update();
- Called once per frame
*/

bmacSdk.Engine.prototype.addObject = function(object)
{
	if (this.objects.contains(object))
		return object;
	if (object.added && bmacSdk.domAttached)
		object.added();
	this.objects.push(object);
	return object;
};

bmacSdk.Engine.prototype.removeObject = function(object)
{
	if (object.removed)
		object.removed();
	this.objects.remove(object);
};

bmacSdk.Engine.prototype._attachDom = function()
{
	this.whiteTexture = THREE.ImageUtils.loadTexture("media/white.png");
	
	this.canvasDiv = document.getElementById(this.canvasDivName);
	this.renderer = new THREE.WebGLRenderer({ alpha: true });
	this.canvasDiv.appendChild(this.renderer.domElement);
	this.canvasDiv.oncontextmenu = function() { return false; };
	this.screenWidth = this.canvasDiv.offsetWidth;
	this.screenHeight = this.canvasDiv.offsetHeight;
	this.renderer.setSize(this.screenWidth, this.screenHeight);
	this.renderer.setClearColor(0x000000, 0);
	
	//TODO: 2D depth management
	//TODO: vectors
	
	//Input
	this.keyboard = new THREEx.KeyboardState();
	this.mouse = new MOUSEMON(this.canvasDiv);
	
	this.scene = new THREE.Scene();
	
	this.mainCamera = new THREE.OrthographicCamera(
		-this.screenWidth/2, this.screenWidth/2, -this.screenHeight/2, this.screenHeight/2,
		-1000, 1000);
	this.mainCamera.position.set(0,0,0);
	
	var thisEng = this;
	window.onresize = function()
	{
		bmacSdk.Engine._onresize(thisEng);
	}
	
	for (var c = 0; c < this.objects.length; c++)
	{
		if (this.objects[c].added)
			this.objects[c].added();
	}
};

bmacSdk.Engine._onresize = function(thisEng)
{
	thisEng.screenWidth = thisEng.canvasDiv.offsetWidth;
	thisEng.screenHeight = thisEng.canvasDiv.offsetHeight;
	thisEng.renderer.setSize(thisEng.screenWidth, thisEng.screenHeight);
	
	thisEng.mainCamera.left = -thisEng.screenWidth/2;
	thisEng.mainCamera.right = thisEng.screenWidth/2;
	thisEng.mainCamera.top = -thisEng.screenHeight/2;
	thisEng.mainCamera.bottom = thisEng.screenHeight/2;
	thisEng.mainCamera.updateProjectionMatrix();
	
	thisEng.wasResized = true;
};

bmacSdk.Engine.prototype._animate = function()
{
	//Calc mouse pos
	this.mousePosWorld = new Vector2(MOUSEPOSREL(this.canvasDiv));
	this.mousePosWorld.x += this.mainCamera.position.x - this.screenWidth/2;
	this.mousePosWorld.y += this.mainCamera.position.y - this.screenHeight/2;
	
	//Update objects
	for (var c = 0; c < this.objects.length; c++)
	{
		if (this.objects[c].update)
			this.objects[c].update();
	}
	
	//Render
	this.renderer.render(this.scene, this.mainCamera);
	
	this.mouse.resetMouseNew();
	this.wasResized = false;
};

bmacSdk._animate = function()
{
	bmacSdk.deltaSec = (Date.now() - bmacSdk._lastFrame) / 1000;
	bmacSdk._lastFrame = Date.now();
	
	requestAnimationFrame(bmacSdk._animate);
	
	if (bmacSdk._eatFrame)
	{
		bmacSdk._eatFrame = false;
		return;
	}
	
	if (!bmacSdk.isFocused)
	{
		return;
	}
	
	for (var c = 0; c < bmacSdk.engines.length; c++)
		bmacSdk.engines[c]._animate();
};
