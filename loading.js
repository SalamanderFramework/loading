/* Salamander loading screen. No dependencies. GMod calls the global functions below. */
(function (root) {
  "use strict";

  // ---- Strings: all text lives here -------------------------------------
  var STR = {
    fr: { map: "Carte", gamemode: "Mode de jeu", slots: "Slots", tipsTitle: "Conseils",
      connecting: "Connexion…", files: "fichiers" },
    en: { map: "Map", gamemode: "Gamemode", slots: "Slots", tipsTitle: "Tips",
      connecting: "Connecting…", files: "files" }
  };

  // ---- Tips: STAFF EDIT HERE (keep fr and en in the same order) ----------
  var TIPS = {
    fr: [
      "Respectez le règlement : le RP et le respect des autres passent avant tout.",
      "Appuyez sur F4 pour ouvrir le menu du serveur.",
      "Appuyez sur E pour interagir avec les portes, machines et objets.",
      "Le chat vocal est proximal : on ne vous entend que si vous êtes proche.",
      "Un problème ? Contactez un membre du staff plutôt que de vous faire justice.",
      "Pas de meta-gaming : ce que vous apprenez hors RP reste hors RP.",
      "[PLACEHOLDER] Ajoutez ici un conseil du staff."
    ],
    en: [
      "Follow the rules: roleplay and respect for others come first.",
      "Press F4 to open the server menu.",
      "Press E to interact with doors, machines and items.",
      "Voice chat is proximity based: only nearby players can hear you.",
      "Got a problem? Ask a staff member instead of taking justice into your own hands.",
      "No meta-gaming: what you learn outside RP stays outside RP.",
      "[PLACEHOLDER] Add a staff tip here."
    ]
  };
  var TIP_MS = 7000;
  var FINAL = /lua started|sending client info|client info sent|starting lua/i; // statuses of the final stages

  var state = { lang: "fr", total: 0, needed: null, file: "", status: "", tipIdx: 0, finished: false };
  var doc = root.document;
  var langHooks = [];
  // Extension API for minigames.js: add strings per language, get notified on language change.
  function addStrings(map) { for (var l in map) if (STR[l]) for (var k in map[l]) STR[l][k] = map[l][k]; }

  function $(id) { return doc ? doc.getElementById(id) : null; }
  function setText(id, v) { var e = $(id); if (e) e.textContent = v; }
  function t(key) { var s = STR[state.lang] || STR.fr; return s[key] != null ? s[key] : key; }

  function detectLang(l) {
    var c = String(l || "").toLowerCase().slice(0, 2);
    if (STR[c]) return c;
    var n = String((root.navigator && root.navigator.language) || "").toLowerCase().slice(0, 2);
    return STR[n] ? n : "fr";
  }

  function showTip(advance) {
    var list = TIPS[state.lang] || TIPS.fr, e = $("tip");
    if (!e || !list.length) return;
    if (advance) state.tipIdx++;
    state.tipIdx %= list.length;
    e.textContent = list[state.tipIdx];
  }

  function render() {
    if (!doc) return;
    var bar = $("bar"), fill = $("fill");
    if (!bar || !fill) return;
    var total = state.total, needed = state.needed;
    if (total > 0 && state.finished) needed = 0; // cached files: SetFilesNeeded is never called again
    if (total > 0 && needed != null) {
      var done = Math.max(0, Math.min(total, total - needed));
      var pct = Math.round(done / total * 100);
      bar.className = "";
      fill.style.width = pct + "%";
      setText("count", done + " / " + total + " " + t("files") + " (" + pct + "%)");
    } else {
      bar.className = "unknown";
      fill.style.width = "";
      setText("count", "");
    }
    setText("status", state.status || t("connecting"));
    setText("file", state.file);
  }

  function applyLang() {
    if (!doc) return;
    doc.documentElement.lang = state.lang;
    var els = doc.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-i18n"));
    showTip(false);
    render();
    for (var j = 0; j < langHooks.length; j++) safe(langHooks[j]);
  }

  function nextTip() {
    var e = $("tip");
    if (!doc || doc.hidden || !e) return;
    e.className = "out";
    setTimeout(function () { showTip(true); e.className = ""; }, 500);
  }

  function safe(fn) { try { fn(); } catch (e) { /* never break the loading screen */ } }

  // ---- GMod callbacks ------------------------------------------------------
  function GameDetails(servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language) {
    safe(function () {
      state.lang = detectLang(language);
      setText("servername", servername || "Salamander");
      setText("map", mapname || "-");
      setText("gamemode", gamemode || "-");
      setText("maxplayers", maxplayers != null ? String(maxplayers) : "-");
      if (servername && doc) doc.title = String(servername);
      applyLang();
    });
  }
  function SetFilesTotal(total) {
    safe(function () {
      state.total = Number(total) || 0;
      if (state.needed == null && state.total > 0) state.needed = state.total;
      render();
    });
  }
  function SetFilesNeeded(needed) {
    safe(function () {
      var n = Number(needed);
      state.needed = (needed == null || isNaN(n)) ? null : n;
      render();
    });
  }
  function DownloadingFile(fileName) {
    safe(function () {
      state.file = String(fileName == null ? "" : fileName);
      render();
    });
  }
  function SetStatusChanged(status) {
    safe(function () {
      state.status = String(status == null ? "" : status);
      if (FINAL.test(state.status)) state.finished = true; // last stages: downloads are done
      render();
    });
  }

  function reset() {
    state.total = 0; state.needed = null; state.file = ""; state.status = ""; state.finished = false;
    safe(render);
  }

  root.GameDetails = GameDetails;
  root.SetFilesTotal = SetFilesTotal;
  root.SetFilesNeeded = SetFilesNeeded;
  root.DownloadingFile = DownloadingFile;
  root.SetStatusChanged = SetStatusChanged;
  root.SalamanderLoading = { reset: reset, state: state, t: t, addStrings: addStrings,
    onLang: function (fn) { langHooks.push(fn); fn(); } };

  if (doc) {
    var start = function () {
      state.lang = detectLang();
      applyLang();
      setInterval(nextTip, TIP_MS);
      doc.addEventListener("visibilitychange", function () {
        doc.documentElement.className = doc.hidden ? "paused" : "";
      });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
  }
})(typeof window !== "undefined" ? window : this);
