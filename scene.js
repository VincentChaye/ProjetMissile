// ========================================
// 🎬 INITIALISATION SCÈNE THREE.JS
// ========================================

// Variables globales de la scène
let scene, camera, renderer;
let earth;
let startMarker, endMarker;

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
    
    // Contrôles de caméra (rotation manuelle)
    setupControls();
    
    // Gestion du redimensionnement
    window.addEventListener('resize', onWindowResize);
}

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
    earth.add(startMarker);  // Attaché à la Terre pour suivre sa rotation
    
    // Marqueur d'arrivée (rouge)
    const endGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    endMarker = new THREE.Mesh(endGeometry, endMaterial);
    earth.add(endMarker);  // Attaché à la Terre pour suivre sa rotation
    
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
        const zoomSpeed = 0.8;
        camera.position.z += e.deltaY * zoomSpeed * 0.01;
        camera.position.z = Math.max(10, Math.min(50, camera.position.z));
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
