// ========================================
// 🚀 SIMULATION FUSÉE-SONDE ÉDUCATIVE
// Point d'entrée principal
// ========================================

/**
 * Boucle d'animation principale
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Rotation lente de la Terre
    earth.rotation.y += 0.0005;
    
    // Mettre à jour la simulation
    updateSimulation(1/60);
    
    // Rendre la scène
    renderer.render(scene, camera);
}

/**
 * Initialisation au chargement de la page
 */
window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    createRocket();
    setupEventListeners();
    updateDashboard();
    animate();
});
