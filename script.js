// ========================================
// 🚀 SIMULATION FUSÉE-SONDE ÉDUCATIVE
// Modélisation physique complète avec RK4
// ========================================

// ===== CONSTANTES PHYSIQUES =====
const CONSTANTS = {
    G0: 9.81,                    // Accélération gravitationnelle au sol (m/s²)
    R_EARTH: 6.371e6,            // Rayon de la Terre (m)
    RHO_0: 1.225,                // Densité de l'air au sol (kg/m³)
    H_SCALE: 8000,               // Échelle de densité atmosphérique (m)
    C_D: 0.75,                   // Coefficient de traînée
    A: 0.05,                     // Surface frontale de la fusée (m²)
    EARTH_RADIUS_VISUAL: 5,      // Rayon visuel de la Terre dans Three.js
    SCALE_FACTOR: 1/100000       // Facteur d'échelle pour visualisation (1 unité = 100km)
};

// ===== VARIABLES GLOBALES =====
let scene, camera, renderer, controls;
let earth, rocket, trajectory;
let startMarker, endMarker;
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

let rocketParams = {
    m0: 50,          // masse initiale (kg)
    thrust: 1500,    // poussée (N)
    mdot: 2.0,       // débit massique (kg/s)
    tBurn: 10,       // temps de combustion (s)
    mDry: 20         // masse sèche (kg)
};

let trajectoryPoints = [];

// ===== FONCTIONS PHYSIQUES =====

/**
 * Calcule la gravité en fonction de l'altitude
 * g(h) = g₀ * (R_T / (R_T + h))²
 */
function gravity(h) {
    const r = CONSTANTS.R_EARTH + h;
    return CONSTANTS.G0 * Math.pow(CONSTANTS.R_EARTH / r, 2);
}

/**
 * Calcule la densité de l'air en fonction de l'altitude
 * ρ(h) = ρ₀ * e^(-h/H)
 */
function airDensity(h) {
    return CONSTANTS.RHO_0 * Math.exp(-h / CONSTANTS.H_SCALE);
}

/**
 * Calcule la force de traînée aérodynamique
 * F_D = ½ * ρ(h) * C_D * A * v²
 */
function dragForce(h, v) {
    const rho = airDensity(h);
    return 0.5 * rho * CONSTANTS.C_D * CONSTANTS.A * v * Math.abs(v);
}

/**
 * Calcule la poussée en fonction du temps
 */
function thrust(t) {
    return t <= rocketParams.tBurn ? rocketParams.thrust : 0;
}

/**
 * Calcule la masse en fonction du temps
 */
function mass(t) {
    if (t <= rocketParams.tBurn) {
        const m = rocketParams.m0 - rocketParams.mdot * t;
        return Math.max(m, rocketParams.mDry);
    }
    return rocketParams.mDry;
}

/**
 * Système d'équations différentielles
 * dh/dt = v
 * dv/dt = (T(t) - F_D - m*g) / m
 */
function derivatives(state, t) {
    const { h, v, m } = state;
    
    const T = thrust(t);
    const g = gravity(h);
    const F_D = dragForce(h, v);
    
    const dh_dt = v;
    const dv_dt = (T - F_D - m * g) / m;
    const dm_dt = t <= rocketParams.tBurn ? -rocketParams.mdot : 0;
    
    return { dh_dt, dv_dt, dm_dt };
}

/**
 * Intégration numérique Runge-Kutta 4 (RK4)
 * Méthode précise à l'ordre 4
 */
function rungeKutta4(state, t, dt) {
    // k1 = f(t, y)
    const k1 = derivatives(state, t);
    
    // k2 = f(t + dt/2, y + k1*dt/2)
    const state2 = {
        h: state.h + k1.dh_dt * dt / 2,
        v: state.v + k1.dv_dt * dt / 2,
        m: state.m + k1.dm_dt * dt / 2
    };
    const k2 = derivatives(state2, t + dt / 2);
    
    // k3 = f(t + dt/2, y + k2*dt/2)
    const state3 = {
        h: state.h + k2.dh_dt * dt / 2,
        v: state.v + k2.dv_dt * dt / 2,
        m: state.m + k2.dm_dt * dt / 2
    };
    const k3 = derivatives(state3, t + dt / 2);
    
    // k4 = f(t + dt, y + k3*dt)
    const state4 = {
        h: state.h + k3.dh_dt * dt,
        v: state.v + k3.dv_dt * dt,
        m: state.m + k3.dm_dt * dt
    };
    const k4 = derivatives(state4, t + dt);
    
    // y_next = y + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
    return {
        h: state.h + (dt / 6) * (k1.dh_dt + 2*k2.dh_dt + 2*k3.dh_dt + k4.dh_dt),
        v: state.v + (dt / 6) * (k1.dv_dt + 2*k2.dv_dt + 2*k3.dv_dt + k4.dv_dt),
        m: state.m + (dt / 6) * (k1.dm_dt + 2*k2.dm_dt + 2*k3.dm_dt + k4.dm_dt)
    };
}

// ===== CONVERSION COORDONNÉES =====

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

// ===== INITIALISATION THREE.JS =====

function initThreeJS() {
    const canvas = document.getElementById('canvas');
    
    // Scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    
    // Caméra
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 20);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    
    // Terre avec texture réelle de la NASA
    const earthGeometry = new THREE.SphereGeometry(CONSTANTS.EARTH_RADIUS_VISUAL, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    // Charger la texture de la Terre depuis une source en ligne
    const earthTexture = textureLoader.load('https://unpkg.com/three-globe@2.24.3/example/img/earth-blue-marble.jpg');
    
    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture,
        specular: 0x333333,
        shininess: 5,
        bumpScale: 0.05
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Atmosphère
    const atmosphereGeometry = new THREE.SphereGeometry(CONSTANTS.EARTH_RADIUS_VISUAL * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    
    // Étoiles
    createStars();
    
    // Marqueurs de départ et d'arrivée
    createMarkers();
    
    // Fusée
    createRocket();
    
    // Contrôles de caméra (rotation manuelle)
    setupControls();
    
    // Gestion du redimensionnement
    window.addEventListener('resize', onWindowResize);
}

// Fonction supprimée - utilisation d'une vraie texture de la Terre depuis internet

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.1,
        transparent: true 
    });
    
    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function createMarkers() {
    // Marqueur de départ (vert)
    const startGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    startMarker = new THREE.Mesh(startGeometry, startMaterial);
    scene.add(startMarker);
    
    // Marqueur d'arrivée (rouge)
    const endGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    endMarker = new THREE.Mesh(endGeometry, endMaterial);
    scene.add(endMarker);
    
    updateMarkerPositions();
}

function updateMarkerPositions() {
    const latStart = parseFloat(document.getElementById('lat-start').value);
    const lonStart = parseFloat(document.getElementById('lon-start').value);
    const latEnd = parseFloat(document.getElementById('lat-end').value);
    const lonEnd = parseFloat(document.getElementById('lon-end').value);
    
    const startPos = latLonToVector3(latStart, lonStart);
    const endPos = latLonToVector3(latEnd, lonEnd);
    
    startMarker.position.copy(startPos);
    endMarker.position.copy(endPos);
    
    simulationState.startPos.copy(startPos);
    simulationState.endPos.copy(endPos);
}

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
    scene.add(rocket);
}

function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            earth.rotation.y += deltaX * 0.005;
            earth.rotation.x += deltaY * 0.005;
            
            // Limiter la rotation X
            earth.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, earth.rotation.x));
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        camera.position.z += e.deltaY * zoomSpeed * 0.01;
        camera.position.z = Math.max(10, Math.min(50, camera.position.z));
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== SIMULATION =====

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
        scene.remove(trajectory);
    }
    trajectoryPoints = [];
    
    // Créer la géométrie de trajectoire
    const trajectoryGeometry = new THREE.BufferGeometry();
    const trajectoryMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffaa00,
        linewidth: 2
    });
    trajectory = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    scene.add(trajectory);
    
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
        scene.remove(trajectory);
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

function updateDashboard() {
    const t = simulationState.time;
    const h = simulationState.h;
    const v = simulationState.v;
    const m = simulationState.m;
    
    const T = thrust(t);
    const g = gravity(h);
    const F_D = dragForce(h, v);
    const rho = airDensity(h);
    const a = (T - F_D - m * g) / m;
    
    document.getElementById('time').textContent = `${t.toFixed(2)} s`;
    document.getElementById('altitude').textContent = `${(h/1000).toFixed(2)} km`;
    document.getElementById('velocity').textContent = `${v.toFixed(2)} m/s`;
    document.getElementById('mass').textContent = `${m.toFixed(2)} kg`;
    document.getElementById('thrust-display').textContent = `${T.toFixed(0)} N`;
    document.getElementById('gravity').textContent = `${g.toFixed(3)} m/s²`;
    document.getElementById('drag').textContent = `${F_D.toFixed(2)} N`;
    document.getElementById('density').textContent = `${rho.toFixed(4)} kg/m³`;
    document.getElementById('acceleration').textContent = `${a.toFixed(2)} m/s²`;
    document.getElementById('apogee').textContent = `${(simulationState.maxApogee/1000).toFixed(2)} km`;
    document.getElementById('max-velocity').textContent = `${simulationState.maxVelocity.toFixed(2)} m/s`;
    document.getElementById('phase').textContent = simulationState.phase;
}

// ===== BOUCLE D'ANIMATION =====

function animate() {
    requestAnimationFrame(animate);
    
    // Rotation lente de la Terre
    earth.rotation.y += 0.0005;
    
    // Mettre à jour la simulation
    updateSimulation(1/60);
    
    // Rendre la scène
    renderer.render(scene, camera);
}

// ===== GESTION DES ÉVÉNEMENTS =====

function setupEventListeners() {
    // Sliders de configuration
    const sliders = [
        { id: 'lat-start', display: 'lat-start-value', suffix: '°', callback: updateMarkerPositions },
        { id: 'lon-start', display: 'lon-start-value', suffix: '°', callback: updateMarkerPositions },
        { id: 'lat-end', display: 'lat-end-value', suffix: '°', callback: updateMarkerPositions },
        { id: 'lon-end', display: 'lon-end-value', suffix: '°', callback: updateMarkerPositions },
        { id: 'mass-init', display: 'mass-value', suffix: ' kg', callback: (v) => { rocketParams.m0 = parseFloat(v); } },
        { id: 'thrust', display: 'thrust-value', suffix: ' N', callback: (v) => { rocketParams.thrust = parseFloat(v); } },
        { id: 'burn-time', display: 'burn-value', suffix: ' s', callback: (v) => { rocketParams.tBurn = parseFloat(v); } },
        { id: 'mdot', display: 'mdot-value', suffix: ' kg/s', callback: (v) => { rocketParams.mdot = parseFloat(v); } }
    ];
    
    sliders.forEach(({ id, display, suffix, callback }) => {
        const slider = document.getElementById(id);
        const displayElem = document.getElementById(display);
        
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            displayElem.textContent = value + suffix;
            if (callback) callback(value);
        });
    });
    
    // Boutons
    document.getElementById('launch-btn').addEventListener('click', launchSimulation);
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
}

// ===== INITIALISATION =====

window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    setupEventListeners();
    updateDashboard();
    animate();
});
