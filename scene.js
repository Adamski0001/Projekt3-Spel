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

  // Two-shaft layout: each shaft wall mesh is 0.3 thick and offset by SHAFT_W/2 + 0.15
  // from the shaft's centerline, so its outer face sits at SHAFT_W/2 + 0.30 = 1.60 m
  // from center. Gap between adjacent shafts' outer faces = SHAFT_PITCH - 2 * 1.60.
  // PITCH 3.6 → 0.40 m visible gap, matching the design.
  var SHAFT_PITCH = 3.6;
  var CAR_X = { a: -SHAFT_PITCH / 2, b: +SHAFT_PITCH / 2 };

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
  // CAMERA — wider initial framing for two shafts
  // ==========================================
  var camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 150
  );
  camera.position.set(11, SHAFT_H * 0.75, 13);
  camera.lookAt(0, SHAFT_H * 0.4, 0);

  // ==========================================
  // LIGHTING (shared across both shafts)
  // ==========================================

  scene.add(new THREE.AmbientLight(0x445577, 0.5));

  var dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  dirLight.position.set(6, SHAFT_H + 5, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 70;
  dirLight.shadow.camera.left = -8;   // widened from -6 for two shafts
  dirLight.shadow.camera.right = 8;   // widened from +6
  dirLight.shadow.camera.top = 36;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.bias = -0.002;
  scene.add(dirLight);

  // Top-down spot — slightly wider cone so both car tops catch the highlight
  var spot = new THREE.SpotLight(0xccddff, 4.0, 50, Math.PI / 4, 0.5, 1.2);
  spot.position.set(0, SHAFT_H + 4, 1);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  scene.add(spot);
  scene.add(spot.target);

  scene.add(new THREE.PointLight(0x334466, 0.6, 25));

  var accentLight = new THREE.PointLight(0x2244aa, 0.5, 20);
  accentLight.position.set(-3, 2, 4);
  scene.add(accentLight);

  var rimLight = new THREE.PointLight(0x1133aa, 0.4, 30);
  rimLight.position.set(3, -1, 3);
  scene.add(rimLight);

  var cableLight = new THREE.PointLight(0xaabbdd, 0.6, 40);
  cableLight.position.set(2, SHAFT_H * 0.5, 2);
  scene.add(cableLight);

  // Soft warm uplight from the lobby floor so the lobby reads as a defined zone
  var lobbyLight = new THREE.PointLight(0xffd8a8, 0.7, 14);
  lobbyLight.position.set(0, 0.6, 3.5);
  scene.add(lobbyLight);

  // ==========================================
  // MATERIALS (shared)
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
  var matGround = new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.9, metalness: 0.05 });
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
  // OUTER GROUND + LOBBY FLOOR (shared)
  // ==========================================

  // Outer dark ground stays as a backdrop floor outside the lobby zone.
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Procedural tile texture for the polished lobby slab.
  function makeLobbyTileTexture() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var ctx = c.getContext('2d');
    // Base color
    ctx.fillStyle = '#b0b6c0';
    ctx.fillRect(0, 0, 256, 256);
    // Per-tile colour variation (4×4 tiles per texture)
    for (var ty = 0; ty < 4; ty++) {
      for (var tx = 0; tx < 4; tx++) {
        var v = 168 + Math.floor(Math.random() * 28);
        ctx.fillStyle = 'rgb(' + v + ',' + (v + 2) + ',' + (v + 8) + ')';
        ctx.fillRect(tx * 64 + 2, ty * 64 + 2, 60, 60);
      }
    }
    // Darker grout lines between tiles
    ctx.strokeStyle = '#6a6e78';
    ctx.lineWidth = 3;
    for (var i = 0; i <= 4; i++) {
      var p = i * 64;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  var matLobby = new THREE.MeshStandardMaterial({
    map: makeLobbyTileTexture(),
    color: 0xffffff,
    metalness: 0.18,
    roughness: 0.32
  });

  // Lobby slab spans both shafts and reaches forward into the room.
  // Width covers both shaft footprints with side margin; depth pushes forward
  // past the door fronts so the camera reads it as a real lobby surface.
  // Thickness 0.2 (matching the original per-shaft groundSlab) so the slab top
  // at y=0.1 meets the car floor cleanly — cars don't visibly float.
  var lobbySlab = new THREE.Mesh(
    new THREE.BoxGeometry(SHAFT_PITCH * 2.5, 0.2, 8),
    matLobby
  );
  lobbySlab.position.set(0, 0, 1.5); // shaft front sill is at z≈1.55, this extends to z≈+5.5
  lobbySlab.receiveShadow = true;
  scene.add(lobbySlab);

  // ==========================================
  // DUST PARTICLES (shared, widened to span both shafts)
  // ==========================================
  var dustCount = 280;
  var dustPositions = new Float32Array(dustCount * 3);
  var dustXSpread = SHAFT_PITCH + SHAFT_W; // 5.9 m
  for (var di = 0; di < dustCount; di++) {
    dustPositions[di * 3] = (Math.random() - 0.5) * dustXSpread;
    dustPositions[di * 3 + 1] = Math.random() * SHAFT_H;
    dustPositions[di * 3 + 2] = (Math.random() - 0.5) * SHAFT_D;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  var dustMat = new THREE.PointsMaterial({
    color: 0xaabbcc, size: 0.03, transparent: true, opacity: 0.35, sizeAttenuation: true
  });
  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ==========================================
  // CAMERA STATE (declared early so per-car observers can read/mutate it
  // without TDZ issues when buildElevator's syncD runs synchronously).
  // ==========================================
  var CAM = { INTRO_OVER: 0, INTRO_DESCEND: 1, IDLE: 2, TRACK: 3, DOOR: 4 };
  var camState = CAM.INTRO_OVER;
  var camP = new THREE.Vector3(11, SHAFT_H * 0.75, 13);
  var camL = new THREE.Vector3(0, SHAFT_H * 0.4, 0);
  var idleTime = 0;
  var stateStartTime = 0;
  var doorCamStartTime = 0;
  // The car the camera is currently leaning toward. null = midpoint framing
  // (used when both cars are moving or when in IDLE).
  var activeCar = null;

  var clock = new THREE.Clock();

  // ==========================================
  // PER-CAR FACTORY
  // ==========================================
  // Builds one shaft + car + cables + counterweight + machine room as a group
  // positioned at centerX. Wires its own MutationObservers to DOM elements
  // namespaced with [data-car="<id>"]. Returns { id, state, tick(t,dt) }.
  function buildElevator(carId, centerX) {
    var shaftGroup = new THREE.Group();
    shaftGroup.position.x = centerX;

    // ---------- Shaft walls ----------
    var bw = new THREE.Mesh(new THREE.BoxGeometry(SHAFT_W + 0.5, SHAFT_H + 3, 0.3), matConcrete);
    bw.position.set(0, SHAFT_H / 2, -SHAFT_D / 2 - 0.15);
    bw.receiveShadow = true;
    shaftGroup.add(bw);

    var lw = new THREE.Mesh(new THREE.BoxGeometry(0.3, SHAFT_H + 3, SHAFT_D + 0.5), matConcrete);
    lw.position.set(-SHAFT_W / 2 - 0.15, SHAFT_H / 2, 0);
    lw.receiveShadow = true;
    lw.castShadow = true;
    shaftGroup.add(lw);

    var rw = new THREE.Mesh(new THREE.BoxGeometry(0.3, SHAFT_H + 3, SHAFT_D + 0.5), matConcrete);
    rw.position.set(SHAFT_W / 2 + 0.15, SHAFT_H / 2, 0);
    rw.receiveShadow = true;
    rw.castShadow = true;
    shaftGroup.add(rw);

    // ---------- Door sills (one per floor) ----------
    var sillGeo = new THREE.BoxGeometry(CAR_W + 0.4, 0.04, 0.15);
    for (var i = 1; i <= TOTAL_FLOORS; i++) {
      var fy = i * FLOOR_HEIGHT;
      var sill = new THREE.Mesh(sillGeo, matRail);
      sill.position.set(0, fy + 0.02, SHAFT_D / 2 + 0.24);
      shaftGroup.add(sill);
    }

    // ---------- Guide rails ----------
    var railGeo = new THREE.CylinderGeometry(0.045, 0.045, SHAFT_H + 2, 8);
    [-1, 1].forEach(function (s) {
      var r = new THREE.Mesh(railGeo, matRail);
      r.position.set(s * (SHAFT_W / 2 - 0.1), SHAFT_H / 2, -SHAFT_D / 2 + 0.1);
      r.castShadow = true;
      shaftGroup.add(r);
    });

    // ---------- Rail clip brackets every 2 floors ----------
    var clipGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
    for (var rci = 1; rci < TOTAL_FLOORS; rci += 2) {
      [-1, 1].forEach(function (s) {
        var clip = new THREE.Mesh(clipGeo, matBracket);
        clip.position.set(
          s * (SHAFT_W / 2 - 0.1),
          rci * FLOOR_HEIGHT + 1.5,
          -SHAFT_D / 2 + 0.1
        );
        shaftGroup.add(clip);
      });
    }

    // ---------- Cross-bracing on back wall ----------
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
      shaftGroup.add(b1);

      var b2 = new THREE.Mesh(braceGeo, matBrace);
      b2.position.set(0, braceCenters[bi], -SHAFT_D / 2 + 0.02);
      b2.rotation.z = -braceAngle;
      shaftGroup.add(b2);
    }

    // ---------- Floor number labels ----------
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
      shaftGroup.add(lspr);
    }

    // ---------- Emergency lights ----------
    for (var ei = 1; ei < TOTAL_FLOORS; ei++) {
      var eLightGeo = new THREE.SphereGeometry(0.04, 6, 6);
      var eLightMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      var eLight = new THREE.Mesh(eLightGeo, eLightMat);
      eLight.position.set(-SHAFT_W / 2 + 0.08, ei * FLOOR_HEIGHT + 2.4, -SHAFT_D / 2 + 0.08);
      shaftGroup.add(eLight);
    }

    // ---------- Machine room frame + motor drum ----------
    var mrBeamGeo = new THREE.BoxGeometry(0.15, 0.15, SHAFT_D + 0.6);
    var mrBeamGeoX = new THREE.BoxGeometry(SHAFT_W + 0.6, 0.15, 0.15);
    var mrPostGeo = new THREE.BoxGeometry(0.15, 3.0, 0.15);

    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) {
      var post = new THREE.Mesh(mrPostGeo, matMachineRoom);
      post.position.set(
        c[0] * (SHAFT_W / 2 + 0.22),
        SHAFT_H + 1.5,
        c[1] * (SHAFT_D / 2 + 0.22)
      );
      post.castShadow = true;
      shaftGroup.add(post);
    });

    var mrTopY = SHAFT_H + 3.0;
    var mrBotY = SHAFT_H + 0.05;
    [mrTopY, mrBotY].forEach(function (by) {
      [-1, 1].forEach(function (s) {
        var beam = new THREE.Mesh(mrBeamGeo, matMachineRoom);
        beam.position.set(s * (SHAFT_W / 2 + 0.22), by, 0);
        shaftGroup.add(beam);
      });
      [-1, 1].forEach(function (s) {
        var beam = new THREE.Mesh(mrBeamGeoX, matMachineRoom);
        beam.position.set(0, by, s * (SHAFT_D / 2 + 0.22));
        shaftGroup.add(beam);
      });
    });

    var motorDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16), matSheave
    );
    motorDrum.rotation.z = Math.PI / 2;
    motorDrum.position.set(0, SHAFT_H + 2.5, -SHAFT_D / 2 + 0.5);
    shaftGroup.add(motorDrum);

    // ---------- Pit ----------
    var pitBack = new THREE.Mesh(new THREE.BoxGeometry(SHAFT_W + 0.5, 1.5, 0.3), matConcrete);
    pitBack.position.set(0, -0.75, -SHAFT_D / 2 - 0.15);
    shaftGroup.add(pitBack);

    var pitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, SHAFT_D + 0.5), matConcrete);
    pitLeft.position.set(-SHAFT_W / 2 - 0.15, -0.75, 0);
    shaftGroup.add(pitLeft);

    var pitRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, SHAFT_D + 0.5), matConcrete);
    pitRight.position.set(SHAFT_W / 2 + 0.15, -0.75, 0);
    shaftGroup.add(pitRight);

    var pitFloor = new THREE.Mesh(
      new THREE.BoxGeometry(SHAFT_W + 0.3, 0.15, SHAFT_D + 0.3), matConcreteFloor
    );
    pitFloor.position.set(0, -1.5, 0);
    shaftGroup.add(pitFloor);

    // Hydraulic buffers
    var bufferMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.4, metalness: 0.3 });
    var springMat = new THREE.MeshStandardMaterial({ color: 0xbb3300, roughness: 0.35, metalness: 0.5 });
    var bufferGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);

    [-0.3, 0.3].forEach(function (bx) {
      var buf = new THREE.Mesh(bufferGeo, bufferMat);
      buf.position.set(bx, -1.1, 0);
      shaftGroup.add(buf);

      var springYs = [-1.2, -1.05, -0.9];
      for (var si = 0; si < springYs.length; si++) {
        var spring = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.015, 6, 16), springMat
        );
        spring.rotation.x = Math.PI / 2;
        spring.position.set(bx, springYs[si], 0);
        shaftGroup.add(spring);
      }
    });

    // ---------- Sheave assembly ----------
    var SHEAVE_Z = -0.15;
    var sheave = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 12, 28), matSheave
    );
    sheave.rotation.x = Math.PI / 2;
    sheave.position.set(0, SHAFT_H + 2.0, SHEAVE_Z);
    shaftGroup.add(sheave);

    var sheaveAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), matSheave
    );
    sheaveAxle.rotation.z = Math.PI / 2;
    sheaveAxle.position.set(0, SHAFT_H + 2.0, SHEAVE_Z);
    shaftGroup.add(sheaveAxle);

    var mountGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    var mountL = new THREE.Mesh(mountGeo, matBracket);
    mountL.position.set(-0.45, SHAFT_H + 2.0, SHEAVE_Z);
    shaftGroup.add(mountL);
    var mountR = new THREE.Mesh(mountGeo, matBracket);
    mountR.position.set(0.45, SHAFT_H + 2.0, SHEAVE_Z);
    shaftGroup.add(mountR);

    // ---------- Car group (interior + exterior + doors + person) ----------
    var car = new THREE.Group();

    var cf = new THREE.Mesh(new THREE.BoxGeometry(CAR_W, 0.1, CAR_D), matCarOut);
    cf.receiveShadow = true;
    car.add(cf);

    var cc = new THREE.Mesh(new THREE.BoxGeometry(CAR_W, 0.08, CAR_D), matCarOut);
    cc.position.y = CAR_H;
    cc.castShadow = true;
    car.add(cc);

    var cBack = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.06, CAR_H, 0.05), matCarIn);
    cBack.position.set(0, CAR_H / 2, -CAR_D / 2 + 0.025);
    car.add(cBack);

    var cLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, CAR_H, CAR_D - 0.04), matCarIn);
    cLeft.position.set(-CAR_W / 2 + 0.025, CAR_H / 2, 0);
    car.add(cLeft);

    var cRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, CAR_H, CAR_D - 0.04), matCarIn);
    cRight.position.set(CAR_W / 2 - 0.025, CAR_H / 2, 0);
    car.add(cRight);

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

    var frontPanelW = (CAR_W - DOOR_W * 2) / 2;
    var frontPanelGeo = new THREE.BoxGeometry(frontPanelW, CAR_H, 0.05);
    var fpL = new THREE.Mesh(frontPanelGeo, matCarIn);
    fpL.position.set(-CAR_W / 2 + frontPanelW / 2, CAR_H / 2, CAR_D / 2 - 0.02);
    car.add(fpL);
    var fpR = new THREE.Mesh(frontPanelGeo, matCarIn);
    fpR.position.set(CAR_W / 2 - frontPanelW / 2, CAR_H / 2, CAR_D / 2 - 0.02);
    car.add(fpR);

    var doorGeo = new THREE.BoxGeometry(DOOR_W, CAR_H - 0.3, 0.035);
    var dL = new THREE.Mesh(doorGeo, matDoor);
    dL.position.set(-DOOR_W / 2, CAR_H / 2, CAR_D / 2 + 0.005);
    dL.castShadow = true;
    car.add(dL);

    var dR = new THREE.Mesh(doorGeo, matDoor);
    dR.position.set(DOOR_W / 2, CAR_H / 2, CAR_D / 2 + 0.005);
    dR.castShadow = true;
    car.add(dR);

    var carLight = new THREE.PointLight(0xfff0d0, 0.8, 12, 2);
    carLight.position.set(0, CAR_H - 0.1, 0);
    car.add(carLight);

    var lightPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.02, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xfffff0 })
    );
    lightPanel.position.set(0, CAR_H - 0.01, 0);
    car.add(lightPanel);

    // ---------- Person inside the car ----------
    var person = new THREE.Group();
    var skinM = new THREE.MeshStandardMaterial({ color: 0xf5c8a0, roughness: 0.65 });
    var shirtM = new THREE.MeshStandardMaterial({
      color: carId === 'a' ? 0x2255bb : 0xbb4422, roughness: 0.6
    });
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

    // ---------- Indicator inside car ----------
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

    car.position.set(0, BASE_Y, 0);
    shaftGroup.add(car);

    // ---------- Cables ----------
    var NUM_CABLES = 4;
    var cables = [];
    var cableOffsets = [
      [-0.12, -0.10], [0.12, -0.10],
      [-0.12,  0.10], [0.12,  0.10]
    ];
    var cableBaseGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 8);
    for (var ci = 0; ci < NUM_CABLES; ci++) {
      var cab = new THREE.Mesh(cableBaseGeo, matSteelCable);
      cab.castShadow = true;
      shaftGroup.add(cab);
      cables.push(cab);
    }

    // ---------- Counterweight ----------
    var cw = new THREE.Group();
    var cwBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.8, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
    );
    cwBody.castShadow = true;
    cw.add(cwBody);

    for (var gri = 0; gri < 3; gri++) {
      var groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.01, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
      );
      groove.position.y = -0.25 + gri * 0.25;
      cw.add(groove);
    }

    var shoeGeoC = new THREE.BoxGeometry(0.08, 0.06, 0.38);
    var shoeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 });
    var shoeTop = new THREE.Mesh(shoeGeoC, shoeMat);
    shoeTop.position.set(0, 0.43, 0);
    cw.add(shoeTop);
    var shoeBot = new THREE.Mesh(shoeGeoC, shoeMat);
    shoeBot.position.set(0, -0.43, 0);
    cw.add(shoeBot);

    shaftGroup.add(cw);

    var cwCables = [];
    var cwCableOffsets = [-0.05, 0, 0.05];
    var cwCableGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 6);
    for (var cwi = 0; cwi < 3; cwi++) {
      var cwc = new THREE.Mesh(cwCableGeo, matSteelCable);
      shaftGroup.add(cwc);
      cwCables.push(cwc);
    }

    scene.add(shaftGroup);

    // ==========================================
    // STATE (per-car closure)
    // ==========================================
    var state = {
      targetY: BASE_Y,
      curY: BASE_Y,
      vel: 0,
      moving: false,
      moveDir: 0,
      doorAmt: 1.0,
      doorTgt: 1.0,
      doorsOpen: true,
      floorNum: 1,
      floorDir: '\u2013',
      // Edge detection used by the camera state machine
      prevMoving: false,
      prevDoorsOpen: true,
      stoppedAt: 0,
      stopPending: false
    };

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
      c.fillText(state.floorNum + ' ' + state.floorDir, 64, 34);
      c.shadowBlur = 0;
      indTex.needsUpdate = true;
    }
    updInd();

    // ==========================================
    // MUTATION OBSERVERS — wired to per-car DOM
    // ==========================================
    var elevEl = document.getElementById('elevator-' + carId);
    if (elevEl) {
      new MutationObserver(function () {
        var tf = elevEl.style.transform;
        if (!tf) return;
        var m = tf.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
        if (!m) return;
        var px = Math.abs(parseFloat(m[1]));
        var ny = (px / CSS_PX) * FLOOR_HEIGHT + BASE_Y;
        if (Math.abs(ny - state.targetY) > 0.05) {
          state.moveDir = ny > state.targetY ? 1 : -1;
          state.targetY = ny;
          state.moving = true;
          // First user action aborts the intro animation so the camera
          // snaps to tracking instead of finishing the fly-in.
          if (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND) {
            camState = CAM.TRACK;
            idleTime = 0;
          }
        }
      }).observe(elevEl, { attributes: true, attributeFilter: ['style'] });
    }

    var dLE = document.querySelector('.door-left[data-car="' + carId + '"]');
    var dRE = document.querySelector('.door-right[data-car="' + carId + '"]');
    function syncD() {
      state.doorsOpen = !!(dLE && dLE.classList.contains('open'));
      state.doorTgt = state.doorsOpen ? 1 : 0;
      if (!state.doorsOpen && (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND)) {
        camState = CAM.IDLE;
        idleTime = 0;
      }
    }
    if (dLE) new MutationObserver(syncD).observe(dLE, { attributes: true, attributeFilter: ['class'] });
    if (dRE) new MutationObserver(syncD).observe(dRE, { attributes: true, attributeFilter: ['class'] });
    syncD();

    var fnE = document.querySelector('.floor-number[data-car="' + carId + '"]');
    var fdE = document.querySelector('.floor-direction[data-car="' + carId + '"]');
    if (fnE) new MutationObserver(function () {
      state.floorNum = parseInt(fnE.textContent) || 1;
      updInd();
    }).observe(fnE, { childList: true, characterData: true, subtree: true });

    if (fdE) new MutationObserver(function () {
      state.floorDir = fdE.textContent || '\u2013';
      updInd();
      updCamMode(clock.getElapsedTime());
    }).observe(fdE, { childList: true, characterData: true, subtree: true });

    // ==========================================
    // PER-FRAME UPDATERS
    // ==========================================
    function updCable(t) {
      var top = car.position.y + CAR_H;
      var anchor = SHAFT_H + 2.0;
      var len = Math.max(anchor - top, 0.1);
      var swayAmount = state.moving ? 0.02 : 0.005;
      for (var k = 0; k < NUM_CABLES; k++) {
        var ox = cableOffsets[k][0];
        var oz = cableOffsets[k][1];
        var sway = Math.sin(t * 3.0 + k * 1.5) * swayAmount;
        cables[k].scale.y = len;
        cables[k].position.set(ox + sway, top + len / 2, SHEAVE_Z + oz);
      }
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
      var swayAmt = state.moving ? 0.008 : 0.002;
      for (var k = 0; k < 3; k++) {
        var sway = Math.sin(t * 2.8 + k * 1.5) * swayAmt;
        cwCables[k].scale.y = cwLen;
        cwCables[k].position.set(cwX + cwCableOffsets[k] + sway, cwTop + cwLen / 2, cwZ);
      }
    }

    function tick(t, dt) {
      // --- Car physics ---
      if (state.doorAmt <= 0.02 || state.moving) {
        var diff = state.targetY - state.curY;
        var dist = Math.abs(diff);

        if (dist > 0.002) {
          if (!state.moving) {
            state.moving = true;
            state.moveDir = diff > 0 ? 1 : -1;
          }
          var d = Math.sign(diff);
          var decelDist = (state.vel * state.vel) / 8;
          if (dist > decelDist + 0.3) {
            state.vel = Math.min(state.vel + 3.0 * dt, 3.5);
          } else {
            state.vel = Math.max(state.vel - 5.0 * dt, 0);
          }
          var step = Math.max(state.vel, 0.15) * dt;
          if (step > dist) step = dist;
          state.curY += d * step;
          if ((d > 0 && state.curY >= state.targetY) || (d < 0 && state.curY <= state.targetY)) {
            state.curY = state.targetY;
            state.vel = 0;
          }
        } else {
          state.curY = state.targetY;
          state.vel = 0;
          if (state.moving) {
            state.moving = false;
            state.moveDir = 0;
          }
        }
      }
      car.position.y = state.curY;

      // --- Doors ---
      if (state.doorAmt < state.doorTgt) {
        state.doorAmt = Math.min(state.doorAmt + 1.0 * dt, state.doorTgt);
      } else if (state.doorAmt > state.doorTgt) {
        state.doorAmt = Math.max(state.doorAmt - 1.0 * dt, state.doorTgt);
      }
      dL.position.x = -DOOR_W / 2 - state.doorAmt * DOOR_OPEN;
      dR.position.x = DOOR_W / 2 + state.doorAmt * DOOR_OPEN;
      carLight.intensity = 0.35 + state.doorAmt * 0.65;

      // --- Cables + counterweight ---
      updCable(t);
      updCounterweight(t);

      // --- Edge detection consumed by the camera state machine ---
      if (state.prevMoving && !state.moving) {
        state.stoppedAt = t;
        state.stopPending = true;
      }
      if (state.moving) state.stopPending = false;
      state.prevMoving = state.moving;
    }

    return { id: carId, state: state, tick: tick };
  }

  // ==========================================
  // BUILD INSTANCES
  // ==========================================
  var carInstances = [
    buildElevator('a', CAR_X.a),
    buildElevator('b', CAR_X.b)
  ];

  // ==========================================
  // CAMERA STATE MACHINE (sees both cars)
  // ==========================================
  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function updCamMode(t) {
    var movingCars = carInstances.filter(function (c) { return c.state.moving; });
    var anyMoving = movingCars.length > 0;

    if (camState === CAM.INTRO_OVER || camState === CAM.INTRO_DESCEND) {
      carInstances.forEach(function (c) { c.state.prevDoorsOpen = c.state.doorsOpen; });
      return;
    }

    // Per-car door / arrival edge detection
    for (var i = 0; i < carInstances.length; i++) {
      var c = carInstances[i];

      // Primary: car stopped, has dwelt ~0.2s, doors not yet open → focus the doors
      if (c.state.stopPending && !c.state.moving && (t - c.state.stoppedAt) > 0.2 && camState !== CAM.DOOR) {
        camState = CAM.DOOR;
        doorCamStartTime = t;
        activeCar = c;
        idleTime = 0;
        c.state.stopPending = false;
      }
      // Fallback: door-open rising edge while idle
      if (c.state.doorsOpen && !c.state.prevDoorsOpen && !c.state.moving && camState !== CAM.DOOR) {
        camState = CAM.DOOR;
        doorCamStartTime = t;
        activeCar = c;
        idleTime = 0;
      }
      // Door-close falling edge → leave DOOR (only the active car triggers this)
      if (!c.state.doorsOpen && c.state.prevDoorsOpen && camState === CAM.DOOR && activeCar === c) {
        camState = CAM.IDLE;
        idleTime = 0;
      }
      c.state.prevDoorsOpen = c.state.doorsOpen;
    }

    if (anyMoving) {
      if (camState !== CAM.TRACK) {
        camState = CAM.TRACK;
        idleTime = 0;
      }
      // Lean toward the single moving car, or stay neutral if both are moving.
      activeCar = movingCars.length === 1 ? movingCars[0] : null;
    } else {
      if (camState === CAM.TRACK && idleTime > 2.0) {
        camState = CAM.IDLE;
        idleTime = 0;
        activeCar = null;
      }
    }
  }

  function updCam(t, dt) {
    var stateA = carInstances[0].state;
    var stateB = carInstances[1].state;
    var midY = (stateA.curY + stateB.curY) / 2 + CAR_H * 0.5;

    var carYActive = activeCar ? activeCar.state.curY + CAR_H * 0.5 : midY;
    var carXActive = activeCar ? CAR_X[activeCar.id] : 0;

    var tp, tl, lerpBase;

    switch (camState) {

      // PHASE 1: Sweeping overview of the whole bank
      case CAM.INTRO_OVER:
        tp = new THREE.Vector3(
          11 + Math.sin(t * 0.12) * 0.6,
          SHAFT_H * 0.7 + Math.sin(t * 0.08) * 0.5,
          13 + Math.cos(t * 0.1) * 0.4
        );
        tl = new THREE.Vector3(0, SHAFT_H * 0.4, 0);
        lerpBase = 0.04;
        if (t > 4.0) {
          camState = CAM.INTRO_DESCEND;
          stateStartTime = t;
        }
        break;

      // PHASE 2: Smooth descent toward the bank, framing both cars
      case CAM.INTRO_DESCEND:
        var descProgress = smoothstep((t - stateStartTime) / 6.0);
        var startY = SHAFT_H * 0.7;
        var endY = midY + 3;
        var startR = 13;
        var endR = 11;
        var r = startR + (endR - startR) * descProgress;
        var h = startY + (endY - startY) * descProgress;
        var angle = 0.3 + descProgress * 0.5;

        tp = new THREE.Vector3(
          Math.sin(angle) * r,
          h,
          Math.cos(angle) * r
        );
        tl = new THREE.Vector3(0, midY + (1 - descProgress) * SHAFT_H * 0.2, 0);
        lerpBase = 0.03;

        if (descProgress >= 1.0) {
          camState = CAM.IDLE;
          idleTime = 0;
        }
        break;

      // IDLE: gentle sway framing both shafts. Pull back when the cars are
      // far apart vertically so both are still visible.
      case CAM.IDLE:
        var carDistY = Math.abs(stateA.curY - stateB.curY);
        var swayAngle = 0.45 + Math.sin(t * 0.06) * 0.35;
        var idleR = 11 + carDistY * 0.5 + Math.sin(t * 0.03) * 0.5;
        tp = new THREE.Vector3(
          Math.sin(swayAngle) * idleR,
          midY + 1.5 + Math.sin(t * 0.05) * 0.3,
          Math.cos(swayAngle) * idleR
        );
        tl = new THREE.Vector3(0, midY, 0);
        lerpBase = 0.012;
        break;

      // TRACK: lean toward the active car (or hold midpoint if both are moving)
      case CAM.TRACK:
        var leanX = activeCar ? carXActive * 0.5 : 0;
        tp = new THREE.Vector3(
          leanX + 5.5 + Math.sin(t * 0.2) * 0.4,
          carYActive + 1.0,
          6.5 + Math.cos(t * 0.15) * 0.3
        );
        tl = new THREE.Vector3(activeCar ? carXActive : 0, carYActive, 0);
        lerpBase = 0.018;
        break;

      // DOOR: focus on the active car's open doors
      case CAM.DOOR:
        var doorElapsed = Math.max(0, t - doorCamStartTime);
        var approach = Math.min(doorElapsed * 0.15, 0.6);
        tp = new THREE.Vector3(
          carXActive + 0.4 + Math.sin(t * 0.08) * 0.15,
          carYActive + 0.4,
          CAR_D / 2 + 5.5 - approach
        );
        tl = new THREE.Vector3(carXActive, carYActive - 0.1, -0.2);
        lerpBase = 0.01;
        break;

      default:
        tp = camP.clone();
        tl = camL.clone();
        lerpBase = 0.02;
    }

    var f = 1.0 - Math.pow(lerpBase, dt);
    camP.lerp(tp, f);
    camL.lerp(tl, f);
    camera.position.copy(camP);
    camera.lookAt(camL);
  }

  // ==========================================
  // RENDER LOOP
  // ==========================================
  function loop() {
    requestAnimationFrame(loop);

    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // --- Tick each car (physics + doors + cables + counterweight) ---
    for (var i = 0; i < carInstances.length; i++) {
      carInstances[i].tick(t, dt);
    }

    // --- Dust particles ---
    var dPos = dust.geometry.attributes.position.array;
    for (var di = 0; di < dustCount; di++) {
      dPos[di * 3 + 1] += Math.sin(t * 0.5 + di) * 0.003;
      dPos[di * 3] += Math.cos(t * 0.3 + di * 0.7) * 0.001;
      if (dPos[di * 3 + 1] > SHAFT_H) dPos[di * 3 + 1] = 0;
      if (dPos[di * 3 + 1] < 0) dPos[di * 3 + 1] = SHAFT_H;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    // --- Idle timer (any car moving resets it) ---
    var anyMoving = carInstances.some(function (c) { return c.state.moving; });
    if (!anyMoving) {
      idleTime += dt;
    } else {
      idleTime = 0;
    }

    updCamMode(t);
    updCam(t, dt);

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
  loop();

})();
