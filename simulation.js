// ========================================
// 🎮 LOGIQUE DE SIMULATION
// ========================================

let simulationState = {
    running: false,
    time: 0,
    h: 0,           // altitude (m)
    v: 0,           // vitesse verticale (m/s)
    m: 50,          // masse (kg)
    maxApogee: 0,
    maxVelocity: 0,
    phase: 'Prêt',
    // Position 3D
    positionOnPath: 0,
    rocketPosition: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3()
};

function launchSimulation() {
    if (simulationState.running) return;
    
    // Réinitialiser l'état
    simulationState.running = true;
    simulationState.time = 0;
    simulationState.h = 0;
    simulationState.v = 0;
    simulationState.m = rocketParams.m0;
    simulationState.maxApogee = 0;
    simulationState.maxVelocity = 0;
    simulationState.phase = 'Propulsion';
    simulationState.positionOnPath = 0;
    
    // Effacer l'ancienne trajectoire
    if (trajectory) {
        earth.remove(trajectory);
    }
    trajectoryPoints = [];
    
    // Créer la géométrie de trajectoire
    const trajectoryGeometry = new THREE.BufferGeometry();
    const trajectoryMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffaa00,
        linewidth: 2
    });
    trajectory = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    earth.add(trajectory);  // Attaché à la Terre pour suivre sa rotation
    
    // Positionner la fusée au départ
    rocket.position.copy(simulationState.startPos);
    rocket.visible = true;
    
    // Orienter la fusée vers le haut (perpendiculaire à la surface)
    const upVector = simulationState.startPos.clone().normalize();
    rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), upVector);
    
    document.getElementById('launch-btn').disabled = true;
}

function resetSimulation() {
    simulationState.running = false;
    simulationState.time = 0;
    simulationState.h = 0;
    simulationState.v = 0;
    simulationState.m = rocketParams.m0;
    simulationState.maxApogee = 0;
    simulationState.maxVelocity = 0;
    simulationState.phase = 'Prêt';
    
    rocket.visible = false;
    
    if (trajectory) {
        earth.remove(trajectory);
        trajectory = null;
    }
    trajectoryPoints = [];
    
    document.getElementById('launch-btn').disabled = false;
    updateDashboard();
}

function updateSimulation(deltaTime) {
    if (!simulationState.running) return;
    
    const dt = 0.05; // Pas de temps fixe pour stabilité
    simulationState.time += dt;
    
    // Intégration RK4
    const state = {
        h: simulationState.h,
        v: simulationState.v,
        m: simulationState.m
    };
    
    const newState = rungeKutta4(state, simulationState.time, dt);
    
    simulationState.h = newState.h;
    simulationState.v = newState.v;
    simulationState.m = newState.m;
    
    // Vérifier si on touche le sol
    if (simulationState.h < 0 && simulationState.time > 1) {
        simulationState.h = 0;
        simulationState.v = 0;
        simulationState.running = false;
        simulationState.phase = 'Atterrissage';
        document.getElementById('launch-btn').disabled = false;
        
        const flame = rocket.getObjectByName('flame');
        if (flame) flame.material.opacity = 0;
        return;
    }
    
    // Déterminer la phase
    if (simulationState.time <= rocketParams.tBurn) {
        simulationState.phase = 'Propulsion 🔥';
        const flame = rocket.getObjectByName('flame');
        if (flame) flame.material.opacity = 0.8;
    } else if (simulationState.v > 0) {
        simulationState.phase = 'Montée balistique ⬆️';
        const flame = rocket.getObjectByName('flame');
        if (flame) flame.material.opacity = 0;
    } else if (simulationState.v < 0 && simulationState.h > 100) {
        simulationState.phase = 'Descente ⬇️';
    }
    
    // Mettre à jour les max
    if (simulationState.h > simulationState.maxApogee) {
        simulationState.maxApogee = simulationState.h;
    }
    if (Math.abs(simulationState.v) > simulationState.maxVelocity) {
        simulationState.maxVelocity = Math.abs(simulationState.v);
    }
    
    // Mettre à jour la position 3D de la fusée
    updateRocketPosition();
    
    // Mettre à jour le tableau de bord
    updateDashboard();
}
