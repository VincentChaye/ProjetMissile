// main.js
let missile;

// On utilise un temps fixe pour le rendu aussi pour éviter des saccades si besoin
const clock = new THREE.Clock(); 

function animate() {
    requestAnimationFrame(animate);
    
    // Simulation accélérée
    const dt = 0.5; 

    if (missile) {
        missile.update(dt);
    }
    
    // Le renderer dessine la scène telle qu'elle est
    // (Avec la Terre tournée par l'utilisateur + missile attaché dessus)
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    
    if (typeof earth !== 'undefined') {
        missile = new Missile(scene, earth);
        
        // Orientation initiale pour voir l'Amérique/Afrique
        earth.rotation.y = -Math.PI / 2; 

        console.log("Système prêt. Faites tourner la Terre avec la souris !");
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                missile.launch();
            }
        });
        
        animate();
    }
});