
bullets =
{
	bullets: [],
	particles: [],
	particlePool: [],
	
	knockBackSpeed: 300,
	knockBackDuration: 0.03
};

bullets.added = function()
{
	this.bulletTexture = THREE.ImageUtils.loadTexture("media/bullet.png");
	this.bulletGeometry = bmacSdk.GEO.makeSpriteGeo(20, 20);
	
	this.particleTexture = THREE.ImageUtils.loadTexture("media/particle.png");
	this.particleGeometry = bmacSdk.GEO.makeSpriteGeo(10, 10);
};

bullets.removed = function()
{
	this.bulletTexture.dispose();
	this.bulletGeometry.dispose();
};

bullets.update = function()
{
	for (var bulletId = this.bullets.length-1; bulletId >= 0; bulletId--)
	{
		var bullet = this.bullets[bulletId];
		var dead = false;
		
		//Move bullet
		bullet.position.x += Math.cos(bullet.rotation.z) * bmacSdk.deltaSec * bullet.speed;
		bullet.position.y += Math.sin(bullet.rotation.z) * bmacSdk.deltaSec * bullet.speed;
		
		ground.ObjectSetDepth(bullet);
		
		//Offscreen kill
		if (bullet.position.x < -GameEngine.screenWidth/2 || bullet.position.x > GameEngine.screenWidth/2
			|| bullet.position.y < -GameEngine.screenHeight/2 || bullet.position.y > GameEngine.screenHeight/2)
		{
			this.Destroy(bulletId);
			continue;
		}
		
		//Collide with enemies
		for (var enemyId = 0; enemyId < enemies.enemies.length; enemyId++)
		{
			var enemy = enemies.enemies[enemyId];
			var dx = enemy.mesh.position.x - bullet.position.x;
			var dy = enemy.mesh.position.y - bullet.position.y;
			var rad = enemy.radius + bullet.radius;
			if (dx*dx + dy*dy < rad*rad)
			{
				if (bullet.owner !== enemy)
				{
					enemies.KnockBack(enemy, bullet.position, this.knockBackSpeed, this.knockBackDuration);
					enemy.Damage();
					this.Destroy(bulletId);
					dead = true;
					break;
				}
			}
			else
			{
				if (bullet.owner === enemy)
					bullet.owner = undefined;
			}
		}
		if (dead) continue;
		
		//Collide with player
		var dx = player.mesh.position.x - bullet.position.x;
		var dy = player.mesh.position.y - bullet.position.y;
		var rad = player.radius + bullet.radius;
		if (dx*dx + dy*dy < rad*rad)
		{
			if (bullet.owner !== player)
			{
				player.Damage();
				this.Destroy(bulletId);
				continue;
			}
		}
		else
		{
			if (bullet.owner === player)
				bullet.owner = undefined;
		}
		
		//Collide with buildings
		var tx = ground.GetTileX(bullet);
		var ty = ground.GetTileY(bullet);
		if (tx >= 0 && ty >= 0 && tx < ground.tilesX && ty < ground.tilesY
			&& ground.buildings[tx][ty])
		{
			if (!ground.buildingBases[ground.buildings[tx][ty].baseId].walkable)
			{
				if (bullet.permaOwner != player)
					ground.buildings[tx][ty].Damage();
				this.Destroy(bulletId);
				continue;
			}
		}
	}
	
	for (var particleId = this.particles.length-1; particleId >= 0; particleId--)
	{
		var particle = this.particles[particleId];
		particle.position.x += particle.velocity * bmacSdk.deltaSec * Math.cos(particle.rotation.z);
		particle.position.y += particle.velocity * bmacSdk.deltaSec * Math.sin(particle.rotation.z);
		particle.lifetime -= bmacSdk.deltaSec;
		if (particle.lifetime <= 0)
		{
			particle.position.y = -10000;
			this.particlePool.push(particle);
			this.particles.splice(particleId, 1);
		}
	}
};

bullets.ImpactAt = function(at, ang)
{
	for (var c = 0; c < 5; c++)
	{
		var particle;
		if (this.particlePool.length > 0)
		{
			particle = this.particlePool[0];
			this.particlePool.splice(0, 1);
		}
		else
		{
			particle = bmacSdk.GEO.makeSpriteMesh(this.particleTexture, this.particleGeometry);
			GameEngine.scene.add(particle);
		}
		
		particle.position.set(at.x, at.y, 500);
		particle.rotation.z = Math.random() * Math.PI - Math.PI/2 + ang;
		particle.velocity = Math.random() * 200 + 100;
		particle.lifetime = 0.25;
		this.particles.push(particle);
	}
};

bullets.Create = function(owner, speed)
{
	var bullet = bmacSdk.GEO.makeSpriteMesh(this.bulletTexture, this.bulletGeometry);
	bullet.position.set(owner.mesh.position.x, owner.mesh.position.y, 10);
	bullet.rotation.z = owner.mesh.rotation.z;
	bullet.owner = owner;
	bullet.permaOwner = owner;
	bullet.speed = speed;
	bullet.radius = 4;
	
	GameEngine.scene.add(bullet);
	this.bullets.push(bullet);
};

bullets.Destroy = function(bulletId)
{
	this.ImpactAt(this.bullets[bulletId].position, this.bullets[bulletId].rotation.z - Math.PI);
	
	var bullet = this.bullets[bulletId];
	bullet.material.dispose();
	GameEngine.scene.remove(bullet);
	this.bullets.splice(bulletId, 1);
};


GameEngine.addObject(bullets);