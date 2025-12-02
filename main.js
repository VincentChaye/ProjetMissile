// ========================================
// 🚀 POINT D'ENTRÉE PRINCIPAL (main.js)
// ========================================

function animate() {
    requestAnimationFrame(animate);
    
    // Rotation lente de la Terre
    if (typeof earth !== 'undefined') {
        earth.rotation.y += 0.0005;
    }
    
    // Mise à jour de la physique (1/60eme de seconde)
    if (typeof updateSimulation === 'function') {
        updateSimulation(1/60);
    }
    
    // Rendu
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Démarrage au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    console.log("Démarrage de l'application...");
    
    // 1. Initialiser la scène 3D
    initThreeJS();
    
    // 2. Créer la fusée
    createRocket();
    
    // 3. Attacher les événements (boutons, sliders)
    setupEventListeners();
    
    // 4. Initialiser l'affichage
    updateDashboard();
    
    // 5. Lancer la boucle d'animation
    animate();
});