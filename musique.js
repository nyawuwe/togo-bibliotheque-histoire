// Togo, musée d'art et d'histoire : la musique de fond des pages servies telles quelles depuis public/ (accueil pour
// ordinateur et son ouverture, salle des personnes). Même boucle et mêmes niveaux que site/src/audio.js, celui de la
// visite : AudioBuffer bouclé sans couture, -9 dB, 11 dB de moins sous une voix. Les deux fichiers vont ensemble.
// Seule différence : sous une chanson de la salle des personnes, la musique (elle-même une chanson) se tait tout à fait.
// ponytail: boucle recopiée de src/audio.js (Vite ne laisse pas une page de public/ importer un module de src/) ; à
// fusionner si la visite passe un jour sur ce script.
//
// Le son est proposé d'emblée, sur grand écran : le navigateur le refuse le plus souvent sans geste de l'utilisateur. Le
// contexte audio reste alors suspendu, le bouton dit « Activer le son », et la musique part au premier clic, au premier
// toucher ou à la première touche. La molette est écoutée aussi, mais la spécification HTML ne la compte pas comme un
// geste : selon le navigateur, elle peut ne rien débloquer, et le bouton continue alors de dire « Activer le son ».
// Le choix du visiteur est retenu : localStorage « togo-son » vaut « 0 » quand il a coupé le son ; aucune page ne la
// relance alors d'elle-même (la visite, src/main.js, écrit la même clé quand on coupe la musique).
'use strict';

window.togoMusique = (() => {
  const NIVEAU = 10 ** (-9 / 20), BAISSE = 10 ** (-11 / 20);
  const ATTAQUE = 0.25, RELACHE = 0.9, ENTREE = 1.2, SILENCE = 0.08;   // SILENCE : -35 dB en 0,3 s, inaudible en 1 s
  const CLE = 'togo-son';
  const lire = () => { try { return localStorage.getItem(CLE); } catch { return null; } };
  const retenir = (coupe) => { try { if (coupe) localStorage.setItem(CLE, '0'); else localStorage.removeItem(CLE); } catch { /* stockage indisponible : le choix vaut pour la page */ } };
  const GESTES = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'wheel'];

  let ctx = null, bus = null, tampon = null, chargement = null, source = null, coupure = 0;
  let voulue = false, sous = false, fichier = null;
  const boutons = [];

  // État affiché : « joue » (le son sort), « attente » (voulu, refusé par le navigateur jusqu'au premier geste), « coupe ».
  const etat = () => (!voulue ? 'coupe' : ctx?.state === 'running' ? 'joue' : 'attente');
  function maj() {
    const e = etat();
    for (const b of boutons) {
      b.dataset.etat = e;
      b.querySelector('.son-texte').textContent = e === 'joue' ? 'Couper le son' : 'Activer le son';
      b.setAttribute('aria-label', b.querySelector('.son-texte').textContent);   // le texte se masque sur petit téléphone
      b.title = e === 'attente' ? 'Le navigateur attend un premier geste pour laisser sortir le son' : '';
    }
  }

  function bornes(b) {
    const voies = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));
    const sonore = (i) => voies.some((v) => Math.abs(v[i]) > 1e-5);
    let debut = 0, fin = b.length - 1;
    while (debut < fin && !sonore(debut)) debut += 1;
    while (fin > debut && !sonore(fin)) fin -= 1;
    return [debut / b.sampleRate, (fin + 1) / b.sampleRate];
  }
  function viser(tau) {
    if (!bus) return;
    const cible = voulue && sous !== 'chanson' ? NIVEAU * (sous ? BAISSE : 1) : 0;
    bus.gain.setTargetAtTime(cible, ctx.currentTime, tau ?? (sous === 'chanson' ? SILENCE : cible < bus.gain.value ? ATTAQUE : RELACHE));
  }
  // Le fichier se décode dès que la musique est voulue, même contexte suspendu : elle part sans attente au premier geste.
  function lancer() {
    if (!voulue || !fichier || !ctx) return;
    chargement ??= fetch(`audio/${fichier}`).then((r) => r.arrayBuffer()).then((d) => ctx.decodeAudioData(d)).then((b) => { tampon = b; }, () => { chargement = null; });
    chargement.then(() => {
      if (!tampon || source || !voulue || ctx.state !== 'running') return;
      const [debut, fin] = bornes(tampon);
      source = ctx.createBufferSource();
      Object.assign(source, { buffer: tampon, loop: true, loopStart: debut, loopEnd: fin });
      source.connect(bus);
      source.start(0, debut);
      viser(ENTREE);
    });
  }
  function contexte() {
    if (ctx) return;
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(ctx.destination);
    ctx.addEventListener('statechange', () => { maj(); lancer(); if (ctx.state === 'running') GESTES.forEach((t) => removeEventListener(t, geste, true)); });
  }
  // Premier geste n'importe où : le son voulu peut sortir. Un geste sur le bouton du son est laissé à son clic.
  function geste(e) {
    if (e.target.closest?.('[data-son]') || !voulue || ctx?.state !== 'suspended') return;
    ctx.resume().catch(() => {});
  }
  function activer() {
    voulue = true;
    retenir(false);
    contexte();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    lancer();
    viser();
    maj();
  }
  function couper() {
    voulue = false;
    retenir(true);
    viser();
    // La boucle s'arrête une fois la rampe descendue ; rendue avant, elle remonte au même endroit (src/audio.js).
    if (source) {
      const s = source, jeton = ++coupure;
      setTimeout(() => { if (!voulue && source === s && coupure === jeton) { source = null; s.stop(); } }, 6 * ATTAQUE * 1000);
    }
    maj();
  }

  // auto : la musique est proposée d'emblée (grand écran), sauf si le visiteur l'a coupée.
  function demarrer({ auto }) {
    lierBoutons();
    if (auto && lire() !== '0') {
      voulue = true;
      contexte();
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); GESTES.forEach((t) => addEventListener(t, geste, { capture: true, passive: true })); }
    }
    maj();
    fetch('audio/index.json').then((r) => (r.ok ? r.json() : null)).then((m) => {
      fichier = m?.musique?.[0] ?? null;
      if (!fichier) { voulue = false; boutons.forEach((b) => { b.hidden = true; }); return; }
      lancer();
    }, () => { boutons.forEach((b) => { b.hidden = true; }); });
  }
  function lierBoutons() {
    for (const b of document.querySelectorAll('[data-son]')) {
      if (boutons.includes(b)) continue;
      boutons.push(b);
      b.addEventListener('click', () => (etat() === 'joue' ? couper() : activer()));
    }
  }

  // Une voix parle (enregistrement d'archive, v = true) : la musique baisse ; une chanson joue (v = 'chanson') : la
  // musique se tait ; l'enregistrement s'arrête (v = false) : la musique remonte.
  const sousLaVoix = (v) => { sous = v; viser(); };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (voulue) ctx.resume().catch(() => {});
  });
  return { demarrer, sousLaVoix, coupe: () => lire() === '0', etat };
})();
