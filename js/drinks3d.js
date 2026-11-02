/* 3D-сцена «напиток FitLine у окна». Требует window.THREE (js/three-bundle.min.js). */
(function(){
  var T = window.THREE;
  var TAU = Math.PI * 2;

  // ---------- настроение каждого напитка ----------
  var DRINKS = {
    activize: {
      // прозрачный рубиново-розовый, как на фото с банкой Activize
      liquid: { color: '#FF9A96', att: '#E0283E', dist: 0.62, rough: 0.03, trans: 1, glow: '#B0142A', gi: 0.32 },
      sun: { color: '#FFE2B8', i: 3.4 }, exposure: 0.9, sky: 'morning',
      caustic: '#FF4A50', bubbles: 70, pack: 'tin', foam: false
    },
    basics: {
      // густой апельсиново-морковный, с лёгкой пенкой
      liquid: { color: '#FFB25A', att: '#F06A00', dist: 0.16, rough: 0.32, trans: 0.55, glow: '#E06A00', gi: 0.42 },
      sun: { color: '#FFDDA6', i: 3.5 }, exposure: 0.9, sky: 'day',
      caustic: '#FF9A1A', bubbles: 30, pack: 'basics', foam: true
    },
    restorate: {
      liquid: { color: '#D8AE88', att: '#A87650', dist: 0.2, rough: 0.35, trans: 0.25, glow: '#8A5E3C', gi: 0.3 },
      sun: { color: '#FFB66E', i: 3.1 }, exposure: 0.85, sky: 'evening',
      caustic: '#FFC870', bubbles: 20, pack: 'restorate', foam: false
    }
  };

  // ---------- размеры стакана FitLine (по фото: высокий, конусный, с «ямочками») ----------
  var H = 1.6, R0 = 0.29, R1 = 0.425, WALL = 0.022, BASE = 0.17, FILL = 1.32;
  function rOut(y){ return R0 + (R1 - R0) * (y / H); }
  function rIn(y){ return rOut(y) - WALL; }
  // логотип: по центру спереди, поверх напитка
  var LOGO_Y = 0.86, LOGO_H = 0.5, LOGO_SPAN = 1.66;

  // ---------- шум для «живых» форм ----------
  function hash(x, y, z){ var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function sm(t){ return t * t * (3 - 2 * t); }
  function vnoise(x, y, z){
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
    function L(a, b, t){ return a + (b - a) * t; }
    return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
             L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz);
  }
  function displace(geo, amp, freq, seed){
    var p = geo.attributes.position, v = new T.Vector3(), n = new T.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); n.copy(v).normalize();
      var k = vnoise(v.x * freq + seed, v.y * freq, v.z * freq) + 0.5 * vnoise(v.x * freq * 2.3, v.y * freq * 2.3 + seed, v.z * freq * 2.3);
      v.addScaledVector(n, amp * (k / 1.5 - 0.5)); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); return geo;
  }
  function rnd(a, b){ return a + Math.random() * (b - a); }

  // ---------- текстуры на canvas ----------
  function canvas(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, srgb){ var t = new T.CanvasTexture(c); if (srgb !== false) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
  function radialTex(inner, outer){
    var c = canvas(256, 256), g = c.getContext('2d'), rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, inner); rg.addColorStop(1, outer); g.fillStyle = rg; g.fillRect(0, 0, 256, 256); return tex(c);
  }
  function noiseTex(base, spread, n, rep){
    var c = canvas(512, 512), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < n; i++) {
      var l = Math.round(128 + rnd(-spread, spread));
      g.fillStyle = 'rgba(' + l + ',' + l + ',' + l + ',.5)';
      g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, rnd(0.6, 2.2), 0, TAU); g.fill();
    }
    var t = tex(c, false); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep || 2, rep || 2); return t;
  }

  function woodTex(){
    var c = canvas(2048, 1024), g = c.getContext('2d');
    g.fillStyle = '#B98F64'; g.fillRect(0, 0, 2048, 1024);
    for (var b = 0; b < 4; b++) { g.fillStyle = 'rgba(' + (b % 2 ? '255,230,200' : '90,60,35') + ',.05)'; g.fillRect(0, b * 256, 2048, 256); }
    for (var i = 0; i < 520; i++) {
      var y = Math.random() * 1024, a = rnd(0.03, 0.11);
      g.strokeStyle = Math.random() < 0.55 ? 'rgba(110,72,40,' + a + ')' : 'rgba(230,196,150,' + a + ')';
      g.lineWidth = rnd(0.8, 3.5); g.beginPath();
      for (var x = 0; x <= 2048; x += 16) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 7 + Math.sin(x * 0.017 + i * 3) * 2.5);
      g.stroke();
    }
    for (var k = 0; k < 6; k++) { // сучки
      var kx = Math.random() * 2048, ky = Math.random() * 1024, kg = g.createRadialGradient(kx, ky, 1, kx, ky, 26);
      kg.addColorStop(0, 'rgba(90,55,30,.55)'); kg.addColorStop(1, 'rgba(90,55,30,0)'); g.fillStyle = kg; g.beginPath(); g.ellipse(kx, ky, 40, 16, 0, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(70,45,25,.4)'; g.lineWidth = 3;
    [256, 512, 768].forEach(function(y){ g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); });
    var t = tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  function plasterTex(){
    var c = canvas(512, 512), g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 2500; i++) { var l = Math.round(rnd(100, 156)); g.fillStyle = 'rgb(' + l + ',' + l + ',' + l + ')'; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, rnd(1, 5), 0, TAU); g.fill(); }
    var c2 = canvas(512, 512), g2 = c2.getContext('2d'); g2.filter = 'blur(2px)'; g2.drawImage(c, 0, 0); c = c2;
    var t = tex(c, false); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 4); return t;
  }

  // хвоя за окном: несколько слоёв веток с глубиной резкости
  var skyCache = {};
  function foliageTex(mood){
    if (skyCache[mood]) return skyCache[mood];
    var P = {
      morning: { sky: ['#E9EEE6', '#F4F3EA', '#D7DEC9'], far: '#8FA48A', mid: '#41583E', near: '#1E2D1F', lit: '#B6C27C', haze: 'rgba(255,248,230,.18)' },
      day: { sky: ['#EEF0E2', '#F7F2DF', '#DCDDBF'], far: '#93A27A', mid: '#3F5536', near: '#1C2919', lit: '#C6C770', haze: 'rgba(255,244,214,.2)' },
      evening: { sky: ['#F2D9B6', '#FBE3BC', '#E3C796'], far: '#A29170', mid: '#4C4A33', near: '#24231A', lit: '#E2B465', haze: 'rgba(255,214,150,.28)' }
    }[mood];
    var W = 2048, Hh = 1152, c = canvas(W, Hh), main = c.getContext('2d'), lc = canvas(W, Hh), g = lc.getContext('2d');
    var lg = main.createLinearGradient(0, 0, 0, Hh); lg.addColorStop(0, P.sky[0]); lg.addColorStop(0.5, P.sky[1]); lg.addColorStop(1, P.sky[2]);
    main.fillStyle = lg; main.fillRect(0, 0, W, Hh);
    function branch(x, y, ang, len, w, col, lit, depth){
      var steps = Math.max(6, Math.round(len / 14)), px = x, py = y, a = ang;
      g.strokeStyle = col; g.lineCap = 'round';
      for (var s = 0; s < steps; s++) {
        a += rnd(-0.08, 0.08) + 0.012;
        var nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
        g.lineWidth = w * (1 - s / steps * 0.7); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        // иголки
        var nn = Math.round(rnd(6, 11));
        for (var k = 0; k < nn; k++) {
          var side = k % 2 ? 1 : -1, na = a + side * rnd(0.5, 1.2), nl = rnd(9, 22) * (0.5 + depth * 0.5), t = Math.random();
          var bx = px + (nx - px) * t, by = py + (ny - py) * t;
          g.strokeStyle = Math.random() < 0.18 ? lit : col; g.lineWidth = rnd(1, 2.2);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(na) * nl, by + Math.sin(na) * nl); g.stroke();
        }
        g.strokeStyle = col;
        if (depth > 0.4 && Math.random() < 0.12) branch(nx, ny, a + rnd(-0.9, 0.9), len * rnd(0.25, 0.45), w * 0.5, col, lit, depth * 0.6);
        px = nx; py = ny;
      }
    }
    function layer(blur, col, lit, count, w, trunks){
      g.clearRect(0, 0, W, Hh);
      for (var t = 0; t < trunks; t++) {
        var tx = rnd(100, W - 100), tw = rnd(16, 34);
        g.fillStyle = col; g.beginPath(); g.moveTo(tx - tw / 2, Hh); g.lineTo(tx - tw / 3 + rnd(-30, 30), 0); g.lineTo(tx + tw / 3 + rnd(-30, 30), 0); g.lineTo(tx + tw / 2, Hh); g.fill();
      }
      for (var i = 0; i < count; i++) {
        var fromLeft = Math.random() < 0.5, y = rnd(-40, Hh * 0.95);
        branch(fromLeft ? rnd(-200, W * 0.6) : rnd(W * 0.4, W + 200), y, fromLeft ? rnd(-0.4, 0.5) : Math.PI + rnd(-0.5, 0.4), rnd(250, 620), w, col, lit, 1);
      }
      // слой целиком размываем одним проходом — так быстро
      main.filter = blur ? 'blur(' + blur + 'px)' : 'none'; main.drawImage(lc, 0, 0); main.filter = 'none';
    }
    layer(9, P.far, P.far, 60, 6, 3);
    main.fillStyle = P.haze; main.fillRect(0, 0, W, Hh);
    layer(3.5, P.mid, P.lit, 55, 7, 2);
    layer(0.6, P.near, P.lit, 22, 9, 0);
    // солнечные «прорехи» в кроне
    g.clearRect(0, 0, W, Hh);
    for (var j = 0; j < 26; j++) { g.fillStyle = 'rgba(255,240,205,' + rnd(0.15, 0.45) + ')'; g.beginPath(); g.arc(rnd(0, W), rnd(0, Hh * 0.8), rnd(20, 70), 0, TAU); g.fill(); }
    main.globalCompositeOperation = 'screen'; main.filter = 'blur(26px)'; main.drawImage(lc, 0, 0); main.filter = 'none'; main.globalCompositeOperation = 'source-over';
    return (skyCache[mood] = tex(c));
  }

  function logoTex(){
    var c = canvas(2048, 512), g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF';
    g.font = '800 190px Manrope, "Segoe UI", Arial, sans-serif'; g.fillText('FitLine', 1024, 220);
    g.font = '700 54px Manrope, "Segoe UI", Arial, sans-serif'; g.globalAlpha = 0.85; g.fillText('P M - I N T E R N A T I O N A L', 1024, 360);
    return tex(c);
  }

  function paperStrawTex(){
    var c = canvas(64, 512), g = c.getContext('2d');
    g.fillStyle = '#F3EEE4'; g.fillRect(0, 0, 64, 512); g.fillStyle = '#B8333B';
    for (var y = -64; y < 600; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 32); g.lineTo(64, y + 54); g.lineTo(0, y + 22); g.fill(); }
    var t = tex(c); t.wrapT = T.RepeatWrapping; t.repeat.set(1, 3); return t;
  }

  // мякоть питахайи: белая с чёрными семечками и розовой кожурой по краю
  function dragonFleshTex(){
    var c = canvas(512, 512), g = c.getContext('2d'), R = 256;
    g.translate(R, R);
    g.fillStyle = '#D23A6E'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    var rg = g.createRadialGradient(0, 0, 10, 0, 0, R * 0.9); rg.addColorStop(0, '#FBF8F2'); rg.addColorStop(0.85, '#F3EEE6'); rg.addColorStop(1, '#F1C9D6');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R * 0.9, 0, TAU); g.fill();
    for (var i = 0; i < 520; i++) {
      var a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R * 0.84;
      g.fillStyle = 'rgba(25,18,18,' + rnd(0.7, 1) + ')'; g.beginPath(); g.ellipse(Math.cos(a) * r, Math.sin(a) * r, rnd(2.5, 4.2), rnd(1.6, 2.6), Math.random() * 3, 0, TAU); g.fill();
    }
    return tex(c);
  }

  function leafTex(base, vein){
    var c = canvas(256, 512), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = vein; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 512); g.lineTo(128, 0); g.stroke();
    g.lineWidth = 2.5;
    for (var y = 470; y > 40; y -= 46) { g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(170, y - 30, 250, y - 70); g.stroke(); g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(86, y - 30, 6, y - 70); g.stroke(); }
    return tex(c);
  }

  // ---------- стакан FitLine ----------
  // овальные «ямочки» в шахматном порядке, как у настоящего стакана; спереди под логотипом гладко
  var DIMPLES = (function(){
    var list = [], rows = [0.36, 0.66, 0.97, 1.27], n = 8;
    rows.forEach(function(y, r){
      for (var k = 0; k < n; k++) {
        var phi = (k + (r % 2 ? 0.5 : 0)) / n * TAU;
        var p = phi > Math.PI ? phi - TAU : phi;
        if ((r === 1 || r === 2) && Math.abs(p) < 0.62) continue; // зона логотипа
        list.push({ phi: phi, y: y, a: 0.31, b: 0.145 });
      }
    });
    return list;
  })();
  var DIMPLE_DEPTH = 0.016;
  function smoothstep(a, b, x){ var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function dimple(phi, y){
    var v = 0;
    for (var i = 0; i < DIMPLES.length; i++) {
      var d = DIMPLES[i], dp = phi - d.phi; dp -= Math.round(dp / TAU) * TAU;
      var e = (dp / d.a) * (dp / d.a) + ((y - d.y) / d.b) * ((y - d.y) / d.b);
      if (e < 1) v = Math.max(v, smoothstep(0, 0.42, 1 - e));
    }
    // ямочки мягко гаснут к дну и к краю
    return v * DIMPLE_DEPTH * smoothstep(BASE + 0.02, BASE + 0.12, y) * (1 - smoothstep(H - 0.2, H - 0.08, y));
  }

  var SEG = 360;
  function glassGeometry(){
    var p = [], outer0, outer1, N = 300;
    // дно снаружи: вогнутый «пятачок» и фаска
    p.push(new T.Vector2(0, 0.018), new T.Vector2(R0 * 0.55, 0.008), new T.Vector2(R0 * 0.8, 0.0015), new T.Vector2(R0 - 0.012, 0), new T.Vector2(R0 - 0.003, 0.004), new T.Vector2(R0, 0.013));
    outer0 = p.length;
    for (var i = 1; i <= N; i++) { var y = 0.013 + (H - 0.007 - 0.013) * i / N; p.push(new T.Vector2(rOut(y), y)); }
    outer1 = p.length - 1;
    // скруглённый край
    var cx = rOut(H) - WALL / 2, cy = H - 0.007;
    for (var k = 1; k < 10; k++) { var a = k / 10 * Math.PI; p.push(new T.Vector2(cx + Math.cos(a) * WALL / 2, cy + Math.sin(a) * WALL * 0.6)); }
    // внутренняя стенка
    var M = 160;
    for (var j = 0; j <= M; j++) { var yy = H - 0.007 - (H - 0.007 - BASE - 0.025) * j / M; p.push(new T.Vector2(rIn(yy), yy)); }
    // внутреннее дно со скруглением
    p.push(new T.Vector2(rIn(BASE) - 0.012, BASE + 0.004), new T.Vector2(rIn(BASE) - 0.035, BASE), new T.Vector2(0, BASE - 0.006));
    var geo = new T.LatheGeometry(p, SEG), pos = geo.attributes.position, np = p.length;
    for (var s = 0; s <= SEG; s++) {
      var phi = s / SEG * TAU, sn = Math.sin(phi), cs = Math.cos(phi);
      for (var q = outer0; q <= outer1; q++) {
        var idx = s * np + q, y2 = p[q].y, r = p[q].x - dimple(phi, y2);
        pos.setXYZ(idx, r * sn, y2, r * cs);
      }
    }
    geo.computeVertexNormals();
    // шов: усредняем нормали первого и последнего меридиана
    var nr = geo.attributes.normal, a1 = new T.Vector3(), a2 = new T.Vector3();
    for (var t = 0; t < np; t++) {
      a1.fromBufferAttribute(nr, t); a2.fromBufferAttribute(nr, SEG * np + t); a1.add(a2).normalize();
      nr.setXYZ(t, a1.x, a1.y, a1.z); nr.setXYZ(SEG * np + t, a1.x, a1.y, a1.z);
    }
    return geo;
  }

  // массивное дно — отдельное «стекло», которое по-настоящему преломляет стол
  function baseGeometry(){
    var p = [new T.Vector2(0, 0.02), new T.Vector2(R0 * 0.55, 0.01), new T.Vector2(R0 * 0.8, 0.004), new T.Vector2(R0 - 0.014, 0.002), new T.Vector2(R0 - 0.004, 0.014)];
    for (var i = 1; i <= 10; i++) { var y = 0.014 + (BASE - 0.014) * i / 10; p.push(new T.Vector2(rOut(y) - 0.003, y)); }
    p.push(new T.Vector2(rIn(BASE) - 0.035, BASE - 0.001), new T.Vector2(0, BASE - 0.007));
    return new T.LatheGeometry(p, 160);
  }

  // наклейка-логотип, повторяющая поверхность стакана
  function logoGeometry(){
    var nu = 140, nv = 90, verts = [], uvs = [], idx = [], y0 = LOGO_Y - LOGO_H / 2;
    for (var j = 0; j <= nv; j++) for (var i = 0; i <= nu; i++) {
      var u = i / nu, v = j / nv, phi = (u - 0.5) * LOGO_SPAN, y = y0 + v * LOGO_H, r = rOut(y) - dimple(phi, y) + 0.0013;
      verts.push(r * Math.sin(phi), y, r * Math.cos(phi)); uvs.push(u, v);
    }
    for (var jj = 0; jj < nv; jj++) for (var ii = 0; ii < nu; ii++) {
      var a = jj * (nu + 1) + ii, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    g.computeVertexNormals(); return g;
  }

  function liquidGeometry(top){
    var e = 0.0035, p = [new T.Vector2(0, BASE + 0.001), new T.Vector2(rIn(BASE) - 0.035, BASE + 0.002), new T.Vector2(rIn(BASE) - 0.012, BASE + 0.006), new T.Vector2(rIn(BASE + 0.03) - e, BASE + 0.03)];
    for (var i = 1; i <= 24; i++) { var y = BASE + 0.03 + (top - BASE - 0.03) * i / 24; p.push(new T.Vector2(rIn(y) - e, y)); }
    // мениск
    p.push(new T.Vector2(rIn(top) - e, top + 0.016), new T.Vector2(rIn(top) - e - 0.01, top + 0.008), new T.Vector2(rIn(top) - 0.05, top + 0.0015), new T.Vector2(0, top));
    return new T.LatheGeometry(p, 200);
  }

  // тонкая «кромка» стекла: чуть зеленоватые края, как у настоящего толстого стекла
  function edgeMaterial(side, strength){
    return new T.ShaderMaterial({
      uniforms: { tint: { value: new T.Color('#5E7F78') }, k: { value: strength } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 tint; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.4); gl_FragColor = vec4(tint, clamp(0.015 + f * k, 0.0, 0.7)); }',
      transparent: true, depthWrite: false, side: side
    });
  }

  // ---------- модели декора ----------
  function shadowy(o){ o.traverse(function(m){ if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

  // ягода из костянок (ежевика / малина)
  function drupeBerry(opt){
    var n = opt.n, im = new T.InstancedMesh(new T.SphereGeometry(1, 14, 12), new T.MeshPhysicalMaterial({
      color: opt.color, roughness: opt.rough, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.6, sheenColor: new T.Color(opt.sheen) }), n);
    var d = new T.Object3D(), ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 1.75, r = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i, taper = opt.cone ? 1 - Math.max(0, -y) * 0.35 : 1;
      d.position.set(Math.cos(th) * r * opt.a * taper, y * opt.c, Math.sin(th) * r * opt.a * taper);
      d.scale.setScalar(opt.s * rnd(0.85, 1.12)); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      if (opt.tint) im.setColorAt(i, new T.Color(opt.color).lerp(new T.Color(opt.tint), Math.random() * 0.5));
    }
    var g = new T.Group(); g.add(im);
    // чашелистики сверху
    var sep = new T.MeshStandardMaterial({ color: '#5F7A3A', roughness: 0.7, side: T.DoubleSide });
    for (var k = 0; k < 5; k++) {
      var s = new T.Mesh(new T.ConeGeometry(0.012, 0.06, 4), sep);
      s.position.set(Math.cos(k / 5 * TAU) * 0.025, opt.c + 0.008, Math.sin(k / 5 * TAU) * 0.025);
      s.rotation.set(Math.sin(k / 5 * TAU) * 1.3, 0, -Math.cos(k / 5 * TAU) * 1.3); g.add(s);
    }
    var stem = new T.Mesh(new T.CylinderGeometry(0.005, 0.006, 0.05, 6), sep); stem.position.y = opt.c + 0.03; g.add(stem);
    return shadowy(g);
  }
  function blackberry(){ return drupeBerry({ n: 70, a: 0.072, c: 0.095, s: 0.028, color: '#1B0C1A', tint: '#3A1230', rough: 0.22, sheen: '#6E2A5A' }); }
  function raspberry(){ return drupeBerry({ n: 56, a: 0.07, c: 0.088, s: 0.025, color: '#B5162F', tint: '#D63650', rough: 0.35, sheen: '#FF9FB0', cone: true }); }

  // листик мяты с зубчиками, прожилками и изгибом
  var mintGeo = null, mintMat = null;
  function mintLeafGeo(){
    if (mintGeo) return mintGeo;
    var sh = new T.Shape(), pts = [], N = 22, L = 0.2, Wd = 0.075;
    for (var i = 0; i <= N; i++) { var t = i / N, w = Math.sin(Math.PI * Math.pow(t, 0.8)) * Wd * (1 - t * 0.25), tooth = (i % 2 && i > 1 && i < N - 1) ? 0.008 : 0; pts.push([w + tooth, t * L]); }
    sh.moveTo(0, 0); pts.forEach(function(p){ sh.lineTo(p[0], p[1]); });
    for (var j = pts.length - 2; j >= 0; j--) sh.lineTo(-pts[j][0], pts[j][1]);
    var geo = new T.ShapeGeometry(sh, 4), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k);
      pos.setZ(k, x * x * 6 + Math.sin(y / L * Math.PI) * 0.012 - y * y * 0.6); // ложбинка и прогиб
      uv.setXY(k, x / (Wd * 2.3) + 0.5, y / L);
    }
    geo.computeVertexNormals();
    mintMat = new T.MeshPhysicalMaterial({ map: leafTex('#3C7A3F', '#6FAA62'), roughness: 0.55, side: T.DoubleSide, sheen: 0.5, sheenColor: new T.Color('#A8D8A0'), bumpScale: 0.3 });
    return (mintGeo = geo);
  }
  function mintSprig(scale){
    var geo = mintLeafGeo(), g = new T.Group();
    var stem = new T.Mesh(new T.CylinderGeometry(0.006, 0.008, 0.36, 8), new T.MeshStandardMaterial({ color: '#4F7A3E', roughness: 0.6 }));
    stem.rotation.x = Math.PI / 2; stem.position.z = -0.02; g.add(stem);
    for (var i = 0; i < 4; i++) for (var s = -1; s <= 1; s += 2) {
      var l = new T.Mesh(geo, mintMat), sc = 0.55 + i * 0.16;
      l.scale.setScalar(sc); l.position.set(0, 0.01, 0.14 - i * 0.075);
      l.rotation.set(-Math.PI / 2 + rnd(0.15, 0.4), 0, s * (1.15 + rnd(-0.15, 0.15)) + Math.PI);
      g.add(l);
    }
    var top = new T.Mesh(geo, mintMat); top.scale.setScalar(0.5); top.position.set(0, 0.015, 0.17); top.rotation.set(-Math.PI / 2 + 0.6, 0, Math.PI); g.add(top);
    g.scale.setScalar(scale || 1);
    return shadowy(g);
  }
  function floatingLeaf(){ var l = new T.Mesh(mintLeafGeo(), mintMat); return l; }

  function ginger(){
    var g = new T.Group(), mat = new T.MeshPhysicalMaterial({ color: '#D2AE7C', roughness: 0.85, bumpMap: noiseTex('#808080', 40, 4000, 3), bumpScale: 1.2 });
    var parts = [[0, 0, 0, 0.11, 0.075, 0.075], [0.15, 0.01, 0.04, 0.085, 0.06, 0.06], [-0.13, 0.0, -0.03, 0.08, 0.06, 0.065], [0.06, 0.03, -0.1, 0.06, 0.05, 0.05], [0.24, 0.02, 0.1, 0.05, 0.04, 0.04]];
    parts.forEach(function(p, i){
      var m = new T.Mesh(displace(new T.SphereGeometry(1, 40, 28), 0.12, 2.5, i * 3), mat);
      m.scale.set(p[3], p[4], p[5]); m.position.set(p[0], p[1] + p[4] * 0.9, p[2]); m.rotation.y = rnd(0, 3); g.add(m);
    });
    // срез светлый
    var cut = new T.Mesh(new T.CircleGeometry(0.055, 32), new T.MeshStandardMaterial({ color: '#EBD49A', roughness: 0.7 }));
    cut.position.set(-0.205, 0.06, -0.035); cut.rotation.y = -Math.PI / 2 - 0.3; g.add(cut);
    return shadowy(g);
  }

  function carrot(len){
    var g = new T.Group(), prof = [];
    for (var i = 0; i <= 24; i++) { var t = i / 24, r = 0.058 * Math.pow(1 - t, 0.75) + 0.002; prof.push(new T.Vector2(r * (1 + (t < 0.05 ? -(0.05 - t) * 6 : 0)), len * (1 - t))); }
    prof.reverse();
    var c = canvas(128, 512), cg = c.getContext('2d'); cg.fillStyle = '#E26A17'; cg.fillRect(0, 0, 128, 512);
    for (var k = 0; k < 70; k++) { cg.strokeStyle = 'rgba(150,60,10,' + rnd(0.15, 0.4) + ')'; cg.lineWidth = rnd(1, 2.5); var y = Math.random() * 512; cg.beginPath(); cg.moveTo(rnd(0, 60), y); cg.lineTo(rnd(70, 128), y + rnd(-3, 3)); cg.stroke(); }
    var geo = new T.LatheGeometry(prof, 40); displace(geo, 0.01, 18, len * 7);
    var body = new T.Mesh(geo, new T.MeshPhysicalMaterial({ map: tex(c), roughness: 0.55, clearcoat: 0.25, sheen: 0.3, sheenColor: new T.Color('#FFB27A') }));
    body.rotation.z = Math.PI / 2; g.add(body);
    // ботва
    var top = new T.MeshStandardMaterial({ color: '#4E7D35', roughness: 0.65, side: T.DoubleSide });
    for (var s = 0; s < 6; s++) {
      var a = (s - 2.5) * 0.18, curve = new T.CatmullRomCurve3([new T.Vector3(-len, 0, 0), new T.Vector3(-len - 0.12, 0.02, a * 0.3), new T.Vector3(-len - 0.28, 0.01, a * 0.8), new T.Vector3(-len - 0.42, -0.02, a * 1.4)]);
      g.add(new T.Mesh(new T.TubeGeometry(curve, 20, 0.006, 6), top));
      for (var f = 0; f < 9; f++) {
        var p = curve.getPoint(0.3 + f * 0.075), leaf = new T.Mesh(new T.CircleGeometry(0.03, 5), top);
        leaf.scale.set(1, 0.45, 1); leaf.position.copy(p); leaf.rotation.set(-Math.PI / 2 + rnd(-0.4, 0.4), 0, rnd(0, 3)); g.add(leaf);
      }
    }
    return shadowy(g);
  }

  function broccoli(){
    var g = new T.Group(), stemMat = new T.MeshPhysicalMaterial({ color: '#8DAE62', roughness: 0.55, sheen: 0.4, sheenColor: new T.Color('#D8F0B0') });
    var stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.065, 0.32, 20), stemMat); stem.position.y = 0.16; g.add(stem);
    var cut = new T.Mesh(new T.CircleGeometry(0.065, 20), new T.MeshStandardMaterial({ color: '#C9D9A0', roughness: 0.7 })); cut.rotation.x = Math.PI / 2; g.add(cut);
    var budMat = new T.MeshPhysicalMaterial({ color: '#2E5A2A', roughness: 0.7, sheen: 0.7, sheenColor: new T.Color('#86B07A') });
    var florets = 13, perFloret = 46, im = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), budMat, florets * perFloret), d = new T.Object3D(), idx = 0;
    for (var f = 0; f < florets; f++) {
      var fa = f / florets * TAU * 2.1, fr = f === 0 ? 0 : rnd(0.07, 0.14), cx = Math.cos(fa) * fr, cz = Math.sin(fa) * fr, cy = 0.36 + (0.14 - fr) * 0.7;
      var br = new T.Mesh(new T.CylinderGeometry(0.014, 0.022, 0.14, 8), stemMat); br.position.set(cx * 0.5, 0.3, cz * 0.5); br.lookAt(cx, cy + 0.2, cz); br.rotateX(Math.PI / 2); g.add(br);
      for (var k = 0; k < perFloret; k++) {
        var u = Math.random() * TAU, v = Math.acos(rnd(0.15, 1)), R = 0.075;
        d.position.set(cx + Math.sin(v) * Math.cos(u) * R, cy + Math.cos(v) * R * 0.8, cz + Math.sin(v) * Math.sin(u) * R);
        d.scale.setScalar(rnd(0.012, 0.02)); d.updateMatrix(); im.setMatrixAt(idx, d.matrix);
        im.setColorAt(idx, new T.Color('#2E5A2A').lerp(new T.Color('#4F7A3A'), Math.random() * 0.6)); idx++;
      }
    }
    g.add(im);
    return shadowy(g);
  }

  function cherryTomatoes(){
    var g = new T.Group(), mat = new T.MeshPhysicalMaterial({ color: '#CF2A1B', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
    var green = new T.MeshStandardMaterial({ color: '#4F7234', roughness: 0.7, side: T.DoubleSide });
    var vine = new T.CatmullRomCurve3([new T.Vector3(-0.25, 0.17, 0), new T.Vector3(-0.05, 0.2, 0.02), new T.Vector3(0.12, 0.19, -0.02), new T.Vector3(0.3, 0.16, 0.01)]);
    g.add(new T.Mesh(new T.TubeGeometry(vine, 30, 0.008, 6), green));
    [[-0.18, 0.02], [-0.02, -0.06], [0.13, 0.05], [0.27, -0.03]].forEach(function(p, i){
      var r = rnd(0.065, 0.078), t = new T.Mesh(displace(new T.SphereGeometry(r, 40, 30), 0.006, 30, i), mat);
      t.scale.y = 0.86; t.position.set(p[0], r * 0.86, p[1]); g.add(t);
      for (var s = 0; s < 5; s++) {
        var sep = new T.Mesh(new T.ConeGeometry(0.008, 0.055, 3), green), a = s / 5 * TAU;
        sep.position.set(p[0] + Math.cos(a) * 0.022, r * 1.7, p[1] + Math.sin(a) * 0.022); sep.rotation.set(Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4); g.add(sep);
      }
      var st = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.05, 5), green); st.position.set(p[0], r * 1.7 + 0.02, p[1]); g.add(st);
    });
    return shadowy(g);
  }

  function bellPepper(color){
    var geo = new T.SphereGeometry(0.17, 64, 48), pos = geo.attributes.position, v = new T.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var a = Math.atan2(v.z, v.x), h = v.y / 0.17, lobe = 1 + 0.09 * Math.cos(a * 4) * (0.6 + 0.4 * h * h), taper = 1 - Math.max(0, -h) * 0.22;
      v.x *= lobe * taper; v.z *= lobe * taper; v.y *= 1.12; if (h < -0.85) v.y += (h + 0.85) * -0.08 + Math.cos(a * 4) * 0.012;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    var g = new T.Group(), body = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color: color, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }));
    body.position.y = 0.19; g.add(body);
    var green = new T.MeshStandardMaterial({ color: '#4E6B2E', roughness: 0.6 });
    var cap = new T.Mesh(new T.CylinderGeometry(0.05, 0.06, 0.02, 12), green); cap.position.y = 0.38; g.add(cap);
    var stem = new T.Mesh(new T.CylinderGeometry(0.014, 0.02, 0.09, 8), green); stem.position.set(0.01, 0.42, 0); stem.rotation.z = -0.3; g.add(stem);
    return shadowy(g);
  }

  function celery(){
    var g = new T.Group();
    var sh = new T.Shape(); sh.moveTo(-0.04, 0); sh.quadraticCurveTo(0, 0.034, 0.04, 0); sh.quadraticCurveTo(0.03, -0.012, 0.02, -0.006); sh.quadraticCurveTo(0, 0.012, -0.02, -0.006); sh.quadraticCurveTo(-0.03, -0.012, -0.04, 0);
    var path = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.02, 0.5, 0), new T.Vector3(0.05, 1.0, 0.01), new T.Vector3(0.08, 1.45, 0.02)]);
    var c = canvas(64, 512), cg = c.getContext('2d'); cg.fillStyle = '#A8C47A'; cg.fillRect(0, 0, 64, 512);
    for (var x = 4; x < 64; x += 8) { cg.fillStyle = 'rgba(230,245,200,.5)'; cg.fillRect(x, 0, 2, 512); }
    sh = new T.Shape(sh.getPoints(24).map(function(p){ return p.multiplyScalar(1.5); }));
    var stalk = new T.Mesh(new T.ExtrudeGeometry(sh, { steps: 60, bevelEnabled: false, extrudePath: path }), new T.MeshPhysicalMaterial({ map: tex(c), roughness: 0.45, sheen: 0.5, sheenColor: new T.Color('#E8F8C8'), clearcoat: 0.3 }));
    g.add(stalk);
    var leafM = new T.MeshPhysicalMaterial({ map: leafTex('#5E8F3C', '#86B060'), roughness: 0.55, side: T.DoubleSide });
    for (var i = 0; i < 7; i++) {
      var l = new T.Mesh(mintLeafGeo(), leafM); l.scale.setScalar(rnd(0.7, 1.05));
      l.position.set(0.08 + rnd(-0.02, 0.02), 1.42 + i * 0.015, 0.02); l.rotation.set(rnd(-0.8, 0.8), rnd(0, 3), rnd(-1.4, 1.4)); g.add(l);
    }
    return shadowy(g);
  }

  function dragonHalf(){
    var g = new T.Group(), r = 0.2;
    var peel = new T.Mesh(displace(new T.SphereGeometry(r, 64, 32, 0, TAU, Math.PI / 2, Math.PI / 2), 0.012, 10, 4),
      new T.MeshPhysicalMaterial({ color: '#D13A6C', roughness: 0.35, clearcoat: 0.7, sheen: 0.5, sheenColor: new T.Color('#FF9CC0') }));
    peel.scale.set(1, 1.25, 1); g.add(peel);
    var face = new T.Mesh(new T.CircleGeometry(r * 0.99, 64), new T.MeshPhysicalMaterial({ map: dragonFleshTex(), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    face.rotation.x = -Math.PI / 2; face.position.y = 0.001; g.add(face);
    // чешуйки с зелёными кончиками
    var scaleGeo = new T.ConeGeometry(0.035, 0.11, 3); scaleGeo.translate(0, 0.055, 0); scaleGeo.scale(1, 1, 0.3);
    var cols = [], cg = canvas(4, 64), cx = cg.getContext('2d'), gr = cx.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, '#D13A6C'); gr.addColorStop(0.55, '#E05A86'); gr.addColorStop(1, '#8DB04A'); cx.fillStyle = gr; cx.fillRect(0, 0, 4, 64);
    var scaleMat = new T.MeshStandardMaterial({ map: tex(cg), roughness: 0.45, side: T.DoubleSide });
    var dirs = [];
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * TAU + (i % 2) * 0.2, v = i % 2 ? 0.6 : 0.3, s = new T.Mesh(scaleGeo, scaleMat);
      var p = new T.Vector3(Math.cos(a) * Math.cos(-v) * r, Math.sin(-v) * r * 1.25, Math.sin(a) * Math.cos(-v) * r);
      s.position.copy(p); s.lookAt(p.clone().multiplyScalar(2).add(new T.Vector3(0, -0.3, 0))); s.rotateX(Math.PI / 2 - 0.7); g.add(s);
    }
    return shadowy(g);
  }

  function citrusSliceTex(peel, pith, flesh, juice, n){
    var c = canvas(512, 512), g = c.getContext('2d'), R = 256; g.translate(R, R);
    g.fillStyle = peel; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.fillStyle = pith; g.beginPath(); g.arc(0, 0, R * 0.9, 0, TAU); g.fill();
    for (var i = 0; i < n; i++) {
      var a0 = i / n * TAU + 0.035, a1 = (i + 1) / n * TAU - 0.035, gr = g.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 0.84);
      gr.addColorStop(0, juice); gr.addColorStop(0.6, flesh); gr.addColorStop(1, flesh); g.fillStyle = gr;
      g.beginPath(); g.moveTo(Math.cos((a0 + a1) / 2) * R * 0.09, Math.sin((a0 + a1) / 2) * R * 0.09); g.arc(0, 0, R * 0.83, a0, a1); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2;
      for (var k = 0; k < 9; k++) { var a = a0 + (a1 - a0) * Math.random(), r1 = R * rnd(0.25, 0.65); g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * (r1 + 30), Math.sin(a) * (r1 + 30)); g.stroke(); }
    }
    g.fillStyle = pith; g.beginPath(); g.arc(0, 0, R * 0.08, 0, TAU); g.fill();
    return tex(c);
  }
  function slice(faceTex, peelColor, r, th){
    var side = new T.MeshPhysicalMaterial({ color: peelColor, roughness: 0.45, clearcoat: 0.4 });
    var face = new T.MeshPhysicalMaterial({ map: faceTex, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    var m = new T.Mesh(new T.CylinderGeometry(r, r, th, 64), [side, face, face]); m.castShadow = true; return m;
  }

  function lavender(){
    var g = new T.Group();
    var curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.25, 0.02, 0.02), new T.Vector3(0.55, 0.01, -0.02), new T.Vector3(0.85, 0.03, 0)]);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 40, 0.006, 6), new T.MeshStandardMaterial({ color: '#6E7F5E', roughness: 0.75 })));
    var n = 110, im = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshPhysicalMaterial({ color: '#7A5CA8', roughness: 0.6, sheen: 0.8, sheenColor: new T.Color('#D9C6FF') }), n), d = new T.Object3D();
    for (var i = 0; i < n; i++) {
      var t = 0.58 + (i / n) * 0.42, p = curve.getPoint(t), a = i * 2.4, rr = 0.016 * (1 - (t - 0.58) * 0.8);
      d.position.set(p.x, p.y + Math.cos(a) * rr, p.z + Math.sin(a) * rr); d.scale.set(0.022, 0.012, 0.012); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      im.setColorAt(i, new T.Color('#6A4E9A').lerp(new T.Color('#A58BD0'), Math.random()));
    }
    g.add(im); g.position.y = 0.02;
    return shadowy(g);
  }

  function candle(h){
    var g = new T.Group(); h = h || 0.34;
    var wax = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, h, 48), new T.MeshPhysicalMaterial({ color: '#F1E4D0', roughness: 0.5, sheen: 0.5, sheenColor: new T.Color('#FFD9B0') }));
    wax.position.y = h / 2;
    var pool = new T.Mesh(new T.CircleGeometry(0.11, 32), new T.MeshPhysicalMaterial({ color: '#F6E6C8', roughness: 0.1, clearcoat: 1 })); pool.rotation.x = -Math.PI / 2; pool.position.y = h - 0.005;
    var wick = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.05, 6), new T.MeshBasicMaterial({ color: '#2a2018' })); wick.position.y = h + 0.02;
    var flame = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: new T.Color(1, 0.86, 0.58), toneMapped: false }));
    flame.scale.set(0.026, 0.07, 0.026); flame.position.y = h + 0.1;
    var light = new T.PointLight('#FFAA5E', 1.4, 3, 2); light.position.y = h + 0.15;
    var glow = new T.Sprite(new T.SpriteMaterial({ map: radialTex('rgba(255,180,100,.8)', 'rgba(255,160,80,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(0.45, 0.45, 1); glow.position.y = h + 0.1;
    g.add(wax, pool, wick, flame, light, glow); shadowy(wax);
    g.userData.flame = flame; g.userData.light = light; g.userData.h = h;
    return g;
  }

  // горшочек с мелкими белыми цветами, как на референсе
  function flowerPot(){
    var g = new T.Group(), prof = [new T.Vector2(0, 0), new T.Vector2(0.13, 0), new T.Vector2(0.15, 0.02), new T.Vector2(0.18, 0.24), new T.Vector2(0.19, 0.26), new T.Vector2(0.17, 0.26), new T.Vector2(0.16, 0.22)];
    var pot = new T.Mesh(new T.LatheGeometry(prof, 48), new T.MeshPhysicalMaterial({ color: '#E7DCC6', roughness: 0.75, bumpMap: noiseTex('#808080', 30, 3000, 2), bumpScale: 0.5, side: T.DoubleSide }));
    g.add(pot);
    var soil = new T.Mesh(new T.CircleGeometry(0.165, 32), new T.MeshStandardMaterial({ color: '#3B2C20', roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = 0.22; g.add(soil);
    var stemMat = new T.MeshStandardMaterial({ color: '#6F7E52', roughness: 0.7 }), tips = [];
    for (var s = 0; s < 16; s++) {
      var a = rnd(0, TAU), r = rnd(0, 0.1), end = new T.Vector3(Math.cos(a) * rnd(0.08, 0.26), rnd(0.42, 0.62), Math.sin(a) * rnd(0.08, 0.26));
      var curve = new T.CatmullRomCurve3([new T.Vector3(Math.cos(a) * r, 0.22, Math.sin(a) * r), new T.Vector3(end.x * 0.4, 0.36, end.z * 0.4), end]);
      g.add(new T.Mesh(new T.TubeGeometry(curve, 10, 0.004, 4), stemMat)); tips.push(end);
    }
    var n = 420, im = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshPhysicalMaterial({ color: '#F7F3EA', roughness: 0.6, sheen: 0.6, sheenColor: new T.Color('#FFFFFF') }), n), d = new T.Object3D();
    for (var i = 0; i < n; i++) {
      var tp = tips[i % tips.length];
      d.position.set(tp.x + rnd(-0.07, 0.07), tp.y + rnd(-0.05, 0.05), tp.z + rnd(-0.07, 0.07)); d.scale.setScalar(rnd(0.008, 0.014)); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    g.add(im);
    return shadowy(g);
  }

  // ---------- настоящее стекло: экранное преломление ----------
  // Каждый кадр сцена без стекла рисуется в отдельную текстуру; стекло, «ямочки», дно и капли
  // берут из неё картинку со сдвигом по нормали — так они работают как линзы, как у настоящего стакана.
  function studioEnvTexture(){
    // панорама для отражений: тёмная комната, яркое окно за стаканом и два вертикальных «софтбокса» по бокам
    var W = 1024, Hh = 512, c = canvas(W, Hh), g = c.getContext('2d');
    var lg = g.createLinearGradient(0, 0, 0, Hh); lg.addColorStop(0, '#2C2A24'); lg.addColorStop(0.5, '#4A4538'); lg.addColorStop(1, '#2A2118');
    g.fillStyle = lg; g.fillRect(0, 0, W, Hh);
    function soft(x, y, w, h, col, blur){ g.filter = 'blur(' + blur + 'px)'; g.fillStyle = col; g.fillRect(x, y, w, h); g.filter = 'none'; }
    // окно (направление -z = середина панорамы по u=0.5... используем u=0 / 1 как +z)
    soft(W * 0.5 - 150, 120, 300, 190, '#C9BFA8', 14);
    // софтбоксы спереди-слева и спереди-справа (вокруг u≈0.12 и 0.88), дают вертикальные блики на гранях
    soft(W * 0.1, 70, 38, 330, '#FFFFFF', 6); soft(W * 0.86, 90, 30, 300, '#FFF6EA', 6);
    // тёплый стол снизу
    soft(0, Hh * 0.72, W, Hh * 0.28, 'rgba(160,110,60,.55)', 20);
    var t = tex(c); t.mapping = T.EquirectangularReflectionMapping; t.wrapS = T.RepeatWrapping;
    return t;
  }

  var GLASS_VS = [
    'varying vec3 vN; varying vec3 vV; varying vec4 vClip; varying float vY; varying vec3 vWN; varying vec3 vWV;',
    'void main(){',
    '  vec4 lp = vec4(position, 1.0); vec3 ln = normal;',
    '  #ifdef USE_INSTANCING',
    '    lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;',
    '  #endif',
    '  vec4 wp = modelMatrix * lp; vec4 mv = viewMatrix * wp;',
    '  vN = normalize(normalMatrix * ln); vV = -mv.xyz; vY = position.y;',
    '  vWN = normalize(mat3(modelMatrix) * ln); vWV = cameraPosition - wp.xyz;',
    '  vClip = projectionMatrix * mv; gl_Position = vClip;',
    '}'
  ].join('\n');

  var GLASS_FS = [
    'uniform sampler2D tScene; uniform sampler2D tEnv; uniform float strength; uniform float baseY; uniform float baseBoost;',
    'uniform vec3 tint; uniform float absorb; uniform float envGain; uniform float side; uniform float aberr; uniform float alphaOut;',
    'uniform vec3 sunDir; uniform vec3 sunCol;',
    'varying vec3 vN; varying vec3 vV; varying vec4 vClip; varying float vY; varying vec3 vWN; varying vec3 vWV;',
    'vec3 env(vec3 d){ float u = atan(d.x, d.z) / 6.2831853 + 0.5; float v = acos(clamp(d.y, -1.0, 1.0)) / 3.1415926; return texture2D(tEnv, vec2(u, v)).rgb; }',
    'void main(){',
    '  vec3 n = normalize(vN) * side; vec3 v = normalize(vV);',
    '  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);',
    '  float edge = 1.0 - ndv;',
    '  float thick = 1.0 + baseBoost * (1.0 - smoothstep(baseY - 0.03, baseY + 0.01, vY));',
    '  vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;',
    '  vec2 off = n.xy * strength * thick * (0.35 + 1.4 * pow(edge, 1.5));',
    '  float ab = aberr * (0.3 + edge);',
    '  vec3 refr;',
    '  refr.r = texture2D(tScene, uv - off * (1.0 + ab)).r;',
    '  refr.g = texture2D(tScene, uv - off).g;',
    '  refr.b = texture2D(tScene, uv - off * (1.0 - ab)).b;',
    '  // поглощение в толще стекла: края и дно зеленовато темнее',
    '  float path = thick * (1.0 + 3.0 * pow(edge, 2.0));',
    '  refr *= mix(vec3(1.0), tint, clamp(absorb * path, 0.0, 1.0));',
    '  vec3 wn = normalize(vWN) * side; vec3 wv = normalize(vWV);',
    '  vec3 r = reflect(-wv, wn);',
    '  float F = 0.04 + 0.96 * pow(1.0 - clamp(dot(wn, wv) * side * side, 0.0, 1.0), 5.0);',
    '  F = clamp(0.04 + 0.96 * pow(edge, 5.0), 0.0, 1.0);',
    '  vec3 refl = env(r) * envGain;',
    '  vec3 h = normalize(normalize(sunDir) + wv);',
    '  float sp = pow(max(dot(wn, h), 0.0), 220.0) * 3.0;',
    '  vec3 col = mix(refr, refl, F) + refl * 0.035 + sunCol * sp;',
    '  gl_FragColor = vec4(col, alphaOut);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');

  function GlassKit(renderer){
    var rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, colorSpace: T.LinearSRGBColorSpace, samples: 4 });
    var envTex = studioEnvTexture();
    function make(opts){
      return new T.ShaderMaterial({
        uniforms: {
          tScene: { value: rt.texture }, tEnv: { value: envTex },
          strength: { value: opts.strength }, baseY: { value: opts.baseY || -1 }, baseBoost: { value: opts.baseBoost || 0 },
          tint: { value: new T.Color(opts.tint || '#8FB8AE') }, absorb: { value: opts.absorb == null ? 0.12 : opts.absorb },
          envGain: { value: opts.envGain || 1 }, side: { value: opts.side || 1 }, aberr: { value: opts.aberr == null ? 0.06 : opts.aberr },
          alphaOut: { value: opts.alpha == null ? 1 : opts.alpha },
          sunDir: { value: new T.Vector3(-0.3, 0.5, 0.8) }, sunCol: { value: new T.Color('#FFF6E8') }
        },
        vertexShader: GLASS_VS, fragmentShader: GLASS_FS,
        side: opts.faces || T.FrontSide, transparent: true, depthWrite: false,
        blending: opts.additive ? T.AdditiveBlending : T.NormalBlending
      });
    }
    return {
      rt: rt, make: make,
      setSize: function(w, h, pr){ rt.setSize(Math.max(4, Math.round(w * pr)), Math.max(4, Math.round(h * pr))); }
    };
  }

  // ---------- детальные фрукты и овощи ----------
  var MAT = {};
  function peelBump(freq, n){
    var key = 'pb' + freq + n; if (MAT[key]) return MAT[key];
    var c = canvas(1024, 1024), g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 1024);
    for (var i = 0; i < n; i++) {
      var x = Math.random() * 1024, y = Math.random() * 1024, r = rnd(freq * 0.6, freq * 1.3), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(40,40,40,.9)'); gr.addColorStop(0.7, 'rgba(110,110,110,.4)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    var t = tex(c, false); t.wrapS = t.wrapT = T.RepeatWrapping; return (MAT[key] = t);
  }

  // половинка цитруса: кожура с порами, белая подложка, дольки с сочными «мешочками» и рельефом
  function citrusHalf(o){
    var key = 'ch' + o.peel;
    if (!MAT[key]) {
      var S = 1024, c = canvas(S, S), g = c.getContext('2d'), b = canvas(S, S), bg = b.getContext('2d'), R = S / 2;
      g.translate(R, R); bg.translate(R, R);
      g.fillStyle = o.peel; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.fillStyle = o.pith; g.beginPath(); g.arc(0, 0, R * 0.93, 0, TAU); g.fill();
      bg.fillStyle = '#9a9a9a'; bg.fillRect(-R, -R, S, S);
      var n = o.seg;
      for (var i = 0; i < n; i++) {
        var a0 = i / n * TAU + 0.022, a1 = (i + 1) / n * TAU - 0.022, am = (a0 + a1) / 2;
        var gr = g.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 0.86);
        gr.addColorStop(0, o.juice); gr.addColorStop(0.45, o.flesh); gr.addColorStop(1, o.flesh2);
        g.fillStyle = gr; g.beginPath(); g.moveTo(Math.cos(am) * R * 0.08, Math.sin(am) * R * 0.08); g.arc(0, 0, R * 0.86, a0, a1); g.closePath(); g.fill();
        bg.fillStyle = '#7a7a7a'; bg.beginPath(); bg.moveTo(0, 0); bg.arc(0, 0, R * 0.86, a0, a1); bg.closePath(); bg.fill();
        // сочные капсулы: вытянутые блики вдоль радиуса
        for (var k = 0; k < 140; k++) {
          var a = rnd(a0 + 0.02, a1 - 0.02), rr = R * rnd(0.12, 0.82), L = rnd(10, 26), w = rnd(3, 6);
          g.save(); g.translate(Math.cos(a) * rr, Math.sin(a) * rr); g.rotate(a);
          g.fillStyle = 'rgba(255,255,255,' + rnd(0.08, 0.28) + ')'; g.beginPath(); g.ellipse(0, 0, L, w, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(120,40,0,' + rnd(0.04, 0.12) + ')'; g.beginPath(); g.ellipse(0, w * 0.9, L, w * 0.5, 0, 0, TAU); g.fill();
          g.restore();
          bg.save(); bg.translate(Math.cos(a) * rr, Math.sin(a) * rr); bg.rotate(a);
          bg.fillStyle = 'rgba(200,200,200,.5)'; bg.beginPath(); bg.ellipse(0, 0, L, w, 0, 0, TAU); bg.fill(); bg.restore();
        }
        if (o.seeds && i % 3 === 0) { g.fillStyle = '#F6E7B8'; g.beginPath(); g.ellipse(Math.cos(am) * R * 0.3, Math.sin(am) * R * 0.3, 14, 7, am, 0, TAU); g.fill(); }
      }
      g.fillStyle = o.pith; g.beginPath(); g.arc(0, 0, R * 0.07, 0, TAU); g.fill();
      MAT[key] = { map: tex(c), bump: tex(b, false) };
    }
    var grp = new T.Group(), r = o.r;
    var peelGeo = displace(new T.SphereGeometry(r, 96, 48, 0, TAU, Math.PI / 2, Math.PI / 2), r * 0.012, 22 / r * 0.1, 3);
    peelGeo.scale(1, o.squash || 1, 1);
    var bump = peelBump(3, 9000); bump.repeat.set(3, 3);
    var dome = new T.Mesh(peelGeo, new T.MeshPhysicalMaterial({ color: o.peel, roughness: 0.48, bumpMap: bump, bumpScale: 1.2, clearcoat: 0.45, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new T.Color('#FFE0B0') }));
    var face = new T.Mesh(new T.CircleGeometry(r * 0.998, 96), new T.MeshPhysicalMaterial({ map: MAT[key].map, bumpMap: MAT[key].bump, bumpScale: 1.6, color: '#E8DCD0', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }));
    face.rotation.x = -Math.PI / 2; face.position.y = 0.0015;
    grp.add(dome, face);
    return shadowy(grp);
  }

  function apple(){
    var prof = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40, a = t * Math.PI, rr = Math.sin(a) * (0.165 + 0.02 * Math.sin(a * 2 - 0.6)), y = 0.17 - Math.cos(a) * 0.16;
      if (t < 0.12) y += (0.12 - t) * 0.35; if (t > 0.9) y -= (t - 0.9) * 0.45;
      prof.push(new T.Vector2(Math.max(0.002, rr), y));
    }
    var geo = new T.LatheGeometry(prof, 96); displace(geo, 0.008, 6, 2);
    var c = canvas(512, 512), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 512);
    lg.addColorStop(0, '#E6C24A'); lg.addColorStop(0.25, '#C2261C'); lg.addColorStop(0.8, '#9E1414'); lg.addColorStop(1, '#D4A93A'); g.fillStyle = lg; g.fillRect(0, 0, 512, 512);
    for (var k = 0; k < 220; k++) { g.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '120,10,10' : '240,170,60') + ',' + rnd(0.1, 0.3) + ')'; g.lineWidth = rnd(1, 4); var x = Math.random() * 512; g.beginPath(); g.moveTo(x, rnd(30, 120)); g.lineTo(x + rnd(-8, 8), rnd(300, 500)); g.stroke(); }
    for (var d = 0; d < 400; d++) { g.fillStyle = 'rgba(255,230,170,' + rnd(0.2, 0.5) + ')'; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, rnd(0.8, 1.8), 0, TAU); g.fill(); }
    var t2 = tex(c); t2.wrapS = T.RepeatWrapping;
    var body = new T.Mesh(geo, new T.MeshPhysicalMaterial({ map: t2, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    var stem = new T.Mesh(new T.CylinderGeometry(0.006, 0.009, 0.08, 8), new T.MeshStandardMaterial({ color: '#5A3E22', roughness: 0.8 }));
    stem.position.set(0.006, 0.34, 0); stem.rotation.z = -0.25;
    var g2 = new T.Group(); g2.add(body, stem);
    return shadowy(g2);
  }

  function broccoliHQ(){
    var g = new T.Group();
    var stemMat = new T.MeshPhysicalMaterial({ color: '#9DBB70', roughness: 0.5, sheen: 0.5, sheenColor: new T.Color('#E2F2C0') });
    var stem = new T.Mesh(displace(new T.CylinderGeometry(0.045, 0.06, 0.3, 24, 6), 0.005, 18, 1), stemMat); stem.position.y = 0.15; g.add(stem);
    var cut = new T.Mesh(new T.CircleGeometry(0.06, 24), new T.MeshStandardMaterial({ color: '#D5E2AE', roughness: 0.7 })); cut.rotation.x = Math.PI / 2; g.add(cut);
    var budGeo = new T.IcosahedronGeometry(1, 1), budMat = new T.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.62, sheen: 0.8, sheenColor: new T.Color('#9CC08A') });
    var florets = 15, per = 150, im = new T.InstancedMesh(budGeo, budMat, florets * per), d = new T.Object3D(), idx = 0;
    var dark = new T.Color('#21471F'), light = new T.Color('#4F7E3B'), blue = new T.Color('#2E5A4A');
    for (var f = 0; f < florets; f++) {
      var fa = f * 2.4, fr = f === 0 ? 0 : 0.05 + 0.1 * Math.sqrt(f / florets), cx = Math.cos(fa) * fr, cz = Math.sin(fa) * fr, cy = 0.35 + (0.15 - fr) * 0.6, R = rnd(0.055, 0.075);
      var br = new T.Mesh(new T.CylinderGeometry(0.012, 0.02, 0.15, 8), stemMat); br.position.set(cx * 0.5, 0.29, cz * 0.5); br.lookAt(cx, cy + 0.2, cz); br.rotateX(Math.PI / 2); g.add(br);
      for (var k = 0; k < per; k++) {
        // гроздь в гроздьях: маленькие бутоны группами
        var u = Math.random() * TAU, v = Math.acos(rnd(0.05, 1)), rr = R * (0.92 + 0.08 * Math.random());
        d.position.set(cx + Math.sin(v) * Math.cos(u) * rr, cy + Math.cos(v) * rr * 0.75, cz + Math.sin(v) * Math.sin(u) * rr);
        d.scale.setScalar(rnd(0.006, 0.011)); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.updateMatrix(); im.setMatrixAt(idx, d.matrix);
        im.setColorAt(idx, dark.clone().lerp(Math.random() < 0.2 ? blue : light, Math.random() * 0.8)); idx++;
      }
    }
    g.add(im);
    return shadowy(g);
  }

  function carrotHQ(len){
    var g = new T.Group(), prof = [];
    for (var i = 0; i <= 40; i++) { var t = i / 40, r = 0.06 * Math.pow(1 - t, 0.7) + 0.0015; if (t < 0.04) r *= 0.7 + t * 7.5; prof.push(new T.Vector2(r, len * (1 - t))); }
    prof.reverse();
    var c = canvas(256, 1024), cg = c.getContext('2d'), lg = cg.createLinearGradient(0, 0, 0, 1024);
    lg.addColorStop(0, '#C7520E'); lg.addColorStop(0.15, '#EB7419'); lg.addColorStop(1, '#E06612'); cg.fillStyle = lg; cg.fillRect(0, 0, 256, 1024);
    for (var k = 0; k < 160; k++) { var y = Math.random() * 1024; cg.strokeStyle = 'rgba(140,55,8,' + rnd(0.2, 0.55) + ')'; cg.lineWidth = rnd(1, 3); cg.beginPath(); cg.moveTo(rnd(0, 120), y); cg.quadraticCurveTo(128, y + rnd(-4, 4), rnd(140, 256), y + rnd(-3, 3)); cg.stroke(); }
    for (var s = 0; s < 400; s++) { cg.fillStyle = 'rgba(255,190,120,' + rnd(0.1, 0.3) + ')'; cg.fillRect(Math.random() * 256, Math.random() * 1024, rnd(1, 4), rnd(4, 14)); }
    var geo = new T.LatheGeometry(prof, 48); displace(geo, 0.008, 14, len * 9);
    var body = new T.Mesh(geo, new T.MeshPhysicalMaterial({ map: tex(c), bumpMap: tex(c, false), bumpScale: 1.5, roughness: 0.5, clearcoat: 0.3, sheen: 0.4, sheenColor: new T.Color('#FFC090') }));
    body.rotation.z = Math.PI / 2; g.add(body);
    var top = new T.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.6, side: T.DoubleSide });
    var stub = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.03, 16), new T.MeshStandardMaterial({ color: '#6E8B3D', roughness: 0.7 })); stub.rotation.z = Math.PI / 2; stub.position.x = -len - 0.01; g.add(stub);
    for (var sI = 0; sI < 7; sI++) {
      var a = (sI - 3) * 0.16, curve = new T.CatmullRomCurve3([new T.Vector3(-len - 0.02, 0, 0), new T.Vector3(-len - 0.14, 0.03, a * 0.3), new T.Vector3(-len - 0.3, 0.015, a * 0.85), new T.Vector3(-len - 0.46, -0.01, a * 1.5)]);
      g.add(new T.Mesh(new T.TubeGeometry(curve, 24, 0.005, 6), top));
      for (var fI = 0; fI < 12; fI++) {
        var p = curve.getPoint(0.3 + fI * 0.058), leaf = new T.Mesh(new T.CircleGeometry(0.024, 6), top);
        leaf.scale.set(1, 0.4, 1); leaf.position.copy(p); leaf.rotation.set(-Math.PI / 2 + rnd(-0.5, 0.5), 0, rnd(0, 3)); g.add(leaf);
      }
    }
    return shadowy(g);
  }

  // камни для «дзен»-пирамидки, как на коробке Restorate
  function pebbleStack(){
    var g = new T.Group(), y = 0, sizes = [[0.25, 0.085], [0.21, 0.075], [0.17, 0.065], [0.12, 0.055]];
    var c = canvas(512, 512), cg = c.getContext('2d'); cg.fillStyle = '#9A8C7C'; cg.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 6000; i++) { var l = rnd(-40, 40); cg.fillStyle = 'rgba(' + Math.round(150 + l) + ',' + Math.round(138 + l) + ',' + Math.round(124 + l) + ',.6)'; cg.fillRect(Math.random() * 512, Math.random() * 512, rnd(1, 3), rnd(1, 3)); }
    for (var j = 0; j < 30; j++) { cg.strokeStyle = 'rgba(90,75,60,.25)'; cg.lineWidth = rnd(1, 3); cg.beginPath(); cg.moveTo(Math.random() * 512, Math.random() * 512); cg.lineTo(Math.random() * 512, Math.random() * 512); cg.stroke(); }
    var stoneTex = tex(c); stoneTex.wrapS = stoneTex.wrapT = T.RepeatWrapping;
    var tints = ['#E2D2BC', '#CDB89E', '#EADCC6', '#BFAA92'];
    sizes.forEach(function(s, i){
      var geo = displace(new T.SphereGeometry(1, 64, 32), 0.06, 1.3, i * 5); geo.scale(s[0], s[1], s[0] * rnd(0.85, 1));
      var m = new T.Mesh(geo, new T.MeshPhysicalMaterial({ map: stoneTex, color: tints[i], roughness: 0.62, bumpMap: stoneTex, bumpScale: 0.8, clearcoat: 0.15 }));
      y += s[1] * (i ? 0.9 : 1); m.position.set(rnd(-0.015, 0.015), y, rnd(-0.015, 0.015)); m.rotation.y = rnd(0, 3); m.rotation.z = rnd(-0.06, 0.06); y += s[1] * 0.9;
      g.add(m);
    });
    return shadowy(g);
  }

  function teaLight(){
    var g = new T.Group();
    var cup = new T.Mesh(new T.CylinderGeometry(0.11, 0.105, 0.06, 64, 1, true), new T.MeshPhysicalMaterial({ color: '#D8D8D4', metalness: 1, roughness: 0.25, side: T.DoubleSide }));
    cup.position.y = 0.03; g.add(cup);
    var wax = new T.Mesh(new T.CylinderGeometry(0.104, 0.104, 0.05, 64), new T.MeshPhysicalMaterial({ color: '#F5EEE2', roughness: 0.35, sheen: 0.6, sheenColor: new T.Color('#FFE2B8'), clearcoat: 0.6 }));
    wax.position.y = 0.026; g.add(wax);
    var wick = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.04, 6), new T.MeshBasicMaterial({ color: '#2a2018' })); wick.position.y = 0.065; g.add(wick);
    var flame = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: new T.Color(1, 0.86, 0.58), toneMapped: false }));
    flame.scale.set(0.022, 0.06, 0.022); flame.position.y = 0.13;
    var light = new T.PointLight('#FFAA5E', 1.2, 2.5, 2); light.position.y = 0.18;
    var glow = new T.Sprite(new T.SpriteMaterial({ map: radialTex('rgba(255,180,100,.85)', 'rgba(255,160,80,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(0.4, 0.4, 1); glow.position.y = 0.13;
    g.add(flame, light, glow); shadowy(cup); shadowy(wax);
    g.userData.flame = flame; g.userData.light = light; g.userData.fs = [0.022, 0.06];
    return g;
  }

  // плод опунции (кактусовая груша), как на коробке Restorate Exotic
  function pricklyPear(half){
    var grp = new T.Group(), geo = new T.SphereGeometry(0.1, 64, 48, 0, TAU, half ? Math.PI / 2 : 0, half ? Math.PI / 2 : Math.PI);
    var pos = geo.attributes.position, v = new T.Vector3();
    for (var i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); var h = v.y / 0.1; v.x *= 1 + 0.12 * h; v.z *= 1 + 0.12 * h; v.y *= 1.45; pos.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    var c = canvas(512, 512), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 512);
    lg.addColorStop(0, '#C8203A'); lg.addColorStop(0.45, '#E2463A'); lg.addColorStop(0.8, '#B9A23C'); lg.addColorStop(1, '#6F9A3A'); g.fillStyle = lg; g.fillRect(0, 0, 512, 512);
    for (var k = 0; k < 90; k++) { var x = Math.random() * 512, y = Math.random() * 480 + 16; g.fillStyle = 'rgba(80,60,20,.7)'; g.beginPath(); g.arc(x, y, rnd(3, 5), 0, TAU); g.fill(); g.fillStyle = 'rgba(240,220,170,.8)'; g.beginPath(); g.arc(x, y, rnd(1.2, 2), 0, TAU); g.fill(); }
    var skin = new T.Mesh(geo, new T.MeshPhysicalMaterial({ map: tex(c), roughness: 0.5, clearcoat: 0.3, bumpMap: peelBump(2, 3000), bumpScale: 0.6 }));
    grp.add(skin);
    if (half) {
      var fc = canvas(512, 512), fg = fc.getContext('2d'); fg.translate(256, 256);
      var rg = fg.createRadialGradient(0, 0, 10, 0, 0, 256); rg.addColorStop(0, '#E8306A'); rg.addColorStop(0.85, '#C8124E'); rg.addColorStop(0.93, '#E8C46A'); rg.addColorStop(1, '#C8203A');
      fg.fillStyle = rg; fg.beginPath(); fg.arc(0, 0, 256, 0, TAU); fg.fill();
      for (var s = 0; s < 260; s++) { var a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 200; fg.fillStyle = 'rgba(40,20,20,.85)'; fg.beginPath(); fg.ellipse(Math.cos(a) * r, Math.sin(a) * r, rnd(4, 6), rnd(3, 4), a, 0, TAU); fg.fill(); }
      var face = new T.Mesh(new T.CircleGeometry(0.1, 64), new T.MeshPhysicalMaterial({ map: tex(fc), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }));
      face.rotation.x = -Math.PI / 2; face.position.y = 0.001; grp.add(face);
    } else { skin.position.y = 0.145; }
    return shadowy(grp);
  }

  function bambooSprig(){
    var g = new T.Group(), stemMat = new T.MeshPhysicalMaterial({ color: '#9BB45A', roughness: 0.4, clearcoat: 0.4 });
    var stem = new T.Mesh(new T.CylinderGeometry(0.008, 0.01, 0.9, 10), stemMat); stem.rotation.z = Math.PI / 2; stem.position.y = 0.012; g.add(stem);
    for (var n = -2; n <= 2; n++) { var node = new T.Mesh(new T.TorusGeometry(0.0095, 0.003, 6, 16), stemMat); node.rotation.y = Math.PI / 2; node.position.set(n * 0.18, 0.012, 0); g.add(node); }
    var sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.035, 0.12, 0, 0.32); sh.quadraticCurveTo(-0.035, 0.12, 0, 0);
    var lgeo = new T.ShapeGeometry(sh, 12), lp = lgeo.attributes.position;
    for (var i = 0; i < lp.count; i++) { var y = lp.getY(i); lp.setZ(i, y * y * 0.6 + Math.abs(lp.getX(i)) * 0.3); }
    lgeo.computeVertexNormals();
    var lmat = new T.MeshPhysicalMaterial({ map: leafTex('#6E9A3A', '#8DB65A'), roughness: 0.45, side: T.DoubleSide, sheen: 0.5, sheenColor: new T.Color('#D8F0A0') });
    for (var k = 0; k < 7; k++) {
      var l = new T.Mesh(lgeo, lmat); l.position.set(0.28 + rnd(-0.05, 0.12), 0.02, rnd(-0.02, 0.02));
      l.rotation.set(-Math.PI / 2 + rnd(0.05, 0.25), 0, -0.7 + k * 0.22 + rnd(-0.1, 0.1)); g.add(l);
    }
    return shadowy(g);
  }

  // ---------- упаковки ----------
  var loader = null, texCache = {};
  function loadTex(src, srgb){
    if (texCache[src]) return texCache[src];
    loader = loader || new T.TextureLoader();
    var t = loader.load(src); if (srgb !== false) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    return (texCache[src] = t);
  }

  function activizeTin(){
    var g = new T.Group(), R = 0.33, Hb = 0.86;
    var label = loadTex('img/tex-activize-label.jpg');
    var body = new T.Mesh(new T.CylinderGeometry(R, R, Hb, 160, 1, true), new T.MeshPhysicalMaterial({ map: label, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.18 }));
    body.position.y = 0.035 + Hb / 2; body.rotation.y = Math.PI; g.add(body);
    var metal = new T.MeshPhysicalMaterial({ color: '#C92A2E', metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
    var lid = new T.Mesh(new T.CylinderGeometry(R + 0.012, R + 0.012, 0.075, 160), metal); lid.position.y = 0.035 + Hb + 0.03; g.add(lid);
    var lidTop = new T.Mesh(new T.CylinderGeometry(R - 0.02, R - 0.02, 0.01, 120), new T.MeshPhysicalMaterial({ color: '#B82226', metalness: 0.3, roughness: 0.3, clearcoat: 1 }));
    lidTop.position.y = 0.035 + Hb + 0.07; g.add(lidTop);
    var ring = new T.Mesh(new T.TorusGeometry(R + 0.006, 0.012, 16, 160), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.035 + Hb + 0.068; g.add(ring);
    var bottom = new T.Mesh(new T.CylinderGeometry(R + 0.006, R + 0.002, 0.035, 160), new T.MeshPhysicalMaterial({ color: '#BDBDB8', metalness: 0.95, roughness: 0.28 })); bottom.position.y = 0.0175; g.add(bottom);
    return shadowy(g);
  }
  function box(front, w, h, d, sideColor, topColor){
    var side = new T.MeshPhysicalMaterial({ color: sideColor, roughness: 0.55, clearcoat: 0.2 });
    var top = new T.MeshPhysicalMaterial({ color: topColor || sideColor, roughness: 0.55, clearcoat: 0.2 });
    var face = new T.MeshPhysicalMaterial({ map: loadTex(front), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.25 });
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), [side, side, top, side, face, side]);
    m.position.y = h / 2;
    var g = new T.Group(); g.add(m); return shadowy(g);
  }

  // капли конденсата на стекле
  var DROP_MAT = null;
  function droplets(count, maxY){
    var im = new T.InstancedMesh(new T.SphereGeometry(1, 16, 10), DROP_MAT, count);
    var d = new T.Object3D(), placed = 0, guard = 0;
    while (placed < count && guard++ < count * 6) {
      var phi = rnd(-Math.PI, Math.PI), y = rnd(BASE + 0.04, maxY);
      var inLogo = Math.abs(phi) < LOGO_SPAN * 0.42 && Math.abs(y - LOGO_Y) < LOGO_H * 0.42;
      if (inLogo && Math.random() < 0.7) continue;
      var r = rOut(y) - dimple(phi, y) + 0.001, s = Math.pow(Math.random(), 2.2) * 0.011 + 0.0025;
      d.position.set(r * Math.sin(phi), y, r * Math.cos(phi));
      d.lookAt(d.position.x * 2, y, d.position.z * 2);
      d.scale.set(s, s * rnd(1.1, 1.5), s * 0.42); d.updateMatrix(); im.setMatrixAt(placed++, d.matrix);
    }
    im.count = placed; im.renderOrder = 6;
    return im;
  }

  function foamCap(color){
    var geo = new T.CircleGeometry(rIn(FILL) - 0.006, 96);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), rr = Math.sqrt(x * x + y * y) / (rIn(FILL));
      pos.setZ(i, (1 - rr * rr) * 0.02 + vnoise(x * 40, y * 40, 1) * 0.008);
    }
    geo.computeVertexNormals();
    var m = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color: color, roughness: 0.85, bumpMap: noiseTex('#808080', 60, 6000, 3), bumpScale: 1.5, sheen: 0.6, sheenColor: new T.Color('#FFE6C0') }));
    m.rotation.x = -Math.PI / 2; m.position.y = FILL + 0.012;
    return m;
  }

  // ---------- сцена ----------
  function Scene(canvasEl){
    var self = this;
    var renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;

    var scene = new T.Scene();
    scene.background = new T.Color('#3E3A31');
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.34;

    var camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
    var controls = new T.OrbitControls(camera, canvasEl);
    controls.enableDamping = true; controls.dampingFactor = 0.07; controls.enablePan = false;
    controls.minDistance = 2.4; controls.maxDistance = 9;
    controls.minPolarAngle = 0.6; controls.maxPolarAngle = 1.48;
    controls.minAzimuthAngle = -0.9; controls.maxAzimuthAngle = 0.9;

    // стол
    var table = new T.Mesh(new T.RoundedBoxGeometry(7, 0.16, 4.2, 4, 0.035), new T.MeshPhysicalMaterial({ map: woodTex(), roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.45, bumpMap: noiseTex('#808080', 20, 2000, 6), bumpScale: 0.15 }));
    table.position.set(0, -0.08, 0); table.receiveShadow = true; scene.add(table);

    // стена и окно
    var wallMat = new T.MeshStandardMaterial({ color: '#6E6756', roughness: 0.95, bumpMap: plasterTex(), bumpScale: 0.6 });
    var WZ = -2.2, WX = 2.05, WY0 = 0.42, WY1 = 3.05, WD = 0.34;
    function wbox(w, h, d, x, y, z, mat){ var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; }
    wbox(6, 9, WD, -WX - 3, 2.5, WZ, wallMat); wbox(6, 9, WD, WX + 3, 2.5, WZ, wallMat);
    wbox(WX * 2, 3, WD, 0, WY0 - 1.5, WZ, wallMat); wbox(WX * 2, 5, WD, 0, WY1 + 2.5, WZ, wallMat);
    var frameMat = new T.MeshPhysicalMaterial({ map: woodTex(), color: '#A87A52', roughness: 0.6, clearcoat: 0.2 });
    var FT = 0.11, FZ = WZ - 0.02;
    wbox(WX * 2 + FT, FT, 0.2, 0, WY0 + FT / 2, FZ, frameMat); wbox(WX * 2 + FT, FT, 0.2, 0, WY1 - FT / 2, FZ, frameMat);
    wbox(FT, WY1 - WY0, 0.2, -WX + FT / 2, (WY0 + WY1) / 2, FZ, frameMat); wbox(FT, WY1 - WY0, 0.2, WX - FT / 2, (WY0 + WY1) / 2, FZ, frameMat);
    wbox(0.12, WY1 - WY0, 0.18, 0, (WY0 + WY1) / 2, FZ, frameMat);
    wbox(WX * 2 + 0.3, 0.07, 0.42, 0, WY0 - 0.02, WZ + 0.1, frameMat);

    var skyMat = new T.MeshBasicMaterial({ color: new T.Color(1, 1, 1).multiplyScalar(1.25) });
    var sky = new T.Mesh(new T.PlaneGeometry(22, 12.4), skyMat); sky.position.set(-0.5, 2.6, -8.5); scene.add(sky);
    var haloC = canvas(512, 512), hgx = haloC.getContext('2d');
    hgx.filter = 'blur(60px)'; hgx.fillStyle = '#FFFFFF'; hgx.fillRect(100, 110, 312, 292); hgx.filter = 'none';
    var haloMat = new T.MeshBasicMaterial({ map: tex(haloC), transparent: true, opacity: 0.14, blending: T.AdditiveBlending, depthWrite: false, color: '#FFE8C8' });
    var halo = new T.Mesh(new T.PlaneGeometry(WX * 2 * 1.6, (WY1 - WY0) * 1.6), haloMat); halo.position.set(0, (WY0 + WY1) / 2, WZ + 0.3); scene.add(halo);

    // свет
    var sun = new T.DirectionalLight('#FFE2B8', 3.4);
    sun.position.set(-3.0, 4.2, -9); sun.target.position.set(0.4, 0, 0.8);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 2; sc.far = 20;
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    var hemi = new T.HemisphereLight('#E6DCCB', '#5A4A38', 0.45); scene.add(hemi);
    var fill = new T.DirectionalLight('#F3E3D0', 0.4); fill.position.set(1.8, 3, 5); scene.add(fill);
    // контровой свет за стаканом и боковые «софтбоксы» для бликов на гранях
    var rim = new T.SpotLight('#FFF1DC', 16, 9, 0.42, 0.8, 1.6); rim.position.set(0.4, 2.4, -1.7); rim.target.position.set(0, 0.8, 0); scene.add(rim, rim.target);
    var keyL = new T.PointLight('#FFF4E6', 2.2, 6, 2); keyL.position.set(-1.6, 1.6, 1.4); scene.add(keyL);
    var keyR = new T.PointLight('#FFE9D2', 1.4, 6, 2); keyR.position.set(1.7, 1.3, 1.6); scene.add(keyR);

    // ---- стакан: настоящее преломление ----
    var kit = GlassKit(renderer);
    var gGeo = glassGeometry();
    var cup = new T.Group();
    // задняя стенка: видна сквозь пустую часть стакана — только блики и кромка
    var gBack = new T.Mesh(gGeo, kit.make({ strength: 0.012, faces: T.BackSide, side: -1, additive: true, tint: '#000000', absorb: 1, envGain: 0.18, aberr: 0 }));
    // передняя стенка и толстое дно: преломляют всё, что за ними
    var gFront = new T.Mesh(gGeo, kit.make({ strength: 0.03, baseY: BASE, baseBoost: 2.6, tint: '#86B4A6', absorb: 0.1, envGain: 1.05, aberr: 0.08 }));
    gFront.renderOrder = 8; gBack.renderOrder = 9;
    var logoTexture = loadTex('img/fitline-logo.png');
    var logo = new T.Mesh(logoGeometry(), new T.MeshPhysicalMaterial({ map: logoTexture, emissiveMap: logoTexture, emissive: new T.Color('#FFFFFF'), emissiveIntensity: 0.1,
      transparent: true, roughness: 0.42, clearcoat: 0.5, depthWrite: false, alphaTest: 0.02 }));
    logo.renderOrder = 10;
    cup.add(gFront, gBack, logo);
    scene.add(cup);
    var glassOnly = [gFront, gBack, logo];
    DROP_MAT = kit.make({ strength: 0.022, absorb: 0.05, envGain: 1.4, aberr: 0.02 });

    var contact = new T.Mesh(new T.PlaneGeometry(1.2, 1.2), new T.MeshBasicMaterial({ map: radialTex('rgba(40,25,15,.65)', 'rgba(40,25,15,0)'), transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; scene.add(contact);
    var causticMat = new T.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.35 });
    var caustic = new T.Mesh(new T.PlaneGeometry(1, 1), causticMat);
    caustic.rotation.x = -Math.PI / 2; caustic.position.set(0.18, 0.004, 0.85); caustic.scale.set(0.7, 1.3, 1); scene.add(caustic);

    // пылинки
    var dir = sun.target.position.clone().sub(sun.position).normalize();
    var dustN = 160, dustPos = new Float32Array(dustN * 3), dustSeed = [];
    for (var di = 0; di < dustN; di++) dustSeed.push({ t: Math.random(), x: rnd(-1.8, 1.8), s: rnd(0.2, 1), p: Math.random() * 6 });
    var dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    var dust = new T.Points(dustGeo, new T.PointsMaterial({ map: radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), size: 0.026, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending, color: '#FFF0D8' }));
    dust.renderOrder = 10; scene.add(dust);
    function moveDust(t){
      for (var i = 0; i < dustN; i++) {
        var q = dustSeed[i], k = (q.t + t * 0.004 * q.s) % 1, y = 2.8 * (1 - k) + 0.1;
        var P = new T.Vector3(q.x, y, WZ + 0.1).addScaledVector(dir, (3 - y) * 0.15 + 0.4 + Math.sin(t * 0.3 + q.p) * 0.25);
        dustPos[i * 3] = P.x + Math.sin(t * 0.5 + q.p) * 0.05; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = P.z + 1.2 * q.s;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }
    moveDust(0);

    var pot = flowerPot(); pot.position.set(-1.45, 0, -1.1); pot.scale.setScalar(1.1); scene.add(pot);

    // ---- наборы для каждого напитка: строим один раз, дальше только переключаем ----
    var groups = {}, cur = null;
    function build(key){
      if (groups[key]) return groups[key];
      var D = DRINKS[key], G = new T.Group(); G.visible = false;
      var L = D.liquid;
      var liquid = new T.Mesh(liquidGeometry(FILL), new T.MeshPhysicalMaterial({
        color: L.color, transmission: L.trans, roughness: L.rough, thickness: 0.8, ior: 1.34,
        attenuationColor: new T.Color(L.att), attenuationDistance: L.dist, emissive: new T.Color(L.glow), emissiveIntensity: L.gi,
        specularIntensity: 1, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: 0.04 }));
      liquid.renderOrder = 1; G.add(liquid);
      if (D.foam) G.add(foamCap('#FFD9A8'));
      var bub = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5, roughness: 0, envMapIntensity: 2.5, depthWrite: false }), D.bubbles);
      bub.renderOrder = 4; bub.userData.data = [];
      for (var i = 0; i < D.bubbles; i++) bub.userData.data.push({ a: Math.random() * TAU, r: Math.random(), y: BASE + Math.random() * (FILL - BASE), v: rnd(0.035, 0.11), s: rnd(0.003, 0.009) });
      G.add(bub); G.userData.bubbles = bub;
      var dr = droplets(key === 'restorate' ? 160 : 340, FILL - 0.02); G.add(dr); G.userData.drops = dr;

      function place(o, x, y, z, rx, ry, rz, s){ o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); if (s) o.scale.setScalar(s); G.add(o); return o; }
      if (D.pack === 'tin') {
        place(activizeTin(), 1.0, 0, -0.4, 0, -0.42, 0);
        place(blackberry(), 0.35, 0.09, 0.95, 0.2, 1, 1.4); place(blackberry(), 0.52, 0.09, 1.15, 1.3, 0, 1.6); place(blackberry(), 0.2, 0.09, 1.25, -0.4, 2, 1.5);
        place(raspberry(), -0.5, 0.085, 1.0, 0.3, 0, 1.6); place(raspberry(), -0.32, 0.085, 1.22, -0.2, 1, 1.5);
        place(mintSprig(1.0), -0.95, 0.02, 0.55, 0, 0.9, 0);
        place(ginger(), -1.15, 0, -0.25, 0, 0.4, 0, 0.9);
      }
      if (D.pack === 'basics') {
        place(box('img/tex-basics-front.jpg', 0.62, 0.78, 0.22, '#D9CF8A', '#E6DCA8'), 1.02, 0, -0.42, 0, -0.42, 0);
        place(citrusHalf({ r: 0.17, peel: '#F08A1C', pith: '#FFF0D2', flesh: '#F98A12', flesh2: '#E8700A', juice: '#FFC060', seg: 11, seeds: true }), 0.5, 0.17, 0.95, 0, 0.4, 0);
        place(citrusHalf({ r: 0.17, peel: '#F08A1C', pith: '#FFF0D2', flesh: '#F98A12', flesh2: '#E8700A', juice: '#FFC060', seg: 11 }), 0.82, 0.17, 0.55, -1.25, 0.3, 0);
        place(carrotHQ(0.62), -0.55, 0.06, 0.95, 0, -0.18, 0);
        place(cherryTomatoes(), -0.05, 0, 1.25, 0, -0.3, 0);
        place(broccoliHQ(), -1.05, 0.06, 0.2, 0, 0.6, Math.PI / 2 - 0.05, 0.95);
        place(apple(), -0.75, 0, -0.35, 0, 0.8, 0);
      }
      if (D.pack === 'restorate') {
        place(box('img/tex-restorate-front.jpg', 0.86, 0.68, 0.32, '#C3D1B3', '#D1BBAE'), 1.08, 0, -0.45, 0, -0.42, 0);
        place(pebbleStack(), -0.95, 0, -0.1, 0, 0.3, 0);
        place(teaLight(), -0.45, 0, 0.6); place(teaLight(), -0.72, 0, 0.92, 0, 0, 0, 0.85);
        place(pricklyPear(true), 0.45, 0.145, 1.0, 0, 0.5, 0); place(pricklyPear(false), 0.75, 0, 0.75, 0, 0, Math.PI / 2 - 0.15);
        place(bambooSprig(), -0.2, 0, 1.25, 0, 0.35, 0);
      }
      scene.add(G);
      return (groups[key] = G);
    }

    function show(key){
      var D = DRINKS[key];
      Object.keys(groups).forEach(function(k){ groups[k].visible = false; });
      var G = build(key); G.visible = true; cur = key;
      skyMat.map = foliageTex(D.sky); skyMat.needsUpdate = true;
      sun.color.set(D.sun.color); sun.intensity = D.sun.i; renderer.toneMappingExposure = D.exposure;
      causticMat.color.set(D.caustic); haloMat.color.set(D.sun.color);
    }

    // ---- камера: компактный вид в блоке сайта и широкий в полноэкранном окне ----
    var mode = 'inline';
    function resize(){
      var w = canvasEl.clientWidth, h = canvasEl.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); kit.setSize(w, h, renderer.getPixelRatio());
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function frameCamera(){
      var a = camera.aspect || 1, t, dist;
      if (mode === 'inline') { t = new T.Vector3(0.38, 0.78, 0.05); dist = 6.2; }
      else if (a < 1) { t = new T.Vector3(0.38, 0.45, 0.05); dist = 8.6; }
      else { t = new T.Vector3(-0.2, 0.82, 0.05); dist = 6.0; }
      controls.target.copy(t);
      camera.position.set(t.x + dist * 0.05, t.y + dist * 0.24, t.z + dist * 0.97);
      controls.enableZoom = mode === 'modal';
      controls.update();
    }

    var clock = new T.Timer(), running = false, idle = 0, d = new T.Object3D();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.addEventListener('start', function(){ idle = -1e9; });
    controls.addEventListener('end', function(){ idle = -2; });
    function animate(dt, t){
      idle += dt;
      if (idle > 0) {
        var want = 0.28 * Math.sin(idle * 0.24), curA = controls.getAzimuthalAngle(), delta = (want - curA) * 0.02;
        var off = camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0, 1, 0), delta);
        camera.position.copy(controls.target).add(off);
      }
      var G = groups[cur], bub = G && G.userData.bubbles;
      if (bub) {
        var data = bub.userData.data;
        for (var i = 0; i < data.length; i++) {
          var b = data[i]; b.y += b.v * dt; b.a += dt * 0.3;
          if (b.y > FILL - 0.01) { b.y = BASE + 0.02; b.r = Math.random(); }
          var rr = (rIn(b.y) - 0.03) * Math.sqrt(b.r);
          d.position.set(Math.cos(b.a) * rr, b.y, Math.sin(b.a) * rr); d.scale.setScalar(b.s); d.updateMatrix(); bub.setMatrixAt(i, d.matrix);
        }
        bub.instanceMatrix.needsUpdate = true;
      }
      moveDust(t);
      if (G) G.children.forEach(function(o){
        if (o.userData.flame) {
          var f = 1 + Math.sin(t * 13 + o.position.x * 9) * 0.06 + Math.sin(t * 7.3) * 0.05;
          var fs = o.userData.fs || [0.026, 0.07]; o.userData.flame.scale.set(fs[0] * f, fs[1] * (2 - f), fs[0] * f); o.userData.light.intensity = 1.3 * f;
        }
      });
    }
    function draw(){
      // 1) сцена без стекла -> текстура; 2) кадр со стеклом, которое её преломляет
      var G = groups[cur], drops = G && G.userData.drops;
      glassOnly.forEach(function(m){ m.visible = false; }); if (drops) drops.visible = false;
      renderer.setRenderTarget(kit.rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
      glassOnly.forEach(function(m){ m.visible = true; }); if (drops) drops.visible = true;
      renderer.render(scene, camera);
    }
    function tick(){
      if (!running) return;
      requestAnimationFrame(tick);
      clock.update();
      var dt = Math.min(clock.getDelta(), 0.05), t = clock.getElapsed();
      if (!reduce) animate(dt, t); else animate(0, 0);
      controls.update();
      draw();
      self.frames = (self.frames || 0) + 1;
    }

    new ResizeObserver(function(){ resize(); }).observe(canvasEl);

    self.show = function(key){ var first = !cur; show(key); resize(); if (first) frameCamera(); };
    self.setMode = function(m){ mode = m; resize(); frameCamera(); idle = 0; };
    self.start = function(){ if (running) return; running = true; clock.update(); resize(); tick(); };
    self.stop = function(){ running = false; };
    self.isRunning = function(){ return running; };
    // заранее собираем все три сцены и компилируем шейдеры, чтобы наведение срабатывало мгновенно
    self.warm = function(){
      // по одной задаче за раз в простое браузера, чтобы не тормозить прокрутку
      var idle = window.requestIdleCallback || function(f){ return setTimeout(f, 60); };
      var jobs = [];
      ['activize', 'basics', 'restorate'].forEach(function(k){
        jobs.push(function(){ build(k); }); jobs.push(function(){ foliageTex(DRINKS[k].sky); });
      });
      jobs.push(function(){
        Object.keys(groups).forEach(function(k){ groups[k].visible = true; });
        var done = function(){ Object.keys(groups).forEach(function(k){ groups[k].visible = k === cur; }); };
        if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(done, done); else { renderer.compile(scene, camera); done(); }
      });
      (function next(){ var j = jobs.shift(); if (!j) return; idle(function(){ if (!running) j(); else jobs.unshift(j); next(); }); })();
    };
    self.camera = camera; self.controls = controls; self.cup = cup;
    self.snapshot = function(){ controls.update(); draw(); return canvasEl.toDataURL('image/jpeg', 0.92); };
  }

  window.Drinks3D = {
    create: function(canvasEl){
      var probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('webgl');
      return (window.Drinks3D.last = new Scene(canvasEl));
    }
  };
})();
