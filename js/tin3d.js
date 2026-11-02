/* Вращающаяся банка Activize на фоне блока Optimal Set. Требует window.THREE (js/three-bundle.min.js). */
(function(){
  var T = window.THREE, TAU = Math.PI * 2;
  function canvas(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, srgb){ var t = new T.CanvasTexture(c); if (srgb !== false) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
  function rnd(a, b){ return a + Math.random() * (b - a); }

  // порошок Activize: рубиново-красные кристаллики
  function powderTex(){
    var S = 512, c = canvas(S, S), g = c.getContext('2d'), b = canvas(S, S), bg = b.getContext('2d');
    g.fillStyle = '#B4182A'; g.fillRect(0, 0, S, S); bg.fillStyle = '#808080'; bg.fillRect(0, 0, S, S);
    for (var i = 0; i < 26000; i++) {
      var x = Math.random() * S, y = Math.random() * S, r = rnd(0.6, 2.2), l = Math.random();
      g.fillStyle = l < 0.08 ? 'rgba(255,170,175,.85)' : l < 0.55 ? 'rgba(196,26,44,.95)' : l < 0.85 ? 'rgba(150,12,28,.9)' : 'rgba(90,6,18,.9)';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      var v = Math.round(rnd(60, 200)); bg.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; bg.beginPath(); bg.arc(x, y, r, 0, TAU); bg.fill();
    }
    var t1 = tex(c), t2 = tex(b, false); t1.wrapS = t1.wrapT = t2.wrapS = t2.wrapT = T.RepeatWrapping; t1.repeat.set(2, 2); t2.repeat.set(2, 2);
    return { map: t1, bump: t2 };
  }
  function sparkTex(){
    var c = canvas(64, 64), g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,200,200,.8)'); rg.addColorStop(1, 'rgba(255,120,120,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return tex(c);
  }

  function TinScene(canvasEl, opts){
    var self = this, R = 0.33, HB = 0.86, LIP = 0.035;
    var renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = T.SRGBColorSpace;

    var scene = new T.Scene();
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    var camera = new T.PerspectiveCamera(26, 1, 0.1, 50);

    // сценический свет: банка в полутени, сверху бьёт узкий тёплый прожектор
    var dark = !!opts.dark;
    scene.environmentIntensity = dark ? 0.22 : 0.8;
    renderer.toneMappingExposure = dark ? 0.95 : 1.05;
    var spot = new T.SpotLight('#FFF1DE', dark ? 75 : 30, 8, 0.3, 0.5, 1.2); spot.position.set(-0.35, 3.6, 0.7); // чуть слева сверху, прямо на банку spot.target.position.set(0, -0.2, 0); scene.add(spot, spot.target);
    var key = new T.DirectionalLight('#FFF3E6', dark ? 0.75 : 2.4); key.position.set(-2, 3, 3); scene.add(key);
    var rim = new T.DirectionalLight('#FFD6DE', dark ? 1.4 : 2.2); rim.position.set(2.5, 1.5, -2); scene.add(rim);
    var rim2 = new T.DirectionalLight('#FFE6D0', dark ? 1.0 : 0); rim2.position.set(-2.5, 1.2, -2); scene.add(rim2);
    var fill = new T.HemisphereLight('#FFF0F2', '#3A2228', dark ? 0.25 : 0.6); scene.add(fill);

    var loader = new T.TextureLoader();
    // этикетка + карта «металличности»: серебристые места печати на жести блестят как металл, цветные — как лак
    // полная этикетка 360° (лицо — с официального фото, бока и оборот — с видео банки)
    var label = loader.load(opts.label);
    label.colorSpace = T.SRGBColorSpace; label.anisotropy = 16; label.wrapS = T.RepeatWrapping;

    var tin = new T.Group(); scene.add(tin);
    var silver = new T.MeshPhysicalMaterial({ color: '#DADAD6', metalness: 1, roughness: 0.2 });
    var silverDark = new T.MeshPhysicalMaterial({ color: '#BDBDB8', metalness: 1, roughness: 0.32, side: T.DoubleSide });

    // металлический корпус: валик-закатка снизу, рёбра жёсткости, «плечо» и закатанный край горлышка
    function lathe(pts, seg, mat){ return new T.Mesh(new T.LatheGeometry(pts.map(function(p){ return new T.Vector2(p[0], p[1]); }), seg), mat); }
    function bead(cx, cy, r, from, to, n){ var o = []; for (var i = 0; i <= n; i++) { var a = from + (to - from) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
    var shell = [[0, -0.004], [R - 0.03, -0.004], [R - 0.012, 0.0]]
      .concat(bead(R - 0.002, 0.012, 0.012, -Math.PI / 2, Math.PI / 2, 10))   // нижняя закатка
      .concat([[R - 0.003, 0.03], [R, 0.036]])
      .concat([[R, HB - 0.05], [R - 0.003, HB - 0.044], [R - 0.004, HB - 0.036], [R - 0.001, HB - 0.03]]) // ребро под крышкой
      .concat([[R - 0.012, HB - 0.022], [R - 0.016, HB - 0.006]])
      .concat(bead(R - 0.016, HB + 0.002, 0.008, -Math.PI / 2, Math.PI, 10))  // закатанный край
      .concat([[R - 0.03, HB - 0.002], [R - 0.03, HB - 0.2]]);
    // картонная банка: закатки белые, как на видео
    var whiteRim = new T.MeshPhysicalMaterial({ color: '#F3F1EC', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, side: T.DoubleSide });
    tin.add(lathe(shell, 192, whiteRim));
    // этикетка — чуть поверх металла, от нижнего ребра до плеча
    var LY0 = 0.036, LY1 = HB - 0.05;
    var labelMat = new T.MeshPhysicalMaterial({ map: label, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: 0.55, specularIntensity: 0.35 }); // мягкий лак: без резких белых полос-бликов
    var body = new T.Mesh(new T.CylinderGeometry(R + 0.0015, R + 0.0015, LY1 - LY0, 256, 1, true), labelMat);
    body.position.y = (LY0 + LY1) / 2; body.rotation.y = Math.PI; tin.add(body); // лицевая сторона смотрит в камеру при spin = 0 и spin = π
    // дно с концентрическими кольцами
    var bc = canvas(512, 512), bg2 = bc.getContext('2d');
    bg2.fillStyle = '#F4F2EE'; bg2.fillRect(0, 0, 512, 512);
    bg2.fillStyle = '#2A2A2A'; bg2.font = '22px "Courier New", monospace'; bg2.save(); bg2.translate(256, 256); bg2.rotate(-0.12);
    bg2.fillText('1000034315   06/2027', -150, -10); bg2.fillText('0128 11:47:45    0708064DE', -170, 24); bg2.restore();
    var bottomMat = new T.MeshPhysicalMaterial({ map: tex(bc), roughness: 0.45, side: T.DoubleSide });
    var bottomDisc = new T.Mesh(new T.CircleGeometry(R - 0.03, 128), bottomMat); bottomDisc.rotation.x = Math.PI / 2; bottomDisc.position.y = -0.002; tin.add(bottomDisc);
    // внутренняя стенка
    var inner = new T.Mesh(new T.CylinderGeometry(R - 0.031, R - 0.031, 0.22, 160, 1, true), new T.MeshPhysicalMaterial({ color: '#C4C4C0', metalness: 1, roughness: 0.38, side: T.BackSide }));
    inner.position.y = HB - 0.11; tin.add(inner);
    // порошок горкой
    var P = powderTex(), PR = R - 0.032, pg = new T.CircleGeometry(PR, 128, 0, TAU), pp = pg.attributes.position;
    pg = new T.PlaneGeometry(PR * 2, PR * 2, 120, 120); pp = pg.attributes.position;
    for (var i = 0; i < pp.count; i++) {
      var x = pp.getX(i), y = pp.getY(i), rr = Math.min(1, Math.sqrt(x * x + y * y) / PR);
      if (Math.sqrt(x * x + y * y) > PR) { var k = PR / Math.sqrt(x * x + y * y); x *= k; y *= k; pp.setXY(i, x, y); }
      pp.setZ(i, Math.pow(1 - rr * rr, 1.4) * 0.05 + (Math.sin(x * 47) * Math.cos(y * 39) + Math.sin(x * 91 + y * 23) * 0.5) * 0.0025);
    }
    pg.computeVertexNormals();
    var powder = new T.Mesh(pg, new T.MeshPhysicalMaterial({ map: P.map, bumpMap: P.bump, bumpScale: 3, roughness: 0.85, sheen: 0.4, sheenColor: new T.Color('#FF6F82') }));
    powder.rotation.x = -Math.PI / 2; powder.position.y = HB - 0.09; tin.add(powder);
    // белая мерная ложечка на порошке
    var scoop = new T.Group(), white = new T.MeshPhysicalMaterial({ color: '#F4F2EE', roughness: 0.35, clearcoat: 0.6, side: T.DoubleSide });
    var bowl = lathe([[0, 0], [0.03, 0.002], [0.045, 0.012], [0.05, 0.03], [0.052, 0.034], [0.048, 0.034]], 64, white); scoop.add(bowl);
    var handle = new T.Mesh(new T.BoxGeometry(0.17, 0.006, 0.026), white); handle.position.set(0.12, 0.03, 0); handle.rotation.z = 0.12; scoop.add(handle);
    scoop.position.set(-0.07, HB - 0.06, 0.05); scoop.rotation.set(0.05, 0.6, -0.08); tin.add(scoop);

    // крышка: юбка с закатанным краем, ступенька и выпуклый верх с рельефными кольцами
    var lidG = new T.Group(); lidG.position.y = HB - 0.03; tin.add(lidG);
    var red = new T.MeshPhysicalMaterial({ color: '#C41E26', metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.2, sheenColor: new T.Color('#FF8A8A'), side: T.DoubleSide }); // пластиковая крышка, как на видео
    var RL = R + 0.012;
    var lid = [[RL - 0.01, 0.0]].concat(bead(RL, 0.004, 0.006, -Math.PI / 2, Math.PI / 2, 8))
      .concat([[RL, 0.012], [RL + 0.001, 0.09], [RL - 0.004, 0.1]])
      .concat(bead(RL - 0.012, 0.1, 0.008, 0, Math.PI, 8))
      .concat([[RL - 0.024, 0.098], [RL - 0.03, 0.102], [RL - 0.06, 0.104], [RL - 0.064, 0.108], [RL - 0.07, 0.104],
               [RL * 0.55, 0.11], [RL * 0.52, 0.113], [RL * 0.49, 0.11], [0, 0.116]]);
    lidG.add(lathe(lid, 192, red));
    var lidIn = new T.Mesh(new T.CircleGeometry(RL - 0.002, 128), new T.MeshPhysicalMaterial({ color: '#B8161E', roughness: 0.3 }));
    lidIn.rotation.x = Math.PI / 2; lidIn.position.y = 0.002; lidG.add(lidIn);
    var lidRing = new T.Mesh(new T.CylinderGeometry(RL - 0.002, RL - 0.002, 0.012, 192, 1, true), red); lidRing.position.y = 0.006; lidG.add(lidRing);

    // искрящаяся «пыльца» над открытой банкой
    var N = 260, pos = new Float32Array(N * 3), seeds = [];
    for (var k = 0; k < N; k++) seeds.push({ a: Math.random() * TAU, r: Math.sqrt(Math.random()) * (R - 0.04), v: rnd(0.12, 0.35), ph: Math.random(), s: rnd(0.5, 1.5) });
    var dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    var dustMat = new T.PointsMaterial({ map: sparkTex(), size: 0.035, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, color: '#FFB8C2' });
    var dust = new T.Points(dustGeo, dustMat); tin.add(dust);

    tin.position.y = -HB / 2 - 0.15;

    var state = { spin: 0, open: 0, t: 0, offsetX: opts.offsetX || 0 };
    function ease(x){ return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

    function resize(){
      var w = canvasEl.clientWidth, h = canvasEl.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      // банка (с местом над ней для крышки) занимает ~70% высоты экрана; на узком экране отодвигаем камеру
      var need = opts.big ? 2.1 : 1.75, dist = need / 2 / Math.tan(camera.fov * Math.PI / 360);
      if (camera.aspect < 0.8) dist *= 0.8 / camera.aspect * 0.75;
      var lookY = opts.big ? 0.24 : 0.12; // чуть выше центра: сверху экран закрывает шапка сайта
      camera.position.set(0, lookY + 0.13, dist); camera.lookAt(0, lookY, 0);
      // смещение по экрану (доля ширины): сдвигаем «объектив», а не банку — перспектива остаётся честной
      camera.setViewOffset(w, h, -state.offsetX * w, 0, w, h);
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvasEl); resize();

    function update(dt){
      state.t += dt;
      var o = ease(Math.min(1, Math.max(0, state.open)));
      tin.rotation.y = state.spin;
      // банка наклонена горлышком к зрителю, а когда открывается — сильнее, чтобы был виден порошок
      tin.rotation.x = 0.22 + o * 0.3 + Math.sin(state.t * 0.6) * 0.03;
      tin.rotation.z = -0.08 + Math.sin(state.t * 0.45) * 0.025;
      tin.position.y = -HB / 2 - 0.08 - o * (opts.big ? 0.03 : 0.16) + Math.sin(state.t * 0.8) * 0.015;
      // крышка взлетает, наклоняется и чуть отходит в сторону
      lidG.position.set(o * 0.42, HB - 0.03 + o * (opts.big ? 0.3 : 0.42), -o * 0.3); // крышка уходит вверх-вбок и назад, чтобы не закрывать порошок
      lidG.rotation.set(o * 0.35, -state.spin * o * 0.4, -o * 0.55);
      // пыльца
      dustMat.opacity = Math.max(0, (o - 0.25) / 0.75) * 0.95;
      if (dustMat.opacity > 0.01) {
        for (var i = 0; i < N; i++) {
          var s = seeds[i], k = (s.ph + state.t * s.v * 0.35) % 1, y = HB - 0.05 + k * 0.75 * o, spread = 1 + k * 1.4;
          pos[i * 3] = Math.cos(s.a + state.t * 0.4) * s.r * spread; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(s.a + state.t * 0.4) * s.r * spread;
        }
        dustGeo.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }

    self.set = function(spin, open){ state.spin = spin; state.open = open; };
    self.setOffset = function(x){ state.offsetX = x; resize(); };
    self.frame = update;
  }

  window.Tin3D = {
    create: function(canvasEl, opts){
      var probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('webgl');
      return new TinScene(canvasEl, opts || {});
    }
  };
})();
