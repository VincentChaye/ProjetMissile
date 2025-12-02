// ========================================
// 🎮 LOGIQUE DE SIMULATION (CORRECTION DÉFINITIVE)
// ========================================

let simulationState = {
    running: false,
    time: 0,
    x: 0, h: 0, vx: 0, vy: 0, m: 50,
    maxApogee: 0,
    maxVelocity: 0,
    phase: 'Prêt',
    // On initialise avec des vecteurs non nuls par sécurité
    startPos: new THREE.Vector3(1, 0, 0),
    endPos: new THREE.Vector3(0, 1, 0),
    targetDist: 0,
    rotationAxis: new THREE.Vector3(0, 0, 1)
};

let lastPhase = 'Prêt';

function launchSimulation() {
    if (simulationState.running) return;

    // =========================================================
    // 1. FORCER LA LECTURE DES SLIDERS (C'est la correction clé)
    // =========================================================
    // On ne fait pas confiance aux valeurs stockées, on relit le HTML
    const latStart = parseFloat(document.getElementById('lat-start').value);
    const lonStart = parseFloat(document.getElementById('lon-start').value);
    const latEnd = parseFloat(document.getElementById('lat-end').value);
    const lonEnd = parseFloat(document.getElementById('lon-end').value);

    // On recalcul immédiatement les positions 3D
    // (Assure-toi que coordinates.js est bien chargé avant simulation.js)
    if (typeof latLonToVector3 === 'function') {
        simulationState.startPos = latLonToVector3(latStart, lonStart);
        simulationState.endPos = latLonToVector3(latEnd, lonEnd);
    } else {
        console.error("Erreur critique: latLonToVector3 introuvable !");
        return;
    }

    // 2. Calcul de la géométrie de trajectoire
    const R_VISUAL = CONSTANTS.EARTH_RADIUS_VISUAL;
    const R_REAL = CONSTANTS.R_EARTH;

    // Distance à parcourir (en mètres)
    simulationState.targetDist = simulationState.startPos.distanceTo(simulationState.endPos) * (R_REAL / R_VISUAL);

    // Axe de rotation (Produit vectoriel Départ x Arrivée)
    const startVec = simulationState.startPos.clone().normalize();
    const endVec = simulationState.endPos.clone().normalize();
    simulationState.rotationAxis = new THREE.Vector3().crossVectors(startVec, endVec).normalize();

    // Sécurité : Si Départ == Arrivée, on définit un axe arbitraire pour éviter NaN
    if (simulationState.rotationAxis.lengthSq() < 0.0001) {
        simulationState.rotationAxis.set(1, 0, 0); 
    }

    // 3. Reset des Variables Physiques
    simulationState.running = true;
    simulationState.time = 0;
    simulationState.x = 0;
    simulationState.h = 2; // On part 2m au dessus du sol (évite bug collision)
    simulationState.vx = 0;
    simulationState.vy = 0;
    
    simulationState.m = rocketParams.m0;
    simulationState.maxApogee = 0;
    simulationState.maxVelocity = 0;
    
    simulationState.phase = 'Propulsion 🔥';
    lastPhase = 'Propulsion 🔥';
    
    // 4. Reset Graphique
    if (trajectory) earth.remove(trajectory);
    trajectoryPoints = [];
    
    // Création de la ligne de trajectoire
    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 3 });
    trajectory = new THREE.Line(trajGeo, trajMat);
    earth.add(trajectory);
    
    rocket.visible = true;
    
    // Positionnement initial FORCE
    rocket.position.copy(simulationState.startPos);
    
    // Fermer les popups précédents
    const popup = document.getElementById('edu-popup');
    if (popup) popup.classList.add('hidden');

    document.getElementById('launch-btn').disabled = true;
    
    console.log("Lancement ! Distance cible:", simulationState.targetDist);
}

function resetSimulation() {
    simulationState.running = false;
    simulationState.time = 0;
    simulationState.h = 0; simulationState.vx = 0; simulationState.vy = 0; simulationState.x = 0;
    simulationState.phase = 'Prêt'; lastPhase = 'Prêt';
    
    rocket.visible = false;
    if (trajectory) { earth.remove(trajectory); trajectory = null; }
    trajectoryPoints = [];
    
    document.getElementById('launch-btn').disabled = false;
    const popup = document.getElementById('edu-popup');
    if (popup) popup.classList.add('hidden');
    
    updateDashboard();
}

function updateSimulation(deltaTime) {
    if (!simulationState.running) return;
    
    const dt = 0.05;
    simulationState.time += dt;
    
    // --- PHYSIQUE (RK4) ---
    const state = { x: simulationState.x, h: simulationState.h, vx: simulationState.vx, vy: simulationState.vy, m: simulationState.m };
    const newState = rungeKutta4(state, simulationState.time, dt);
    
    simulationState.x = newState.x;
    simulationState.h = newState.h;
    simulationState.vx = newState.vx;
    simulationState.vy = newState.vy;
    simulationState.m = newState.m;

    // --- DÉTECTION CRASH / ATTERRISSAGE ---
    let currentPhase = '';
    let flameOpacity = 0;
    
    // On considère atterri si altitude <= 0 ET on descend (vy < 0)
    // On ajoute un timer > 1s pour éviter le crash immédiat au décollage
    if (simulationState.h <= 0 && (simulationState.vy < 0 || simulationState.time > 1)) {
        simulationState.h = 0; simulationState.vx = 0; simulationState.vy = 0;
        simulationState.running = false;
        
        const diff = simulationState.x - simulationState.targetDist;
        if (Math.abs(diff) < 50000) currentPhase = 'CIBLE ATTEINTE 🎯';
        else if (diff > 0) currentPhase = 'OVERSHOOT (Trop loin) 💨';
        else currentPhase = 'UNDERSHOOT (Trop court) 📉';
        
        document.getElementById('launch-btn').disabled = false;
    } 
    else if (simulationState.time <= rocketParams.tBurn) {
        currentPhase = 'Propulsion 🔥'; flameOpacity = 0.8 + Math.random()*0.2;
    } 
    else if (simulationState.vy > 0) {
        currentPhase = 'Montée balistique ⬆️';
    } 
    else {
        currentPhase = 'Descente ⬇️';
    }

    const flame = rocket.getObjectByName('flame');
    if (flame) flame.material.opacity = flameOpacity;

    // --- GESTION POPUP ---
    if (currentPhase !== lastPhase && currentPhase !== '' && simulationState.time > 0.2) {
        simulationState.phase = currentPhase;
        simulationState.running = false; // Pause
        if(typeof showEduPopup === 'function') showEduPopup(currentPhase);
        lastPhase = currentPhase;
        updateDashboard();
    }
    simulationState.phase = currentPhase;

    // Stats
    if (simulationState.h > simulationState.maxApogee) simulationState.maxApogee = simulationState.h;
    const vTot = Math.sqrt(simulationState.vx**2 + simulationState.vy**2);
    if (vTot > simulationState.maxVelocity) simulationState.maxVelocity = vTot;

    updateRocketPositionReal();
    updateDashboard();
}

function updateRocketPositionReal() {
    // 1. Calcul de l'angle parcouru sur Terre
    // Angle (rad) = distance (m) / Rayon Terre (m)
    const angleRad = simulationState.x / CONSTANTS.R_EARTH;
    
    // 2. Rotation du vecteur de départ autour de l'axe
    // On clone pour ne pas modifier l'original !
    const startVecNorm = simulationState.startPos.clone().normalize();
    const currentPosGround = startVecNorm.applyAxisAngle(simulationState.rotationAxis, angleRad);
    
    // 3. Application de l'altitude visuelle
    // Scale factor convertit les mètres réels en unités ThreeJS
    const visualAlt = simulationState.h * CONSTANTS.SCALE_FACTOR;
    const visualRadius = CONSTANTS.EARTH_RADIUS_VISUAL + visualAlt;
    
    rocket.position.copy(currentPosGround.multiplyScalar(visualRadius));
    
    // 4. Orientation (Rotation locale de la fusée)
    const up = rocket.position.clone().normalize();
    const forward = new THREE.Vector3().crossVectors(simulationState.rotationAxis, up).normalize();
    
    // Vecteur vitesse résultant (vx = tangentiel, vy = radial)
    let velocityVec = forward.clone().multiplyScalar(simulationState.vx)
                      .add(up.clone().multiplyScalar(simulationState.vy));
                      
    if (velocityVec.lengthSq() > 0.001) {
        rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velocityVec.normalize());
    }

    // 5. Traceur
    trajectoryPoints.push(rocket.position.clone());
    if (trajectoryPoints.length > 1500) trajectoryPoints.shift();
    
    if (trajectory && trajectoryPoints.length > 1) {
        const positions = new Float32Array(trajectoryPoints.length * 3);
        trajectoryPoints.forEach((p, i) => {
            positions[i*3] = p.x;
            positions[i*3+1] = p.y;
            positions[i*3+2] = p.z;
        });
        trajectory.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trajectory.geometry.attributes.position.needsUpdate = true;
    }
}