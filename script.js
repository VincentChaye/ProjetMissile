import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js";

const EARTH_RADIUS = 6_371_000; // metres
const G0 = 9.80665;
const RHO0 = 1.225; // kg/m^3
const SCALE_HEIGHT = 8_000; // metres
const UNIT_SCALE = 1 / 100_000; // 1 scene unit = 100 km
const ALTITUDE_EXAGGERATION = 75; // exaggerate altitude visually
const EARTH_RADIUS_UI = EARTH_RADIUS * UNIT_SCALE;
const ALTITUDE_SCALE = UNIT_SCALE * ALTITUDE_EXAGGERATION;

const container = document.getElementById("scene-container");
const form = document.getElementById("simulation-form");
const resetBtn = document.getElementById("reset-btn");

const telemetryElements = {
  time: document.getElementById("telemetry-time"),
  altitude: document.getElementById("telemetry-altitude"),
  velocity: document.getElementById("telemetry-velocity"),
  mass: document.getElementById("telemetry-mass"),
  thrust: document.getElementById("telemetry-thrust"),
  drag: document.getElementById("telemetry-drag"),
  gravity: document.getElementById("telemetry-gravity"),
  density: document.getElementById("telemetry-density"),
};

let renderer;
let scene;
let camera;
let controls;
let earthMesh;
let rocketGroup;
let trajectoryLine;
let launchMarker;
let impactMarker;

const simulation = {
  data: null,
  isRunning: false,
  startTime: 0,
  currentTime: 0,
  cursor: 0,
  playbackSpeed: 1,
};

initScene();
updateMarkersFromInputs();
resetTelemetry();
animate();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  startSimulation();
});

resetBtn.addEventListener("click", () => {
  resetSimulation();
});

form.addEventListener("input", (event) => {
  if (["launchLat", "launchLon", "impactLat", "impactLon"].includes(event.target.name)) {
    updateMarkersFromInputs();
  }
});

window.addEventListener("resize", onWindowResize);

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040f);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    5000
  );
  camera.position.set(EARTH_RADIUS_UI * 1.5, EARTH_RADIUS_UI * 0.8, EARTH_RADIUS_UI * 1.5);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = EARTH_RADIUS_UI * 1.1;
  controls.maxDistance = EARTH_RADIUS_UI * 6;
  controls.target.set(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x8899cc, 0.6);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
  sunLight.position.set(3, 2, 1).multiplyScalar(EARTH_RADIUS_UI * 2);
  scene.add(sunLight);

  const earthTexture = new THREE.TextureLoader().load(
    "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
  );

  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UI, 128, 128);
  const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earthMesh);

  const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UI * 1.02, 128, 128);
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x4f95ff,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  earthMesh.add(atmosphere);

  launchMarker = createMarker(0x5effb5);
  impactMarker = createMarker(0xff8a5c);
  scene.add(launchMarker, impactMarker);

  rocketGroup = createRocket();
  rocketGroup.visible = false;
  scene.add(rocketGroup);

  addStarfield();
}

function createMarker(color) {
  const markerRadius = EARTH_RADIUS_UI * 0.02;
  const geometry = new THREE.SphereGeometry(markerRadius, 24, 24);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  return new THREE.Mesh(geometry, material);
}

function createRocket() {
  const group = new THREE.Group();

  const bodyGeometry = new THREE.CylinderGeometry(0.18, 0.24, 1.6, 24);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffcf8f, shininess: 80 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.8;
  group.add(body);

  const noseGeometry = new THREE.ConeGeometry(0.18, 0.6, 24);
  const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xff735c, shininess: 100 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.y = 1.6;
  group.add(nose);

  const finGeometry = new THREE.BoxGeometry(0.05, 0.35, 0.25);
  const finMaterial = new THREE.MeshPhongMaterial({ color: 0x89c2ff });
  const finPositions = [
    [0.16, 0.2, 0],
    [-0.16, 0.2, 0],
    [0, 0.2, 0.16],
    [0, 0.2, -0.16],
  ];
  finPositions.forEach(([x, y, z]) => {
    const fin = new THREE.Mesh(finGeometry, finMaterial);
    fin.position.set(x, y, z);
    group.add(fin);
  });

  const exhaustGeometry = new THREE.ConeGeometry(0.26, 0.4, 16, 1, true);
  const exhaustMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc857,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  exhaust.position.y = 0.1;
  exhaust.rotation.x = Math.PI;
  group.add(exhaust);

  return group;
}

function addStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const radius = EARTH_RADIUS_UI * (6 + Math.random() * 6);
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = 2 * Math.PI * Math.random();
    const idx = i * 3;
    positions[idx] = radius * Math.sin(theta) * Math.cos(phi);
    positions[idx + 1] = radius * Math.cos(theta);
    positions[idx + 2] = radius * Math.sin(theta) * Math.sin(phi);
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: true });
  const starfield = new THREE.Points(starGeometry, starMaterial);
  scene.add(starfield);
}

function onWindowResize() {
  const { clientWidth, clientHeight } = container;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (simulation.isRunning && simulation.data) {
    const now = performance.now();
    const elapsed = (now - simulation.startTime) / 1000;
    simulation.currentTime = Math.min(
      elapsed * simulation.playbackSpeed,
      simulation.data.totalTime
    );

    updateRocket(simulation.currentTime);

    if (simulation.currentTime >= simulation.data.totalTime) {
      simulation.isRunning = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function startSimulation() {
  const params = readSimulationParameters();
  if (!params) {
    return;
  }

  updateMarkers(params.launchVector, params.impactVector);

  const data = prepareSimulationData(params);
  if (!data) {
    alert("Impossible de calculer la trajectoire avec ces paramètres.");
    return;
  }

  simulation.data = data;
  simulation.isRunning = true;
  simulation.startTime = performance.now();
  simulation.currentTime = 0;
  simulation.cursor = 0;

  if (trajectoryLine) {
    scene.remove(trajectoryLine);
    trajectoryLine.geometry.dispose();
    trajectoryLine.material.dispose();
    trajectoryLine = null;
  }

  trajectoryLine = new THREE.Line(
    data.trajectoryGeometry,
    new THREE.LineBasicMaterial({ color: 0x5edfff, transparent: true, opacity: 0.85 })
  );
  scene.add(trajectoryLine);

  rocketGroup.visible = true;
  rocketGroup.position.copy(data.states[0].position);
  updateTelemetry(data.states[0]);
}

function resetSimulation() {
  simulation.data = null;
  simulation.isRunning = false;
  simulation.currentTime = 0;
  simulation.cursor = 0;

  if (trajectoryLine) {
    scene.remove(trajectoryLine);
    trajectoryLine.geometry.dispose();
    trajectoryLine.material.dispose();
    trajectoryLine = null;
  }

  rocketGroup.visible = false;
  rocketGroup.position.set(0, 0, 0);
  resetTelemetry();

  updateMarkersFromInputs();
}

function readSimulationParameters() {
  const launchLat = parseFloat(form.launchLat.value);
  const launchLon = parseFloat(form.launchLon.value);
  const impactLat = parseFloat(form.impactLat.value);
  const impactLon = parseFloat(form.impactLon.value);
  const initialMass = Math.max(1, parseFloat(form.initialMass.value));
  const thrust = Math.max(0, parseFloat(form.thrust.value));
  const massFlow = Math.max(0, parseFloat(form.massFlow.value));
  const burnTime = Math.max(0, parseFloat(form.burnTime.value));
  const area = Math.max(0, parseFloat(form.area.value));
  const drag = Math.max(0, parseFloat(form.drag.value));

  const values = [
    launchLat,
    launchLon,
    impactLat,
    impactLon,
    initialMass,
    thrust,
    massFlow,
    burnTime,
    area,
    drag,
  ];

  if (values.some((value) => Number.isNaN(value) || !Number.isFinite(value))) {
    alert("Merci de vérifier les paramètres saisis.");
    return null;
  }

  const launchVector = latLonToVector3(launchLat, launchLon);
  const impactVector = latLonToVector3(impactLat, impactLon);

  return {
    launchLat,
    launchLon,
    impactLat,
    impactLon,
    initialMass,
    thrust,
    massFlow,
    burnTime,
    area,
    drag,
    launchVector,
    impactVector,
  };
}

function prepareSimulationData(params) {
  const verticalProfile = simulateVerticalFlight(params);
  if (!verticalProfile || verticalProfile.states.length < 2) {
    return null;
  }

  const totalTime = verticalProfile.states[verticalProfile.states.length - 1].time;
  const states = verticalProfile.states;
  const { launchVector, impactVector } = params;
  const positions = new Float32Array(states.length * 3);

  for (let i = 0; i < states.length; i += 1) {
    const state = states[i];
    const progress = totalTime > 0 ? state.time / totalTime : 0;
    const easedProgress = easeInOutCubic(progress);
    const direction = slerpVectors(launchVector, impactVector, easedProgress).normalize();
    const radius = EARTH_RADIUS_UI + state.altitude * ALTITUDE_SCALE;
    const position = direction.clone().multiplyScalar(radius);
    state.position = position;
    state.direction = direction;
    const idx = i * 3;
    positions[idx] = position.x;
    positions[idx + 1] = position.y;
    positions[idx + 2] = position.z;
  }

  for (let i = 0; i < states.length; i += 1) {
    const prev = states[Math.max(i - 1, 0)].position;
    const next = states[Math.min(i + 1, states.length - 1)].position;
    const tangent = next.clone().sub(prev).normalize();
    states[i].tangent = tangent;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  return {
    states,
    totalTime,
    dt: verticalProfile.dt,
    trajectoryGeometry: geometry,
    apogee: verticalProfile.apogee,
    maxVelocity: verticalProfile.maxVelocity,
  };
}

function simulateVerticalFlight(params) {
  const dt = 0.05;
  const maxDuration = 800;

  const minDryMass = params.initialMass * 0.05;
  const maxFuelMass = Math.max(params.initialMass - minDryMass, 0);
  const effectiveMassFlow = params.burnTime > 0
    ? Math.min(params.massFlow, maxFuelMass / params.burnTime)
    : 0;
  const dryMassEstimate = Math.max(
    params.initialMass - effectiveMassFlow * params.burnTime,
    minDryMass
  );
  const effectiveParams = { ...params, massFlow: effectiveMassFlow };

  let t = 0;
  let h = 0;
  let v = 0;
  let m = params.initialMass;

  const states = [];
  let apogee = 0;
  let maxVelocity = 0;

  while (t <= maxDuration) {
    const deriv = computeDerivatives({ h, v, m }, t, effectiveParams, dryMassEstimate);
    states.push({
      time: t,
      altitude: h,
      velocity: v,
      mass: m,
      thrust: deriv.thrust,
      drag: Math.abs(deriv.drag),
      gravity: deriv.g,
      density: deriv.rho,
    });

    apogee = Math.max(apogee, h);
    maxVelocity = Math.max(maxVelocity, Math.abs(v));

    const nextState = rk4Step({ h, v, m }, t, dt, effectiveParams, dryMassEstimate);
    const hNext = nextState.h;

    if (h > 0 && hNext <= 0) {
      const denominator = h - hNext;
      const fraction = denominator !== 0 ? THREE.MathUtils.clamp(h / denominator, 0, 1) : 0;
      const impactTime = t + fraction * dt;
      const impactVelocity = THREE.MathUtils.lerp(v, nextState.v, fraction);
      const impactMass = THREE.MathUtils.lerp(m, nextState.m, fraction);
      const impactDeriv = computeDerivatives({ h: 0, v: impactVelocity, m: impactMass }, impactTime, effectiveParams, dryMassEstimate);
      states.push({
        time: impactTime,
        altitude: 0,
        velocity: impactVelocity,
        mass: impactMass,
        thrust: 0,
        drag: Math.abs(impactDeriv.drag),
        gravity: impactDeriv.g,
        density: impactDeriv.rho,
      });
      break;
    }

    h = Math.max(0, hNext);
    v = nextState.v;
    m = Math.max(dryMassEstimate, nextState.m);
    t += dt;

    if (h <= 0 && t > params.burnTime + 5) {
      break;
    }
  }

  return { states, dt, apogee, maxVelocity };
}

function computeDerivatives(state, time, params, dryMass) {
  const activeBurn = time <= params.burnTime && params.massFlow > 0;
  const thrust = activeBurn ? params.thrust : 0;
  const massFlow = activeBurn ? params.massFlow : 0;
  const h = Math.max(0, state.h);
  const m = Math.max(dryMass, state.m);
  const rho = RHO0 * Math.exp(-h / SCALE_HEIGHT);
  const g = G0 * (EARTH_RADIUS / (EARTH_RADIUS + h)) ** 2;
  const drag = 0.5 * rho * params.drag * params.area * state.v * Math.abs(state.v);
  const dhdt = state.v;
  const dvdt = (thrust - drag - m * g) / m;
  const dmdt = -massFlow;
  return { dhdt, dvdt, dmdt, thrust, drag, g, rho };
}

function rk4Step(state, time, dt, params, dryMass) {
  const k1 = computeDerivatives(state, time, params, dryMass);
  const s1 = advanceState(state, k1, dt / 2);
  const k2 = computeDerivatives(s1, time + dt / 2, params, dryMass);
  const s2 = advanceState(state, k2, dt / 2);
  const k3 = computeDerivatives(s2, time + dt / 2, params, dryMass);
  const s3 = advanceState(state, k3, dt);
  const k4 = computeDerivatives(s3, time + dt, params, dryMass);

  const h = state.h + (dt / 6) * (k1.dhdt + 2 * k2.dhdt + 2 * k3.dhdt + k4.dhdt);
  const v = state.v + (dt / 6) * (k1.dvdt + 2 * k2.dvdt + 2 * k3.dvdt + k4.dvdt);
  const m = state.m + (dt / 6) * (k1.dmdt + 2 * k2.dmdt + 2 * k3.dmdt + k4.dmdt);

  return { h, v, m };
}

function advanceState(state, derivative, scale) {
  return {
    h: state.h + derivative.dhdt * scale,
    v: state.v + derivative.dvdt * scale,
    m: state.m + derivative.dmdt * scale,
  };
}

function updateRocket(currentTime) {
  const { data } = simulation;
  const { states } = data;

  while (
    simulation.cursor < states.length - 2 &&
    states[simulation.cursor + 1].time <= currentTime
  ) {
    simulation.cursor += 1;
  }

  const currentState = states[simulation.cursor];
  const nextState = states[Math.min(simulation.cursor + 1, states.length - 1)];
  const segmentDuration = Math.max(nextState.time - currentState.time, 1e-6);
  const alpha = (currentTime - currentState.time) / segmentDuration;

  const interpolatedPosition = currentState.position
    .clone()
    .lerp(nextState.position, alpha);
  rocketGroup.position.copy(interpolatedPosition);

  const interpolatedTangent = currentState.tangent
    .clone()
    .lerp(nextState.tangent, alpha)
    .normalize();

  if (interpolatedTangent.lengthSq() > 0) {
    alignRocketToDirection(interpolatedTangent);
  }

  const altitude = THREE.MathUtils.lerp(currentState.altitude, nextState.altitude, alpha);
  const velocity = THREE.MathUtils.lerp(currentState.velocity, nextState.velocity, alpha);
  const mass = THREE.MathUtils.lerp(currentState.mass, nextState.mass, alpha);
  const thrust = THREE.MathUtils.lerp(currentState.thrust, nextState.thrust, alpha);
  const drag = THREE.MathUtils.lerp(currentState.drag, nextState.drag, alpha);
  const gravity = THREE.MathUtils.lerp(currentState.gravity, nextState.gravity, alpha);
  const density = THREE.MathUtils.lerp(currentState.density, nextState.density, alpha);

  updateTelemetry({
    time: currentTime,
    altitude,
    velocity,
    mass,
    thrust,
    drag,
    gravity,
    density,
  });
}

function alignRocketToDirection(direction) {
  const upAxis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(upAxis, direction.normalize());
  rocketGroup.setRotationFromQuaternion(quaternion);
}

function updateTelemetry(state) {
  telemetryElements.time.textContent = `${state.time.toFixed(1)} s`;
  telemetryElements.altitude.textContent = `${formatNumber(state.altitude)} m`;
  telemetryElements.velocity.textContent = `${formatNumber(state.velocity)} m/s`;
  telemetryElements.mass.textContent = `${state.mass.toFixed(1)} kg`;
  telemetryElements.thrust.textContent = `${formatNumber(state.thrust)} N`;
  telemetryElements.drag.textContent = `${formatNumber(state.drag)} N`;
  telemetryElements.gravity.textContent = `${state.gravity.toFixed(3)} m/s²`;
  telemetryElements.density.textContent = `${state.density.toFixed(3)} kg/m³`;
}

function resetTelemetry() {
  updateTelemetry({
    time: 0,
    altitude: 0,
    velocity: 0,
    mass: 0,
    thrust: 0,
    drag: 0,
    gravity: G0,
    density: RHO0,
  });
}

function updateMarkers(launchVector, impactVector) {
  const launchPosition = launchVector.clone().multiplyScalar(EARTH_RADIUS_UI * 1.01);
  const impactPosition = impactVector.clone().multiplyScalar(EARTH_RADIUS_UI * 1.01);
  launchMarker.position.copy(launchPosition);
  impactMarker.position.copy(impactPosition);
}

function updateMarkersFromInputs() {
  const launchLat = parseFloat(form.launchLat.value);
  const launchLon = parseFloat(form.launchLon.value);
  const impactLat = parseFloat(form.impactLat.value);
  const impactLon = parseFloat(form.impactLon.value);

  if ([launchLat, launchLon, impactLat, impactLon].some((value) => Number.isNaN(value))) {
    return;
  }

  const launchVector = latLonToVector3(launchLat, launchLon);
  const impactVector = latLonToVector3(impactLat, impactLon);
  updateMarkers(launchVector, impactVector);
}

function latLonToVector3(latDeg, lonDeg) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = Math.cos(lat) * Math.cos(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z).normalize();
}

function slerpVectors(a, b, t) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9995) {
    return a.clone().lerp(b, t).normalize();
  }
  if (dot < -0.9995) {
    const orthogonal = Math.abs(a.x) < 0.1 && Math.abs(a.z) < 0.1
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const axis = orthogonal.sub(a.clone().multiplyScalar(a.dot(orthogonal))).normalize();
    const angle = Math.PI * t;
    return a.clone().multiplyScalar(Math.cos(angle)).add(axis.multiplyScalar(Math.sin(angle))).normalize();
  }
  const theta = Math.acos(dot) * t;
  const relative = b.clone().sub(a.clone().multiplyScalar(dot)).normalize();
  return a.clone().multiplyScalar(Math.cos(theta)).add(relative.multiplyScalar(Math.sin(theta))).normalize();
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function formatNumber(value) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absValue >= 1000) {
    return `${sign}${absValue.toFixed(0)}`;
  }
  if (absValue >= 10) {
    return `${sign}${absValue.toFixed(1)}`;
  }
  return `${sign}${absValue.toFixed(2)}`;
}
