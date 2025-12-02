// ========================================
// 🧮 MOTEUR PHYSIQUE (physics.js)
// ========================================

// Constantes locales de sécurité
const P_CONST = {
    G0: 9.81,
    R_EARTH: 6.371e6,
    RHO_0: 1.225,
    H_SCALE: 8000,
    C_D: 0.75,
    A: 0.05,
    DEFAULT_ANGLE: 45 * (Math.PI / 180) 
};

function gravity(h) {
    const r = P_CONST.R_EARTH + h;
    return P_CONST.G0 * Math.pow(P_CONST.R_EARTH / r, 2);
}

function airDensity(h) {
    return P_CONST.RHO_0 * Math.exp(-h / P_CONST.H_SCALE);
}

// C'est cette fonction que ui.js cherche !
function calculateForces(state, t) {
    const { h, vx, vy, m } = state;
    
    // Vitesse totale
    const v_sq = vx*vx + vy*vy;
    const v = Math.sqrt(v_sq);
    
    // 1. Atmosphère
    const rho = airDensity(h);
    
    // 2. Traînée
    let dragX = 0;
    let dragY = 0;
    const dragMag = 0.5 * rho * P_CONST.C_D * P_CONST.A * v_sq;

    if (v > 0.001) {
        dragX = -dragMag * (vx / v);
        dragY = -dragMag * (vy / v);
    }

    // 3. Poussée
    let thrustX = 0;
    let thrustY = 0;
    let thrustMag = 0;

    // Si on a accès aux paramètres globaux (définis dans constants.js)
    if (typeof rocketParams !== 'undefined' && t <= rocketParams.tBurn) {
        thrustMag = rocketParams.thrust;
        
        let angleRad = P_CONST.DEFAULT_ANGLE; 
        
        // Gestion de l'angle
        if (typeof CONSTANTS !== 'undefined' && CONSTANTS.LAUNCH_ANGLE_DEG) {
            angleRad = CONSTANTS.LAUNCH_ANGLE_DEG * (Math.PI / 180);
        }

        // Alignement prograde si vitesse suffisante
        if (v > 50) {
            angleRad = Math.atan2(vy, vx);
        }

        thrustX = thrustMag * Math.cos(angleRad);
        thrustY = thrustMag * Math.sin(angleRad);
    }

    // 4. Poids
    const weight = m * gravity(h);

    return {
        fx: thrustX + dragX,
        fy: thrustY + dragY - weight,
        thrust: thrustMag,
        drag: dragMag,
        weight: weight
    };
}

function derivatives(state, t) {
    const forces = calculateForces(state, t);
    return {
        dx_dt: state.vx,
        dy_dt: state.vy,
        dvx_dt: forces.fx / state.m,
        dvy_dt: forces.fy / state.m,
        dm_dt: (typeof rocketParams !== 'undefined' && t <= rocketParams.tBurn) ? -rocketParams.mdot : 0
    };
}

function rungeKutta4(state, t, dt) {
    const k1 = derivatives(state, t);
    
    const state2 = {
        x: state.x + k1.dx_dt * dt/2, h: state.h + k1.dy_dt * dt/2,
        vx: state.vx + k1.dvx_dt * dt/2, vy: state.vy + k1.dvy_dt * dt/2, m: state.m + k1.dm_dt * dt/2
    };
    const k2 = derivatives(state2, t + dt/2);
    
    const state3 = {
        x: state.x + k2.dx_dt * dt/2, h: state.h + k2.dy_dt * dt/2,
        vx: state.vx + k2.dvx_dt * dt/2, vy: state.vy + k2.dvy_dt * dt/2, m: state.m + k2.dm_dt * dt/2
    };
    const k3 = derivatives(state3, t + dt/2);
    
    const state4 = {
        x: state.x + k3.dx_dt * dt, h: state.h + k3.dy_dt * dt,
        vx: state.vx + k3.dvx_dt * dt, vy: state.vy + k3.dvy_dt * dt, m: state.m + k3.dm_dt * dt
    };
    const k4 = derivatives(state4, t + dt);
    
    return {
        x: state.x + (dt/6)*(k1.dx_dt + 2*k2.dx_dt + 2*k3.dx_dt + k4.dx_dt),
        h: state.h + (dt/6)*(k1.dy_dt + 2*k2.dy_dt + 2*k3.dy_dt + k4.dy_dt),
        vx: state.vx + (dt/6)*(k1.dvx_dt + 2*k2.dvx_dt + 2*k3.dvx_dt + k4.dvx_dt),
        vy: state.vy + (dt/6)*(k1.dvy_dt + 2*k2.dvy_dt + 2*k3.dvy_dt + k4.dvy_dt),
        m: state.m + (dt/6)*(k1.dm_dt + 2*k2.dm_dt + 2*k3.dm_dt + k4.dm_dt)
    };
}