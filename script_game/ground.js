
ground =
{
	tilesX: 15,
	tilesY: 15,
	tileWidth: 40,
	tileHeight: 40,
	tileRatY: 0.707,
	
	baseIncome: 0,
	
	bTextureChance: 0.04
};

ground.added = function()
{
	this.tileWorldHeight = this.tileHeight*this.tileRatY;
	this.halfWidth = this.tilesX*this.tileWidth/2;
	this.halfHeight = this.tilesY*this.tileWorldHeight/2;
	
	this.tileTexture = THREE.ImageUtils.loadTexture("media/groundtile.png");
	this.tileTexture.magFilter = this.tileTexture.minFilter = THREE.NearestFilter;
	this.tileGeometry = bmacSdk.GEO.makeSpriteGeo(this.tileWidth, this.tileHeight);
	this.buildingGeometry = bmacSdk.GEO.makeSpriteGeo(40, 64);
	
	this.particleTexture = THREE.ImageUtils.loadTexture("media/money.png");
	this.particleGeometry = bmacSdk.GEO.makeSpriteGeo(16, 16);
	this.particles = [];
	this.particlePool = [];
	
	this.buildings = [];
	var tiles = [];
	for (var x = 0; x < this.tilesX; x++)
	{
		this.buildings[x] = [];
		tiles[x] = [];
		for (var y = 0; y < this.tilesY; y++)
		{
			tiles[x][y] = bmacSdk.GEO.makeSpriteMesh(this.tileTexture, this.tileGeometry);
			GameEngine.scene.add(tiles[x][y]);
			tiles[x][y].position.set(
				this.GetWorldX(x),
				this.GetWorldY(y),
				0);
		}
	}
	
	//Building data
	this.buildingBases = [];
	this.buildingBases.push({
		name: "Demolish",
		desc: "Remove a building or ruin.",
		textureUrl: "media/bld_demolish.png",
		walkable: true,
		cost: 4,
		health: 0,
		demolish: true
	});
	this.buildingBases.push({
		name: "Wall",
		desc: "High health.",
		textureUrl: "media/bld_wall.png",
		cost: 2,
		health: 20
	});
	this.buildingBases.push({
		name: "Road",
		desc: "Move faster on roads.",
		textureUrl: "media/bld_road.png",
		walkable: true,
		moveSpeedBonus: 85,
		cost: 1,
		health: 6
	});
	this.buildingBases.push({
		name: "House",
		desc: "Generates a little income.",
		textureUrl: "media/bld_house.png",
		cost: 4,
		health: 10,
		porch: true,
		value: function(x,y)
		{
			return 2 + 2*ground.CountInRange(x, y, "Garden", 1);
		}
	});
	this.buildingBases.push({
		name: "Store",
		desc: "Generates income for each house within 2 tiles.",
		textureUrl: "media/bld_store.png",
		cost: 6,
		health: 10,
		porch: true,
		value: function(x,y)
		{
			return ground.AggregateValueInRange(x, y, "House", 2);
		}
	});
	this.buildingBases.push({
		name: "Garden",
		desc: "Increases value of adjacent houses. Low health.",
		textureUrl: "media/bld_garden.png",
		textureUrlB: "media/bld_garden_b.png",
		walkable: true,
		cost: 12,
		health: 3
	});
	this.buildingBases.push({
		name: "Ruin",
		desc: "",
		textureUrl: "media/bld_ruin.png",
		walkable: true,
		cost: 0,
		health: 0,
		hideFromList: true
	});
	
	for (var c = 0; c < this.buildingBases.length; c++)
	{
		//Load tex
		this.buildingBases[c].texture = THREE.ImageUtils.loadTexture(this.buildingBases[c].textureUrl);
		this.buildingBases[c].texture.magFilter = this.buildingBases[c].texture.minFilter = THREE.NearestFilter;
		if (this.buildingBases[c].textureUrlB)
		{
			this.buildingBases[c].textureB = THREE.ImageUtils.loadTexture(this.buildingBases[c].textureUrlB);
			this.buildingBases[c].textureB.magFilter = this.buildingBases[c].textureB.minFilter = THREE.NearestFilter;
		}
	}
	
	this.UpdateBuildPane();
	
	this.buildSelectAudio = "audio/build_select.wav";
	this.buildSelectInvalidAudio = "audio/build_selectnomoney.wav";
	this.buildPlaceAudio = "audio/build_place.wav";
	this.buildHurtAudio = "audio/build_hurt.wav";
	this.buildDestroyAudio = "audio/build_destroy.wav";
	
	AUDIOMANAGER.preloadSound(this.buildSelectAudio);
	AUDIOMANAGER.preloadSound(this.buildSelectInvalidAudio);
	AUDIOMANAGER.preloadSound(this.buildPlaceAudio);
	AUDIOMANAGER.preloadSound(this.buildHurtAudio);
	AUDIOMANAGER.preloadSound(this.buildDestroyAudio);
};

ground.ShowIncomeIncreaseIf = function(building, x, y)
{
	//Calculate increase in income
	this.GetIncome(1);
	var oldbld = this.buildings[x][y];
	this.buildings[x][y] = building;
	this.GetIncome(2);
	this.buildings[x][y] = oldbld;
	
	//Display increase
	for (var x = 0; x < this.tilesX; x++)
	{
		for (var y = 0; y < this.tilesY; y++)
		{
			if (this.buildings[x][y])
			{
				console.log(this.buildings[x][y].cachedValue);
				if (this.buildings[x][y].cachedValue > 0)
					this.ShowIncomeAt(x, y, this.buildings[x][y].cachedValue);
			}
		}
	}
};

ground.ShowIncomeAt = function(x, y, value)
{
	var worldx = this.GetWorldX(x);
	var worldy = this.GetWorldY(y);
	for (var c = 0; c < value; c++)
	{
		var particle;
		if (this.particlePool.length > 0)
		{
			particle = this.particlePool[0];
			this.particlePool.splice(0, 1);
			particle.visible = true;
		}
		else
		{
			particle = bmacSdk.GEO.makeSpriteMesh(this.particleTexture, this.particleGeometry);
			GameEngine.scene.add(particle);
		}
		
		this.particles.push(particle);
		particle.moveTime = 0.3;
		particle.lifeTime = 1.3;
		particle.velocity = 100;
		particle.position.set(worldx + 18*(c - (value-1)/2), worldy, 500);
	}
};

ground.HasBuildingOfType = function(type)
{
	var type = this.GetBuildingBaseByName(type);
	for (var x = 0; x < this.tilesX; x++)
	{
		for (var y = 0; y < this.tilesY; y++)
		{
			if (this.buildings[x][y] && this.buildings[x][y].baseId == type)
				return true;
		}
	}
	return false;
};

ground.GetBuildingBaseByName = function(type)
{
	for (var i = 0; i < this.buildingBases.length; i++)
	{
		if (this.buildingBases[i].name === type)
			return i;
	}
	return -1;
};

ground.CountInRange = function(x, y, type, range)
{
	var count = 0;
	var type = this.GetBuildingBaseByName(type);
	for (var dx = -range; dx <= range; dx++)
	{
		for (var dy = -range; dy <= range; dy++)
		{
			if (dx != 0 || dy != 0)
			{
				var rx = dx+x;
				var ry = dy+y;
				if (this.TileValid(rx, ry) && this.buildings[rx][ry] && this.buildings[rx][ry].baseId == type)
				{
					count++;
				}
			}
		}
	}
	return count;
};

ground.AggregateValueInRange = function(x, y, type, range)
{
	var count = 0;
	var type = this.GetBuildingBaseByName(type);
	for (var dx = -range; dx <= range; dx++)
	{
		for (var dy = -range; dy <= range; dy++)
		{
			if (dx != 0 || dy != 0)
			{
				var rx = dx+x;
				var ry = dy+y;
				if (this.TileValid(rx, ry) && this.buildings[rx][ry] && this.buildings[rx][ry].baseId == type)
				{
					if (this.buildingBases[type].value)
						count += this.buildingBases[type].value(rx, ry);
				}
			}
		}
	}
	return count;
};

ground.UpdateBuildPane = function()
{
	if (!this.buildingBases)
		return;
	
	//Fill out building information
	var buildstr = "[Q] Exit Building Mode";
	for (var c = 0; c < this.buildingBases.length; c++)
	{
		if (this.buildingBases[c].hideFromList) continue;
		
		buildstr += "<hr/><span onclick='ground.Build(" + c + ")'>";
		buildstr += "[<b>" + (c+1) + "</b>] ";
		buildstr += "<img src=\"" + this.buildingBases[c].textureUrl + "\" height=\"32px\"/> ";
		buildstr += "<b>" + this.buildingBases[c].name + " ";
		if (this.buildingBases[c].cost > controller.funds)
			buildstr += "<span style='color:#ff4c4c'>";
		buildstr += "(" + this.buildingBases[c].cost + controller.currencySym + ")";
		if (this.buildingBases[c].cost > controller.funds)
			buildstr += "</span>";
		buildstr += "</b><br/>";
		if (this.buildingBases[c].desc !== "")
			buildstr += this.buildingBases[c].desc;
		buildstr += "</span>";
	}
	
	this.buildTab = document.getElementById("buildTab");
	this.buildTab.innerHTML = buildstr;
}

ground.removed = function()
{
	this.tileTexture.dispose();
	this.tileGeometry.dispose();
};

ground.InstantiateBuilding = function(c)
{
	var texture = this.buildingBases[c].textureB && Math.random()<this.bTextureChance ? this.buildingBases[c].textureB : this.buildingBases[c].texture;
	var material = new THREE.ShaderMaterial(
	{
		uniforms:
		{
			uTexture: { type: "t", value: texture },
			uColor: { type: "c", value: new THREE.Color(0xFFFFFF) },
			uBlend: { type: "f", value: 1 },
			uTileX: { type: "f", value: 0 },
			uTileY: { type: "f", value: 0 },
			uMaxTileX: { type: "f", value: 4 },
			uMaxTileY: { type: "f", value: 1 }
		},
		vertexShader: document.getElementById("vert_simple").textContent,
		fragmentShader: document.getElementById("frag_spritesheet").textContent,
		transparent: true
	});
	
	var build = bmacSdk.GEO.makeSpriteMeshMat(material, this.buildingGeometry);
	build.baseId = c;
	build.health = this.buildingBases[c].health;
	build.Damage = function()
	{
		this.health--;
		if (this.health == 0)
		{
			this.baseId = ground.GetBuildingBaseByName("Ruin");
			this.material.uniforms.uTileX.value = 3;
			
			AUDIOMANAGER.playSound(ground.buildDestroyAudio);
			
			//Update income display
			controller.AddMoney(0);
		}
		else if (this.health > 0)
		{
			//Update frame
			this.material.uniforms.uTileX.value = Math.floor(3 * (1-this.health / ground.buildingBases[this.baseId].health));
			
			AUDIOMANAGER.playSound(ground.buildHurtAudio);
		}
	};
	GameEngine.scene.add(build);
	build.position.z = 20;
	return build;
};

ground.Build = function(c)
{
	if (this.buildingBases[c].hideFromList) return;
	
	if (this.currentBuilding)
	{
		GameEngine.scene.remove(this.currentBuilding);
		this.currentBuilding = null;
	}
	
	if (controller.funds >= this.buildingBases[c].cost)
		AUDIOMANAGER.playSound(this.buildSelectAudio, 0.6);
	else
		AUDIOMANAGER.playSound(this.buildSelectInvalidAudio, 0.6);
	
	this.eWasPressed = true; //TODO: ???
	this.currentBuilding = this.InstantiateBuilding(c);
};

ground.update = function()
{
	for (var c = 0; c < this.particles.length; c++)
	{
		var particle = this.particles[c];
		if (particle.moveTime > 0)
			particle.position.y -= particle.velocity * Math.min(particle.moveTime, bmacSdk.deltaSec);
		particle.moveTime -= bmacSdk.deltaSec;
		particle.lifeTime -= bmacSdk.deltaSec;
		if (particle.lifeTime <= 0)
		{
			this.particlePool.push(particle);
			particle.visible = false;
			this.particles.splice(c, 1);
		}
	}
	
	//Start building
	if (controller.buildTabState)
	{
		var anypress = false;
		for (var c = 0; c < this.buildingBases.length; c++)
		{
			if (GameEngine.keyboard.pressed(""+(c+1)))
			{
				anypress = true;
				if (!this.eWasPressed)
				{
					this.Build(c);
				}
			}
		}
		if (!anypress)
			this.eWasPressed = undefined;
	}
	
	//Update building
	if (this.currentBuilding)
	{
		if (!controller.buildTabState)
		{
			//Cancel
			GameEngine.scene.remove(this.currentBuilding);
			this.currentBuilding = null;
		}
		else
		{
			var tilex = this.ToTileX(GameEngine.mousePosWorld.x);
			var tiley = this.ToTileY(GameEngine.mousePosWorld.y);
			if (this.TileValid(tilex, tiley))
			{
				this.currentBuilding.position.x = this.GetWorldX(tilex);
				this.currentBuilding.position.y = this.GetWorldY(tiley);
				
				//Conditions:
				//- tile empty (except for demo)
				//- got money
				//- not screen edge
				//- not porch-blocking
				var demo = this.buildingBases[this.currentBuilding.baseId].demolish;
				var valid = !!this.buildings[tilex][tiley] == !!demo
					&& controller.funds >= this.buildingBases[this.currentBuilding.baseId].cost
					&& tiley > 0 && tiley < this.tilesY-1 && tilex > 0 && tilex < this.tilesX-1
					&& (this.buildingBases[this.currentBuilding.baseId].walkable || !this.buildings[tilex][tiley-1] || !this.buildingBases[this.buildings[tilex][tiley-1].baseId].porch);
				this.currentBuilding.material.uniforms.uColor.value.set(valid ? 0xFFFFFF : 0xFF0000);
				this.currentBuilding.material.uniforms.uBlend.value = valid ? 1 : 0.5;
				
				ground.ObjectSetDepth(this.currentBuilding, -2);
				if (GameEngine.mouse.mouseDownNew[1])
				{
					if (valid)
					{
						controller.RemoveMoney(this.buildingBases[this.currentBuilding.baseId].cost);
						GameEngine.mouse.mouseDownNew[1] = false;
						player.waitForMouseUp = true;
						
						this.ShowIncomeIncreaseIf(this.currentBuilding, tilex, tiley);
						
						AUDIOMANAGER.playSound(this.buildPlaceAudio);
						
						if (demo)
						{
							this.DestroyAt(tilex, tiley);
							GameEngine.scene.remove(this.currentBuilding);
						}
						else
						{
							this.buildings[tilex][tiley] = this.currentBuilding;
						}
						this.currentBuilding = undefined;
						
						//Update income display
						controller.AddMoney(0);
					}
					else
					{
						AUDIOMANAGER.playSound(this.buildSelectInvalidAudio);
					}
				}
			}
		}
	}
};

ground.DestroyAt = function(x, y)
{
	if (this.TileValid(x, y) && this.buildings[x][y])
	{
		GameEngine.scene.remove(this.buildings[x][y]);
		this.buildings[x][y] = undefined;
	}
};

ground.TileValid = function(x, y)
{
	return x >= 0 && y >= 0 && x < this.tilesX && y < this.tilesY;
};

ground.FarOutOfBounds = function(obj)
{
	var tx = this.GetTileX(obj);
	var ty = this.GetTileY(obj);
	var tolerance = 5;
	return tx < -tolerance || ty < -tolerance || tx > this.tilesX+tolerance || ty > this.tilesY+tolerance;
};

ground.ObjectSetDepth = function(obj, inc)
{
	obj.position.z = this.GetTileY(obj)*10 + 10 + (inc ? inc : 0);
};

ground.IsWalkable = function(tx, ty)
{
	tx = Math.round(tx);
	ty = Math.round(ty);
	if (tx >= 0 && ty >= 0 && tx < this.tilesX && ty < this.tilesY)
	{
		return !this.buildings[tx][ty] || this.buildingBases[this.buildings[tx][ty].baseId].walkable;
	}
	else
		return false;
};

ground.GetTileX = function(obj)
{
	return Math.floor((obj.position.x + this.halfWidth) / this.tileWidth);
};

ground.GetTileY = function(obj)
{
	return Math.floor((obj.position.y + this.halfHeight) / this.tileWorldHeight);
};

ground.ToTileX = function(world)
{
	return Math.floor((world + this.halfWidth) / this.tileWidth);
};

ground.ToTileY = function(world)
{
	return Math.floor((world + this.halfHeight) / this.tileWorldHeight);
};

ground.GetWorldX = function(tilex)
{
	return (tilex+0.5) * this.tileWidth - this.halfWidth;
};

ground.GetWorldY = function(tiley)
{
	return (tiley+0.5) * this.tileWorldHeight - this.halfHeight;
};

/// Returns Vector2 of blocker or falsey value
ground.DoMove = function(mesh, moveX, moveY, maxSpeed, additionalX, additionalY)
{
	//Normalize
	var sum = moveX+moveY;
	if (sum > 0)
	{
		moveX /= sum;
		moveY /= sum;
	}
	
	var blocker;
	
	//Force back onto field
	var tx = this.GetTileX(mesh);
	var ty = this.GetTileY(mesh);
	if (tx < 0)
		mesh.position.x = this.GetWorldX(0);
	else if (tx >= this.tilesX)
		mesh.position.x = this.GetWorldX(this.tilesX-1);
	if (ty < 0)
		mesh.position.y = this.GetWorldY(0);
	else if (ty >= this.tilesY)
		mesh.position.y = this.GetWorldY(this.tilesY-1);
	
	//Weird input transformation
	/*if (Math.abs(moveX) > Math.abs(moveY))
		moveY = 0;
	else
		moveX = 0;*/
	
	//If player is not aligned to direction of movement, fix that first
	var axisX = ground.GetWorldX(ground.GetTileX(mesh));
	var axisY = ground.GetWorldY(ground.GetTileY(mesh));
	/*if (moveX != 0 && axisY != mesh.position.y)
	{
		var dir = Math.signum(axisY - mesh.position.y);
		if (moveY) dir = moveY;
		mesh.position.y += dir * bmacSdk.deltaSec * maxSpeed;
		if (Math.signum(axisY - mesh.position.y) != dir)
			mesh.position.y = axisY;
	}
	else if (moveY != 0 && axisX != mesh.position.x)
	{
		var dir = Math.signum(axisX - mesh.position.x);
		if (moveX) dir = moveX;
		mesh.position.x += dir * bmacSdk.deltaSec * maxSpeed;
		if (Math.signum(axisX - mesh.position.x) != dir)
			mesh.position.x = axisX;
	}*/
	
	//Actually move
	var sometx = ground.GetTileX(mesh);
	var somety = ground.GetTileY(mesh);
	var tx = ground.ToTileX(mesh.position.x - Math.signum(moveX)*0.5*this.tileWidth);
	var ty = ground.ToTileY(mesh.position.y - Math.signum(moveY)*0.5*this.tileWorldHeight);
	var destX = tx + Math.signum(moveX);
	var destY = ty + Math.signum(moveY);
	if (destX >= 0 && destY >= 0 && destX < ground.tilesX && destY < ground.tilesY)
	{
		var tyWalkable = this.IsWalkable(destX, ty);
		var sometyWalkable = this.IsWalkable(destX, somety);
		if (!(tyWalkable || sometyWalkable))
			blocker = new THREE.Vector2(destX, sometyWalkable ? ty : somety);
		else if (!this.IsWalkable(destX, destY))
			blocker = new THREE.Vector2(destX, destY);
		else
			mesh.position.x += moveX * bmacSdk.deltaSec * maxSpeed + (additionalX?additionalX:0) * bmacSdk.deltaSec;
		
		var txWalkable = this.IsWalkable(tx, destY);
		var sometxWalkable = this.IsWalkable(sometx, destY);
		if (!(txWalkable || sometxWalkable))
			blocker = new THREE.Vector2(sometxWalkable ? tx : sometx, destY);
		else if (!this.IsWalkable(destX, destY))
			blocker = new THREE.Vector2(destX, destY);
		else
			mesh.position.y += moveY * bmacSdk.deltaSec * maxSpeed + (additionalY?additionalY:0) * bmacSdk.deltaSec;
	}
	
	this.ObjectSetDepth(mesh);
	
	return blocker;
};

ground.GetIncome = function(cache)
{
	var income = this.baseIncome;
	if (this.buildings)
	{
		for (var x = 0; x < this.tilesX; x++)
		{
			for (var y = 0; y < this.tilesY; y++)
			{
				if (this.buildings[x][y])
				{
					var b = this.buildingBases[this.buildings[x][y].baseId];
					if (b.value)
					{
						var val = b.value(x, y);
						if (cache == 1)
							this.buildings[x][y].cachedValue = val;
						else if (cache == 2)
							this.buildings[x][y].cachedValue = val - this.buildings[x][y].cachedValue;
						income += val;
					}
				}
			}
		}
	}
	return income;
};


GameEngine.addObject(ground);