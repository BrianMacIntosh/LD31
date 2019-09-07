
enemies =
{
	enemies: []
};

enemies.added = function()
{
	this.wildlifeEnemyTexture = THREE.ImageUtils.loadTexture("media/enemy_wildlife.png");
	this.rangedEnemyTexture = THREE.ImageUtils.loadTexture("media/enemy_ranged.png");
	this.wildlifeEnemyGeometry = bmacSdk.GEO.makeSpriteGeo(50, 51);
	this.rangedEnemyGeometry = bmacSdk.GEO.makeSpriteGeo(29, 29);
	
	this.hurtSound = [ "audio/enemy_hurt1.wav", "audio/enemy_hurt2.wav", "audio/enemy_hurt3.wav" ];
	AUDIOMANAGER.preloadSound(this.hurtSound);
};

enemies.removed = function()
{
	this.wildlifeEnemyTexture.dispose();
	this.rangedEnemyTexture.dispose();
	this.wildlifeEnemyGeometry.dispose();
	this.rangedEnemyGeometry.dispose();
};

enemies.update = function()
{
	for (var enemyId = this.enemies.length-1; enemyId >= 0; enemyId--)
	{
		var enemy = this.enemies[enemyId];
		
		//Update logic
		enemy.update();
		
		//Die
		if (enemy.health <= 0
			//Safety check
			|| (ground.FarOutOfBounds(enemy.mesh)))
		{
			this.Destroy(enemyId);
			continue;
		}
	}
};

enemies.AddEnemy = function(enemy)
{
	this.enemies.push(enemy);
};

enemies.Clear = function()
{
	for (var c = this.enemies.length-1; c >= 0; c--)
	{
		this.Destroy(c);
	}
};

enemies.Destroy = function(enemyId)
{
	var enemy = this.enemies[enemyId];
	//enemy.mesh.material.dispose();
	GameEngine.scene.remove(enemy.mesh);
	this.enemies.splice(enemyId, 1);
};

enemies.Spawn = function(type)
{
	var enemy;
	var x = Math.random() * ground.halfWidth;
	var y = Math.random() * ground.halfHeight;
	if (Math.random() > 0.5)
		x *= -1;
	if (Math.random() > 0.5)
		y *= -1;
	if (Math.random() > 0.5)
		x = Math.signum(x) * (ground.halfWidth + ground.tileWidth);
	else
		y = Math.signum(y) * (ground.halfHeight + ground.tileHeight);
	var pos = new THREE.Vector3(x, y, 0);
	
	if (!type) type = Math.random()>0.5 ? 1 : 2;
	if (type == 1)
		enemy = new WildlifeEnemy(pos);
	else if (type == 2)
		enemy = new RangedEnemy(pos);
	
	this.enemies.push(enemy);
};

enemies.KnockBack = function(enemy, awayFrom, speed, duration)
{
	var vel = new THREE.Vector3();
	vel.subVectors(enemy.mesh.position, awayFrom);
	vel.normalize();
	vel.multiplyScalar(speed);
	enemy.knockBackVelocity = vel;
	enemy.knockBackDuration = duration;
};


/// Random-walks until the player is sighted, then turns and charges
function WildlifeEnemy(position)
{
	this.mesh = bmacSdk.GEO.makeSpriteMesh(enemies.wildlifeEnemyTexture, enemies.wildlifeEnemyGeometry);
	GameEngine.scene.add(this.mesh);
	this.mesh.position.set(position.x, position.y, 10);
	
	this.damageTimer = 0;
	
	this.health = 5;
	this.radius = 15;
	
	this.sightRadius = 190;
	this.chargeDelay = 0.8;
	this.chargeDuration = 1.7;
	this.chargeSpeed = 200;
	this.walkSpeed = 40;
	this.damageCooldown = 1;
	
	this.aggroSound = "audio/enemy_aggro.wav";
	this.chargeSound = "audio/enemy_charge.wav";
	AUDIOMANAGER.preloadSound(this.aggroSound);
	AUDIOMANAGER.preloadSound(this.chargeSound);
};

WildlifeEnemy.prototype.Damage = function()
{
	this.health--;
	AUDIOMANAGER.playSound(enemies.hurtSound);
};

WildlifeEnemy.prototype.update = function()
{
	var velocity = 0;
	
	this.damageTimer -= bmacSdk.deltaSec;
	
	//Collide with player
	var dx = this.mesh.position.x - player.mesh.position.x;
	var dy = this.mesh.position.y - player.mesh.position.y;
	var rad = this.radius + player.radius;
	if (dx*dx + dy*dy < rad*rad && this.damageTimer <= 0)
	{
		player.Damage();
		this.damageTimer = this.damageCooldown;
		//player.SolveCollision(this.mesh.position, this.radius);
		player.KnockBack(this.mesh.position, this.chargeSpeed*2, 0.3);
	}
	
	if (!ground.TileValid(ground.GetTileX(this.mesh), ground.GetTileY(this.mesh)))
	{
		//Get on screen
		this.mesh.rotation.z = Math.atan2(this.mesh.position.y, this.mesh.position.x) + Math.PI;
		this.mesh.position.x += Math.cos(this.mesh.rotation.z) * bmacSdk.deltaSec * this.walkSpeed;
		this.mesh.position.y += Math.sin(this.mesh.rotation.z) * bmacSdk.deltaSec * this.walkSpeed;
		this.randomWalkTime = 3;
		
		return;
	}
	
	if (this.chargeLeft)
	{
		this.chargeLeft -= bmacSdk.deltaSec;
		if (this.chargeLeft <= 0)
		{
			//Stop charging
			this.chargeLeft = undefined;
		}
		else
		{
			//Continue charging
			velocity = this.chargeSpeed;
		}
	}
	else if (this.chargeTimer)
	{
		//Wait and then charge
		this.chargeTimer -= bmacSdk.deltaSec;
		if (this.chargeTimer <= 0)
		{
			this.chargeTimer = undefined;
			this.chargeLeft = this.chargeDuration;
			AUDIOMANAGER.playSound(this.chargeSound, 0.6);
		}
		
		//Face player
		this.mesh.rotation.z = Math.atan2(
			this.mesh.position.y - player.mesh.position.y,
			this.mesh.position.x - player.mesh.position.x) + Math.PI;
	}
	else
	{
		//Randomwalk
		if (this.randomWalkTime)
		{
			this.randomWalkTime -= bmacSdk.deltaSec;
			velocity = this.walkSpeed;
			if (this.randomWalkTime <= 0)
			{
				this.randomWalkTime = undefined;
			}
		}
		else if (this.randomWalkWait)
		{
			this.randomWalkWait -= bmacSdk.deltaSec;
			if (this.randomWalkWait <= 0)
			{
				this.randomWalkWait = undefined;
				
				this.randomWalkTime = Math.random()*6;
				if (Math.random() > 0.5)
				{
					//Walk toward center
					this.mesh.rotation.z = Math.atan2(this.mesh.position.y, this.mesh.position.x) + Math.PI;
				}
				else
					this.mesh.rotation.z = Math.random()*Math.PI*2;
			}
		}
		else
		{
			this.randomWalkWait = Math.random() * 2.5;
		}
		
		//Look for player
		var dx = this.mesh.position.x - player.mesh.position.x;
		var dy = this.mesh.position.y - player.mesh.position.y;
		if (dx*dx + dy*dy < this.sightRadius*this.sightRadius)
		{
			this.chargeTimer = this.chargeDelay;
			AUDIOMANAGER.playSound(this.aggroSound, 0.6);
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
	
	//Move
	var blocker = ground.DoMove(this.mesh, Math.cos(this.mesh.rotation.z), Math.sin(this.mesh.rotation.z), velocity, additionalX, additionalY);
	
	//Damage blocking building
	if (blocker && this.damageTimer <= 0)
	{
		if (ground.TileValid(blocker.x, blocker.y))
		{
			if (ground.buildings[blocker.x][blocker.y])
			{
				ground.buildings[blocker.x][blocker.y].Damage();
				
				var ang = Math.atan2(
					ground.GetWorldY(blocker.y)-this.mesh.position.y,
					ground.GetWorldX(blocker.x)-this.mesh.position.x);
				bullets.ImpactAt(
					new THREE.Vector2(this.mesh.position.x+Math.cos(ang)*this.radius, this.mesh.position.y+Math.cos(ang)*this.radius),
					ang - Math.PI);
				
				this.damageTimer = this.damageCooldown;
			}
		}
	}
	
	//Damage standing-on building
	var tx = ground.GetTileX(this.mesh);
	var ty = ground.GetTileY(this.mesh);
	if (ground.TileValid(tx, ty) && ground.buildings[tx][ty] && this.damageTimer <= 0)
	{
		ground.buildings[tx][ty].Damage();
		this.damageTimer = this.damageCooldown;
	}
};


/// Circle-strafes and shoots at player and stuff
function RangedEnemy(position)
{
	this.mesh = bmacSdk.GEO.makeSpriteMesh(enemies.rangedEnemyTexture, enemies.rangedEnemyGeometry);
	GameEngine.scene.add(this.mesh);
	this.mesh.position.set(position.x, position.y, 10);
	
	this.health = 2;
	this.radius = 14;
	
	this.desiresCenterDist = 180;
	this.walkSpeed = 30;
	this.gunCooldown = 0.8;
	this.shootRange = 200;
	this.bulletSpeed = 200;
	this.clipSize = 3;
	this.reloadTime = 1.5;
	this.buildingAggroRange = 3;
	
	this.gunCd = 0;
	this.clip = this.clipSize;
	
	this.shootSound = [ "audio/enemy_shoot1.wav", "audio/enemy_shoot2.wav", "audio/enemy_shoot3.wav" ];
	AUDIOMANAGER.preloadSound(this.shootSound);
};

RangedEnemy.prototype.Damage = function()
{
	this.health--;
	AUDIOMANAGER.playSound(enemies.hurtSound);
};

RangedEnemy.prototype.update = function()
{
	var velocity = 0;
	var moveAngle = 0;
	var shootAt = undefined;
	
	if (!ground.TileValid(ground.GetTileX(this.mesh), ground.GetTileY(this.mesh)))
	{
		//Get on screen
		ang = Math.atan2(this.mesh.position.y, this.mesh.position.x) + Math.PI;
		this.mesh.position.x += Math.cos(ang) * bmacSdk.deltaSec * this.walkSpeed;
		this.mesh.position.y += Math.sin(ang) * bmacSdk.deltaSec * this.walkSpeed;
		return;
	}
	
	//Select interesting targets in range
	var dx = this.mesh.position.x - player.mesh.position.x;
	var dy = this.mesh.position.y - player.mesh.position.y;
	if (dx*dx + dy*dy < this.shootRange*this.shootRange)
	{
		//Shoot player
		shootAt = player.mesh;
	}
	else
	{
		//Shoot buildings
		var tx = ground.GetTileX(this.mesh);
		var ty = ground.GetTileY(this.mesh);
		for (var x = -this.buildingAggroRange; x <= this.buildingAggroRange; x++)
		{
			for (var y = -this.buildingAggroRange; y <= this.buildingAggroRange; y++)
			{
				if (ground.TileValid(x+tx, y+ty) && ground.buildings[x+tx][y+ty])
					shootAt = ground.buildings[x+tx][y+ty];
			}
		}
	}
	
	var dx = this.mesh.position.x;
	var dy = this.mesh.position.y;
	if (this.boredTime === undefined
		&& dx*dx + dy*dy > this.desiresCenterDist*this.desiresCenterDist)
	{
		//Move toward map center
		moveAngle = Math.atan2(this.mesh.position.y, this.mesh.position.x) + Math.PI;
		velocity = this.walkSpeed;
	}
	else if (!shootAt)
	{
		if (!this.attentionSpan)
		{
			this.attentionSpan = Math.random()*2+2;
		}
		else
		{
			this.attentionSpan -= bmacSdk.deltaSec;
			
			if (this.attentionSpan <= 0)
			{
				if (this.boredTime === undefined)
				{
					//I'm bored (and also boring)
					//Pick left or right
					moveAngle = moveAngle + (Math.PI/2) * (Math.random()>0.5?-1:1);
					this.boredTime = Math.random()*2+2;
				}
				else
				{
					velocity = this.walkSpeed;
					this.boredTime -= bmacSdk.deltaSec;
					if (this.boredTime <= 0)
					{
						this.boredTime = undefined;
						this.attentionSpan = undefined;
					}
				}
			}
		}
	}
	
	//Point at target
	if (shootAt)
	{
		this.mesh.rotation.z = Math.atan2(
			this.mesh.position.y - shootAt.position.y,
			this.mesh.position.x - shootAt.position.x) + Math.PI;
	}
	else
	{
		this.mesh.rotation.z = moveAngle;
	}
	
	//Reload
	if (this.clip <= 0)
	{
		if (!this.reloadTimer)
		{
			this.reloadTimer = this.reloadTime;
		}
		else
		{
			this.reloadTimer -= bmacSdk.deltaSec;
			if (this.reloadTimer <= 0)
			{
				this.reloadTimer = undefined;
				this.clip = this.clipSize;
			}
		}
	}
	
	//Fire weapon
	if (this.gunCd <= 0)
	{
		if (shootAt && this.clip > 0)
		{
			this.gunCd = this.gunCooldown;
			bullets.Create(this, this.bulletSpeed);
			this.clip--;
			AUDIOMANAGER.playSound(this.shootSound, 0.4);
		}
	}
	else
	{
		this.gunCd -= bmacSdk.deltaSec;
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
	
	//Move
	ground.DoMove(this.mesh, Math.cos(moveAngle), Math.sin(moveAngle), velocity, additionalX, additionalY);
};


GameEngine.addObject(enemies);