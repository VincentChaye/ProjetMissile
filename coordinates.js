// ========================================
// 🌐 CONVERSION COORDONNÉES
// ========================================

/**
 * Convertit latitude/longitude en position 3D sur la sphère
 */
function latLonToVector3(lat, lon, radius = CONSTANTS.EARTH_RADIUS_VISUAL) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
}

/**
 * Calcule un arc de trajectoire entre deux points sur la sphère
 */
function calculateTrajectoryArc(start, end, apogeeHeight) {
    const points = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Interpolation sphérique (SLERP)
        const startClone = start.clone().normalize();
        const endClone = end.clone().normalize();
        const angle = startClone.angleTo(endClone);
        
        if (angle === 0) {
            points.push(start.clone());
            continue;
        }
        
        const sinAngle = Math.sin(angle);
        const a = Math.sin((1 - t) * angle) / sinAngle;
        const b = Math.sin(t * angle) / sinAngle;
        
        const interpolated = new THREE.Vector3(
            a * startClone.x + b * endClone.x,
            a * startClone.y + b * endClone.y,
            a * startClone.z + b * endClone.z
        );
        
        // Ajouter la hauteur (arc parabolique)
        const heightFactor = Math.sin(t * Math.PI); // 0 au début et fin, 1 au milieu
        const radius = CONSTANTS.EARTH_RADIUS_VISUAL + (apogeeHeight * CONSTANTS.SCALE_FACTOR * heightFactor);
        
        interpolated.normalize().multiplyScalar(radius);
        points.push(interpolated);
    }
    
    return points;
}
