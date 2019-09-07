
Math.signum = function(x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); };

controller = 
{
	skipIntro: 0,
	currencySym: "&#x20B5",
	
	MODE_LAUNCH: 0,
	MODE_INTRO: 1,
	MODE_STARTANIM: 2,
	MODE_KILL: 3,
	MODE_BUILD: 4,
	MODE_GAMEOVER: 5,
	
	currentMode: 0,
	
	startYear: 3000,
	startingFunds: 20,
	
	buildTabSpeed: 650,
	buildTabWidth: 200,
	
	fadeInSpeed: 0.25,
	fadeInDelay: 1.3,
	
	buildModeMaxTime: 120,
	buildModeMinTime: 60,
	
	spawnsPerYear: 7,
	maxSpawnInterval: 2,
	initialSpawnDelay: 2
};

controller.PlayAgain = function()
{
	if (window.location.href.indexOf("?re=1") < 0)
		window.location.href += "?re=1";
	else
		window.location.reload();
}

controller.added = function()
{
	//Look up replay param to skip intro
	if (window.location.search.indexOf("re=1") >= 0)
		this.skipIntro = 1;
	
	this.funds = this.startingFunds;
	this.fundsLabel = document.getElementById("fundsLabel");
	this.fundsLabel.style.visibility = "hidden";
	this.SetMoney(this.funds);
	
	this.yearCounter = document.getElementById("yearCounter");
	this.yearCounter.style.visibility = "hidden";
	this.SetYear(this.startYear);
	
	this.buildContainer = document.getElementById("buildContainer");
	this.buildTabState = false;
	this.tabPos = -this.buildTabWidth;
	this.buildContainer.style.left = this.tabPos + "px";
	
	this.buildTimer = document.getElementById("buildTimer");
	
	this.buildExpander = document.getElementById("buildExpander");
	this.buildExpanderExpanded = new THREE.Vector2();
	this.buildExpanderContracted = new THREE.Vector2();
	this.buildExpanderPos = new THREE.Vector2();
	this.buildExpanderFactor = 0;
	
	this.nextExpander = document.getElementById("nextButton");
	this.nextExpanderExpanded = new THREE.Vector2();
	this.nextExpanderContracted = new THREE.Vector2();
	this.nextExpanderPos = new THREE.Vector2();
	this.nextExpanderFactor = 0;
	
	this.shipFlyTexture = THREE.ImageUtils.loadTexture("media/ship_fly.png");
	this.shipLandTexture = THREE.ImageUtils.loadTexture("media/ship_landed_closed.png");
	this.shipOpenTexture = THREE.ImageUtils.loadTexture("media/ship_landed.png");
	this.shipFlyTexture.magFilter = this.shipFlyTexture.minFilter = THREE.NearestFilter;
	this.shipLandTexture.magFilter = this.shipLandTexture.minFilter = THREE.NearestFilter;
	this.shipOpenTexture.magFilter = this.shipOpenTexture.minFilter = THREE.NearestFilter;
	
	this.shipGeometry = bmacSdk.GEO.makeSpriteGeo(39, 46);
	this.shipMesh = bmacSdk.GEO.makeSpriteMesh(this.shipFlyTexture, this.shipGeometry);
	GameEngine.scene.add(this.shipMesh);
	this.shipMesh.position.set(0, -Math.min(400, GameEngine.screenHeight / 2), 500);
	this.shipMesh.visible = false;
	
	this.missionLabel = document.getElementById("missionString");
	this.missionStage = 0;
	
	this.creditsLabel = document.getElementById("creditsLabel");
	this.gameOverLabel = document.getElementById("gameOverLabel");
	
	this.fader = document.getElementById("fader");
	this.faderAlpha = 1;
	
	this.shipLandSound = "audio/ship_land.wav";
	this.shipOpenSound = "audio/ship_open.wav";
	this.shipCloseSound = "audio/ship_close.wav";
	this.nextYearSound = "audio/next_year.wav";
	this.tabOpenSound = "audio/build_tabopen.wav";
	this.tabCloseSound = "audio/build_tabclose.wav";
	this.shipLandSound = "audio/ship_land.wav";
	
	this.musicIntro = "audio/music_intro.mp3";
	this.musicStartAnim = "audio/music_startanim.mp3";
	this.musicEnd = "audio/music_end.mp3";
	AUDIOMANAGER.preloadSound(this.musicStartAnim);
	AUDIOMANAGER.preloadSound(this.musicEnd);
	this.introMusic = AUDIOMANAGER.playSound(this.musicIntro);
	this.introMusic.loop = true;
	
	AUDIOMANAGER.preloadSound(this.shipLandSound);
	AUDIOMANAGER.preloadSound(this.shipOpenSound);
	AUDIOMANAGER.preloadSound(this.shipCloseSound);
	AUDIOMANAGER.preloadSound(this.nextYearSound);
	AUDIOMANAGER.preloadSound(this.tabOpenSound);
	AUDIOMANAGER.preloadSound(this.tabCloseSound);
	AUDIOMANAGER.preloadSound(this.shipLandSound);
};

controller.removed = function()
{
	
};

controller.update = function()
{
	//Animate build button
	var changed = false;
	if (!this.buildTabState && this.currentMode == this.MODE_BUILD)
	{
		if (this.buildExpanderFactor < 1)
		{
			changed = true;
			this.buildExpanderFactor += 3 * bmacSdk.deltaSec;
			if (this.buildExpanderFactor >= 1)
				this.buildExpanderFactor = 1;
		}
	}
	else if (this.buildExpanderFactor > 0)
	{
		changed = true;
		this.buildExpanderFactor -= 3 * bmacSdk.deltaSec;
		if (this.buildExpanderFactor <= 0)
			this.buildExpanderFactor = 0;
	}
	if (changed || GameEngine.wasResized)
	{
		var mapScreenLeft = -ground.halfWidth + GameEngine.screenWidth/2;
		var mapScreenTop = -ground.halfHeight + GameEngine.screenHeight/2;
		
		this.buildExpanderExpanded.set(mapScreenLeft-100, mapScreenTop-100);
		this.buildExpanderContracted.set(mapScreenLeft, mapScreenTop);
		
		this.buildExpanderPos.set(this.buildExpanderContracted.x, this.buildExpanderContracted.y);
		this.buildExpanderPos.lerp(this.buildExpanderExpanded, this.buildExpanderFactor);
		this.buildExpander.style.left = Math.floor(this.buildExpanderPos.x) + "px";
		this.buildExpander.style.top = Math.floor(this.buildExpanderPos.y) + "px";
	}
	
	//Animate next button
	var changed = false;
	if (this.currentMode == this.MODE_BUILD)
	{
		if (this.nextExpanderFactor < 1)
		{
			changed = true;
			this.nextExpanderFactor += 3 * bmacSdk.deltaSec;
			if (this.nextExpanderFactor >= 1)
				this.nextExpanderFactor = 1;
		}
	}
	else if (this.nextExpanderFactor > 0)
	{
		changed = true;
		this.nextExpanderFactor -= 3 * bmacSdk.deltaSec;
		if (this.nextExpanderFactor <= 0)
			this.nextExpanderFactor = 0;
	}
	if (changed || GameEngine.wasResized)
	{
		var mapScreenRight = ground.halfWidth + GameEngine.screenWidth/2;
		var mapScreenTop = -ground.halfHeight + GameEngine.screenHeight/2;
		
		this.nextExpanderExpanded.set(mapScreenRight-100, mapScreenTop-100);
		this.nextExpanderContracted.set(mapScreenRight-200, mapScreenTop);
		
		this.nextExpanderPos.set(this.nextExpanderContracted.x, this.nextExpanderContracted.y);
		this.nextExpanderPos.lerp(this.nextExpanderExpanded, this.nextExpanderFactor);
		this.nextExpander.style.left = Math.floor(this.nextExpanderPos.x) + "px";
		this.nextExpander.style.top = Math.floor(this.nextExpanderPos.y) + "px";
	}
	
	switch (this.currentMode)
	{
	case this.MODE_INTRO:
		
		if (this.fadeInDelayTimer === undefined)
		{
			this.fadeInDelayTimer = this.fadeInDelay;
		}
		else if (this.fadeInDelayTimer > 0)
		{
			this.fadeInDelayTimer -= bmacSdk.deltaSec;
		}
		else if (this.faderAlpha > 0)
		{
			this.faderAlpha -= this.fadeInSpeed*bmacSdk.deltaSec;
			if (this.faderAlpha <= 0.5)
			{
				this.animMusicClip = AUDIOMANAGER.playSound(this.musicStartAnim);
				this.faderAlpha = 0.5;
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
				this.ChangeMode(this.MODE_STARTANIM);
			}
			else
			{
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
			}
		}
		
		break;
		
	case this.MODE_STARTANIM:
		
		this.creditsTimer -= bmacSdk.deltaSec;
		if (this.skipIntro)
			this.creditsStage = 100;
		else if (this.creditsTimer <= 0)
		{
			if (!this.creditsStage) this.creditsStage = 0;
			this.creditsStage++;
			switch (this.creditsStage)
			{
			case 1:
				this.creditsLabel.innerHTML += "A game for<br/>";
				this.creditsTimer = 0.7;
				break;
			case 2:
				this.creditsLabel.innerHTML += "<span style='font-size:200%; font-family:Impact;'>Ludum Dare 31</span><br/><br/>";
				this.creditsTimer = 2;
				break;
			case 3:
				this.creditsLabel.innerHTML += "<b>Programming:</b><br/>";
				this.creditsTimer = 1.3;
				break;
			case 4:
				this.creditsLabel.innerHTML += "Brian MacIntosh<br/><br/>";
				this.creditsTimer = 2;
				break;
			case 5:
				this.creditsLabel.innerHTML += "<b>Design:</b><br/>";
				this.creditsTimer = 1.3;
				break;
			case 6:
				this.creditsLabel.innerHTML += "Justin Britch<br/><br/>";
				this.creditsTimer = 3;
				break;
			case 7:
				this.creditsLabel.innerHTML = "";
				break;
			}
		}
		
		if (this.creditsStage >= 7 && this.faderAlpha > 0)
		{
			this.faderAlpha -= this.fadeInSpeed*bmacSdk.deltaSec;
			if (this.faderAlpha <= 0)
			{
				this.faderAlpha = 0;
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
				this.fader.style.visibility = "hidden";
			}
			else
			{
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
			}
		}
		
		// Waiting on both descent and credits
		if (this.shipMesh.position.y >= 0 && this.creditsStage >= 7 && !this.spacemode)
		{
			this.timer = 3;
			this.spacemode = 1;
		}
		
		if (!this.spacemode && this.shipMesh.position.y < 0)
		{
			this.shipMesh.visible = true;
			this.shipMesh.position.y += (30 + (this.skipIntro ? 60 : 0)) * bmacSdk.deltaSec;
			if (this.shipMesh.position.y > 0)
			{
				if (this.thrustAudio)
					this.thrustAudio.volume = 0;
				AUDIOMANAGER.playSound(this.shipLandSound);
				this.shipMesh.position.y = 0;
				this.shipMesh.material.map = this.shipLandTexture;
			}
		}
		else
		{
			switch (this.spacemode)
			{
			case 1:
				this.timer -= bmacSdk.deltaSec;
				if (this.timer <= 0)
				{
					this.timer = 2;
					this.spacemode = 2;
					this.shipMesh.material.map = this.shipOpenTexture;
					AUDIOMANAGER.playSound(this.shipOpenSound);
				}
				break;
			case 2:
				this.timer -= bmacSdk.deltaSec;
				if (this.timer <= 0)
				{
					this.timer = 2;
					this.spacemode = 3;
					player.mesh.position.x = 20;
					player.mesh.position.y = 10;
					ground.ObjectSetDepth(player.mesh);
				}
				break;
			case 3:
				this.timer -= bmacSdk.deltaSec;
				if (this.timer <= 0)
				{
					this.timer = 2;
					this.spacemode = 4;
					this.shipMesh.material.map = this.shipLandTexture;
					AUDIOMANAGER.playSound(this.shipCloseSound);
				}
				break;
			case 4:
				this.timer -= bmacSdk.deltaSec;
				if (this.timer <= 0 && this.creditsStage >= 7 && this.faderAlpha <= 0)
				{
					this.ChangeMode(this.MODE_KILL);
					this.fundsLabel.style.visibility = "visible";
					this.yearCounter.style.visibility = "visible";
					this.shipMesh.material.map = this.shipFlyTexture;
					AUDIOMANAGER.playSound(this.shipLandSound);
				}
				break;
			}
		}
		
		break;
		
	case this.MODE_KILL:
		
		//Exeunt spaceship
		if (this.shipMesh.position.y > -GameEngine.screenHeight)
			this.shipMesh.position.y -= 90 * bmacSdk.deltaSec;
		
		//No income means game over
		if (this.GetGameOver())
		{
			this.ChangeMode(this.MODE_GAMEOVER);
			break;
		}
		
		//Tutorialization
		if (this.wasdHelpTimer > 0)
		{
			this.wasdHelpTimer -= bmacSdk.deltaSec;
			if (this.wasdHelpTimer <= 0)
				this.missionLabel.innerHTML = "Move with 'WASD'.";
		}
		if (this.wasdHelpTimer == -1 && this.mouseHelpTimer > 0)
		{
			this.mouseHelpTimer -= bmacSdk.deltaSec;
			if (this.mouseHelpTimer <= 0)
				this.missionLabel.innerHTML = "Aim and shoot with the mouse.";
		}
		
		//Spawn
		if (this.spawnTimer && this.spawnTimer > 0)
		{
			this.spawnTimer -= bmacSdk.deltaSec;
			if (this.spawnTimer <= 0)
			{
				enemies.Spawn();
			}
		}
		else if (this.spawnPool && this.spawnPool > 0)
		{
			this.spawnTimer = Math.random()*this.maxSpawnInterval;
			this.spawnPool--;
		}
		
		//End mode
		if ((!this.spawnPool || this.spawnPool <= 0) && enemies.enemies.length == 0)
		{
			if (!this.endCombatDelay || this.endCombatDelay <= 0)
			{
				this.endCombatDelay = 1;
			}
			else
			{
				this.endCombatDelay -= bmacSdk.deltaSec;
				if (this.endCombatDelay <= 0)
					this.ChangeMode(this.MODE_BUILD);
			}
		}
		
		break;
		
	case this.MODE_BUILD:
		
		//Expand/contract build tab
		var pressed = false;
		if (GameEngine.keyboard.pressed("q"))
		{
			pressed = true;
			if (!this.tabPressed)
			{
				this.tabPressed = true;
				this.ToggleBuildTab();
			}
		}
		if (GameEngine.keyboard.pressed("e"))
		{
			pressed = true;
			if (!this.tabPressed)
			{
				this.tabPressed = true;
				this.ForceKill();
			}
		}
		if (!pressed)
			this.tabPressed = false;
		
		this.buildModeTimer -= bmacSdk.deltaSec;
		if (this.buildModeTimer <= 0)
			this.ForceKill();
		
		this.buildTimer.innerHTML = "Build: " + Math.floor(this.buildModeTimer) + " sec";
		
		break;
		
	case this.MODE_GAMEOVER:
		
		if (this.faderAlpha < 0.65)
		{
			this.faderAlpha += this.fadeInSpeed*bmacSdk.deltaSec;
			if (this.faderAlpha >= 0.65)
			{
				this.faderAlpha = 0.65;
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
			}
			else
			{
				this.fader.style["background-color"] = "rgba(0,0,0," + this.faderAlpha + ")";
			}
		}
		else
		{
			this.gameOverTimer -= bmacSdk.deltaSec;
			if (this.gameOverTimer <= 0)
			{
				if (!this.gameOverStage) this.gameOverStage = 0;
				this.gameOverStage++;
				switch (this.gameOverStage)
				{
				case 1:
					player.mesh.position.y = -10000;
					this.gameOverLabel.innerHTML += "<span style='font-size:200%; color:#bfbfbf';><b>Ashes to Ashes.</b></span><br/>";
					this.gameOverTimer = 1.5;
					break;
				case 2:
					this.gameOverLabel.innerHTML += "<span style='font-size:160%; color:#bfbfbf';><b>Dust to Dust.</b></span><br/>";
					this.gameOverLabel.innerHTML += "<br/><br/><br/><br/><br/>";
					this.gameOverTimer = 1.5;
					break;
				case 3:
					this.gameOverLabel.innerHTML += "The outpost did not last.<br/>";
					this.gameOverTimer = 2;
					break;
				case 4:
					this.gameOverLabel.innerHTML += this.startYear + " - " + this.currentYear + "<br/><br/>";
					this.gameOverTimer = 1;
					break;
				case 5:
					this.gameOverLabel.innerHTML += "<b>Peak Year:</b><br/>";
					this.gameOverLabel.innerHTML += this.bestYear + " (Income: " + this.bestIncome + this.currencySym + ")<br/>";
					this.gameOverLabel.innerHTML += "<br/><br/>";
					this.gameOverLabel.innerHTML += "<span style='color:#a7e1e2;' onclick='controller.PlayAgain();'><u>Play Again</u></span>";
					this.gameOverTimer = 1;
					break;
				}
			}
		}
		
		break;
	}
	
	//Update build tab
	if (this.buildTabState && this.tabPos < 0)
	{
		this.tabPos += bmacSdk.deltaSec * this.buildTabSpeed;
		if (this.tabPos > 0)
			this.tabPos = 0;
		this.buildContainer.style.left = this.tabPos + "px";
	}
	else if (!this.buildTabState && this.tabPos > -this.buildTabWidth)
	{
		this.tabPos -= bmacSdk.deltaSec * this.buildTabSpeed;
		if (this.tabPos < -this.buildTabWidth)
			this.tabPos = -this.buildTabWidth;
		this.buildContainer.style.left = this.tabPos + "px";
	}
};

controller.AddMoney = function(val)
{
	this.SetMoney(this.funds + val);
};

controller.RemoveMoney = function(val)
{
	this.SetMoney(this.funds - val);
};

controller.SetMoney = function(val)
{
	this.funds = val;
	ground.UpdateBuildPane();
	this.fundsLabel.innerHTML = "Funds: " + this.funds + this.currencySym + " -- Income: " + ground.GetIncome() + this.currencySym;
	
	//If we'll be getting a game over, stop spawning enemies
	if (this.GetGameOver())
		this.spawnPool = 0;
};

controller.GetGameOver = function()
{
	return this.notFirstYear && ground.GetIncome() <= 0 && ground.HasBuildingOfType("Ruin");
};

controller.ForceKill = function()
{
	if (this.currentMode == this.MODE_BUILD)
	{
		AUDIOMANAGER.playSound(this.nextYearSound);
		this.ChangeMode(this.MODE_KILL);
	}
};

controller.ToggleBuildTab = function()
{
	this.SetBuildTab(!this.buildTabState);
};

controller.SetBuildTab = function(val)
{
	this.buildTabState = val;
	if (val)
		AUDIOMANAGER.playSound(this.tabOpenSound);
	else
		AUDIOMANAGER.playSound(this.tabCloseSound);
};

controller.ChangeMode = function(newMode)
{
	if (newMode != this.MODE_BUILD)
	{
		this.buildTabState = false; //No audio here
		this.buildTimer.style.visibility = "hidden";
	}
	else
	{
		this.buildTimer.style.visibility = "visible";
	}
	
	this.currentMode = newMode;
	
	switch (newMode)
	{
	case this.MODE_INTRO:
		var launchButton = document.getElementById("launchButton");
		launchButton.style.visibility="hidden";
		
		var titleLabel = document.getElementById("titleLabel");
		titleLabel.style.visibility="hidden";
		
		AUDIOMANAGER.playSound(this.shipLandSound);
		this.introMusic.pause();
		
		break;
		
	case this.MODE_STARTANIM:
		
		this.creditsTimer = 3;
		
		break;
		
	case this.MODE_BUILD:
		
		if (!this.loopMusic)
		{
			this.loopMusic = AUDIOMANAGER.playSound("audio/music_loop.mp3");
			this.loopMusic.loop = true;
		}
		
		if (this.missionStage == 1)
			this.missionLabel.innerHTML = "Build an outpost. You gain money each year.";
		else if (this.missionStage == 2)
			this.missionLabel.innerHTML = "You have limited time.";
		else
			this.missionLabel.innerHTML = "This world is yours.";
		
		this.buildModeTimer = this.buildModeMaxTime - (this.buildModeMaxTime-this.buildModeMinTime)*(1-1.0/(this.currentYear-this.startYear));
		
		var income = ground.GetIncome();
		this.AddMoney(income);
		
		player.ResetHealth();
		
		//Track best year
		if (!this.bestIncome || income > this.bestIncome)
		{
			this.bestIncome = income;
			this.bestYear = this.currentYear;
		}
		
		this.notFirstYear = true;
		
		break;
		
	case this.MODE_KILL:
		
		this.missionStage++;
		if (this.missionStage < 4)
			this.missionLabel.innerHTML = "";
		
		if (this.notFirstYear)
		{
			this.IncYear();
			this.NewWave();
			if (!this.firstKillMission && ground.GetIncome() > 0)
			{
				this.firstKillMission = true;
				this.missionLabel.innerHTML = "Defend your people.";
			}
		}
		else
		{
			//Spawn starting enemies
			enemies.Spawn(1);
			enemies.Spawn(1);
			enemies.Spawn(1);
			enemies.Spawn(1);
			this.missionLabel.innerHTML = "Clear away the wildlife.";
			this.wasdHelpTimer = 3;
			this.mouseHelpTimer = 3;
		}
		
		break;
		
	case this.MODE_GAMEOVER:
		
		enemies.Clear();
		
		if (this.loopMusic)
		{
			this.loopMusic.pause();
			this.loopMusic.volume = 0;
		}
		AUDIOMANAGER.playSound(this.musicEnd);
		
		this.fundsLabel.style.visibility = "hidden";
		this.yearCounter.style.visibility = "hidden";
		
		this.fader.style.visibility = "visible";
		this.gameOverTimer = 0;
		
		break;
	}
};

controller.NewWave = function()
{
	this.spawnTimer = this.initialSpawnDelay;
	this.spawnPool = Math.max(1, (this.currentYear - this.startYear)) * this.spawnsPerYear;
};

controller.IncYear = function()
{
	this.SetYear(this.currentYear + 1);
};

controller.SetYear = function(year)
{
	this.currentYear = year;
	this.yearCounter.innerHTML = "Year " + year;
};

GameEngine.addObject(controller);
