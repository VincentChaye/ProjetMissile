// ========================================
// 🎬 INITIALISATION SCÈNE THREE.JS (Terre + Repère + Zoom Centré)
// ========================================

// Variables globales
let scene, camera, renderer;
let earth;

// Configuration visuelle
const CONFIG = {
    EARTH_RADIUS: 5,
    ROTATION_SPEED: 0.0005,
    AUTO_ROTATE: true,
    AXIS_LENGTH: 8
};

function initThreeJS() {
    const canvas = document.getElementById('canvas');
    
    // 1. Scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    
    // 2. Caméra
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    // Position initiale en diagonale pour bien voir le repère
    camera.position.set(12, 10, 20);
    camera.lookAt(0, 0, 0);
    
    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 4. Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    
    // 5. Création de la Terre
    createEarth();
    
    // 6. Création du Repère (Attaché à la Terre)
    createReferenceFrame();
    
    // 7. Étoiles (Restent dans la scène globale)
    createStars();
    
    // 8. Contrôles (Souris + Zoom)
    setupControls();
    
    window.addEventListener('resize', onWindowResize);
}

function createEarth() {
    const earthGeometry = new THREE.SphereGeometry(CONFIG.EARTH_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    // Texture NASA Blue Marble
    const earthTexture = textureLoader.load('https://unpkg.com/three-globe@2.24.3/example/img/earth-blue-marble.jpg');
    
    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture,
        specular: 0x333333,
        shininess: 5,
        bumpScale: 0.05
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth); // La Terre est ajoutée à la scène
    
    // Atmosphère (Enfant de la Terre pour suivre la rotation)
    const atmosphereGeometry = new THREE.SphereGeometry(CONFIG.EARTH_RADIUS * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earth.add(atmosphere);
}

function createReferenceFrame() {
    // Le repère est relatif au centre de la Terre (0,0,0 local)
    const origin = new THREE.Vector3(0, 0, 0);
    
    // 1. Vecteur i (Rouge) - Axe X (Équatorial)
    const dirI = new THREE.Vector3(1, 0, 0);
    const arrowI = new THREE.ArrowHelper(dirI, origin, CONFIG.AXIS_LENGTH, 0xff0000, 0.5, 0.3);
    earth.add(arrowI); // ATTACHÉ À EARTH
    createLabel("i", new THREE.Vector3(CONFIG.AXIS_LENGTH + 0.5, 0, 0), "red");

    // 2. Vecteur k (Vert) - Axe Y (Pôles)
    const dirK = new THREE.Vector3(0, 1, 0);
    const arrowK = new THREE.ArrowHelper(dirK, origin, CONFIG.AXIS_LENGTH, 0x00ff00, 0.5, 0.3);
    earth.add(arrowK); // ATTACHÉ À EARTH
    createLabel("k (Nord)", new THREE.Vector3(0, CONFIG.AXIS_LENGTH + 0.5, 0), "#00ff00");

    // 3. Vecteur j (Bleu) - Axe Z (Équatorial)
    const dirJ = new THREE.Vector3(0, 0, 1);
    const arrowJ = new THREE.ArrowHelper(dirJ, origin, CONFIG.AXIS_LENGTH, 0x0088ff, 0.5, 0.3);
    earth.add(arrowJ); // ATTACHÉ À EARTH
    createLabel("j", new THREE.Vector3(0, 0, CONFIG.AXIS_LENGTH + 0.5), "#0088ff");
    
    // 4. Plan Équatorial (Cercle discret)
    const curve = new THREE.EllipseCurve(
        0, 0,
        CONFIG.AXIS_LENGTH - 1, CONFIG.AXIS_LENGTH - 1,
        0, 2 * Math.PI,
        false,
        0
    );
    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    const equatorialPlane = new THREE.Line(geometry, material);
    
    // Rotation pour mettre le cercle à plat (plan XZ)
    equatorialPlane.rotation.x = Math.PI / 2;
    earth.add(equatorialPlane); // ATTACHÉ À EARTH
}

function createLabel(text, position, colorStr) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.font = "Bold 40px Arial";
    context.fillStyle = colorStr;
    context.textAlign = "center";
    context.fillText(text, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.scale.set(4, 2, 1);
    
    earth.add(sprite); // ATTACHÉ À EARTH
}

function createStars() {
    // Les étoiles sont fixes dans l'espace (attachées à scene, pas à earth)
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true });
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

function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    // --- GESTION ROTATION (Clic Gauche) ---
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        CONFIG.AUTO_ROTATE = false; 
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            // Rotation de l'objet Terre (entraîne le repère)
            earth.rotation.y += deltaX * 0.005;
            earth.rotation.x += deltaY * 0.005;
            
            // Limites pour ne pas inverser les pôles
            earth.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, earth.rotation.x));
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
        CONFIG.AUTO_ROTATE = true;
    });
    
    // --- GESTION ZOOM (Molette) ---
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();

        // 1. Calcul distance actuelle
        let distance = camera.position.length();
        
        // 2. Vitesse de zoom proportionnelle à la distance
        const zoomSpeed = distance * 0.001; 
        
        // 3. Nouvelle distance
        distance += e.deltaY * zoomSpeed;
        
        // 4. Limites (Min: 6.5 pour ne pas rentrer dans la Terre, Max: 100)
        distance = Math.max(6.5, Math.min(100, distance));
        
        // 5. Appliquer la distance en gardant l'angle (Zoom vers le centre)
        camera.position.setLength(distance);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}