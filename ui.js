// ========================================
// 🎨 INTERFACE UTILISATEUR & PÉDAGOGIE
// ========================================

// ========================================
// 1. DONNÉES PÉDAGOGIQUES (POP-UPS)
// ========================================
const PHASE_EXPLANATIONS = {
    'Propulsion 🔥': {
        title: "Mise à Feu & Décollage",
        icon: "🚀",
        desc: "Le moteur est allumé ! Il éjecte du gaz à haute vitesse pour créer une Poussée qui combat le Poids et la Traînée.",
        math: "La Poussée (T) est > Poids (P). L'accélération est positive et augmente car la masse (m) diminue (carburant brûlé)."
    },
    'Montée balistique ⬆️': {
        title: "Arrêt Moteur (MECO)",
        icon: "🛑",
        desc: "Panne sèche ! La fusée continue de monter sur sa lancée (inertie), mais la gravité et l'air la ralentissent immédiatement.",
        math: "T = 0. L'équation devient négative : -(D + P) / m. La vitesse diminue jusqu'à atteindre 0 à l'apogée."
    },
    'Descente ⬇️': {
        title: "Apogée & Chute Libre",
        icon: "📉",
        desc: "Point le plus haut atteint. La vitesse verticale s'inverse. La fusée retombe vers la Terre, accélérée par la gravité.",
        math: "La vitesse devient négative. La Traînée (D) change de sens (vers le haut) et freine la chute, combattant le Poids (P)."
    },
    'Atterrissage': {
        title: "Impact au Sol",
        icon: "💥",
        desc: "La fusée est revenue au niveau de la mer (Altitude 0).",
        math: "Fin de la simulation. L'énergie cinétique est dissipée dans l'impact."
    },
    'CIBLE ATTEINTE 🎯': {
        title: "Succès de la Mission !",
        icon: "🏆",
        desc: "Bravo ! La fusée a atterri à moins de 50km de la cible prévue.",
        math: "Les paramètres de puissance et d'angle étaient parfaits pour cette distance."
    },
    'OVERSHOOT (Trop loin) 💨': {
        title: "Tir Trop Puissant",
        icon: "⏭️",
        desc: "La fusée a dépassé la cible ! Elle est allée trop loin.",
        math: "La vitesse horizontale (Vx) était trop élevée ou le temps de combustion trop long. Réduisez la Poussée ou la Durée."
    },
    'UNDERSHOOT (Trop court) 📉': {
        title: "Tir Trop Court",
        icon: "⏮️",
        desc: "La fusée s'est écrasée avant d'atteindre la cible.",
        math: "Manque d'énergie cinétique. Augmentez la Poussée, réduisez la Masse, ou augmentez le Temps de combustion."
    }
};

// ========================================
// 2. GESTION DU TABLEAU DE BORD
// ========================================

function updateDashboard() {
    // Récupération de l'état global
    const t = simulationState.time;
    const h = simulationState.h;
    const m = simulationState.m;
    const x = simulationState.x; // Distance parcourue
    
    // Calcul de la vitesse totale (Pythagore : V = sqrt(Vx² + Vy²))
    const vTotal = Math.sqrt(simulationState.vx**2 + simulationState.vy**2);

    // --- RE-CALCUL DES FORCES POUR L'AFFICHAGE ---
    // On appelle la fonction physique pour avoir les valeurs exactes à cet instant
    // Note: On recrée un objet état temporaire pour le calcul
    const tempState = { 
        x: x, h: h, 
        vx: simulationState.vx, vy: simulationState.vy, 
        m: m 
    };
    
    // Utilise la fonction définie dans physics.js
    const forces = calculateForces(tempState, t);
    
    // Accélération totale ressentie (Magnitude)
    const aTotal = Math.sqrt(forces.fx**2 + forces.fy**2) / m;

    // --- MISE À JOUR VISUALISEUR MATHÉMATIQUE ---
    document.getElementById('math-accel').textContent = aTotal.toFixed(2);
    document.getElementById('math-thrust').textContent = forces.thrust.toFixed(0);
    document.getElementById('math-drag').textContent = forces.drag.toFixed(0);
    document.getElementById('math-weight').textContent = forces.weight.toFixed(0);
    document.getElementById('math-mass').textContent = m.toFixed(1);

    // Effet visuel : Griser la Poussée si moteur éteint
    const thrustElem = document.querySelector('.term-group.thrust');
    if (forces.thrust <= 0) {
        thrustElem.style.opacity = '0.3';
    } else {
        thrustElem.style.opacity = '1';
    }

    // --- MISE À JOUR DES MÉTRIQUES CLASSIQUES ---
    document.getElementById('time').textContent = `${t.toFixed(1)} s`;
    document.getElementById('altitude').textContent = `${(h/1000).toFixed(2)} km`;
    document.getElementById('velocity').textContent = `${vTotal.toFixed(1)} m/s`;
    
    // Remplacement de la Densité par la Distance (plus utile en 2D)
    // On change dynamiquement le label si besoin, ou on suppose que l'HTML est à jour
    const densityElem = document.getElementById('density');
    const labelDensity = densityElem.previousElementSibling; // Le span "label"
    
    if (labelDensity.textContent.includes('Densité')) {
        labelDensity.textContent = "📍 Distance Sol";
    }
    
    // Affichage : Distance Parcourue / Distance Cible
    const distKm = (x / 1000).toFixed(1);
    const targetKm = (simulationState.targetDist / 1000).toFixed(0);
    densityElem.textContent = `${distKm} / ${targetKm} km`;

    // Gravité
    const g = gravity(h);
    document.getElementById('gravity').textContent = `${g.toFixed(2)}`;
    
    // Phase
    document.getElementById('phase').textContent = simulationState.phase;
}

// ========================================
// 3. GESTION DES POP-UPS ÉDUCATIFS
// ========================================

function showEduPopup(phaseKey) {
    const data = PHASE_EXPLANATIONS[phaseKey];
    
    // Si la phase n'est pas connue exactement, on ne plante pas
    if (!data) return;

    document.getElementById('edu-title').textContent = data.title;
    document.getElementById('edu-desc').textContent = data.desc;
    document.getElementById('edu-math').textContent = data.math;
    document.querySelector('.edu-icon').textContent = data.icon;
    
    const popup = document.getElementById('edu-popup');
    if (popup) {
        popup.classList.remove('hidden');
    }
}

// ========================================
// 4. ÉVÉNEMENTS & CONTRÔLES
// ========================================

function setupEventListeners() {
    // --- SLIDERS ---
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
        
        if(slider && displayElem) {
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                displayElem.textContent = value + suffix;
                if (callback) callback(value);
            });
        }
    });
    
    // --- BOUTONS PRINCIPAUX ---
    document.getElementById('launch-btn').addEventListener('click', () => {
    if (typeof launchSimulation === 'function') {
        launchSimulation();
    }
});
    document.getElementById('reset-btn').addEventListener('click', () => {
    if (typeof resetSimulation === 'function') {
        resetSimulation();
    } else {
        console.error("Erreur : La fonction resetSimulation n'est pas encore chargée.");
    }
});
    
    // --- BOUTON POP-UP "CONTINUER" ---
    const continueBtn = document.getElementById('edu-continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            // Masquer le popup
            document.getElementById('edu-popup').classList.add('hidden');
            
            // Relancer la simulation si elle n'est pas terminée
            if (simulationState.phase !== 'Atterrissage' && 
                !simulationState.phase.includes('CIBLE') && 
                !simulationState.phase.includes('OVERSHOOT') && 
                !simulationState.phase.includes('UNDERSHOOT')) {
                simulationState.running = true;
            }
        });
    }

    // --- INSTRUCTIONS (Optionnel) ---
    const instructionsPanel = document.getElementById('instructions');
    const closeBtn = document.getElementById('close-instructions');
    const toggleBtn = document.getElementById('toggle-instructions');
    
    if (closeBtn && instructionsPanel) {
        closeBtn.addEventListener('click', () => {
            instructionsPanel.classList.add('hidden');
            if(toggleBtn) toggleBtn.style.display = 'flex';
        });
    }
    
    if (toggleBtn && instructionsPanel) {
        toggleBtn.addEventListener('click', () => {
            instructionsPanel.classList.remove('hidden');
            toggleBtn.style.display = 'none';
        });
    }
}