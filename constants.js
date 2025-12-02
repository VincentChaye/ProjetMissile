// ========================================
// 🚀 CONSTANTES & PARAMÈTRES GLOBAUX
// ========================================

const CONSTANTS = {
    G0: 9.81,
    R_EARTH: 6.371e6,
    RHO_0: 1.225,
    H_SCALE: 8000,
    C_D: 0.75,
    A: 0.05,
    EARTH_RADIUS_VISUAL: 5,
    SCALE_FACTOR: 1/100000,
    // CHANGEMENT ICI : Angle plus faible pour une meilleure parabole visuelle
    LAUNCH_ANGLE_DEG: 60 
};

// Paramètres initiaux de la fusée
let rocketParams = {
    m0: 50,          // masse initiale (kg)
    thrust: 1500,    // poussée (N)
    mdot: 2.0,       // débit massique (kg/s)
    tBurn: 10,       // temps de combustion (s)
    mDry: 20         // masse sèche (kg)
};