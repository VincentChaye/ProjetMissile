// ========================================
// 🌍 POINT D'ENTRÉE PRINCIPAL
// ========================================

function animate() {
    requestAnimationFrame(animate);
    
    // Rotation automatique douce de la Terre
    if (typeof earth !== 'undefined' && CONFIG.AUTO_ROTATE) {
        earth.rotation.y += CONFIG.ROTATION_SPEED;
    }
    
    // Rendu de l'image
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Démarrage au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    console.log("Démarrage de la visualisation Terre...");
    
    // 1. Initialiser la scène 3D (défini dans scene.js)
    initThreeJS();
    
    // 2. Lancer la boucle d'animation
    animate();
});