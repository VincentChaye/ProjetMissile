// ========================================
// 🚀 GESTION DE LA FUSÉE (rocket.js)
// ========================================

// Variables visuelles
let rocket;
let trajectory;
let trajectoryPoints = [];

// NOTE : rocketParams est maintenant géré dans constants.js
// Ne pas le re-déclarer ici !

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
    
    // Sécurité : On attend que la Terre soit créée avant d'attacher la fusée
    if (typeof earth !== 'undefined') {
        earth.add(rocket);
    } else {
        console.error("Erreur: La Terre n'est pas encore créée lors de l'initialisation de la fusée.");
    }
}