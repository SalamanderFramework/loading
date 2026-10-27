/* Salamander loading screen mini-games: self-playing demo (Snake, 2048, Reaction). GMod gives the loading panel no input, so nothing here reads the mouse or keyboard. No dependencies. */
(function (root) {
  "use strict";
  var doc = root.document, L = root.SalamanderLoading;
  if (!doc || !L) return;
  var mount = doc.getElementById("minigames");
  if (!mount) return;

  L.addStrings({
    fr: { snake: "Snake", g2048: "2048", reaction: "Réaction", score: "Score", demo: "Démo",
      over: "Perdu !", rxWait: "Attendez le doré…", rxGo: "CLIQUEZ !", rxMs: "ms", round: "Manche" },
    en: { snake: "Snake", g2048: "2048", reaction: "Reaction", score: "Score", demo: "Demo",
      over: "Game over!", rxWait: "Wait for gold…", rxGo: "CLICK!", rxMs: "ms", round: "Round" }
  });
  var t = L.t, GAME_MS = 20000; // a game is cut after GAME_MS if it has not ended

  var tabs, bodyEl, msgEl, cur = null, idx = -1, capT = 0, capLeft = 0, capT0 = 0;
  function el(tag, cls, p) { var e = doc.createElement(tag); if (cls) e.className = cls; if (p) p.appendChild(e); return e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  // Timer loop shared by the games: step() returns the delay (ms) before the next call, or <0 to stop.
  function auto(step) {
    var tm = 0;
    function run(d) { clearTimeout(tm); tm = setTimeout(function () { var n = step(); if (n >= 0) run(n); }, d); }
    return { stop: function () { clearTimeout(tm); tm = 0; }, run: run }; // run(firstDelayMs)
  }

  // ---- Snake -------------------------------------------------------------
  var N = 20, CELL = 15, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var snake = (function () {
    var cx, body, dir, food, score, over, done, loop, nextDelay;
    function hit(c, x, y) { return c[0] === x && c[1] === y; }
    function reset() { body = [[10, 10], [9, 10], [8, 10]]; dir = [1, 0]; score = 0; over = false; place(); draw(); say(); }
    function say() { msgEl.textContent = t("score") + ": " + score + (over ? " - " + t("over") : ""); }
    function place() {
      do { food = [rnd(N), rnd(N)]; } while (body.some(function (c) { return hit(c, food[0], food[1]); }));
    }
    function draw() {
      cx.fillStyle = "#141414"; cx.fillRect(0, 0, N * CELL, N * CELL);
      cx.fillStyle = "#b03030"; cx.fillRect(food[0] * CELL + 2, food[1] * CELL + 2, CELL - 4, CELL - 4);
      for (var i = 0; i < body.length; i++) {
        cx.fillStyle = i ? "#9c821a" : "#D7B222";
        cx.fillRect(body[i][0] * CELL + 1, body[i][1] * CELL + 1, CELL - 2, CELL - 2);
      }
    }
    function safe(x, y) { // the tail cell frees up as the head moves, so it counts as free
      return x >= 0 && y >= 0 && x < N && y < N && !body.some(function (c, i) { return i < body.length - 1 && hit(c, x, y); });
    }
    function free(x, y) { // open neighbours of a cell, to avoid walking into dead ends
      return D4.filter(function (d) { return safe(x + d[0], y + d[1]); }).length;
    }
    function ai() { // greedy toward food, avoid walls/body, fall back to any safe move
      var h = body[0], best = null, bs = 1e9;
      D4.forEach(function (d) {
        var x = h[0] + d[0], y = h[1] + d[1];
        if ((d[0] === -dir[0] && d[1] === -dir[1]) || !safe(x, y)) return;
        var s = Math.abs(x - food[0]) + Math.abs(y - food[1]) + (free(x, y) < 2 ? 50 : 0) + Math.random() * 0.5;
        if (s < bs) { bs = s; best = d; }
      });
      return best;
    }
    function step() {
      if (over) { done(); return -1; }
      dir = ai() || dir; // no safe move: keep going and die
      var h = [body[0][0] + dir[0], body[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || body.some(function (c) { return hit(c, h[0], h[1]); })) {
        over = true; say(); return 1500;
      }
      body.unshift(h);
      if (hit(h, food[0], food[1])) { score++; place(); say(); } else body.pop();
      draw(); return Math.max(60, 110 - score * 3);
    }
    return {
      init: function (host, next) {
        done = next; var cv = el("canvas", "", host); cv.width = cv.height = N * CELL; cx = cv.getContext("2d");
        reset(); loop = auto(step); loop.run(500);
      },
      pause: function () { if (loop) loop.stop(); },
      resume: function () { if (loop) loop.run(90); }
    };
  })();

  // ---- 2048 --------------------------------------------------------------
  var g2048 = (function () {
    var grid, cells, score, over, done, loop;
    var COL = { 0: "#2e2e2e", 2: "#4a4a4a", 4: "#5e5a45", 8: "#8a6f1c", 16: "#a98a1a", 32: "#c29e1c", 64: "#D7B222",
      128: "#e3c64a", 256: "#ecd36f", 512: "#f2dd8f", 1024: "#f7e8b0", 2048: "#fff3c4" };
    function spawn() {
      var free = []; for (var i = 0; i < 16; i++) if (!grid[i]) free.push(i);
      if (free.length) grid[free[rnd(free.length)]] = Math.random() < 0.9 ? 2 : 4;
    }
    function draw() {
      for (var i = 0; i < 16; i++) {
        var v = grid[i], c = cells[i];
        c.textContent = v || ""; c.style.background = COL[v] || "#fff";
        c.style.color = v > 4 ? "#222" : "#fff";
        c.style.fontSize = v >= 1024 ? ".7em" : v >= 128 ? ".85em" : "";
      }
      msgEl.textContent = t("score") + ": " + score + (over ? " - " + t("over") : "");
    }
    function line(a) { // slide and merge toward index 0; returns [cells, points]
      var r = a.filter(Boolean), out = [], pts = 0;
      for (var i = 0; i < r.length; i++) {
        if (r[i] === r[i + 1]) { out.push(r[i] * 2); pts += r[i] * 2; i++; } else out.push(r[i]);
      }
      while (out.length < 4) out.push(0);
      return [out, pts];
    }
    function slide(g, d) { // pure: returns { g, pts, moved } for direction d
      var res = g.slice(), pts = 0, moved = false;
      for (var k = 0; k < 4; k++) {
        var ix = [], j;
        for (j = 0; j < 4; j++) {
          ix.push(d[0] ? (d[0] > 0 ? k * 4 + 3 - j : k * 4 + j) : (d[1] > 0 ? (3 - j) * 4 + k : j * 4 + k));
        }
        var r = line(ix.map(function (i) { return g[i]; }));
        pts += r[1];
        for (j = 0; j < 4; j++) { if (g[ix[j]] !== r[0][j]) moved = true; res[ix[j]] = r[0][j]; }
      }
      return { g: res, pts: pts, moved: moved };
    }
    function empty(g) { return g.filter(function (v) { return !v; }).length; }
    function ai() { // prefer down, left, right (merges + empty cells); up only when stuck
      var best = null, bs = -1;
      [[0, 1], [-1, 0], [1, 0], [0, -1]].forEach(function (d, i) {
        var r = slide(grid, d); if (!r.moved) return;
        var s = r.pts + empty(r.g) * 4 - i * 3 - (i === 3 ? 1000 : 0) + Math.random();
        if (bs < 0 || s > bs) { bs = s; best = r; }
      });
      return best;
    }
    function step() {
      if (over) { done(); return -1; }
      var r = ai();
      if (!r) { over = true; draw(); return 1500; }
      grid = r.g; score += r.pts; spawn(); draw();
      if (!ai()) over = true;
      return over ? (draw(), 1500) : 280;
    }
    return {
      init: function (host, next) {
        done = next; var g = el("div", "g2", host); cells = [];
        for (var i = 0; i < 16; i++) cells.push(el("i", "", g));
        grid = []; for (i = 0; i < 16; i++) grid.push(0);
        score = 0; over = false; spawn(); spawn(); draw(); loop = auto(step); loop.run(500);
      },
      pause: function () { if (loop) loop.stop(); },
      resume: function () { if (loop) loop.run(200); }
    };
  })();

  // ---- Reaction ----------------------------------------------------------
  var reaction = (function () {
    var box, phase, round, ms, done, loop, ROUNDS = 4;
    function set(text, cls) { box.className = "rx " + (cls || ""); box.textContent = text; }
    function step() { // wait -> GO -> simulated reaction time -> next round
      if (phase === "wait") {
        phase = "go"; set(t("rxGo"), "go"); ms = 180 + rnd(141); return ms; // "player" reacts after ms
      }
      if (phase === "go") {
        phase = "result"; set(ms + " " + t("rxMs")); return 1500;
      }
      if (round >= ROUNDS) { done(); return -1; }
      round++; phase = "wait"; set(t("rxWait"), "wait");
      msgEl.textContent = t("round") + " " + round + " / " + ROUNDS;
      return 1200 + rnd(1300);
    }
    return {
      init: function (host, next) {
        done = next; box = el("div", "rx", host); round = 0; phase = "result"; ms = 0;
        loop = auto(step); loop.run(300);
      },
      pause: function () { if (loop) loop.stop(); },
      resume: function () { if (loop) loop.run(phase === "wait" ? 1000 : 400); }
    };
  })();

  // Add new games here: [translation key (also the tab label), game], with
  //   game = { init(host, next), pause(), resume() }
  // init builds the game inside `host` and starts it playing by itself (no input exists on the
  // loading panel). Drive it with auto(step) and write the score/status into msgEl. Call next()
  // when the game is over; the demo also moves on after GAME_MS. pause() must stop every timer
  // (called on tab hidden and before a game is replaced), resume() restarts them. Only the active
  // game exists: host is emptied between games.
  var GAMES = [["snake", snake], ["g2048", g2048], ["reaction", reaction]];

  // ---- Demo cycle / lifecycle ----------------------------------------------
  function arm(ms) { clearTimeout(capT); capLeft = ms; capT0 = Date.now(); capT = setTimeout(next, ms); }
  function select(i) {
    if (cur) cur.pause();
    idx = i; cur = GAMES[i][1];
    GAMES.forEach(function (p, j) { tabs.children[j].className = j === i ? "on" : ""; });
    bodyEl.innerHTML = ""; msgEl.textContent = ""; // only the active game exists
    var me = cur;
    me.init(bodyEl, function () { if (cur === me) next(); });
    arm(GAME_MS);
  }
  function next() { select((idx + 1) % GAMES.length); }
  function labels() {
    if (!tabs) return;
    GAMES.forEach(function (p, i) { tabs.children[i].textContent = t(p[0]); });
    tabs.lastChild.textContent = t("demo");
  }

  tabs = el("div", "", null); tabs.id = "mg-tabs";
  GAMES.forEach(function () { el("span", "", tabs); });
  el("div", "", tabs).id = "mg-demo";
  bodyEl = el("div", "", null); bodyEl.id = "mg-body";
  msgEl = el("div", "", null); msgEl.id = "mg-msg";
  mount.appendChild(tabs); mount.appendChild(bodyEl); mount.appendChild(msgEl);
  L.onLang(labels);
  select(0);

  doc.addEventListener("visibilitychange", function () {
    if (!cur) return;
    if (doc.hidden) { cur.pause(); clearTimeout(capT); capLeft = Math.max(1000, capLeft - (Date.now() - capT0)); }
    else { cur.resume(); arm(capLeft); }
  });
})(typeof window !== "undefined" ? window : this);
