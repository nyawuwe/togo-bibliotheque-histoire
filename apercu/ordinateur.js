// Togo, musée d'art et d'histoire : accueil pour ordinateur (servi tel quel depuis public/, à côté d'index.html).
// L'ouverture, l'affiche, les salles en cartes, puis la galerie (galerie.js, chargé à l'approche) ; chaque lien mène à
// l'écran correspondant d'index.html, en grand.
// Tout est lu à l'exécution dans les données du site (data/), sans rien recopier : le nombre de salles, leurs textes,
// leurs archives et les objets.
// Un seul écouteur de défilement, cadencé par requestAnimationFrame, écrit des variables CSS ; le reste est en CSS.
'use strict';

(() => {
  const BASE = '';
  const IMAGES = `${BASE}images/archives/`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));

  // Réglages de présentation propres à cette proposition (jamais du contenu) : un identifiant absent des données est ignoré.
  const FILM = ['bandjeli-hauts-fourneaux', 'sokode-cavaliers', 'bellin-golfe-benin', 'lome-gare', 'kamina-antennes', 'takienta-tamberma'];
  const FOND_SALLES = 'takienta-tamberma';
  // Pose des objets dans l'affiche, à l'état final : centre horizontal (% de la largeur), hauteur et retrait du bas
  // en unités u (style.css, .foule), plan (1 devant, 3 au fond). Chaque plan garde sa ligne de base : la profondeur
  // survit à la fin de la parallaxe. Les objets se chevauchent, mais aucun ne sort par un bord : ordinateur.css borne leur place (consigne du
  // 15/11 : une image n'est jamais rognée).
  const POSES = {
    'statuette-00217': { x: 4, h: 46, bas: 9, plan: 2 },
    cloche: { x: 36, h: 48, bas: 5.5, plan: 1 },
    'vase-00318': { x: 72, h: 19, bas: 20, plan: 3 },
    'statuette-00140': { x: 92.5, h: 48, bas: 6, plan: 1 },
  };
  // PLAN §2 : pas de masque en figure de proue. Il reste dans sa salle (archive de la salle 4) et dans les crédits.
  const HORS_AFFICHE = new Set(['masque']);

  // ---------- Texte ----------
  // Espace insécable devant « : ; ! ? » et à l'intérieur des guillemets : une ligne ne commence jamais par la
  // ponctuation (« Commons : PD-old », « Agbodrafo »).
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]).replace(/ (?=[:;!?»])/g, '\u00a0').replace(/« /g, '«\u00a0');
  // Siècles et premiers en exposant (« XVe », « Ier »), comme sur le site actuel.
  const riche = (s) => esc(s).replace(/\b(1|[IVX]+)(er|e)\b/g, '$1<sup>$2</sup>');
  const point = (s) => { const t = String(s ?? '').trim(); return !t ? '' : /[.!?»]$/.test(t) ? t : `${t}.`; };
  const LETTRES = ['Aucune', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze'];
  const enLettres = (n) => LETTRES[n] ?? String(n);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  // Première phrase d'un texte, reprise telle quelle : on ne coupe ni après une initiale (« P. de Barros ») ni après « av. ».
  function premierePhrase(t) {
    const re = /[.!?](?=\s+[A-ZÀÂÉÈÊÎÔÛÇ«])/g;
    let m;
    while ((m = re.exec(t))) {
      const avant = t.slice(0, m.index);
      if (/(\b[A-Z]|\bav|\bapr|\bn°|\bp)$/.test(avant)) continue;
      return t.slice(0, m.index + 1);
    }
    return t;
  }

  // ---------- Images : WebP en srcset, repli JPEG, jamais agrandies (même règle que site/src/tailles.js) ----------
  const tailles = (l) => { const t = [480, 960, 1600].filter((x) => x <= l); if (l < 1600 && !t.includes(l)) t.push(l); return t; };
  const plusGrande = (a, max = 1600) => tailles(a.largeur).filter((x) => x <= max).at(-1);
  function image(a, { sizes = '100vw', lazy = true, alt = a.titre } = {}) {
    const t = tailles(a.largeur);
    const set = (ext) => t.map((x) => `${IMAGES}${a.id}-${x}.${ext} ${x}w`).join(', ');
    return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${IMAGES}${a.id}-${t[0]}.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${esc(alt)}" width="${a.largeur}" height="${a.hauteur}"${lazy ? ' loading="lazy"' : ''} decoding="async" style="background-color:${esc(a.couleur ?? '#d9cfbf')}"></picture>`;
  }
  // Vignette entière : le fond est celui du cadre (passe-partout, ordinateur.css), jamais la couleur moyenne de l'image.
  // Ses proportions sont posées d'avance (width, height) : une rangée de vignettes ne se replie plus au chargement,
  // ce qui déplaçait la salle visée par une ancre d'arrivée.
  const vignette = (a, alt) => `<picture><source type="image/webp" srcset="${IMAGES}${a.id}-vignette.webp"><img src="${IMAGES}${a.id}-vignette.jpg" alt="${esc(alt)}" width="${Number(a.largeur) || ''}" height="${Number(a.hauteur) || ''}" loading="lazy" decoding="async"></picture>`;
  const licence = (a) => (a.licence_url ? `<a href="${esc(a.licence_url)}" rel="license">${esc(a.licence)}</a>` : esc(a.licence));
  // ---------- Données ----------
  const json = async (f) => { const r = await fetch(`${BASE}data/${f}`); if (!r.ok) throw new Error(`${f} : HTTP ${r.status}`); return r.json(); };
  let D;
  const parId = new Map();
  const decor = (a) => (a && a.decor !== false ? a : undefined);
  const archivesDe = (s) => (s.archives ?? []).map((id) => parId.get(id)).filter(Boolean);
  // ---------- 0. Ouverture : clichés du Togo ----------
  const racine = document.documentElement;
  const params = new URLSearchParams(location.search);
  function memoire(cle, valeur) {
    try { if (valeur === undefined) return sessionStorage.getItem(cle); sessionStorage.setItem(cle, valeur); } catch { /* stockage indisponible : sans effet */ }
    return null;
  }
  // Une arrivée sur une ancre de cette page (#salles) va droit à sa cible, sans l'ouverture. « Revoir l'ouverture » la
  // rejoue à la demande, même sous mouvement réduit : sans zoom ni rideau alors (ordinateur.css).
  const veutFilm = () => !reduit.matches && params.get('ouverture') !== '0' && (params.get('ouverture') === '1' || (!memoire('togo-ouverture-vue') && location.hash.length < 2));
  const cliches = () => FILM.map((id) => decor(parId.get(id))).filter(Boolean);
  let masquer = 0;

  function ouverture(demande = false) {
    const liste = cliches();
    if (liste.length < 2 || !(demande || veutFilm())) return;
    const film = $('#film'), boite = $('#film-images'), legendeFilm = $('#film-legende'), segs = $('#film-segments');
    // Le film couvre toute la page : derrière lui, rien ne se lit au lecteur d'écran ni ne prend le focus.
    const derriere = [$('.evitement'), $('main')];
    const DUREE = 3400, TITRE = 2200;
    clearTimeout(masquer);
    boite.innerHTML = liste.map((a) => `<div class="film-image"><img src="${IMAGES}${a.id}-${plusGrande(a)}.webp" alt="" decoding="async" style="object-position:${esc(D.mise?.cadrages?.[a.id] ?? '50% 50%')}"></div>`).join('');
    segs.innerHTML = liste.map(() => '<li><span></span></li>').join('');
    const images = $$('.film-image', boite), traits = $$('li', segs);
    let i = -1, minuteur = 0, fini = false;
    film.classList.remove('leve', 'vite', 'titre-visible');
    film.hidden = false;
    racine.classList.add('film-actif');
    derriere.forEach((el) => { el.inert = true; });
    if (demande) scrollTo({ top: 0, behavior: 'instant' });
    $('#film-passer').focus({ preventScroll: true });

    const montrer = (n) => {
      images.forEach((el, k) => el.classList.toggle('actif', k === n));
      traits.forEach((el, k) => { el.classList.toggle('fait', k < n); el.classList.toggle('actif', k === n); });
      const a = liste[n];
      legendeFilm.innerHTML = `<span class="film-legende-titre">${esc(a.titre)}</span><span>${riche(point(a.date))} ${esc(a.lieu ?? '')}</span>`;
    };
    const suivant = () => {
      i += 1;
      if (i < liste.length) { montrer(i); minuteur = setTimeout(suivant, DUREE); return; }
      film.classList.add('titre-visible');
      minuteur = setTimeout(() => lever(false), TITRE);
    };
    function lever(vite) {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      memoire('togo-ouverture-vue', '1');
      ['wheel', 'touchmove', 'keydown'].forEach((t) => removeEventListener(t, interrompre, { capture: true }));
      const focusDedans = film.contains(document.activeElement);
      film.classList.add('leve');
      if (vite) film.classList.add('vite');
      racine.classList.remove('film-actif');
      derriere.forEach((el) => { el.inert = false; });
      if (focusDedans) $('#titre').focus({ preventScroll: true });
      masquer = setTimeout(() => { film.hidden = true; boite.innerHTML = ''; }, vite ? 750 : 1200);
    }
    function interrompre(e) {
      if (e.type === 'keydown' && ['Tab', 'Shift'].includes(e.key)) return;
      if (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' ') && e.target === $('#film-passer')) return;
      e.preventDefault();
      lever(true);
    }
    ['wheel', 'touchmove', 'keydown'].forEach((t) => addEventListener(t, interrompre, { capture: true, passive: false }));
    $('#film-passer').onclick = () => lever(true);
    // Le premier cliché chargé (ou 2,5 s au plus) donne le départ : jamais d'écran noir à vide.
    const premier = images[0].querySelector('img');
    const go = () => { if (i === -1 && !fini) suivant(); };
    if (premier.complete) go(); else { premier.addEventListener('load', go, { once: true }); premier.addEventListener('error', go, { once: true }); setTimeout(go, 2500); }
  }

  // ---------- 1. L'affiche : les objets de la collection en bas de page ----------
  function affiche() {
    const n = D.salles.length;
    // Le titre s'écrit dans ordinateur.html seulement. Sa fin suit l'année la plus tardive des salles (une salle
    // thématique peut se ranger après la plus récente) : « à l'indépendance » (PLAN, option A) si le récit s'arrête en
    // 1960, la fin écrite dans le HTML s'il va jusqu'aux dernières années, un titre neutre sinon. La première ligne
    // est reprise du HTML.
    const fin = Math.max(0, ...D.salles.flatMap((s) => String(s.periode ?? '').match(/\d{4}/g) ?? []).map(Number));
    const debut = $('#titre').innerHTML.split(/<br\s*\/?>/i)[0];
    if (fin === 1960) $('#titre').innerHTML = `${debut}<br>à l'indépendance`;
    else if (fin < new Date().getFullYear() - 2) $('#titre').innerHTML = 'Histoire<br>du Togo';
    $('#compte').innerHTML = `<span>${enLettres(n)} salle${n > 1 ? 's' : ''}</span><br><span>${pluriel(D.archives.length, 'archive')}, ${pluriel(D.objets.length, 'objet')}</span>`;
    const montres = D.objets.filter((o) => !HORS_AFFICHE.has(o.id));
    const connus = montres.filter((o) => POSES[o.id]), autres = montres.filter((o) => !POSES[o.id]);
    // Un objet ajouté aux données sans pose se range en second plan, réparti sur la largeur.
    const pose = (o, k) => POSES[o.id] ?? { x: ((k + 0.5) / autres.length) * 100, h: 30, bas: 14, plan: 2 };
    $('#foule').innerHTML = [...connus, ...autres].map((o, k) => {
      const p = pose(o, k - connus.length);
      return `<figure class="objet plan-${p.plan}" style="--x:${p.x};--h:${p.h};--bas:${p.bas};--r:${(o.largeur / o.hauteur).toFixed(4)}">
        <img src="${BASE}images/objets/${esc(o.image)}.webp" alt="${esc(o.alt)}" width="${o.largeur}" height="${o.hauteur}" decoding="async">
        <figcaption class="cartel"><span class="cartel-nom">${esc(o.nom)}</span><span>${riche(o.reperes_bande)}</span></figcaption>
      </figure>`;
    }).join('');
  }

  // ---------- Index ----------
  function index() {
    const bouton = $('#bouton-index'), panneau = $('#index');
    $('#index-liste').innerHTML = D.salles.map((s) => `<li><a href="./#/salle/${esc(s.id)}"><span class="index-num">${s.numero}</span><span class="index-nom">${esc(s.titre)}</span><span class="index-periode">${riche(s.periode)}</span></a></li>`).join('');
    const basculer = (ouvrir) => {
      panneau.hidden = !ouvrir;
      bouton.setAttribute('aria-expanded', String(ouvrir));
      if (ouvrir) $('a', panneau).focus(); else if (panneau.contains(document.activeElement) || document.activeElement === document.body) bouton.focus();
    };
    bouton.addEventListener('click', () => basculer(panneau.hidden));
    $('#index-fermer').addEventListener('click', () => basculer(false));
    panneau.addEventListener('click', (e) => { if (e.target.closest('a, [data-revoir]')) basculer(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panneau.hidden) basculer(false); });
  }

  // ---------- 2. Les salles en cartes sur l'archive sépia ----------
  function planche() {
    const fond = decor(parId.get(FOND_SALLES)) ?? D.archives.find((a) => decor(a) && a.largeur >= 1400 && a.largeur / a.hauteur > 1.3);
    if (fond) {
      $('#planche-fond').innerHTML = image(fond, { sizes: '100vw', alt: '' });
      $('#planche-credit').innerHTML = `Fond : ${esc(fond.titre)}, ${riche(fond.date)}. ${esc(point(fond.auteur))} ${licence(fond)}. Mis en sépia et légèrement assombri à l'affichage. <a href="${esc(fond.lien)}">Original</a>.`;
    }
    const piste = $('#cartes-piste');
    piste.innerHTML = D.salles.map((s, i) => {
      const a = archivesDe(s);
      return `<li class="carte" data-i="${i}">
        <button type="button" class="carte-tete" aria-expanded="false" aria-controls="carte-corps-${i}">
          <span class="carte-num" aria-hidden="true">${s.numero}</span>
          <span class="carte-espace" aria-hidden="true"></span>
          <span class="carte-nom"><span class="visuellement-cache">Salle ${s.numero} : </span>${esc(s.titre)}</span>
          <span class="carte-periode">${riche(s.periode)}</span>
        </button>
        <div class="carte-corps" id="carte-corps-${i}">
          <p class="carte-texte">${riche(premierePhrase(s.texte ?? ''))}</p>
          <div class="carte-pied">
            <span class="carte-vignettes" aria-hidden="true">${a.filter(decor).slice(0, 4).map((x) => vignette(x, '')).join('')}</span>
            <span class="carte-compte">${pluriel(a.length, 'archive')}</span>
            <a class="carte-lien" href="./#/salle/${esc(s.id)}">Entrer dans la salle<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></a>
          </div>
        </div>
      </li>`;
    }).join('');
    const cartes = $$('.carte', piste), n = cartes.length;
    const prec = $('#carte-precedente'), suiv = $('#carte-suivante'), zone = $('#cartes');
    let actif = -1, x = null;
    // La carte choisie se transforme sur place et ses voisines se resserrent (ordinateur.css, une seule courbe). La piste
    // ne bouge que du strict nécessaire pour garder la carte ouverte dans la planche, à --bord des deux côtés, et jamais
    // au-delà de sa position de départ. Une lecture de style par choix, aucune par image.
    const placer = () => {
      const st = getComputedStyle(piste), px = (v) => parseFloat(st.getPropertyValue(v));
      const w = px('--w'), wo = px('--wo'), gap = px('--gap'), bord = px('--bord'), avant = actif * (w + gap);
      x = Math.min(bord, Math.max(bord - avant, Math.min(x ?? bord, zone.clientWidth - bord - wo - avant)));
      piste.style.setProperty('--x', `${x}px`);
    };
    addEventListener('resize', placer);
    const choisir = (k, annoncer = true) => {
      k = borne(k, 0, n - 1);
      if (k === actif) return;
      actif = k;
      cartes.forEach((c, j) => {
        const ouverte = j === k;
        c.classList.toggle('ouverte', ouverte);
        c.toggleAttribute('aria-current', ouverte);
        $('.carte-tete', c).setAttribute('aria-expanded', String(ouverte));
        $('.carte-corps', c).inert = !ouverte;
      });
      placer();
      $('#planche').style.setProperty('--avance', n > 1 ? k / (n - 1) : 0);
      $('#progression-niveau').style.cssText = `width:${100 / n}%;transform:translateX(${k * 100}%)`;
      $('#progression-compte').textContent = `Salle ${k + 1} sur ${n}`;
      prec.disabled = k === 0;
      suiv.disabled = k === n - 1;
      if (annoncer) $('#cartes-annonce').textContent = `Salle ${D.salles[k].numero} sur ${n} : ${D.salles[k].titre}, ${D.salles[k].periode}.`;
    };
    // Le focus clavier ouvre la carte qu'il atteint : la piste l'amène dans le champ, jamais hors de la planche.
    cartes.forEach((c, j) => { const t = $('.carte-tete', c); t.addEventListener('click', () => choisir(j)); t.addEventListener('focus', () => choisir(j)); });
    prec.addEventListener('click', () => choisir(actif - 1));
    suiv.addEventListener('click', () => choisir(actif + 1));
    $('#cartes').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      choisir(actif + (e.key === 'ArrowRight' ? 1 : -1));
      $('.carte-tete', cartes[actif]).focus({ preventScroll: true });
    });
    const depart = Number(params.get('salle'));
    choisir(Number.isInteger(depart) && depart > 0 ? depart - 1 : 0, false);
  }

  // ---------- Défilement : une seule boucle, des variables CSS ----------
  function defilement() {
    const scene = $('#scene'), affiche = $('#affiche'), planche = $('#planche');
    let attente = false;
    const maj = () => {
      attente = false;
      const h = innerHeight, mouvement = !reduit.matches;
      // L'affiche : 0 en haut, 1 quand la scène collante se libère. Le titre sort par le haut en premier (--pt) ;
      // les objets (--po) montent jusqu'au bout. Sous mouvement réduit : objets posés et cartels visibles d'emblée.
      const ra = affiche.getBoundingClientRect(), p = borne(-ra.top / Math.max(1, ra.height - h), 0, 1);
      scene.style.setProperty('--pt', mouvement ? Math.min(1, p * 1.4).toFixed(4) : 0);
      scene.style.setProperty('--po', mouvement ? p.toFixed(4) : 1);
      // La planche : de -1 (sous l'écran) à 1 (au-dessus), pour un léger banc-titre de sa photographie de fond.
      const r = planche.getBoundingClientRect();
      planche.style.setProperty('--v', mouvement ? borne((h / 2 - (r.top + r.height / 2)) / ((h + r.height) / 2), -1, 1).toFixed(4) : 0);
    };
    const demander = () => { if (!attente) { attente = true; requestAnimationFrame(maj); } };
    addEventListener('scroll', demander, { passive: true });
    addEventListener('resize', demander);
    reduit.addEventListener('change', demander);
    maj();
  }

  // ---------- 3. La galerie et le pied : chargés à l'approche ----------
  // galerie.js (la galerie, ses films, sa visionneuse, le formulaire de réclamation) et ses données ne se demandent qu'à
  // une hauteur d'écran de la galerie ou du pied : rien de la galerie ne se charge à l'arrivée sur la page.
  function galerieAuBesoin() {
    $('#formulaire').addEventListener('submit', (e) => e.preventDefault());   // tant que galerie.js n'est pas là
    const io = new IntersectionObserver((entrees) => {
      if (!entrees.some((e) => e.isIntersecting)) return;
      io.disconnect();
      document.head.append(Object.assign(document.createElement('script'), { src: `${BASE}galerie.js` }));
    }, { rootMargin: '100% 0px' });
    ['#galerie', '.pied'].forEach((s) => io.observe($(s)));
  }

  async function demarrer() {
    galerieAuBesoin();
    try {
      const [salles, archives, objets, mise] = await Promise.all(['salles.json', 'archives.json', 'objets.json', 'mise-en-page.json'].map(json));
      D = { salles, archives, objets, mise };
      archives.forEach((a) => parId.set(a.id, a));
    } catch (e) {
      document.body.insertAdjacentHTML('afterbegin', `<p class="sans-script" role="alert">Les données du site n'ont pas pu être lues (${esc(e.message)}). Recharger la page.</p>`);
      return;
    }
    ouverture();
    affiche();
    index();
    planche();
    defilement();
    racine.classList.add('pret');
    if (cliches().length >= 2) $$('[data-revoir]').forEach((b) => { b.hidden = false; b.addEventListener('click', () => ouverture(true)); });
    // Commencer la visite : le geste est fait ici, la visite démarre dans un autre document (index.html). Ce drapeau,
    // lu une fois là-bas, y lance la voix ; un navigateur qui refuse le son garde la visite muette et montre le bouton Voix.
    document.addEventListener('click', (e) => { if (e.target.closest('a[href*="#/tableau/"]')) memoire('togo-son', '1'); });
    // Une ancre de cette page (#salles) vise un élément sous l'affiche : saut direct, le défilement doux de la page
    // (html { scroll-behavior: smooth }) traverserait toute l'affiche. Les ancres d'écran sont parties vers index.html.
    try { if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch { /* ancre mal formée : ignorée */ }
  }
  demarrer();
})();
