// Togo, musée d'art et d'histoire : la galerie de l'accueil pour ordinateur, ses deux films et les deux formulaires du
// pied de page (réclamation de droits, contribution). ordinateur.js ne charge ce script que lorsque la galerie ou le pied approche
// de l'écran : ni ce code, ni data/galerie.json, ni aucune image de la galerie ne se chargent à l'arrivée.
// Une seule source de données, data/galerie.json ; « masques » y cache un groupe (« lifetour », « enfants ») ou une
// image par son identifiant (contenu/LISEZMOI.md).
'use strict';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]).replace(/ (?=[:;!?»])/g, ' ').replace(/« /g, '« ');
  const DOSSIER = 'images/galerie/';
  const SOURCES = { pinterest: 'Pinterest', foaa: 'Musée FOAA', commons: 'Wikimedia Commons', flickr: 'Flickr' };
  const deux = (n) => String(n).padStart(2, '0');

  // ---------- Images : WebP en srcset, proportions posées (width, height), jamais recadrées ni agrandies ----------
  // La largeur affichée est bornée à la largeur réelle du plus grand fichier (--max, ordinateur.css).
  const dossier = (i) => i.dossier ?? DOSSIER;   // la salle des personnes pose le sien (images/personnes/)
  const srcset = (i) => i.tailles.map((w) => `${dossier(i)}${i.id}-${w}.webp ${w}w`).join(', ');
  const image = (i, sizes, alt = i.alt) => `<img src="${dossier(i)}${i.id}-${i.tailles[0]}.webp" srcset="${srcset(i)}" sizes="${sizes}" alt="${esc(alt)}" width="${i.largeur}" height="${i.hauteur}" loading="lazy" decoding="async" style="--max:${i.largeur}px;background-color:${esc(i.couleur ?? '#EEEAE4')}">`;

  // ---------- Crédits ----------
  const lien = (href, texte, rel = '') => `<a href="${esc(href)}"${rel ? ` rel="${rel}"` : ''}>${texte}</a>`;
  function credit(i) {
    if (i.source === 'pinterest') return i.auteur === 'non identifié' ? 'Image trouvée sur Pinterest, auteur non identifié.' : `Image trouvée sur Pinterest. ${esc(i.auteur)}.`;
    // Salle des personnes : image sans licence connue, avec sa source et le lien du formulaire de réclamation ; la photo
    // d'une œuvre encore protégée le dit (i.oeuvre).
    if (i.source === 'web') return `Image trouvée sur ${lien(i.lien, esc(i.site))}, ${i.auteur === 'non identifié' ? 'auteur non identifié' : esc(i.auteur)}.${i.oeuvre ? ` ${esc(i.oeuvre)}` : ''}${i.reclamation ? ` ${lien(i.reclamation, 'Signaler cette image')}.` : ''}`;
    if (i.source === 'foaa') {
      const site = lien(i.lien, 'Musée FOAA (musee-foaa.com)');
      const avant = [i.musee && `${esc(i.musee)}.`, i.objet && `${esc(i.objet)}, nom donné par le site du musée FOAA.`, i.cartel && `Cartel : ${esc(i.cartel)}.`].filter(Boolean).join(' ');
      const photo = i.auteur === 'non identifié' ? `${site}, auteur non identifié.` : `© ${esc(i.auteur)}, via le site du ${lien(i.lien, 'musée FOAA (musee-foaa.com)')}.`;
      return `${avant} ${photo}`.trim();
    }
    const ou = i.source === 'flickr' ? 'Flickr' : 'Wikimedia Commons';
    return `${i.lieu ? `Lieu indiqué sur Flickr : ${esc(i.lieu)}. ` : ''}${esc(i.auteur)}, ${lien(i.licence_url, esc(i.licence), 'license')}. ${lien(i.lien, `Original sur ${ou}`)}. ${esc(i.modification ?? 'Réduite pour le web')}.`;
  }

  // ---------- Composition : des rangées de tailles variées, jamais une grille uniforme ----------
  // Douze colonnes. Une rangée porte une, deux ou trois images selon un motif ; la grande et la petite changent de côté
  // d'une rangée à l'autre, les colonnes libres font les respirations, et une image sur deux ou trois descend d'un pas.
  // Une image seule n'est posée en grand que si elle est horizontale et assez définie.
  const sens = (i) => (i.largeur / i.hauteur >= 1.15 ? 'h' : 'v');
  const MOTIF = [2, 3, 1, 2, 2, 3, 2, 1];
  function rangees(liste) {
    const out = [];
    for (let i = 0, n = 0; i < liste.length; n += 1) {
      const reste = liste.length - i;
      let k = MOTIF[n % MOTIF.length];
      if (k === 1 && !(sens(liste[i]) === 'h' && liste[i].largeur >= 1200)) k = 2;
      if (reste - k === 1) k = k === 3 ? 2 : k + 1;   // jamais une petite image orpheline en fin de thème
      k = Math.min(k, reste);
      out.push(liste.slice(i, i + k));
      i += k;
    }
    return out;
  }
  function poser(row, n) {
    const k = row.length, s = row.map(sens);
    let spans, grande = 0;
    if (k === 1) spans = [s[0] === 'h' ? 9 : 5];
    else if (k === 2) {
      // La grande place va d'ordinaire à gauche puis à droite ; à une image nettement mieux définie que sa voisine sinon.
      grande = row[0].largeur < row[1].largeur * 0.6 ? 1 : row[1].largeur < row[0].largeur * 0.6 ? 0 : n % 2;
      spans = s.map((x, j) => (j === grande ? (x === 'h' ? 7 : 5) : (x === 'h' ? 4 : 3)));
    } else {
      const nh = s.filter((x) => x === 'h').length;
      spans = s.map((x) => (x === 'h' ? (nh >= 2 ? 4 : 5) : 3));
    }
    const libre = 12 - spans.reduce((a, b) => a + b, 0);
    let tete, ecarts;
    if (k === 1) { tete = n % 2 ? libre : Math.min(1, libre); ecarts = []; } else if (k === 2) {
      [tete, ecarts] = [[0, [libre]], [Math.min(1, libre), [Math.max(0, libre - 1)]], [Math.max(0, Math.floor((libre - 1) / 2)), [Math.min(1, libre)]], [Math.max(0, libre - 1), [Math.min(1, libre)]]][n % 4];
    } else {
      tete = n % 2 ? 0 : Math.min(1, libre);
      ecarts = [Math.ceil((libre - tete) / 2), Math.floor((libre - tete) / 2)];
    }
    const alignes = k === 3 ? [['start', 'end', 'start'], ['end', 'start', 'center'], ['start', 'center', 'end']][n % 3] : null;
    let c = 1 + tete;
    return row.map((i, j) => {
      const debut = c;
      c += spans[j] + (ecarts[j] ?? 0);
      let a = 'start', d = 0;
      if (k === 2 && j !== grande) [a, d] = n % 4 < 2 ? ['end', 0] : ['start', 1];
      if (k === 3) { a = alignes[j]; d = a === 'start' ? [0, 1, 0.5][(j + n) % 3] : 0; }
      const just = k === 1 ? 'center' : j === 0 ? 'end' : j === k - 1 ? 'start' : 'center';
      return { i, col: `${debut} / span ${spans[j]}`, span: spans[j], a, d, just };
    });
  }

  // ---------- Construction ----------
  // Les images montrées, dans l'ordre des thèmes, avec leur numéro (une image masquée n'a ni place ni numéro).
  function trier(D) {
    const masques = new Set(D.masques ?? []);
    const rang = new Map(D.themes.map((t, k) => [t.id, k]));
    const liste = D.images.filter((i) => rang.has(i.theme) && !masques.has(i.groupe) && !masques.has(i.id)).sort((a, b) => rang.get(a.theme) - rang.get(b.theme));
    const numero = new Map(liste.map((i, k) => [i.id, k + 1]));
    const themes = D.themes.map((t) => ({ ...t, images: liste.filter((i) => i.theme === t.id) })).filter((t) => t.images.length);
    return { liste, numero, themes };
  }

  // reclamation.html : le formulaire de la galerie seul, sans la galerie (les crédits de la version téléphone y mènent).
  async function formulaireSeul() {
    $('#formulaire').addEventListener('submit', (e) => e.preventDefault());   // tant que les données ne sont pas là
    try {
      const r = await fetch('data/galerie.json');
      if (!r.ok) throw new Error(`galerie.json : HTTP ${r.status}`);
      const { numero, themes } = trier(await r.json());
      reclamation(themes, numero);
    } catch { reclamation([], new Map()); }   // « Autre image » reste possible
  }

  async function demarrer() {
    let D;
    try {
      const r = await fetch('data/galerie.json');
      if (!r.ok) throw new Error(`galerie.json : HTTP ${r.status}`);
      D = await r.json();
    } catch (e) {
      $('#galerie-themes').innerHTML = `<p class="galerie-erreur" role="alert">La galerie n'a pas pu être lue (${esc(e.message)}). Recharger la page.</p>`;
      reclamation([], new Map());   // le formulaire reste utilisable, avec « Autre image »
      return;
    }
    const { liste, numero, themes } = trier(D);
    const parId = new Map(liste.map((i) => [i.id, i]));   // une image masquée ne sert pas non plus de vignette
    $('#galerie-compte').textContent = `${liste.length} images`;

    $('#galerie-themes').innerHTML = themes.map((t, k) => `<section class="theme" aria-labelledby="theme-${esc(t.id)}">
      <header class="theme-tete"><span class="theme-num" aria-hidden="true">${deux(k + 1)}</span><h3 class="theme-titre" id="theme-${esc(t.id)}">${esc(t.titre)}</h3><span class="theme-compte">${t.images.length} images</span></header>
      ${rangees(t.images).map((row, n) => `<div class="rangee">${poser(row, n).map((p) => `<figure class="piece${p.just === 'end' ? ' vers-droite' : ''}" style="grid-column:${p.col};align-self:${p.a};justify-self:${p.just};--d:${p.d};--max:${p.i.largeur}px">
        <button type="button" class="piece-ouvrir" data-id="${esc(p.i.id)}" aria-haspopup="dialog">${image(p.i, `${((p.span * 91) / 12).toFixed(1)}vw`)}</button>
        <figcaption class="piece-legende" aria-hidden="true"><span class="piece-num">${numero.get(p.i.id)}</span>${esc(p.i.legende)}<span class="piece-source">${esc(p.i.site ?? SOURCES[p.i.source])}</span></figcaption>
      </figure>`).join('')}</div>`).join('')}
    </section>`).join('') + films(D.videos ?? [], parId, themes.length + 1);

    visionneuse(liste, numero, D.themes);
    lecteurs();
    reclamation(themes, numero);
    $('#credits-galerie-compte').textContent = `${liste.length} images`;
    $('#credits-galerie-liste').innerHTML = liste.map((i) => `<li><span class="cg-num">${numero.get(i.id)}</span><span class="cg-texte"><span class="cg-legende">${esc(i.legende)}.</span> ${credit(i)}</span></li>`).join('');
    // Arrivée sur une ancre de la galerie ou du pied (#reclamation) : la construction l'a déplacée, on la rejoint.
    try { const cible = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); if (cible && cible.closest('#galerie, .pied')) cible.scrollIntoView({ behavior: 'instant' }); } catch { /* ancre mal formée */ }
  }

  // ---------- Visionneuse : <dialog> natif, Échap, flèches, focus rendu ----------
  // L'image grandit depuis sa vignette jusqu'à sa place (FLIP en Web Animations : seule une transformation bouge, aux
  // proportions de l'image, donc rien n'est rogné ni ne saute) et y retourne à la fermeture. D'une image à l'autre, elle
  // s'efface en glissant pendant que la suivante se charge, puis celle-ci entre. Au doigt, l'image se glisse vers la
  // voisine et se ferme en la tirant vers le bas (gestes, plus bas). Sous mouvement réduit, tout change d'un coup.
  const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const ALLER = { duration: 440, easing: 'cubic-bezier(.22, .8, .16, 1)' };
  const RETOUR = { duration: 400, easing: 'cubic-bezier(.45, 0, .2, 1)' };
  const RESSORT = 'cubic-bezier(.2, .9, .3, 1.02)';
  // La transformation qui pose le rectangle r1 (l'image dans la fenêtre) sur r0 (la vignette) ; origine en haut à gauche.
  const depuis = (r0, r1) => `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${r0.width / r1.width}, ${r0.height / r1.height})`;

  function visionneuse(liste, numero, tousThemes, conteneur = $('#galerie-themes')) {
    const d = $('#visionneuse'), im = $('#v-img'), zone = $('.v-image', d);
    const habillage = $$('.v-compte, .v-fermer, .v-fleche, .v-texte', d);
    const fond = getComputedStyle(document.documentElement).getPropertyValue('--fond').trim() || '#fff';
    const titre = new Map(tousThemes.map((t) => [t.id, t.titre]));
    const boutons = new Map($$('.piece-ouvrir').map((b) => [b.dataset.id, b]));
    // k : l'image annoncée (compteur, légende, crédit) ; affiche : celle que montre <img>, en retard pendant un passage.
    let k = 0, affiche = 0, sens = 1, versFormulaire = false, passage = false, fermeture = false, cachee = null;
    // seance : numéro de l'ouverture en cours (un passage resté en route ne touche pas à la suivante) ; ouverte : son morph.
    let seance = 0, ouverte = Promise.resolve();
    // La taille affichée : la place disponible, jamais plus que la largeur réelle de l'image ; sizes suit, au pixel.
    const largeur = (i) => Math.max(1, Math.floor(Math.min(i.largeur, zone.clientWidth, (zone.clientHeight * i.largeur) / i.hauteur)));
    const ajuster = () => { const w = largeur(liste[affiche]); im.style.width = `${w}px`; im.sizes = `${w}px`; };
    const textes = () => {
      const i = liste[k];
      $('#v-compte').textContent = `${numero.get(i.id)} sur ${liste.length}, ${titre.get(i.theme) ?? ''}`;
      $('#v-legende').textContent = i.alt;
      $('#v-credit').innerHTML = credit(i);
    };
    // src : le fichier de la vignette, déjà en mémoire, pour que l'image soit là dès la première image du morph.
    const poser = (n, src) => {
      affiche = n;
      const i = liste[n];
      im.removeAttribute('srcset');
      im.removeAttribute('src');
      Object.assign(im, { width: i.largeur, height: i.hauteur, alt: i.alt });
      im.style.backgroundColor = i.couleur ?? '';
      ajuster();
      if (src) { im.src = src; return; }
      im.srcset = srcset(i);
      im.src = `${dossier(i)}${i.id}-${i.tailles[0]}.webp`;
    };
    const precharger = (i) => {
      const p = new Image();
      Object.assign(p, { sizes: `${largeur(i)}px`, srcset: srcset(i), src: `${dossier(i)}${i.id}-${i.tailles[0]}.webp` });
      return Promise.race([p.decode().catch(() => {}), attendre(1200)]);
    };
    const finir = (anims) => Promise.all(anims.map((a) => a.finished)).catch(() => {});
    const montrerVignette = () => { if (cachee) cachee.style.visibility = ''; cachee = null; };
    const cacherVignette = (img) => { montrerVignette(); cachee = img; img.style.visibility = 'hidden'; };

    async function ouvrir(b) {
      const ici = ++seance, vivante = () => seance === ici && d.open && !fermeture;
      const vignette = $('img', b), n = liste.findIndex((i) => i.id === b.dataset.id);
      const morph = !calme() && vignette.complete && vignette.naturalWidth > 0;
      const r0 = vignette.getBoundingClientRect(), teinte = getComputedStyle(vignette).opacity;   // .88 sous la souris
      if (morph) d.classList.add('ouvre', 'anime');   // fenêtre transparente, image et commandes invisibles
      // Largeur de la barre de défilement, remplacée par une marge tant que la fenêtre est ouverte (ordinateur.css) ; avec
      // scrollbar-gutter, la mise en page changeait et le retour ne tombait plus sur la vignette.
      document.documentElement.style.setProperty('--barre', `${innerWidth - document.documentElement.clientWidth}px`);
      d.showModal();
      k = n;
      textes();
      $('.v-fermer', d).focus();
      if (!morph) { poser(n); if (calme()) d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); return; }
      poser(n, vignette.currentSrc);
      await Promise.race([im.decode().catch(() => {}), attendre(300)]);
      if (!vivante()) return;
      const r1 = im.getBoundingClientRect();
      d.classList.remove('ouvre');
      cacherVignette(vignette);
      const anims = [
        im.animate([{ transform: depuis(r0, r1), opacity: teinte }, { transform: 'none', opacity: 1 }], ALLER),
        d.animate([{ backgroundColor: 'transparent' }, { backgroundColor: fond }], { duration: ALLER.duration * 0.8, easing: 'ease-out' }),
        ...habillage.map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 180, easing: 'ease-out', fill: 'backwards' })),
      ];
      // Le fichier à la taille de la fenêtre remplace la vignette dès qu'il est chargé ; d'ici là, elle reste affichée.
      im.srcset = srcset(liste[n]);
      await finir(anims);
      if (!vivante()) return;
      d.classList.remove('anime');
      montrerVignette();
    }

    // Les demandes rapprochées ne s'empilent pas : un seul passage à la fois, qui va droit à la dernière image demandée.
    // Demandé pendant le morph d'ouverture, il attend que l'image soit à sa place.
    async function passer() {
      const ici = seance, vivant = () => seance === ici && d.open && !fermeture;
      passage = true;
      await ouverte;
      if (vivant()) d.classList.add('passe');
      while (affiche !== k && vivant()) {
        let cible = k, pret = precharger(liste[cible]);
        // Lâchée au doigt, l'image part d'où elle est et continue sur sa lancée ; au clavier, elle glisse de 26 px.
        const depart = getComputedStyle(im).transform, x0 = depart === 'none' ? 0 : new DOMMatrix(depart).m41;
        im.style.transform = '';
        await finir([im.animate([{ opacity: 1, transform: depart }, { opacity: 0, transform: `translateX(${x0 ? x0 - sens * 140 : -sens * 26}px)` }], { duration: x0 ? 200 : 170, easing: x0 ? 'ease-out' : 'ease-in', fill: 'forwards' })]);
        await pret;
        while (cible !== k && vivant()) { cible = k; await precharger(liste[cible]); }
        if (!vivant()) break;
        im.getAnimations().forEach((a) => a.cancel());
        poser(cible);
        await finir([im.animate([{ opacity: 0, transform: `translateX(${sens * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: RESSORT })]);
      }
      if (seance !== ici) return;   // fenêtre fermée (et peut-être rouverte) entre-temps : rien à rendre
      passage = false;
      d.classList.remove('passe');
    }
    function aller(n, s) {
      if (fermeture) return;
      k = (n + liste.length) % liste.length;
      sens = s;
      textes();
      if (calme()) { poser(k); return; }
      if (!passage) passer();
    }

    async function fermer() {
      if (fermeture || !d.open) return;
      const b = boutons.get(liste[affiche].id), vignette = b && $('img', b);
      // Sous mouvement réduit : un fondu court, rien d'autre.
      if (calme() && !versFormulaire) { fermeture = true; await finir([d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' })]); if (d.open) d.close(); return; }
      // Morph d'ouverture pas encore parti (fenêtre transparente, vignette encore à sa place) : rien n'a bougé, on ferme.
      if (!vignette || versFormulaire || d.classList.contains('ouvre')) { d.close(); return; }
      fermeture = true;
      k = affiche;   // fermé pendant un passage : on revient à l'image que l'on voyait
      // Le retour part de ce qui est à l'écran à cet instant (morph d'ouverture, glissement ou geste en cours compris) : rien
      // ne saute. Le geste posé en ligne est retiré avant de mesurer, pour que le trajet vise la vignette depuis la vraie place.
      const vu = (el, p) => getComputedStyle(el)[p];
      const depart = { tr: vu(im, 'transform'), op: vu(im, 'opacity'), fond: vu(d, 'backgroundColor'), habits: habillage.map((el) => vu(el, 'opacity')) };
      d.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      lisser();
      d.classList.add('anime');
      const r1 = im.getBoundingClientRect(), y = scrollY;
      b.scrollIntoView({ block: 'nearest', behavior: 'instant' });   // la vignette, à l'écran ; la page ne bouge que si besoin
      // Page défilée : les animations liées au défilement (.p-flux .piece, salle des personnes) ne se mettent à jour qu'à
      // l'image suivante ; mesurée tout de suite, la vignette serait 48 px trop bas. L'image reste où elle est le temps d'une
      // image, puis la vignette est mesurée à sa vraie place.
      if (scrollY !== y) {
        im.style.transform = depart.tr; im.style.opacity = depart.op; d.style.backgroundColor = depart.fond;
        habillage.forEach((el, i) => { el.style.opacity = depart.habits[i]; });
        await new Promise((ok) => requestAnimationFrame(ok));
        lisser(); im.style.opacity = '';
      }
      const r0 = vignette.getBoundingClientRect();
      cacherVignette(vignette);
      await finir([
        im.animate([{ transform: depart.tr, opacity: depart.op }, { transform: depuis(r0, r1), opacity: 1 }], { ...RETOUR, fill: 'forwards' }),
        d.animate([{ backgroundColor: depart.fond }, { backgroundColor: 'transparent' }], { duration: RETOUR.duration, easing: 'ease-in', fill: 'forwards' }),
        ...habillage.map((el, i) => el.animate([{ opacity: depart.habits[i] }, { opacity: 0 }], { duration: 160, fill: 'forwards' })),
      ]);
      if (d.open) d.close();
    }

    conteneur.addEventListener('click', (e) => {
      const b = e.target.closest('.piece-ouvrir');
      if (b && !d.open) ouverte = ouvrir(b).catch(() => {});
    });
    $('.v-prec', d).addEventListener('click', () => aller(k - 1, -1));
    $('.v-suiv', d).addEventListener('click', () => aller(k + 1, 1));
    $('.v-fermer', d).addEventListener('click', fermer);
    d.addEventListener('keydown', (e) => {
      // Échap pendant une fermeture en cours : ignoré, la fermeture se termine. Le second « cancel » n'est plus annulable
      // (le navigateur limite les fermetures retenues) : il faut l'arrêter dès la touche, sinon la fenêtre se ferme d'un coup.
      if (e.key === 'Escape' && fermeture) { e.preventDefault(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); aller(k + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight' ? 1 : -1); }
    });
    // Échap : le navigateur annonce la fermeture ; on la joue en morph. S'il ne la laisse pas différer, elle se fait d'un coup.
    d.addEventListener('cancel', (e) => { if (fermeture) { e.preventDefault(); return; } if (e.cancelable) { e.preventDefault(); fermer(); } });
    // Un clic dans le vide autour de l'image ferme, comme Échap.
    d.addEventListener('click', (e) => { if (e.target === d || e.target.classList.contains('v-scene') || e.target === zone) fermer(); });
    addEventListener('resize', () => { if (d.open) ajuster(); });
    // Gestes : l'image suit le doigt (ou la souris). Sur le côté, au-delà de 60 px ou d'un geste vif, elle part vers la
    // voisine avec son élan ; vers le bas, elle se détache en rapetissant, le fond et les commandes s'effacent à mesure, et
    // lâchée assez bas (ou d'un geste vif), elle retourne à sa vignette (fermer part de là où elle est). En deçà, elle
    // revient à sa place sur un ressort. transform et opacity seulement, plus la couleur du fond, unie.
    let tir = null;
    im.draggable = false;
    const lisser = () => { im.style.transform = ''; d.style.backgroundColor = ''; habillage.forEach((el) => { el.style.opacity = ''; }); };
    im.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || fermeture || passage || d.classList.contains('anime') || calme()) return;
      tir = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, dy: 0, vx: 0, vy: 0, axe: null, w: im.offsetWidth, h: im.offsetHeight };
    });
    im.addEventListener('pointermove', (e) => {
      if (!tir || e.pointerId !== tir.id) return;
      const dx = e.clientX - tir.x, dy = e.clientY - tir.y, dt = Math.max(1, e.timeStamp - tir.t);
      if (!tir.axe) {
        if (Math.hypot(dx, dy) < 8) return;
        tir.axe = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        im.setPointerCapture(e.pointerId);
      }
      tir.vx = (dx - tir.dx) / dt; tir.vy = (dy - tir.dy) / dt; tir.t = e.timeStamp; tir.dx = dx; tir.dy = dy;
      if (tir.axe === 'x') { im.style.transform = `translateX(${dx}px)`; return; }
      // Origine de l'image en haut à gauche (FLIP) : la réduction se recentre d'elle-même.
      const p = Math.min(1, Math.max(0, dy) / (innerHeight * 0.45)), e2 = 1 - p * 0.25;
      im.style.transform = `translate(${dx * 0.5 + ((1 - e2) * tir.w) / 2}px, ${(dy > 0 ? dy : dy * 0.3) + ((1 - e2) * tir.h) / 2}px) scale(${e2})`;
      d.style.backgroundColor = `color-mix(in srgb, ${fond} ${Math.round((1 - p) * 100)}%, transparent)`;
      habillage.forEach((el) => { el.style.opacity = String(1 - p); });
    });
    const lacher = (e) => {
      if (!tir || e.pointerId !== tir.id) return;
      const t = tir, vif = e.timeStamp - t.t < 90;
      tir = null;
      if (!t.axe) return;
      if (t.axe === 'x' && (Math.abs(t.dx) > 60 || (vif && Math.abs(t.vx) > 0.4 && Math.sign(t.vx) === Math.sign(t.dx)))) { const s = t.dx < 0 ? 1 : -1; aller(k + s, s); return; }
      if (t.axe === 'y' && (t.dy > 110 || (vif && t.vy > 0.5))) { fermer(); return; }
      const vu = { tr: getComputedStyle(im).transform, fond: d.style.backgroundColor, habits: habillage.map((el) => el.style.opacity) };
      lisser();
      im.animate([{ transform: vu.tr }, { transform: 'none' }], { duration: 380, easing: RESSORT });
      if (vu.fond) d.animate([{ backgroundColor: vu.fond }, { backgroundColor: fond }], { duration: 240, easing: 'ease-out' });
      habillage.forEach((el, i) => { if (vu.habits[i]) el.animate([{ opacity: vu.habits[i] }, { opacity: 1 }], { duration: 240, easing: 'ease-out' }); });
    };
    im.addEventListener('pointerup', lacher);
    im.addEventListener('pointercancel', lacher);
    // Le focus revient sur l'image de la page que l'on regardait en dernier (celle qui a ouvert, si l'on n'a pas navigué).
    d.addEventListener('close', () => {
      d.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      d.classList.remove('ouvre', 'anime', 'passe');
      lisser();
      document.documentElement.style.removeProperty('--barre');
      montrerVignette();
      seance++;
      passage = false;
      fermeture = false;
      im.removeAttribute('srcset');
      im.removeAttribute('src');
      if (versFormulaire) { versFormulaire = false; return; }
      boutons.get(liste[affiche].id)?.focus({ preventScroll: true });
    });
    // « Signaler cette image » : le lien de la visionneuse (galerie) ou celui du crédit (salle des personnes). Le
    // formulaire est sur la même page : on y va sans recharger, l'image déjà choisie.
    d.addEventListener('click', (e) => {
      if (!e.target.closest('.v-signaler, a[href*="#reclamation"]') || !$('#reclamation')) return;
      e.preventDefault();
      versFormulaire = true;
      const id = liste[affiche].id;
      d.close();
      $('#f-image').value = id;
      $('#reclamation').scrollIntoView({ behavior: 'instant' });
      $('#f-image').focus({ preventScroll: true });
    });
  }

  // ---------- Films : vignette locale, YouTube seulement au clic ----------
  // Rien n'est demandé à YouTube (ni lecteur, ni vignette) avant le clic. La vignette est une photographie de la galerie,
  // montrée entière sur la nuit, à droite du titre.
  function films(videos, parId, num) {
    if (!videos.length) return '';
    const spans = ['1 / span 7', '8 / span 5'];
    return `<section class="theme films" aria-labelledby="theme-films">
      <header class="theme-tete"><span class="theme-num" aria-hidden="true">${deux(num)}</span><h3 class="theme-titre" id="theme-films">${videos.length > 1 ? 'Deux films' : 'Un film'}</h3><span class="theme-compte">Sur YouTube</span></header>
      <div class="rangee">${videos.map((v, k) => {
        const vi = parId.get(v.vignette);
        const langue = v.langue && v.langue !== 'fr' ? ` lang="${esc(v.langue)}"` : '';
        return `<figure class="film-video" style="grid-column:${spans[k % 2]};align-self:${k % 2 ? 'end' : 'start'}">
          <div class="lecteur" data-video="${esc(v.id)}" data-titre="${esc(v.titre)}">
            <button type="button" class="lecteur-lire" aria-label="Lire la vidéo : ${esc(v.titre)}, ${esc(v.chaine)}. La lecture charge le lecteur de YouTube.">
              ${vi ? image({ ...vi, couleur: 'transparent' }, k % 2 ? '38vw' : '53vw', '') : ''}
              <span class="lecteur-voile" aria-hidden="true"></span>
              <span class="lecteur-texte" aria-hidden="true"><span class="lecteur-chaine">${esc(v.chaine)}</span><span class="lecteur-titre"${langue}>${esc(v.titre)}</span><span class="lecteur-note">La lecture charge le lecteur de YouTube.</span></span>
              <span class="lecteur-icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.5v11l9-5.5z"/></svg></span>
            </button>
          </div>
          <figcaption class="lecteur-credit">Vidéo : ${lien(v.chaine_url, esc(v.chaine))}, sur YouTube.${vi ? ` Vignette : ${esc(vi.legende)}. ${credit(vi)}` : ''}</figcaption>
        </figure>`;
      }).join('')}</div>
    </section>`;
  }
  function lecteurs() {
    $('#galerie-themes').addEventListener('click', (e) => {
      const b = e.target.closest('.lecteur-lire');
      if (!b) return;
      const l = b.closest('.lecteur');
      l.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(l.dataset.video)}?autoplay=1" title="${esc(l.dataset.titre)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      l.classList.add('lance');
      $('iframe', l).focus();
    });
  }

  // ---------- Formulaires du pied : un courriel préparé, aucun service tiers ----------
  // L'adresse n'est écrite en clair ni dans la page ni dans ce script : elle se compose au moment de l'envoi.
  const MORCEAUX = [[115, 126, 102, 124, 122, 124, 106, 112, 116, 114, 113, 102, 112, 106, 123, 110, 115], [108, 114, 102, 110, 113, 51, 104, 116, 114]];
  const destinataire = () => MORCEAUX.map((m) => String.fromCharCode(...m.map((c) => c - 5))).join(String.fromCharCode(64));
  const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const LIEN = /^https?:\/\/[^\s/]+\.[^\s]+$/i;

  // Commun aux deux formulaires : erreurs à l'envoi puis corrigées à la saisie, courriel ouvert par mailto:, et repli
  // (le message à copier, l'adresse révélée seulement alors). e : préfixe des messages d'erreur ; r : identifiant du repli ;
  // groupes : les champs à plusieurs boutons ; rediger() rend l'objet et le corps du message.
  function courriel(f, e, r, TESTS, groupes, rediger) {
    const champs = (cle) => (groupes.includes(cle) ? $$(`input[name="${cle}"]`, f) : [f.elements[cle]]);
    const marquer = (cle) => {
      const msg = TESTS[cle](), el = $(`#${e}${cle}`);
      el.textContent = msg;
      el.hidden = !msg;
      champs(cle).forEach((c) => (msg ? c.setAttribute('aria-invalid', 'true') : c.removeAttribute('aria-invalid')));
      return msg;
    };
    // Une erreur affichée se corrige à la saisie ; les autres n'apparaissent qu'à l'envoi.
    const corriger = (ev) => { const cle = ev.target.name; if (TESTS[cle] && !$(`#${e}${cle}`).hidden) marquer(cle); };
    f.addEventListener('input', corriger);
    f.addEventListener('change', corriger);
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fautes = Object.keys(TESTS).filter((cle) => marquer(cle));
      if (fautes.length) { champs(fautes[0])[0].focus(); return; }
      const { sujet, corps } = rediger(), dest = destinataire();
      const a = document.createElement('a');
      a.href = `mailto:${dest}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps.replace(/\n/g, '\r\n'))}`;
      a.click();
      $(`#${r}-adresse`).innerHTML = `<a href="mailto:${dest}">${dest}</a>`;
      $(`#${r}-texte`).value = `À : ${dest}\nObjet : ${sujet}\n\n${corps}`;
      $(`#${r}-etat`).textContent = '';
      $(`#${r}`).hidden = false;
      $(`#${r}`).focus();
    });
    $(`#${r}-copier`).addEventListener('click', async () => {
      const t = $(`#${r}-texte`);
      let ok = false;
      try { await navigator.clipboard.writeText(t.value); ok = true; } catch {
        t.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
      }
      $(`#${r}-etat`).textContent = ok ? 'Message copié.' : 'Copie impossible ici : sélectionnez le texte, puis Ctrl+C.';
    });
  }

  // Réclamation de droits sur une image de la galerie, ou d'une page de la salle des personnes (personne : { id, nom },
  // le formulaire est alors dans la salle elle-même). ?image=<identifiant> la choisit d'avance.
  function reclamation(themes, numero, personne) {
    const f = $('#formulaire'), choix = $('#f-image');
    const avant = choix.value || new URLSearchParams(location.search).get('image') || '';
    const num = (i) => (numero.get(i.id) ? `${numero.get(i.id)}. ` : '');   // le portrait d'entrée n'a pas de numéro
    choix.innerHTML = `<option value="">Choisir une image</option>${themes.map((t) => `<optgroup label="${esc(t.titre)}">${t.images.map((i) => `<option value="${esc(i.id)}">${num(i)}${esc(i.legende)}</option>`).join('')}</optgroup>`).join('')}<option value="autre">Autre image (à décrire dans le message)</option>`;
    if ([...choix.options].some((o) => o.value === avant)) choix.value = avant;
    const parId = new Map(themes.flatMap((t) => t.images).map((i) => [i.id, i]));
    const val = (n) => (f.elements[n].value ?? '').trim();
    courriel(f, 'e-', 'repli', {
      nom: () => (val('nom') ? '' : 'Indiquez votre nom.'),
      courriel: () => (!val('courriel') ? 'Indiquez votre adresse électronique.' : f.elements.courriel.validity.typeMismatch || !COURRIEL.test(val('courriel')) ? 'Cette adresse électronique n\'est pas valide (exemple : nom@exemple.org).' : ''),
      image: () => (val('image') ? '' : 'Choisissez l\'image concernée, ou « Autre image ».'),
      demande: () => (val('demande') ? '' : 'Choisissez : créditer ou retirer l\'image.'),
      lien: () => (!val('lien') || LIEN.test(val('lien')) ? '' : 'Ce lien n\'est pas une adresse web complète : elle commence par https://.'),
      message: () => (val('message') ? '' : 'Écrivez quelques mots sur votre demande.'),
    }, ['demande'], () => {
      const i = parId.get(val('image'));
      return {
        sujet: `Réclamation de droits : ${personne ? `${personne.nom}, ${i ? i.id : 'autre image'}` : i ? `${i.legende} (${i.id})` : 'autre image'}`,
        corps: [
          'Bonjour,', '',
          `Je vous écris au sujet d'une image ${personne ? `de la page de ${personne.nom}, salle « Ces Togolais(es) qui m'ont marqué »,` : 'de la galerie'} de « Togo, musée d'art et d'histoire ».`, '',
          `Image concernée : ${i ? `${numero.get(i.id) ? `n° ${numero.get(i.id)}, ` : ''}${i.legende} (${i.id}), source indiquée : ${i.site ?? SOURCES[i.source]}` : 'autre image, décrite dans le message'}`,
          `Demande : ${val('demande') === 'retirer' ? 'retirer l\'image' : 'créditer l\'image'}`,
          `Lien établissant mes droits : ${val('lien') || 'non fourni'}`, '',
          'Message :', val('message'), '',
          val('nom'), val('courriel'), '',
          // Une adresse qui s'ouvre sur tout appareil : la page de la personne, sinon le fichier de l'image elle-même,
          // sinon (autre image) les crédits du musée.
          personne ? `Page : ${location.origin}${location.pathname}?p=${encodeURIComponent(personne.id)}`
            : i ? `Image en ligne : ${location.origin}${location.pathname.replace(/[^/]*$/, '')}${dossier(i)}${i.id}-${Math.max(...i.tailles)}.webp`
            : `Page : ${location.origin}${location.pathname.replace(/[^/]*$/, '')}#/credits`,
        ].join('\n'),
      };
    });
  }

  // Contribution au musée : une image, un document, un témoignage, une correction. Ne dépend pas de la galerie.
  function contribution() {
    const f = $('#contribution-formulaire');
    const val = (n) => (f.elements[n].value ?? '').trim();
    courriel(f, 'ce-', 'c-repli', {
      courriel: () => (!val('courriel') ? 'Indiquez votre adresse électronique, pour qu\'on puisse vous répondre.' : f.elements.courriel.validity.typeMismatch || !COURRIEL.test(val('courriel')) ? 'Cette adresse électronique n\'est pas valide (exemple : nom@exemple.org).' : ''),
      nature: () => (val('nature') ? '' : 'Choisissez le type de contribution.'),
      sujet: () => (val('sujet') ? '' : 'Indiquez la salle ou le sujet concerné.'),
      lien: () => (!val('lien') || LIEN.test(val('lien')) ? '' : 'Ce lien n\'est pas une adresse web complète : elle commence par https://.'),
      message: () => (val('message') ? '' : 'Décrivez votre contribution en quelques mots.'),
      droits: () => (f.elements.droits.checked ? '' : 'Cochez cette case : sans droits ni source, la contribution ne peut pas être publiée.'),
    }, ['nature'], () => ({
      sujet: `Contribution : ${val('nature')}`,
      corps: [
        'Bonjour,', '',
        'Je propose une contribution à « Togo, musée d\'art et d\'histoire ».', '',
        `Type : ${val('nature')}`,
        `Salle ou sujet concerné : ${val('sujet')}`,
        `Lien : ${val('lien') || 'non fourni'}`, '',
        'Message :', val('message'), '',
        'Je détiens les droits sur ce que je propose, ou j\'en indique la source.', '',
        val('nom') || '(nom non indiqué)', val('courriel'), '',
        `Page : ${location.origin}${location.pathname}#contribution`,
      ].join('\n'),
    }));
  }

  // Hors de l'accueil pour ordinateur (salle des personnes), rien ne démarre : la composition, l'image, la visionneuse et
  // le formulaire de réclamation y sont prêtés tels quels. Sur reclamation.html, le formulaire de la galerie seul.
  window.togoGalerie = { rangees, poser, image, credit, visionneuse, reclamation };
  if ($('#reclamation[data-galerie]')) formulaireSeul();
  if (!$('#galerie-themes')) return;
  contribution();
  demarrer();
})();
