(function () {
  'use strict';

  // ==========================================
  // THREE.JS LOAD CHECK
  // ==========================================
  if (typeof THREE === 'undefined') {
    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;inset:0;display:grid;place-content:center;color:#ff4444;font:bold 24px sans-serif;background:#000;z-index:999;';
    msg.textContent = 'Three.js failed to load — check your internet connection.';
    document.body.appendChild(msg);
    return;
  }

  // ==========================================
  // CONSTANTS
  // ==========================================
  var FLOOR_HEIGHT = 3.0;
  var TOTAL_FLOORS = 10;
  var SHAFT_W = 2.6;
  var SHAFT_D = 2.6;
  var SHAFT_H = TOTAL_FLOORS * FLOOR_HEIGHT;
  var CAR_W = 2.2;
  var CAR_H = 2.8;
  var CAR_D = 2.0;
  var DOOR_W = 1.05;
  var DOOR_OPEN = 0.62;
  var CSS_PX = 50; // px per floor in script.js
  var BASE_Y = 0.1;

  // ==========================================
  // RENDERER
  // ==========================================
  var canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  if (renderer.outputColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  // ==========================================
  // SCENE
  // ==========================================
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080816);
  scene.fog = new THREE.FogExp2(0x080816, 0.012);

  // ==========================================
  // CAMERA
  // ==========================================
  var camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 150
  );
  camera.position.set(7, 5, 7);
  camera.lookAt(0, 3, 0);

  // ==========================================
  // LIGHTING
  // ==========================================

  // Ambient
  scene.add(new THREE.AmbientLight(0x445577, 0.5));

  // Key light — warm directional
  var dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  dirLight.position.set(6, SHAFT_H + 5, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 70;
  dirLight.shadow.camera.left = -6;
  dirLight.shadow.camera.right = 6;
  dirLight.shadow.camera.top = 36;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.bias = -0.002;
  scene.add(dirLight);

  // Dramatic top-down spot
  var spot = new THREE.SpotLight(0xccddff, 3.0, 50, Math.PI / 5, 0.5, 1.2);
  spot.position.set(0, SHAFT_H + 4, 1);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  scene.add(spot);
  scene.add(spot.target);

  // Fill from front-below
  scene.add(new THREE.PointLight(0x334466, 0.6, 25));

  // Colored accent light
  var accentLight = new THREE.PointLight(0x2244aa, 0.5, 20);
  accentLight.position.set(-3, 2, 4);
  scene.add(accentLight);

  // ==========================================
  // MATERIALS
  // ==========================================
  var matConcrete = new THREE.MeshStandardMaterial({ color: 0x707580, roughness: 0.88, metalness: 0.08 });
  var matConcreteFloor = new THREE.MeshStandardMaterial({ color: 0x606570, roughness: 0.82, metalness: 0.12 });
  var matCarOut = new THREE.MeshStandardMaterial({ color: 0x181828, roughness: 0.28, metalness: 0.85 });
  var matCarIn = new THREE.MeshStandardMaterial({ color: 0x303040, roughness: 0.55, metalness: 0.25 });
  var matDoor = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, roughness: 0.2, metalness: 0.92 });
  var matRail = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.12, metalness: 1.0 });
  var matCable = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.8 });
  var matGround = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.9, metalness: 0.05 });

  // ==========================================
  // SHAFT STRUCTURE
  // ==========================================
  var shaft = new THREE.Group();

  // Back wall
  var bw = new THREE.Mesh(new THREE.BoxGeometry(SHAFT_W + 0.5, SHAFT_H + 3, 0.3), matConcrete);
  bw.position.set(0, SHAFT_H / 2, -SHAFT_D / 2 - 0.15);
  bw.receiveShadow = true;
  shaft.add(bw);

  // Left wall
  var lw = new THREE.Mesh(new THREE.BoxGeometry(0.3, SHAFT_H + 3, SHAFT_D + 0.5), matConcrete);
  lw.position.set(-SHAFT_W / 2 - 0.15, SHAFT_H / 2, 0);
  lw.receiveShadow = true;
  lw.castShadow = true;
  shaft.add(lw);

  // Right wall
  var rw = new THREE.Mesh(new THREE.BoxGeometry(0.3, SHAFT_H + 3, SHAFT_D + 0.5), matConcrete);
  rw.position.set(SHAFT_W / 2 + 0.15, SHAFT_H / 2, 0);
  rw.receiveShadow = true;
  rw.castShadow = true;
  shaft.add(rw);

  // Floor slabs + trim
  for (var i = 0; i <= TOTAL_FLOORS; i++) {
    var slab = new THREE.Mesh(
      new THREE.BoxGeometry(SHAFT_W + 0.7, 0.2, SHAFT_D + 0.6), matConcreteFloor
    );
    slab.position.set(0, i * FLOOR_HEIGHT, 0);
    slab.receiveShadow = true;
    slab.castShadow = true;
    shaft.add(slab);

    if (i > 0) {
      // Front lip / trim
      var trim = new THREE.Mesh(
        new THREE.BoxGeometry(SHAFT_W + 0.7, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x99aa88, metalness: 0.5, roughness: 0.4, emissive: 0x222211, emissiveIntensity: 0.15 })
      );
      trim.position.set(0, i * FLOOR_HEIGHT + 0.11, SHAFT_D / 2 + 0.28);
      shaft.add(trim);
    }
  }

  // Guide rails (two vertical pipes)
  var railGeo = new THREE.CylinderGeometry(0.045, 0.045, SHAFT_H + 2, 8);
  [-1, 1].forEach(function (s) {
    var r = new THREE.Mesh(railGeo, matRail);
    r.position.set(s * (SHAFT_W / 2 - 0.1), SHAFT_H / 2, -SHAFT_D / 2 + 0.1);
    r.castShadow = true;
    shaft.add(r);
  });

  // Floor number labels (glowing sprites on right wall)
  for (var fi = 0; fi < TOTAL_FLOORS; fi++) {
    var lc = document.createElement('canvas');
    lc.width = 64; lc.height = 64;
    var lx = lc.getContext('2d');
    lx.fillStyle = '#00ff88';
    lx.font = 'bold 40px monospace';
    lx.textAlign = 'center';
    lx.textBaseline = 'middle';
    lx.shadowColor = '#00ff88';
    lx.shadowBlur = 8;
    lx.fillText(String(fi + 1), 32, 32);
    var ltex = new THREE.CanvasTexture(lc);
    var lspr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, transparent: true, opacity: 0.7 }));
    lspr.position.set(SHAFT_W / 2 - 0.1, fi * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5, -SHAFT_D / 2 + 0.16);
    lspr.scale.set(0.6, 0.6, 1);
    shaft.add(lspr);
  }

  // Small emergency lights along shaft (emissive dots)
  for (var ei = 1; ei < TOTAL_FLOORS; ei++) {
    var eLightGeo = new THREE.SphereGeometry(0.04, 6, 6);
    var eLightMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    var eLight = new THREE.Mesh(eLightGeo, eLightMat);
    eLight.position.set(-SHAFT_W / 2 + 0.08, ei * FLOOR_HEIGHT + 2.4, -SHAFT_D / 2 + 0.08);
    shaft.add(eLight);
  }

  scene.add(shaft);

  // Ground plane
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // ==========================================
  // ELEVATOR CAR
  // ==========================================
  var car = new THREE.Group();

  // Floor
  var cf = new THREE.Mesh(new THREE.BoxGeometry(CAR_W, 0.1, CAR_D), matCarOut);
  cf.receiveShadow = true;
  car.add(cf);

  // Ceiling
  var cc = new THREE.Mesh(new THREE.BoxGeometry(CAR_W, 0.08, CAR_D), matCarOut);
  cc.position.y = CAR_H;
  cc.castShadow = true;
  car.add(cc);

  // Interior walls
  var cBack = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.06, CAR_H, 0.05), matCarIn);
  cBack.position.set(0, CAR_H / 2, -CAR_D / 2 + 0.025);
  car.add(cBack);

  var cLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, CAR_H, CAR_D - 0.04), matCarIn);
  cLeft.position.set(-CAR_W / 2 + 0.025, CAR_H / 2, 0);
  car.add(cLeft);

  var cRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, CAR_H, CAR_D - 0.04), matCarIn);
  cRight.position.set(CAR_W / 2 - 0.025, CAR_H / 2, 0);
  car.add(cRight);

  // Exterior shell
  var sBack = new THREE.Mesh(new THREE.BoxGeometry(CAR_W + 0.04, CAR_H + 0.04, 0.04), matCarOut);
  sBack.position.set(0, CAR_H / 2, -CAR_D / 2 - 0.02);
  sBack.castShadow = true;
  car.add(sBack);

  var sLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, CAR_H + 0.04, CAR_D + 0.04), matCarOut);
  sLeft.position.set(-CAR_W / 2 - 0.02, CAR_H / 2, 0);
  sLeft.castShadow = true;
  car.add(sLeft);

  var sRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, CAR_H + 0.04, CAR_D + 0.04), matCarOut);
  sRight.position.set(CAR_W / 2 + 0.02, CAR_H / 2, 0);
  sRight.castShadow = true;
  car.add(sRight);

  // Doors
  var doorGeo = new THREE.BoxGeometry(DOOR_W, CAR_H - 0.3, 0.035);
  var dL = new THREE.Mesh(doorGeo, matDoor);
  dL.position.set(-DOOR_W / 2, CAR_H / 2, CAR_D / 2 + 0.005);
  dL.castShadow = true;
  car.add(dL);

  var dR = new THREE.Mesh(doorGeo, matDoor);
  dR.position.set(DOOR_W / 2, CAR_H / 2, CAR_D / 2 + 0.005);
  dR.castShadow = true;
  car.add(dR);

  // Interior warm light
  var carLight = new THREE.PointLight(0xfff0d0, 0.8, 12, 2);
  carLight.position.set(0, CAR_H - 0.1, 0);
  car.add(carLight);

  // Ceiling light panel (emissive)
  var lightPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.02, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xfffff0 })
  );
  lightPanel.position.set(0, CAR_H - 0.01, 0);
  car.add(lightPanel);

  // ==========================================
  // PERSON
  // ==========================================
  var person = new THREE.Group();

  var skinM = new THREE.MeshStandardMaterial({ color: 0xf5c8a0, roughness: 0.65 });
  var shirtM = new THREE.MeshStandardMaterial({ color: 0x2255bb, roughness: 0.6 });
  var pantsM = new THREE.MeshStandardMaterial({ color: 0x1c1c40, roughness: 0.7 });
  var shoeM = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  var hairM = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });

  // Head
  var pHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skinM);
  pHead.position.set(0, 1.65, 0);
  pHead.castShadow = true;
  person.add(pHead);

  // Hair
  var pHair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairM);
  pHair.position.set(0, 1.65, 0);
  person.add(pHair);

  // Neck
  var pNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skinM);
  pNeck.position.set(0, 1.47, 0);
  person.add(pNeck);

  // Torso
  var pTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.6, 8), shirtM);
  pTorso.position.set(0, 1.12, 0);
  pTorso.castShadow = true;
  person.add(pTorso);

  // Arms
  var armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
  var armL = new THREE.Mesh(armGeo, shirtM);
  armL.position.set(-0.22, 1.05, 0);
  armL.rotation.z = 0.1;
  person.add(armL);
  var armR = new THREE.Mesh(armGeo, shirtM);
  armR.position.set(0.22, 1.05, 0);
  armR.rotation.z = -0.1;
  person.add(armR);

  // Legs
  var legGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.55, 8);
  var legL = new THREE.Mesh(legGeo, pantsM);
  legL.position.set(-0.09, 0.5, 0);
  legL.castShadow = true;
  person.add(legL);
  var legR = new THREE.Mesh(legGeo, pantsM);
  legR.position.set(0.09, 0.5, 0);
  legR.castShadow = true;
  person.add(legR);

  // Shoes
  var shoeGeo = new THREE.BoxGeometry(0.1, 0.05, 0.16);
  var shoeL = new THREE.Mesh(shoeGeo, shoeM);
  shoeL.position.set(-0.09, 0.2, 0.03);
  person.add(shoeL);
  var shoeR = new THREE.Mesh(shoeGeo, shoeM);
  shoeR.position.set(0.09, 0.2, 0.03);
  person.add(shoeR);

  person.position.set(0, 0.05, -0.2);
  car.add(person);

  // ==========================================
  // FLOOR INDICATOR (CanvasTexture inside car)
  // ==========================================
  var indCanvas = document.createElement('canvas');
  indCanvas.width = 128;
  indCanvas.height = 64;
  var indTex = new THREE.CanvasTexture(indCanvas);
  indTex.minFilter = THREE.LinearFilter;

  var indPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshBasicMaterial({ map: indTex, transparent: true })
  );
  indPanel.position.set(0, CAR_H - 0.3, -CAR_D / 2 + 0.06);
  car.add(indPanel);

  // Initial car position (floor 1)
  car.position.set(0, BASE_Y, 0);
  scene.add(car);

  // ==========================================
  // CABLE
  // ==========================================
  var cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1, 6), matCable
  );
  scene.add(cable);

  function updCable() {
    var top = car.position.y + CAR_H;
    var anchor = SHAFT_H + 3;
    var len = Math.max(anchor - top, 0.1);
    cable.scale.y = len;
    cable.position.set(0, top + len / 2, -SHAFT_D / 2 + 0.18);
  }

  // ==========================================
  // COUNTERWEIGHT
  // ==========================================
  var cw = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.9, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.65, roughness: 0.45 })
  );
  cw.castShadow = true;
  scene.add(cw);

  var cwCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1, 6), matCable
  );
  scene.add(cwCable);

  function updCounterweight() {
    var maxY = (TOTAL_FLOORS - 1) * FLOOR_HEIGHT;
    var ratio = Math.max(0, Math.min(1, (car.position.y - BASE_Y) / maxY));
    var cwY = SHAFT_H * 0.85 * (1 - ratio) + 0.5;
    cw.position.set(-SHAFT_W / 2 + 0.1, cwY, -SHAFT_D / 2 + 0.2);

    var anchor = SHAFT_H + 3;
    var cwTop = cwY + 0.45;
    var cwLen = Math.max(anchor - cwTop, 0.1);
    cwCable.scale.y = cwLen;
    cwCable.position.set(-SHAFT_W / 2 + 0.1, cwTop + cwLen / 2, -SHAFT_D / 2 + 0.2);
  }

  // ==========================================
  // STATE
  // ==========================================
  var targetY = BASE_Y;
  var curY = BASE_Y;
  var vel = 0;
  var moving = false;
  var doorAmt = 1.0; // 0=closed, 1=open
  var doorTgt = 1.0;
  var doorsOpen = true;
  var floorNum = 1;
  var floorDir = '\u2013';
  var moveDir = 0; // +1 up, -1 down
  var floorsCount = 0;

  // Camera state
  var MODE = { OVER: 0, TRACK: 1, LOW: 2, HIGH: 3, DOOR: 4 };
  var camMode = MODE.OVER;
  var camP = new THREE.Vector3(7, 5, 7);
  var camL = new THREE.Vector3(0, 3, 0);
  var modeTime = 0;
  var idleTime = 0;

  // ==========================================
  // MUTATION OBSERVERS
  // ==========================================

  // 1) Elevator transform → 3D position
  var elev = document.getElementById('elevator');
  if (elev) {
    new MutationObserver(function () {
      var tf = elev.style.transform;
      if (!tf) return;
      var m = tf.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
      if (!m) return;
      var px = Math.abs(parseFloat(m[1]));
      var ny = (px / CSS_PX) * FLOOR_HEIGHT + BASE_Y;
      if (Math.abs(ny - targetY) > 0.05) {
        moveDir = ny > targetY ? 1 : -1;
        targetY = ny;
        moving = true;
        floorsCount++;
      }
    }).observe(elev, { attributes: true, attributeFilter: ['style'] });
  }

  // 2) Door classes → open/close
  var dLE = document.querySelector('.door-left');
  var dRE = document.querySelector('.door-right');
  function syncD() {
    doorsOpen = !!(dLE && dLE.classList.contains('open'));
    doorTgt = doorsOpen ? 1 : 0;
  }
  if (dLE) new MutationObserver(syncD).observe(dLE, { attributes: true, attributeFilter: ['class'] });
  if (dRE) new MutationObserver(syncD).observe(dRE, { attributes: true, attributeFilter: ['class'] });
  syncD();

  // 3) Floor indicator
  var fnE = document.querySelector('.floor-number');
  var fdE = document.querySelector('.floor-direction');
  if (fnE) new MutationObserver(function () {
    floorNum = parseInt(fnE.textContent) || 1;
    updInd();
  }).observe(fnE, { childList: true, characterData: true, subtree: true });

  if (fdE) new MutationObserver(function () {
    floorDir = fdE.textContent || '\u2013';
    updInd();
    updCamMode();
  }).observe(fdE, { childList: true, characterData: true, subtree: true });

  // ==========================================
  // INDICATOR TEXTURE
  // ==========================================
  function updInd() {
    var c = indCanvas.getContext('2d');
    c.fillStyle = '#060610';
    c.fillRect(0, 0, 128, 64);
    c.strokeStyle = '#004433';
    c.lineWidth = 2;
    c.strokeRect(3, 3, 122, 58);
    c.fillStyle = '#00ff88';
    c.shadowColor = '#00ff88';
    c.shadowBlur = 6;
    c.font = 'bold 36px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(floorNum + ' ' + floorDir, 64, 34);
    c.shadowBlur = 0;
    indTex.needsUpdate = true;
  }
  updInd();

  // ==========================================
  // CAMERA MODE SELECTION
  // ==========================================
  function updCamMode() {
    var now = performance.now() * 0.001;
    if (now - modeTime < 0.8) return;

    if (floorDir === '\u25B2') { // up arrow
      camMode = (floorsCount % 5 === 0 && Math.random() > 0.45) ? MODE.HIGH : MODE.TRACK;
      idleTime = 0;
      modeTime = now;
    } else if (floorDir === '\u25BC') { // down arrow
      camMode = (floorsCount % 5 === 0 && Math.random() > 0.45) ? MODE.LOW : MODE.TRACK;
      idleTime = 0;
      modeTime = now;
    } else {
      if (doorsOpen && camMode !== MODE.DOOR && camMode !== MODE.OVER) {
        camMode = MODE.DOOR;
        modeTime = now;
      }
    }
  }

  // ==========================================
  // CAMERA UPDATE
  // ==========================================
  function updCam(t, dt) {
    var cy = car.position.y + CAR_H * 0.5;
    var tp, tl;

    switch (camMode) {
      case MODE.OVER:
        tp = new THREE.Vector3(
          6.0 + Math.sin(t * 0.15) * 2.0,
          cy + 5 + Math.sin(t * 0.1) * 1.5,
          6.0 + Math.cos(t * 0.12) * 1.5
        );
        tl = new THREE.Vector3(0, cy, 0);
        break;

      case MODE.TRACK:
        tp = new THREE.Vector3(
          4.5 + Math.sin(t * 0.3) * 0.7,
          cy + 1.0 + moveDir * 0.6,
          4.2 + Math.cos(t * 0.2) * 0.4
        );
        tl = new THREE.Vector3(0, cy + moveDir * 1.5, 0);
        // shake
        tp.x += (Math.random() - 0.5) * 0.03;
        tp.y += (Math.random() - 0.5) * 0.025;
        break;

      case MODE.LOW:
        tp = new THREE.Vector3(
          3.8 + Math.sin(t * 0.18) * 0.4,
          Math.max(cy - 10, 0.5),
          5.0
        );
        tl = new THREE.Vector3(0, cy + 4, 0);
        break;

      case MODE.HIGH:
        tp = new THREE.Vector3(
          3.8 + Math.sin(t * 0.18) * 0.4,
          Math.min(cy + 12, SHAFT_H + 4),
          5.0
        );
        tl = new THREE.Vector3(0, cy - 4, 0);
        break;

      case MODE.DOOR:
        var pushIn = Math.min(idleTime * 0.06, 0.5);
        tp = new THREE.Vector3(0, cy + 0.15, CAR_D / 2 + 4.0 - pushIn);
        tl = new THREE.Vector3(0, cy - 0.05, 0);
        break;

      default:
        tp = camP.clone();
        tl = camL.clone();
    }

    // Smooth lerp (framerate independent)
    var f = 1.0 - Math.pow(0.02, dt);
    camP.lerp(tp, f);
    camL.lerp(tl, f);
    camera.position.copy(camP);
    camera.lookAt(camL);
  }

  // ==========================================
  // RENDER LOOP
  // ==========================================
  var clock = new THREE.Clock();

  function loop() {
    requestAnimationFrame(loop);

    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // --- Car physics ---
    var diff = targetY - curY;
    var dist = Math.abs(diff);

    if (dist > 0.004) {
      var d = Math.sign(diff);
      var decelDist = (vel * vel) / 24;

      if (dist > decelDist + 0.12) {
        vel = Math.min(vel + 12 * dt, 8);
      } else {
        vel = Math.max(vel - 18 * dt, 0.25);
      }
      curY += d * vel * dt;

      if ((d > 0 && curY > targetY) || (d < 0 && curY < targetY)) {
        curY = targetY;
        vel = 0;
        moving = false;
        moveDir = 0;
      }
    } else {
      curY = targetY;
      vel = 0;
      if (moving) { moving = false; moveDir = 0; }
    }
    car.position.y = curY;

    // --- Doors ---
    var dd = doorTgt - doorAmt;
    if (Math.abs(dd) > 0.001) {
      doorAmt += Math.sign(dd) * 1.8 * dt;
      doorAmt = Math.max(0, Math.min(1, doorAmt));
    }
    dL.position.x = -DOOR_W / 2 - doorAmt * DOOR_OPEN;
    dR.position.x = DOOR_W / 2 + doorAmt * DOOR_OPEN;

    // Light spills more when doors open
    carLight.intensity = 0.35 + doorAmt * 0.65;

    // --- Cable + counterweight ---
    updCable();
    updCounterweight();

    // --- Idle / camera mode timer ---
    if (!moving) {
      idleTime += dt;
      if (idleTime > 4.5 && camMode === MODE.DOOR) camMode = MODE.OVER;
    } else {
      idleTime = 0;
    }

    // --- Camera ---
    updCam(t, dt);

    // --- Render ---
    renderer.render(scene, camera);
  }

  // ==========================================
  // RESIZE
  // ==========================================
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ==========================================
  // GO
  // ==========================================
  updCable();
  updCounterweight();
  loop();

})();
