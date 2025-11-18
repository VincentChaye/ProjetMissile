// ========================================
// 🧮 FONCTIONS PHYSIQUES
// ========================================

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
