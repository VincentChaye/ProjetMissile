// ========================================
// 🚀 MISSILE.JS - VERSION FINALE (LOGS COMPLETS)
// ========================================

const PHYSICS = {
    G: 6.674e-11,
    M_EARTH: 5.972e24,
    R_EARTH_REAL: 6378000,
    R_SCENE: 5,
    OMEGA_EARTH: 7.292e-5,
    // M51 Params
    M0: 54000, THRUST: 700000, MASS_FLOW: 223, BURN_TIME: 224, AREA: 4.15, CD: 0.2,
    // Kourou
    LAT: 5.236 * (Math.PI / 180), 
    LON: -52.768 * (Math.PI / 180) 
};

const SCALE_FACTOR = PHYSICS.R_SCENE / PHYSICS.R_EARTH_REAL;

class Missile {
    constructor(scene, earthObject) {
        this.scene = scene;
        this.earth = earthObject; 
        
        this.mass = PHYSICS.M0;
        this.time = 0;
        this.isActive = false;
        
        // --- 1. Position Initiale (Local sur Terre) ---
        const r = PHYSICS.R_SCENE; 
        const y = r * Math.sin(PHYSICS.LAT);
        const h = r * Math.cos(PHYSICS.LAT);
        const x = h * Math.cos(PHYSICS.LON);
        const z = h * Math.sin(PHYSICS.LON);
        
        this.startLocalPosition = new THREE.Vector3(x, y, z);
        
        // Vecteurs physiques
        this.realPosition = new THREE.Vector3(); 
        this.realVelocity = new THREE.Vector3();
        this.orientation = new THREE.Vector3();
        
        // --- 2. Visuel ---
        this.mesh = this.createMesh();
        this.flame = this.createFlame();
        this.mesh.add(this.flame);
        this.earth.add(this.mesh); // Attaché à la Terre

        // --- 3. Traces ---
        this.groundPathPoints = [];
        this.groundLineGeometry = new THREE.BufferGeometry();
        this.groundLine = new THREE.Line(
            this.groundLineGeometry, 
            new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
        );
        this.earth.add(this.groundLine);

        this.airPathPoints = [];
        this.airLineGeometry = new THREE.BufferGeometry();
        this.airLine = new THREE.Line(
            this.airLineGeometry, 
            new THREE.LineBasicMaterial({ color: 0xffff00 })
        );
        this.earth.add(this.airLine);

        this.lastTraceTime = 0;
        
        // Collage initial
        this.stickToGround();
    }

    getEarthVelocityAt(position) {
        return new THREE.Vector3().crossVectors(new THREE.Vector3(0, PHYSICS.OMEGA_EARTH, 0), position);
    }

    createMesh() {
        const visHeight = 0.8; 
        const visRadius = 0.08;
        const geometry = new THREE.CylinderGeometry(visRadius * 0.6, visRadius, visHeight, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 50 });
        const mesh = new THREE.Mesh(geometry, material);
        geometry.translate(0, visHeight / 2, 0); 
        return mesh;
    }
    
    createFlame() {
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const flame = new THREE.Mesh(geometry, material);
        flame.position.y = -0.1;
        flame.visible = false;
        return flame;
    }

    stickToGround() {
        this.mesh.position.copy(this.startLocalPosition);
        const up = new THREE.Vector3(0, 1, 0);
        const localUp = this.startLocalPosition.clone().normalize();
        this.mesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, localUp));
    }

    launch() {
        if(!this.isActive) {
            this.isActive = true;
            this.flame.visible = true;
            
            // Init Physique Inertielle
            this.realPosition.copy(this.startLocalPosition).divideScalar(SCALE_FACTOR);
            this.realVelocity = this.getEarthVelocityAt(this.realPosition);
            this.orientation = this.realPosition.clone().normalize();
            
            console.log("🚀 Lancement ! Suivi télémétrique activé.");
            console.log("Format: Temps | Altitude | Vitesse | Angle (Pitch)");
        }
    }

    update(dt) {
        this.earth.rotation.y += PHYSICS.OMEGA_EARTH * dt;

        if (!this.isActive) return;

        this.time += dt;

        // --- CALCULS PHYSIQUES ---
        const rVec = this.realPosition.clone();
        const r = rVec.length();
        const alt = r - PHYSICS.R_EARTH_REAL;
        const upLocal = rVec.clone().normalize();
        
        const vAtmosphere = this.getEarthVelocityAt(this.realPosition);
        const vRel = new THREE.Vector3().subVectors(this.realVelocity, vAtmosphere);
        const vRelMag = vRel.length();

        if (this.time < PHYSICS.BURN_TIME) this.mass -= PHYSICS.MASS_FLOW * dt;
        else this.flame.visible = false;

        // GUIDAGE
        if (this.time < 15) {
            this.orientation = upLocal;
        } else if (this.time < 35) {
            const angleRad = THREE.MathUtils.degToRad((this.time - 15) * 0.3);
            const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), upLocal).normalize();
            this.orientation = upLocal.clone().multiplyScalar(Math.cos(angleRad)).add(east.multiplyScalar(Math.sin(angleRad))).normalize();
        } else {
            let targetDir = (vRelMag > 10) ? vRel.clone().normalize() : upLocal;
            if (alt < 100000) { 
                const angleFromUp = upLocal.angleTo(targetDir); 
                if (angleFromUp > THREE.MathUtils.degToRad(65)) { 
                    const axis = new THREE.Vector3().crossVectors(upLocal, targetDir).normalize();
                    targetDir = upLocal.clone().applyAxisAngle(axis, THREE.MathUtils.degToRad(65));
                }
            }
            this.orientation = targetDir;
        }

        // FORCES
        const forces = upLocal.clone().multiplyScalar(-(PHYSICS.G * PHYSICS.M_EARTH * this.mass) / (r * r));
        if (this.time < PHYSICS.BURN_TIME) forces.add(this.orientation.clone().multiplyScalar(PHYSICS.THRUST));
        if (alt < 140000) {
            const rho = 1.225 * Math.exp(-alt / 8500);
            forces.add(vRel.clone().normalize().multiplyScalar(-0.5 * rho * PHYSICS.AREA * PHYSICS.CD * vRelMag * vRelMag));
        }

        const acc = forces.divideScalar(this.mass);
        this.realVelocity.add(acc.multiplyScalar(dt));
        this.realPosition.add(this.realVelocity.clone().multiplyScalar(dt));

        // VISUEL
        this.updateVisualsInFlight();
        this.updateTrails(dt);
        
        // ============================================================
        // 📊 LOGS CONSOLE (Temps, Alt, Vitesse, Angle)
        // ============================================================
        // On affiche toutes les 5 secondes de simulation pour ne pas spammer
        if (this.time % 5 < dt) {
             // Calcul de l'angle par rapport à l'horizon (Pitch)
             // 90° = Vertical, 0° = Horizontal
             const angleFromVertical = upLocal.angleTo(this.orientation);
             const pitchDeg = 90 - THREE.MathUtils.radToDeg(angleFromVertical);

             console.log(
                `T+${this.time.toFixed(0).padStart(3, '0')}s | ` +
                `Alt: ${(alt/1000).toFixed(0).padStart(4)} km | ` +
                `Vit: ${vRelMag.toFixed(0).padStart(5)} m/s | ` +
                `Angle: ${pitchDeg.toFixed(1)}°`
             );
        }
    }

    updateVisualsInFlight() {
        const physicsRotationAngle = this.time * PHYSICS.OMEGA_EARTH;
        const absolutePos = this.realPosition.clone().multiplyScalar(SCALE_FACTOR);
        
        const localPos = absolutePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -physicsRotationAngle);
        this.mesh.position.copy(localPos);

        const localOrientation = this.orientation.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -physicsRotationAngle);
        const up = new THREE.Vector3(0, 1, 0);
        this.mesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, localOrientation));
    }

    updateTrails(dt) {
        if (this.time - this.lastTraceTime > 0.5) {
            this.lastTraceTime = this.time;
            const currentLocalPos = this.mesh.position.clone();
            
            this.airPathPoints.push(currentLocalPos);
            this.groundPathPoints.push(currentLocalPos.clone().normalize().multiplyScalar(PHYSICS.R_SCENE * 1.002));

            this.airLineGeometry.setFromPoints(this.airPathPoints);
            this.groundLineGeometry.setFromPoints(this.groundPathPoints);
        }
    }
}