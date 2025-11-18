// ========================================
// 🎨 INTERFACE UTILISATEUR
// ========================================

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
    
    // Fermeture/Ouverture des instructions
    const instructionsPanel = document.getElementById('instructions');
    const closeBtn = document.getElementById('close-instructions');
    const toggleBtn = document.getElementById('toggle-instructions');
    
    closeBtn.addEventListener('click', () => {
        instructionsPanel.classList.add('hidden');
        toggleBtn.style.display = 'flex';
    });
    
    toggleBtn.addEventListener('click', () => {
        instructionsPanel.classList.remove('hidden');
        toggleBtn.style.display = 'none';
    });
}
