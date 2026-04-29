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
  var DOOR_W = 0.65;
  var DOOR_OPEN = 0.42;
  var CSS_PX = 50;
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
  scene.fog = new THREE.FogExp2(0x080816, 0.008);

  // ==========================================
  // CAMERA
  // ==========================================
  var camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 150
  );
  camera.position.set(9, SHAFT_H * 0.75, 11);
  camera.lookAt(0, SHAFT_H * 0.4, 0);

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
  var spot = new THREE.SpotLight(0xccddff, 4.0, 50, Math.PI / 5, 0.5, 1.2);
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

  // Blue rim light from below-right
  var rimLight = new THREE.PointLight(0x1133aa, 0.4, 30);
  rimLight.position.set(3, -1, 3);
  scene.add(rimLight);

  // Cable highlight light — illuminates the cable run area
  var cableLight = new THREE.PointLight(0xaabbdd, 0.6, 40);
  cableLight.position.set(2, SHAFT_H * 0.5, 2);
  scene.add(cableLight);

  // ==========================================
  // MATERIALS
  // ==========================================
  var matConcrete = new THREE.MeshStandardMaterial({
    color: 0x707580, roughness: 0.88, metalness: 0.08,
    emissive: 0x050508, emissiveIntensity: 0.15
  });
  var matConcreteFloor = new THREE.MeshStandardMaterial({ color: 0x606570, roughness: 0.82, metalness: 0.12 });
  var matCarOut = new THREE.MeshStandardMaterial({ color: 0x181828, roughness: 0.28, metalness: 0.85 });
  var matCarIn = new THREE.MeshStandardMaterial({ color: 0x303040, roughness: 0.55, metalness: 0.25 });
  var matDoor = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, roughness: 0.2, metalness: 0.92 });
  var matRail = new THREE.MeshStandardMaterial({
    color: 0xbbbbbb, roughness: 0.08, metalness: 1.0,
    emissive: 0x111115, emissiveIntensity: 0.1
  });
  var matCable = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.8 });
  var matGround = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.9, metalness: 0.05 });

  // New materials
  var matDoorFrame = new THREE.MeshStandardMaterial({
    color: 0x8a9078, metalness: 0.55, roughness: 0.35,
    emissive: 0x111108, emissiveIntensity: 0.1
  });
  var matSteelCable = new THREE.MeshStandardMaterial({
    color: 0x999999, roughness: 0.2, metalness: 0.95,
    emissive: 0x333333, emissiveIntensity: 0.3
  });
  var matSheave = new THREE.MeshStandardMaterial({
    color: 0x555555, roughness: 0.25, metalness: 0.95
  });
  var matBracket = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a, roughness: 0.5, metalness: 0.8
  });
  var matBrace = new THREE.MeshStandardMaterial({
    color: 0x6a6a70, roughness: 0.4, metalness: 0.7
  });
  var matMachineRoom = new THREE.MeshStandardMaterial({
    color: 0x5a5a68, roughness: 0.75, metalness: 0.2
  });

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

  // ==========================================
  // HOLLOW SHAFT: Structural ledges + door frames
  // ==========================================

  // Ground-level slab only (floor 0)
  var groundSlab = new THREE.Mesh(
    new THREE.BoxGeometry(SHAFT_W + 0.5, 0.2, SHAFT_D + 0.4), matConcreteFloor
  );
  groundSlab.position.set(0, 0, 0);
  groundSlab.receiveShadow = true;
  groundSlab.castShadow = true;
  shaft.add(groundSlab);

  // Door sill at each floor
  var sillGeo = new THREE.BoxGeometry(CAR_W + 0.4, 0.04, 0.15);

  for (var i = 1; i <= TOTAL_FLOORS; i++) {
    var fy = i * FLOOR_HEIGHT;

    // Door sill (threshold) only — no jambs/lintels to reduce clutter
    var sill = new THREE.Mesh(sillGeo, matRail);
    sill.position.set(0, fy + 0.02, SHAFT_D / 2 + 0.24);
    shaft.add(sill);
  }

  // ==========================================
  // GUIDE RAILS
  // ==========================================
  var railGeo = new THREE.CylinderGeometry(0.045, 0.045, SHAFT_H + 2, 8);
  [-1, 1].forEach(function (s) {
    var r = new THREE.Mesh(railGeo, matRail);
    r.position.set(s * (SHAFT_W / 2 - 0.1), SHAFT_H / 2, -SHAFT_D / 2 + 0.1);
    r.castShadow = true;
    shaft.add(r);
  });

  // Guide rail clip brackets every 2 floors
  var clipGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
  for (var rci = 1; rci < TOTAL_FLOORS; rci += 2) {
    [-1, 1].forEach(function (s) {
      var clip = new THREE.Mesh(clipGeo, matBracket);
      clip.position.set(
        s * (SHAFT_W / 2 - 0.1),
        rci * FLOOR_HEIGHT + 1.5,
        -SHAFT_D / 2 + 0.1
      );
      shaft.add(clip);
    });
  }

  // ==========================================
  // CROSS-BRACING ON BACK WALL
  // ==========================================
  var spanH = 3 * FLOOR_HEIGHT;
  var spanW = SHAFT_W * 0.6;
  var braceLen = Math.sqrt(spanH * spanH + spanW * spanW);
  var braceAngle = Math.atan2(spanW, spanH);
  var braceGeo = new THREE.BoxGeometry(0.04, braceLen, 0.04);

  var braceCenters = [1.5 * FLOOR_HEIGHT, 5.0 * FLOOR_HEIGHT, 8.5 * FLOOR_HEIGHT];
  for (var bi = 0; bi < braceCenters.length; bi++) {
    var b1 = new THREE.Mesh(braceGeo, matBrace);
    b1.position.set(0, braceCenters[bi], -SHAFT_D / 2 + 0.02);
    b1.rotation.z = braceAngle;
    shaft.add(b1);

    var b2 = new THREE.Mesh(braceGeo, matBrace);
    b2.position.set(0, braceCenters[bi], -SHAFT_D / 2 + 0.02);
    b2.rotation.z = -braceAngle;
    shaft.add(b2);
  }

  // ==========================================
  // FLOOR NUMBER LABELS
  // ==========================================
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

  // ==========================================
  // EMERGENCY LIGHTS
  // ==========================================
  for (var ei = 1; ei < TOTAL_FLOORS; ei++) {
    var eLightGeo = new THREE.SphereGeometry(0.04, 6, 6);
    var eLightMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    var eLight = new THREE.Mesh(eLightGeo, eLightMat);
    eLight.position.set(-SHAFT_W / 2 + 0.08, ei * FLOOR_HEIGHT + 2.4, -SHAFT_D / 2 + 0.08);
    shaft.add(eLight);
  }

  // ==========================================
  // MACHINE ROOM (open frame so cables are visible)
  // ==========================================
  var mrBeamGeo = new THREE.BoxGeometry(0.15, 0.15, SHAFT_D + 0.6);
  var mrBeamGeoX = new THREE.BoxGeometry(SHAFT_W + 0.6, 0.15, 0.15);
  var mrPostGeo = new THREE.BoxGeometry(0.15, 3.0, 0.15);

  // 4 corner posts
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) {
    var post = new THREE.Mesh(mrPostGeo, matMachineRoom);
    post.position.set(
      c[0] * (SHAFT_W / 2 + 0.22),
      SHAFT_H + 1.5,
      c[1] * (SHAFT_D / 2 + 0.22)
    );
    post.castShadow = true;
    shaft.add(post);
  });

  // Top beams (connecting posts at top)
  var mrTopY = SHAFT_H + 3.0;
  var mrBotY = SHAFT_H + 0.05;
  [mrTopY, mrBotY].forEach(function (by) {
    // Front-back beams (left and right side)
    [-1, 1].forEach(function (s) {
      var beam = new THREE.Mesh(mrBeamGeo, matMachineRoom);
      beam.position.set(s * (SHAFT_W / 2 + 0.22), by, 0);
      shaft.add(beam);
    });
    // Left-right beams (front and back side)
    [-1, 1].forEach(function (s) {
      var beam = new THREE.Mesh(mrBeamGeoX, matMachineRoom);
      beam.position.set(0, by, s * (SHAFT_D / 2 + 0.22));
      shaft.add(beam);
    });
  });

  // Motor housing drum (centered in machine room)
  var motorDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16), matSheave
  );
  motorDrum.rotation.z = Math.PI / 2;
  motorDrum.position.set(0, SHAFT_H + 2.5, -SHAFT_D / 2 + 0.5);
  shaft.add(motorDrum);

  // ==========================================
  // ELEVATOR PIT (below ground)
  // ==========================================

  // Pit back wall
  var pitBack = new THREE.Mesh(new THREE.BoxGeometry(SHAFT_W + 0.5, 1.5, 0.3), matConcrete);
  pitBack.position.set(0, -0.75, -SHAFT_D / 2 - 0.15);
  shaft.add(pitBack);

  // Pit left wall
  var pitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, SHAFT_D + 0.5), matConcrete);
  pitLeft.position.set(-SHAFT_W / 2 - 0.15, -0.75, 0);
  shaft.add(pitLeft);

  // Pit right wall
  var pitRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, SHAFT_D + 0.5), matConcrete);
  pitRight.position.set(SHAFT_W / 2 + 0.15, -0.75, 0);
  shaft.add(pitRight);

  // Pit floor
  var pitFloor = new THREE.Mesh(
    new THREE.BoxGeometry(SHAFT_W + 0.3, 0.15, SHAFT_D + 0.3), matConcreteFloor
  );
  pitFloor.position.set(0, -1.5, 0);
  shaft.add(pitFloor);

  // Safety buffers (hydraulic cylinders)
  var bufferMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.4, metalness: 0.3 });
  var springMat = new THREE.MeshStandardMaterial({ color: 0xbb3300, roughness: 0.35, metalness: 0.5 });
  var bufferGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);

  [-0.3, 0.3].forEach(function (bx) {
    var buf = new THREE.Mesh(bufferGeo, bufferMat);
    buf.position.set(bx, -1.1, 0);
    shaft.add(buf);

    // Spring coils
    var springYs = [-1.2, -1.05, -0.9];
    for (var si = 0; si < springYs.length; si++) {
      var spring = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.015, 6, 16), springMat
      );
      spring.rotation.x = Math.PI / 2;
      spring.position.set(bx, springYs[si], 0);
      shaft.add(spring);
    }
  });

  scene.add(shaft);

  // ==========================================
  // GROUND PLANE
  // ==========================================
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

  // Front wall panels (flanking the door opening)
  var frontPanelW = (CAR_W - DOOR_W * 2) / 2;
  var frontPanelGeo = new THREE.BoxGeometry(frontPanelW, CAR_H, 0.05);
  var fpL = new THREE.Mesh(frontPanelGeo, matCarIn);
  fpL.position.set(-CAR_W / 2 + frontPanelW / 2, CAR_H / 2, CAR_D / 2 - 0.02);
  car.add(fpL);
  var fpR = new THREE.Mesh(frontPanelGeo, matCarIn);
  fpR.position.set(CAR_W / 2 - frontPanelW / 2, CAR_H / 2, CAR_D / 2 - 0.02);
  car.add(fpR);

  // Doors (narrower, slide behind front panels)
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

  var pHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skinM);
  pHead.position.set(0, 1.65, 0);
  pHead.castShadow = true;
  person.add(pHead);

  var pHair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairM);
  pHair.position.set(0, 1.65, 0);
  person.add(pHair);

  var pNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skinM);
  pNeck.position.set(0, 1.47, 0);
  person.add(pNeck);

  var pTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.6, 8), shirtM);
  pTorso.position.set(0, 1.12, 0);
  pTorso.castShadow = true;
  person.add(pTorso);

  var armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
  var armL = new THREE.Mesh(armGeo, shirtM);
  armL.position.set(-0.22, 1.05, 0);
  armL.rotation.z = 0.1;
  person.add(armL);
  var armR = new THREE.Mesh(armGeo, shirtM);
  armR.position.set(0.22, 1.05, 0);
  armR.rotation.z = -0.1;
  person.add(armR);

  var legGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.55, 8);
  var legL = new THREE.Mesh(legGeo, pantsM);
  legL.position.set(-0.09, 0.5, 0);
  legL.castShadow = true;
  person.add(legL);
  var legR = new THREE.Mesh(legGeo, pantsM);
  legR.position.set(0.09, 0.5, 0);
  legR.castShadow = true;
  person.add(legR);

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
  // SHEAVE / PULLEY ASSEMBLY (centered at shaft top, visible)
  // ==========================================
  var SHEAVE_Z = -0.15; // slightly behind center, but visible from front
  var sheave = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.1, 12, 28), matSheave
  );
  sheave.rotation.x = Math.PI / 2;
  sheave.position.set(0, SHAFT_H + 2.0, SHEAVE_Z);
  scene.add(sheave);

  // Sheave axle
  var sheaveAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), matSheave
  );
  sheaveAxle.rotation.z = Math.PI / 2;
  sheaveAxle.position.set(0, SHAFT_H + 2.0, SHEAVE_Z);
  scene.add(sheaveAxle);

  // Mounting brackets
  var mountGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
  var mountL = new THREE.Mesh(mountGeo, matBracket);
  mountL.position.set(-0.45, SHAFT_H + 2.0, SHEAVE_Z);
  scene.add(mountL);
  var mountR = new THREE.Mesh(mountGeo, matBracket);
  mountR.position.set(0.45, SHAFT_H + 2.0, SHEAVE_Z);
  scene.add(mountR);

  // ==========================================
  // CABLE SYSTEM (4 thick steel cables, centered in shaft)
  // ==========================================
  var NUM_CABLES = 4;
  var cables = [];
  // 2x2 rectangle pattern on car roof, centered in shaft
  var cableOffsets = [
    [-0.12, -0.10], [0.12, -0.10],
    [-0.12,  0.10], [0.12,  0.10]
  ];
  var cableBaseGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
  for (var ci = 0; ci < NUM_CABLES; ci++) {
    var cab = new THREE.Mesh(cableBaseGeo, matSteelCable);
    cab.castShadow = true;
    scene.add(cab);
    cables.push(cab);
  }

  function updCable(t) {
    var top = car.position.y + CAR_H;
    var anchor = SHAFT_H + 2.0; // sheave Y
    var len = Math.max(anchor - top, 0.1);
    var swayAmount = moving ? 0.02 : 0.005;

    for (var ci = 0; ci < NUM_CABLES; ci++) {
      var ox = cableOffsets[ci][0];
      var oz = cableOffsets[ci][1];
      var sway = Math.sin(t * 3.0 + ci * 1.5) * swayAmount;

      cables[ci].scale.y = len;
      cables[ci].position.set(
        ox + sway,
        top + len / 2,
        SHEAVE_Z + oz
      );
    }
  }

  // ==========================================
  // COUNTERWEIGHT (detailed)
  // ==========================================
  var cw = new THREE.Group();

  // Main body
  var cwBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.8, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
  );
  cwBody.castShadow = true;
  cw.add(cwBody);

  // Stacked plate grooves
  for (var gri = 0; gri < 3; gri++) {
    var groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.01, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
    );
    groove.position.y = -0.25 + gri * 0.25;
    cw.add(groove);
  }

  // Guide shoes (top and bottom)
  var shoeGeoC = new THREE.BoxGeometry(0.08, 0.06, 0.38);
  var shoeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 });
  var shoeTop = new THREE.Mesh(shoeGeoC, shoeMat);
  shoeTop.position.set(0, 0.43, 0);
  cw.add(shoeTop);
  var shoeBot = new THREE.Mesh(shoeGeoC, shoeMat);
  shoeBot.position.set(0, -0.43, 0);
  cw.add(shoeBot);

  scene.add(cw);

  // Counterweight cables (3)
  var cwCables = [];
  var cwCableOffsets = [-0.05, 0, 0.05];
  var cwCableGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 6);
  for (var cwi = 0; cwi < 3; cwi++) {
    var cwc = new THREE.Mesh(cwCableGeo, matSteelCable);
    scene.add(cwc);
    cwCables.push(cwc);
  }

  function updCounterweight(t) {
    var maxY = (TOTAL_FLOORS - 1) * FLOOR_HEIGHT;
    var ratio = Math.max(0, Math.min(1, (car.position.y - BASE_Y) / maxY));
    var cwY = SHAFT_H * 0.85 * (1 - ratio) + 0.5;
    var cwX = -SHAFT_W / 2 + 0.18;
    var cwZ = -SHAFT_D / 2 + 0.25;
    cw.position.set(cwX, cwY, cwZ);

    var anchor = SHAFT_H + 2.0;
    var cwTop = cwY + 0.45;
    var cwLen = Math.max(anchor - cwTop, 0.1);
    var swayAmt = moving ? 0.008 : 0.002;

    for (var cwi = 0; cwi < 3; cwi++) {
      var sway = Math.sin(t * 2.8 + cwi * 1.5) * swayAmt;
      cwCables[cwi].scale.y = cwLen;
      cwCables[cwi].position.set(
        cwX + cwCableOffsets[cwi] + sway,
        cwTop + cwLen / 2,
        cwZ
      );
    }
  }

  // ==========================================
  // DUST PARTICLES
  // ==========================================
  var dustCount = 200;
  var dustPositions = new Float32Array(dustCount * 3);
  for (var di = 0; di < dustCount; di++) {
    dustPositions[di * 3] = (Math.random() - 0.5) * SHAFT_W;
    dustPositions[di * 3 + 1] = Math.random() * SHAFT_H;
    dustPositions[di * 3 + 2] = (Math.random() - 0.5) * SHAFT_D;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));

  var dustMat = new THREE.PointsMaterial({
    color: 0xaabbcc,
    size: 0.03,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true
  });

  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ==========================================
  // STATE
  // ==========================================
  var targetY = BASE_Y;
  var curY = BASE_Y;
  var vel = 0;
  var moving = false;
  var doorAmt = 1.0;
  var doorTgt = 1.0;
  var doorsOpen = true;
  var floorNum = 1;
  var floorDir = '\u2013';
  var moveDir = 0;

  // Camera state — cinematic sequence system
  var CAM = { INTRO_OVER: 0, INTRO_DESCEND: 1, IDLE: 2, TRACK: 3, DOOR: 4 };
  var camState = CAM.INTRO_OVER;
  // Start high up, looking at the full shaft
  var camP = new THREE.Vector3(9, SHAFT_H * 0.75, 11);
  var camL = new THREE.Vector3(0, SHAFT_H * 0.4, 0);
  var idleTime = 0;
  var stateStartTime = 0;
  var doorCamStartTime = 0;
  var prevDoorsOpen = true;
  var prevMoving = false;
  var stoppedAt = 0;
  var stopPending = false;

  // ==========================================
  // MUTATION OBSERVERS
  // ==========================================

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
        // First user action aborts the intro animation so the camera
        // follows the elevator immediately instead of finishing the fly-in.
        if (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND) {
          camState = CAM.TRACK;
          idleTime = 0;
        }
      }
    }).observe(elev, { attributes: true, attributeFilter: ['style'] });
  }

  var dLE = document.querySelector('.door-left');
  var dRE = document.querySelector('.door-right');
  function syncD() {
    doorsOpen = !!(dLE && dLE.classList.contains('open'));
    doorTgt = doorsOpen ? 1 : 0;
    // First user action (door close) aborts intro animation so the camera
    // starts moving toward the elevator right away.
    if (!doorsOpen && (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND)) {
      camState = CAM.IDLE;
      idleTime = 0;
    }
  }
  if (dLE) new MutationObserver(syncD).observe(dLE, { attributes: true, attributeFilter: ['class'] });
  if (dRE) new MutationObserver(syncD).observe(dRE, { attributes: true, attributeFilter: ['class'] });
  syncD();

  var fnE = document.querySelector('.floor-number');
  var fdE = document.querySelector('.floor-direction');
  if (fnE) new MutationObserver(function () {
    floorNum = parseInt(fnE.textContent) || 1;
    updInd();
  }).observe(fnE, { childList: true, characterData: true, subtree: true });

  if (fdE) new MutationObserver(function () {
    floorDir = fdE.textContent || '\u2013';
    updInd();
    updCamMode(clock.getElapsedTime());
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
  // CAMERA MODE SELECTION (simple state machine)
  // ==========================================
  function updCamMode(t) {
    if (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND) {
      prevDoorsOpen = doorsOpen;
      return;
    }

    // Primary trigger: car stops and stays stopped for a short dwell
    // (longer than a pass-through). Fires BEFORE doors open — the DOM
    // waits an extra moment after arrival before calling openDoors, so
    // the camera gets lead time to lerp into position.
    if (stopPending && !moving && (t - stoppedAt) > 0.2 && camState !== CAM.DOOR) {
      camState = CAM.DOOR;
      doorCamStartTime = t;
      idleTime = 0;
      stopPending = false;
    }
    // Fallback: if the scene car was still arriving when the DOM opened
    // doors, catch the rising edge too.
    if (doorsOpen && !prevDoorsOpen && !moving && camState !== CAM.DOOR) {
      camState = CAM.DOOR;
      doorCamStartTime = t;
      idleTime = 0;
    }
    // Door-close falling edge → return to IDLE so we don't stare at shut doors.
    if (!doorsOpen && prevDoorsOpen && camState === CAM.DOOR) {
      camState = CAM.IDLE;
      idleTime = 0;
    }
    prevDoorsOpen = doorsOpen;

    if (moving) {
      if (camState !== CAM.TRACK) {
        camState = CAM.TRACK;
        idleTime = 0;
      }
    } else {
      // Only leave TRACK after being stopped for 2+ seconds
      // (prevents frantic switching during multi-floor trips)
      if (camState === CAM.TRACK && idleTime > 2.0) {
        camState = CAM.IDLE;
        idleTime = 0;
      }
    }
  }

  // ==========================================
  // CAMERA UPDATE (cinematic sequence)
  // ==========================================
  // Smoothstep helper: ease-in-ease-out [0,1] → [0,1]
  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function updCam(t, dt) {
    var cy = car.position.y + CAR_H * 0.5;
    var tp, tl, lerpBase;

    switch (camState) {

      // --- PHASE 1: Overview of entire shaft (first ~4 seconds) ---
      case CAM.INTRO_OVER:
        tp = new THREE.Vector3(
          9 + Math.sin(t * 0.12) * 0.5,
          SHAFT_H * 0.7 + Math.sin(t * 0.08) * 0.5,
          11 + Math.cos(t * 0.1) * 0.3
        );
        tl = new THREE.Vector3(0, SHAFT_H * 0.4, 0);
        lerpBase = 0.04;

        if (t > 4.0) {
          camState = CAM.INTRO_DESCEND;
          stateStartTime = t;
        }
        break;

      // --- PHASE 2: Smooth descent to elevator car (4–10 seconds) ---
      case CAM.INTRO_DESCEND:
        var descProgress = smoothstep((t - stateStartTime) / 6.0);
        // Glide from overview height down to car level, medium distance
        var startY = SHAFT_H * 0.7;
        var endY = cy + 3;
        var startR = 11;
        var endR = 8;
        var r = startR + (endR - startR) * descProgress;
        var h = startY + (endY - startY) * descProgress;
        var angle = 0.3 + descProgress * 0.5; // gentle angle change

        tp = new THREE.Vector3(
          Math.sin(angle) * r,
          h,
          Math.cos(angle) * r
        );
        tl = new THREE.Vector3(0, cy + (1 - descProgress) * SHAFT_H * 0.2, 0);
        lerpBase = 0.03;

        if (descProgress >= 1.0) {
          camState = CAM.IDLE;
          idleTime = 0;
        }
        break;

      // --- IDLE: Medium-distance gentle sway, always facing the front ---
      case CAM.IDLE:
        // Sway within front arc (±25° from front-right), never goes behind
        var swayAngle = 0.45 + Math.sin(t * 0.06) * 0.35;
        var idleR = 8 + Math.sin(t * 0.03) * 0.5;
        tp = new THREE.Vector3(
          Math.sin(swayAngle) * idleR,
          cy + 1.2 + Math.sin(t * 0.05) * 0.3,
          Math.cos(swayAngle) * idleR
        );
        tl = new THREE.Vector3(0, cy, 0);
        lerpBase = 0.012;
        break;

      // --- TRACKING: Closer view following the moving car ---
      case CAM.TRACK:
        tp = new THREE.Vector3(
          4.5 + Math.sin(t * 0.2) * 0.4,
          cy + 1.0,
          5.5 + Math.cos(t * 0.15) * 0.3
        );
        tl = new THREE.Vector3(0, cy, 0);
        lerpBase = 0.018;
        break;

      // --- DOOR: Gentle approach toward the open doors ---
      case CAM.DOOR:
        var doorElapsed = Math.max(0, t - doorCamStartTime);
        var approach = Math.min(doorElapsed * 0.15, 0.6);
        tp = new THREE.Vector3(
          0.4 + Math.sin(t * 0.08) * 0.15,
          cy + 0.4,
          CAR_D / 2 + 5.5 - approach
        );
        tl = new THREE.Vector3(0, cy - 0.1, -0.2);
        lerpBase = 0.01;
        break;

      default:
        tp = camP.clone();
        tl = camL.clone();
        lerpBase = 0.02;
    }

    // Frame-rate independent smooth lerp
    var f = 1.0 - Math.pow(lerpBase, dt);
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

    // --- Car physics: run when doors effectively closed, or while an in-flight
    //     trip finishes arriving (so a slight timing lag vs. DOM can't strand
    //     the car between floors when DOM begins opening doors).
    if (doorAmt <= 0.02 || moving) {
      var diff = targetY - curY;
      var dist = Math.abs(diff);

      if (dist > 0.002) {
        if (!moving) {
          moving = true;
          moveDir = diff > 0 ? 1 : -1;
        }
        var d = Math.sign(diff);
        var decelDist = (vel * vel) / 8;

        if (dist > decelDist + 0.3) {
          vel = Math.min(vel + 3.0 * dt, 3.5);
        } else {
          vel = Math.max(vel - 5.0 * dt, 0);
        }
        var step = Math.max(vel, 0.15) * dt;
        if (step > dist) step = dist;
        curY += d * step;

        if ((d > 0 && curY >= targetY) || (d < 0 && curY <= targetY)) {
          curY = targetY;
          vel = 0;
        }
      } else {
        curY = targetY;
        vel = 0;
        if (moving) {
          // Car just arrived at a floor — DOM drives the door-open event via syncD.
          moving = false;
          moveDir = 0;
        }
      }
    }
    car.position.y = curY;

    // --- Doors: DOM .open class (via syncD → doorTgt) is the source of truth ---
    if (doorAmt < doorTgt) {
      doorAmt = Math.min(doorAmt + 1.0 * dt, doorTgt);
    } else if (doorAmt > doorTgt) {
      doorAmt = Math.max(doorAmt - 1.0 * dt, doorTgt);
    }

    dL.position.x = -DOOR_W / 2 - doorAmt * DOOR_OPEN;
    dR.position.x = DOOR_W / 2 + doorAmt * DOOR_OPEN;

    carLight.intensity = 0.35 + doorAmt * 0.65;

    // --- Cable + counterweight ---
    updCable(t);
    updCounterweight(t);

    // --- Dust particles ---
    var dPos = dust.geometry.attributes.position.array;
    for (var di = 0; di < dustCount; di++) {
      dPos[di * 3 + 1] += Math.sin(t * 0.5 + di) * 0.003;
      dPos[di * 3] += Math.cos(t * 0.3 + di * 0.7) * 0.001;
      if (dPos[di * 3 + 1] > SHAFT_H) dPos[di * 3 + 1] = 0;
      if (dPos[di * 3 + 1] < 0) dPos[di * 3 + 1] = SHAFT_H;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    // --- Idle timer + camera state updates ---
    if (!moving) {
      idleTime += dt;
    } else {
      idleTime = 0;
    }

    // Track moving→false edge so we can trigger the door-focus camera
    // before the DOM actually opens the doors (see updCamMode).
    if (prevMoving && !moving) {
      stoppedAt = t;
      stopPending = true;
    }
    if (moving) {
      stopPending = false;
    }
    prevMoving = moving;

    updCamMode(t);

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
  updCable(0);
  updCounterweight(0);
  loop();

})();
