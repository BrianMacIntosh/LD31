
player =
{
	maxSpeed: 85,
	gunCooldown: 0.105,
	radius: 9,
	maxHealth: 8,
	bulletSpeed: 600,
	respawnTime: 3
};

player.added = function()
{
	this.playerTexture = THREE.ImageUtils.loadTexture("media/player.png");
	this.playerGeometry = bmacSdk.GEO.makeSpriteGeo(26, 25);
	
	this.mesh = bmacSdk.GEO.makeSpriteMesh(this.playerTexture, this.playerGeometry);
	GameEngine.scene.add(this.mesh);
	
	this.mesh.position.set(0, -10000, 10);
	
	this.gunCd = 0;
	this.health = this.maxHealth;
	
	this.shootSound = [ "audio/player_shoot1.wav", "audio/player_shoot2.wav", "audio/player_shoot3.wav" ];
	this.hurtSound = [ "audio/player_hurt1.wav", "audio/player_hurt2.wav" ];
	this.playerRespawnSound = "audio/player_respawn.wav";
	this.playerDeathSound = "audio/player_death.wav";
	AUDIOMANAGER.preloadSound(this.shootSound);
	AUDIOMANAGER.preloadSound(this.hurtSound);
	AUDIOMANAGER.preloadSound(this.playerRespawnSound);
	AUDIOMANAGER.preloadSound(this.playerDeathSound);
};

player.removed = function()
{
	this.playerTexture.dispose();
	this.playerGeometry.dispose();
	
	GameEngine.scene.remove(this.mesh);
	this.mesh = undefined;
};

player.ResetHealth = function()
{
	this.health = this.maxHealth;
};

player.update = function()
{
	//Rotate player
	this.mesh.rotation.z = Math.atan2(
		this.mesh.position.y - GameEngine.mousePosWorld.y,
		this.mesh.position.x - GameEngine.mousePosWorld.x) + Math.PI;
	
	this.respawnTimer -= bmacSdk.deltaSec;
	if (this.respawnTimer <= 0)
	{
		this.ResetHealth();
		this.respawnTimer = undefined;
		AUDIOMANAGER.playSound(this.playerRespawnSound);
		
		//Find an open space to spawn
		var x = Math.floor(ground.tilesX/2);
		this.mesh.position.x = ground.GetWorldX(x);
		for (var y = 0; y < Math.floor(ground.tilesY/2); y++)
		{
			var oy = Math.floor(ground.tilesY/2)+y;
			if (ground.TileValid(x, oy) && !ground.buildings[x][oy])
			{
				this.mesh.position.y = ground.GetWorldY(oy);
				break;
			}
			var oy = Math.floor(ground.tilesY/2)-y;
			if (ground.TileValid(x, oy) && !ground.buildings[x][oy])
			{
				this.mesh.position.y = ground.GetWorldY(oy);
				break;
			}
		}
	}
	
	if (controller.currentMode == controller.MODE_STARTANIM || this.health <= 0 || controller.currentMode == controller.MODE_GAMEOVER)
		return;
	
	//Move player
	var moveX = 0;
	var moveY = 0;
	if (GameEngine.keyboard.pressed("a"))
	{
		moveX--;
	}
	if (GameEngine.keyboard.pressed("d"))
	{
		moveX++;
	}
	if (GameEngine.keyboard.pressed("w"))
	{
		moveY--;
	}
	if (GameEngine.keyboard.pressed("s"))
	{
		moveY++;
	}
	
	//Cancel tutorial
	if (moveX != 0 || moveY != 0)
		controller.wasdHelpTimer = -1;
	
	//Shoot gun
	if (this.gunCd > 0)
	{
		this.gunCd -= bmacSdk.deltaSec;
	}
	else
	{
		if (this.waitForMouseUp)
		{
			if (GameEngine.mouse.mouseUp[1])
				this.waitForMouseUp = false;
		}
		else if (GameEngine.mouse.mouseDown[1] && !ground.currentBuilding)
		{
			//Cancel tutorial
			controller.mouseHelpTimer = -1;
			
			this.gunCd = this.gunCooldown;
			bullets.Create(this, this.bulletSpeed);
			AUDIOMANAGER.playSound(this.shootSound, 0.2);
		}
	}
	
	//Knock back
	var additionalX = 0;
	var additionalY = 0;
	if (this.knockBackDuration)
	{
		this.knockBackDuration -= bmacSdk.deltaSec;
		additionalX += this.knockBackVelocity.x;
		additionalY += this.knockBackVelocity.y;
		if (this.knockBackDuration <= 0)
		{
			this.knockBackDuration = undefined;
			this.knockBackVelocity = undefined;
		}
	}
	
	var speed = this.maxSpeed;
	var tx = ground.GetTileX(this.mesh);
	var ty = ground.GetTileY(this.mesh);
	if (ground.TileValid(tx, ty))
	{
		var bld = ground.buildings[tx][ty];
		if (bld && ground.buildingBases[bld.baseId].moveSpeedBonus)
			speed += ground.buildingBases[bld.baseId].moveSpeedBonus;
	}
	if (controller.currentMode > controller.MODE_STARTANIM)
		ground.DoMove(this.mesh, moveX, moveY, speed, additionalX, additionalY);
};

player.Damage = function()
{
	if (this.health > 0)
	{
		this.health--;
		if (this.health <= 0)
		{
			this.mesh.position.y = -10000;
			this.respawnTimer = this.respawnTime;
			AUDIOMANAGER.playSound(this.playerDeathSound);
		}
		else
			AUDIOMANAGER.playSound(this.hurtSound);
	}
};

/// Move the player out of the collision
player.SolveCollision = function(otherPos, otherRad)
{
	var dir = new THREE.Vector3();
	dir.subVectors(this.mesh.position, otherPos);
	dir.normalize();
	dir.multiplyScalar(otherRad + this.radius);
	dir.add(this.mesh.position);
	this.mesh.position = dir;
};

player.KnockBack = function(awayFrom, speed, duration)
{
	var vel = new THREE.Vector3();
	vel.subVectors(this.mesh.position, awayFrom);
	vel.normalize();
	vel.multiplyScalar(speed);
	this.knockBackVelocity = vel;
	this.knockBackDuration = duration;
};


GameEngine.addObject(player);