// ========================================
// 🚀 GESTION DE LA FUSÉE
// ========================================

let rocket;
let trajectory;
let trajectoryPoints = [];

let rocketParams = {
    m0: 50,          // masse initiale (kg)
    thrust: 1500,    // poussée (N)
    mdot: 2.0,       // débit massique (kg/s)
    tBurn: 10,       // temps de combustion (s)
    mDry: 20         // masse sèche (kg)
};

function createRocket() {
    // Groupe pour la fusée
    rocket = new THREE.Group();
    
    // Corps de la fusée (cylindre)
    const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    rocket.add(body);
    
    // Cône de la fusée
    const coneGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const coneMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.z = 0.35;
    cone.rotation.x = -Math.PI / 2;
    rocket.add(cone);
    
    // Flamme (initialement invisible)
    const flameGeometry = new THREE.ConeGeometry(0.12, 0.3, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.z = -0.35;
    flame.rotation.x = Math.PI / 2;
    flame.name = 'flame';
    rocket.add(flame);
    
    rocket.visible = false;
    earth.add(rocket);  // Attaché à la Terre pour suivre sa rotation
}

function updateRocketPosition() {
    // Interpoler entre start et end en fonction de la progression
    const totalDistance = simulationState.startPos.distanceTo(simulationState.endPos);
    const progress = Math.min(simulationState.time / 60, 1); // Progression sur 60 secondes
    
    // SLERP pour l'interpolation sphérique
    const startNorm = simulationState.startPos.clone().normalize();
    const endNorm = simulationState.endPos.clone().normalize();
    const angle = startNorm.angleTo(endNorm);
    
    if (angle > 0) {
        const sinAngle = Math.sin(angle);
        const a = Math.sin((1 - progress) * angle) / sinAngle;
        const b = Math.sin(progress * angle) / sinAngle;
        
        const basePos = new THREE.Vector3(
            a * startNorm.x + b * endNorm.x,
            a * startNorm.y + b * endNorm.y,
            a * startNorm.z + b * endNorm.z
        );
        
        // Ajouter l'altitude
        const radius = CONSTANTS.EARTH_RADIUS_VISUAL + (simulationState.h * CONSTANTS.SCALE_FACTOR);
        basePos.normalize().multiplyScalar(radius);
        
        rocket.position.copy(basePos);
        
        // Orienter la fusée
        const upVector = basePos.clone().normalize();
        const tangent = simulationState.v > 0 ? upVector : upVector.clone().negate();
        rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    }
    
    // Ajouter le point à la trajectoire
    trajectoryPoints.push(rocket.position.clone());
    if (trajectoryPoints.length > 1000) {
        trajectoryPoints.shift();
    }
    
    // Mettre à jour la géométrie de trajectoire
    if (trajectory && trajectoryPoints.length > 0) {
        const positions = new Float32Array(trajectoryPoints.length * 3);
        trajectoryPoints.forEach((point, i) => {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        });
        trajectory.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trajectory.geometry.attributes.position.needsUpdate = true;
    }
}
