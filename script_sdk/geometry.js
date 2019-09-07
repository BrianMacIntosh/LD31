
bmacSdk.GEO = 
{
	c_planeCorrection: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI, 0, 0))
};

bmacSdk.GEO.makeSpriteMesh = function(tex, geo)
{
	var material = new THREE.MeshBasicMaterial({ map:tex, transparent:true });
	var mesh = new THREE.Mesh(geo, material);
	return mesh;
}

bmacSdk.GEO.makeSpriteMeshMat = function(mat, geo)
{
	var mesh = new THREE.Mesh(geo, mat);
	return mesh;
}

bmacSdk.GEO.makeSpriteGeo = function(width, height)
{
	var geo = new THREE.PlaneGeometry(width, height);
	geo.applyMatrix(bmacSdk.GEO.c_planeCorrection);
	return geo;
}