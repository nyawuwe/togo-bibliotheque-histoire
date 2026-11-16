// Togo, musée d'art et d'histoire : la salle « Ces Togolais(es) qui m'ont marqué » (personnes.html), une page par
// personne (?p=identifiant, la première sans paramètre). En tête, l'entrée de la maquette : rail des portraits, grand
// portrait, nom, naissance et mort avec dates et lieux, vignettes. Dessous, la page : sa voix (enregistrement authentique,
// ou « enregistrement à venir »), une citation ou un fait marquant, puis le défilé de la galerie (galerie.js : mêmes
// rangées, même visionneuse, même morph) où les paragraphes de la biographie prennent place entre les images, de sorte
// qu'une personne qui n'a que trois images n'a ni trou ni image répétée. Divergences, sources, crédits et le formulaire « Signaler une image » ferment la page.
// Données : data/personnes.json (outils/importer-personnes.mjs, depuis contenu/personnes.json).
'use strict';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]).replace(/ (?=[:;!?»])/g, ' ').replace(/« /g, '« ');
  const lignes = (s) => esc(s).replace(/\n/g, '<br>');
  const G = window.togoGalerie;

  // Musique : proposée d'emblée sur grand écran, comme l'accueil ; sur téléphone, le bouton seul.
  // Même requête que personnes.css (max-width: 1100px), pour qu'aucune largeur fractionnaire (zoom) ne tombe entre les deux.
  const grandEcran = () => !matchMedia('(max-width: 1100px)').matches;
  window.togoMusique?.demarrer({ auto: grandEcran() });
  // Le bouton du son est fixe : en descendant, il se retire (classe « replie », personnes.css) pour ne pas rester posé sur
  // le texte qu'on lit ; il revient dès qu'on remonte de quelques pixels, et en haut de page.
  let dernier = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (Math.abs(y - dernier) < 6 && y > 80) return;
    $('.bouton-son')?.classList.toggle('replie', y > dernier && y > 80);
    dernier = y;
  }, { passive: true });

  const duree = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
  const annee = (t) => t.match(/\b(1[89]\d\d|20\d\d)\b/)?.[0] ?? '';
  // Renvois aux sources : leur numéro dans la liste de la personne, en bas de page.
  // L'onde du lecteur de la voix : un dessin fixe, propre à chaque personne (ce n'est pas l'analyse du son), plus haut au
  // milieu qu'aux bords.
  const ONDE = 44;
  const onde = (id) => {
    const graine = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: ONDE }, (_, k) => { const x = Math.sin((k + 1) * 12.9898 + graine * 78.233) * 43758.5453; return (0.3 + 0.7 * (x - Math.floor(x))) * (0.55 + 0.45 * Math.sin(((k + 0.5) / ONDE) * Math.PI)); });
  };
  const renvois = (p, ids) => `<p class="p-refs">Sources : ${ids.map((s) => [s, p.sources.findIndex((x) => x.id === s) + 1]).sort((a, b) => a[1] - b[1]).map(([s, n]) => `<a href="#source-${esc(s)}">${n}</a>`).join(', ')}</p>`;

  async function demarrer() {
    let D;
    try {
      const r = await fetch('data/personnes.json');
      if (!r.ok) throw new Error(`personnes.json : HTTP ${r.status}`);
      D = await r.json();
    } catch (e) {
      $('#p-titrage').innerHTML = `<p class="p-erreur" role="alert">La salle n'a pas pu être lue (${esc(e.message)}). Recharger la page.</p>`;
      return;
    }
    const demande = new URLSearchParams(location.search).get('p');
    const p = D.personnes.find((x) => x.id === demande) ?? D.personnes[0];
    const parId = new Map(D.images.map((i) => [i.id, i]));
    document.title = `${p.nom} · ${D.salle.titre} · Togo, musée d'art et d'histoire`;
    entree(D, p, parId);
    page(D, p, parId);
    // « Signaler cette image » hors de la visionneuse (crédits) : le formulaire est plus bas, on y va sans recharger. La
    // visionneuse fait de même pour son propre lien (galerie.js).
    document.addEventListener('click', (e) => {
      const a = !e.defaultPrevented && e.target.closest('a[href*="#reclamation"]');
      if (!a) return;
      const u = new URL(a.href, location.href), chemin = (s) => s.replace(/\.html$/, '');
      if (chemin(u.pathname) !== chemin(location.pathname) || u.searchParams.get('p') !== p.id) return;
      e.preventDefault();
      $('#f-image').value = u.searchParams.get('image') ?? '';
      $('#reclamation').scrollIntoView({ behavior: 'instant' });
      $('#f-image').focus({ preventScroll: true });
    });
    // Arrivée sur une ancre de la page (#page, #source-s3) : elle n'existait pas avant la construction.
    try { const cible = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); if (cible) cible.scrollIntoView({ behavior: 'instant' }); } catch { /* ancre mal formée */ }
  }

  // ---------- L'entrée : la maquette ----------
  function entree(D, p, parId) {
    $('#p-rail').innerHTML = D.personnes.map((q) => {
      const i = q.portrait && parId.get(q.portrait);
      const visage = i ? `<img src="${i.dossier}${i.id}-${i.tailles[0]}.webp" alt="" width="${i.largeur}" height="${i.hauteur}" decoding="async">` : `<span class="p-mono" aria-hidden="true">${esc(q.monogramme)}</span>`;
      return `<li><a href="?p=${esc(q.id)}"${q === p ? ' aria-current="page"' : ''}>${visage}<span class="p-rail-nom">${esc(q.nom)}</span></a></li>`;
    }).join('');

    const portrait = p.portrait && parId.get(p.portrait);
    $('#p-portrait').innerHTML = portrait
      ? G.image(portrait, `min(${portrait.largeur}px, 100vw)`).replace(' loading="lazy"', ' fetchpriority="high"').replace('style="', `style="--ratio:${portrait.largeur / portrait.hauteur};`)
      : `<span class="p-monogramme" aria-hidden="true">${esc(p.monogramme)}</span>`;

    // Sur grand écran, aucun texte ne passe sur le portrait, bords fondus compris : sa boîte entière reste au-dessus des
    // légendes des vignettes, sous la barre, et à droite de toute ligne du titrage qui monte à sa hauteur (24 px de garde).
    // Sa largeur est bornée à la place qui reste jusqu'à la marge, puis il glisse vers la droite s'il commence trop tôt.
    // Au-dessus de 1100 px seulement (dessous, l'entrée s'empile) ; recalé quand la fenêtre change.
    const img = $('#p-portrait img');
    if (img) {
      const fins = (e) => { const g = document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()]; };
      const caler = () => {
        const boite = $('#p-portrait'), garde = 24;
        boite.style.translate = ''; boite.style.removeProperty('--p-place'); boite.style.removeProperty('--p-bas');
        if (!grandEcran()) return;
        const entree = $('.p-entree').getBoundingClientRect(), barre = $('.p-barre').getBoundingClientRect();
        const legendes = [...document.querySelectorAll('.p-vignette-legende')].flatMap(fins);
        if (legendes.length) boite.style.setProperty('--p-bas', `${Math.ceil(entree.bottom - Math.min(...legendes.map((r) => r.top)) + 12)}px`);
        const pied = boite.getBoundingClientRect().bottom;
        const lire = $('.p-lire')?.getBoundingClientRect();
        const lignes = [...document.querySelectorAll('.p-salle, .p-nom, .p-role, .p-date dt, .p-date-jour, .p-date-lieu, .p-sans-portrait')].flatMap(fins)
          .concat(lire ? [lire] : []).filter((r) => r.width > 1 && r.top < pied);
        const gauche = Math.ceil(Math.max(0, ...lignes.map((r) => r.right)) + garde);
        const ratio = parseFloat(img.style.getPropertyValue('--ratio')) || img.width / img.height;
        boite.style.setProperty('--p-place', `${Math.floor(Math.min(barre.right - gauche, (pied - barre.bottom - 16) * ratio))}px`);
        const i = img.getBoundingClientRect();
        if (i.left < gauche) boite.style.translate = `${gauche - i.left}px 0`;   // pas arrondi : il dépasserait la marge d'un pixel
      };
      document.fonts.ready.then(caler);
      addEventListener('resize', caler);
    }

    const [ne, mort] = p.genre === 'f' ? ['Née', 'Morte'] : ['Né', 'Mort'];
    const date = (etiquette, d) => `<div class="p-date"><dt>${etiquette}</dt><dd><span class="p-date-jour"><time datetime="${esc(d.date)}">${esc(d.affiche)}</time></span><span class="p-date-lieu">${esc(d.lieu)}</span></dd></div>`;
    $('#p-titrage').innerHTML = `<p class="p-salle">${esc(D.salle.titre)}</p>
      <h1 class="p-nom" id="p-nom">${esc(p.nom).replace(' ', '<br>')}</h1>
      <p class="p-role">${esc(p.role.texte)}</p>
      <dl class="p-dates">${date(ne, p.naissance)}${date(mort, p.deces)}</dl>
      ${portrait ? '' : `<p class="p-sans-portrait">Aucune photographie de ${esc(p.nom)} n'est encore publiée ici.</p>`}
      <a class="p-lire" href="#page">Lire sa page<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6"/></svg></a>`;

    $('#p-vignettes').innerHTML = p.images.slice(0, 3).map((id) => {
      const i = parId.get(id);
      return `<li><a href="#piece-${esc(i.id)}">${G.image(i, '220px', '')}<span class="p-vignette-legende">${esc(annee(i.legende))}</span><span class="visuellement-cache">${esc(i.legende)}</span></a></li>`;
    }).join('');
  }

  // ---------- La page : voix, citation ou fait, défilé, divergences, sources, crédits ----------
  function page(D, p, parId) {
    const toutes = p.images.map((id) => parId.get(id));

    const voix = p.audio
      ? `<p class="p-voix-titre">${esc(p.audio.titre)}</p>
        <div class="p-ecoute">
          <button type="button" class="p-ecoute-bouton" aria-label="Écouter l'enregistrement" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="p-ecoute-lire" d="M8.5 5.5v13l10-6.5z"/><path class="p-ecoute-pause" d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z"/></svg></button>
          <div class="p-onde" role="slider" tabindex="0" aria-label="Position dans l'enregistrement" aria-valuemin="0" aria-valuemax="${Math.round(p.audio.duree)}" aria-valuenow="0" aria-valuetext="${duree(0)}">${onde(p.id).map((h) => `<span style="--h:${h.toFixed(2)}"></span>`).join('')}</div>
          <span class="p-ecoule" aria-hidden="true">0:00</span>
        </div>
        <audio class="p-lecteur" preload="none" src="${esc(p.audio.fichier)}"></audio>
        <p class="p-voix-duree">${duree(p.audio.duree)}</p>
        <p class="p-voix-credit">${esc(p.audio.credit)}</p>`
      : `<p class="p-voix-titre">Enregistrement à venir</p>
        <p class="p-voix-note">Aucun enregistrement authentique de ${esc(p.nom)} n'est encore diffusé ici. ${esc(D.salle.voix)}</p>`;
    const mot = p.citation
      ? `<figure class="p-citation"><p class="p-etiquette">${p.citation.traduction ? 'Ses mots, chantés' : 'Ses mots'}</p>
          <blockquote${p.citation.langue && p.citation.langue !== 'fr' ? ` lang="${esc(p.citation.langue)}"` : ''}><p>« ${lignes(p.citation.texte)} »</p></blockquote>
          ${p.citation.traduction ? `<p class="p-traduction">${lignes(p.citation.traduction)}</p>` : ''}
          <figcaption class="p-contexte">${esc(p.citation.contexte)}</figcaption>
          ${renvois(p, [...new Set([...p.citation.sources, ...(p.citation.sources_traduction ?? [])])])}</figure>`
      : `<figure class="p-fait"><p class="p-etiquette">Fait marquant</p><p class="p-fait-texte">${esc(p.fait.texte)}</p>${renvois(p, p.fait.sources)}</figure>`;

    // Le défilé. Chaque paragraphe de la biographie partage sa rangée avec une image, de part et d'autre, d'un côté puis de
    // l'autre ; les images en surnombre font des rangées de galerie (motif et pose de galerie.js) glissées entre ces
    // rangées ; les paragraphes en surnombre, des rangées de texte. Peu d'images : ni trou, ni image répétée. La
    // visionneuse suit l'ordre du défilé.
    const paires = Math.min(p.recit.length, toutes.length);
    const reste = G.rangees(toutes.slice(paires));
    const plan = [];
    for (let k = 0; k < Math.max(p.recit.length, reste.length); k += 1) {
      if (k < paires) plan.push({ paire: k, i: toutes[k] });
      else if (p.recit[k]) plan.push({ texte: k });
      if (reste[k]) plan.push({ rangee: reste[k], n: k });
    }
    const liste = plan.flatMap((r) => r.i ? [r.i] : r.rangee ?? []);
    const numero = new Map(liste.map((i, k) => [i.id, k + 1]));
    const piece = (x) => `<figure class="piece${x.just === 'end' ? ' vers-droite' : ''}" id="piece-${esc(x.i.id)}" style="grid-column:${x.col};align-self:${x.a};justify-self:${x.just};--d:${x.d};--max:${x.i.largeur}px">
        <button type="button" class="piece-ouvrir" data-id="${esc(x.i.id)}" aria-haspopup="dialog">${G.image(x.i, `(max-width: 760px) calc(100vw - 32px), ${((x.span * 91) / 12).toFixed(1)}vw`)}</button>
        <figcaption class="piece-legende" aria-hidden="true"><span class="piece-num">${numero.get(x.i.id)}</span>${esc(x.i.legende)}</figcaption>
      </figure>`;
    const bio = (k, col) => `<div class="p-bio" style="grid-column:${col}"><p>${esc(p.recit[k].texte)}</p>${renvois(p, p.recit[k].sources)}</div>`;
    const flux = plan.map((r) => {
      if (r.rangee) return `<div class="rangee">${G.poser(r.rangee, r.n).map(piece).join('')}</div>`;
      if (r.texte !== undefined) return `<div class="rangee p-texte">${bio(r.texte, '3 / span 7')}</div>`;
      // Image horizontale sur six colonnes, verticale sur cinq ; à gauche aux rangs pairs, à droite aux rangs impairs.
      const large = r.i.largeur / r.i.hauteur >= 1.15 ? 6 : 5, gauche = r.paire % 2 === 0;
      const img = piece({ i: r.i, col: gauche ? `1 / span ${large}` : `${13 - large} / span ${large}`, span: large, a: 'center', d: 0, just: gauche ? 'end' : 'start' });
      return `<div class="rangee p-paire">${gauche ? `${img}${bio(r.paire, '8 / span 5')}` : `${bio(r.paire, '1 / span 5')}${img}`}</div>`;
    });

    const images = [p.portrait, ...p.images].filter(Boolean).map((id) => parId.get(id));
    $('#page').innerHTML = `<header class="p-page-tete">
        <span class="p-page-num" aria-hidden="true">${String(D.personnes.indexOf(p) + 1).padStart(2, '0')}</span>
        <h2 class="p-page-titre" id="p-page-titre">${esc(p.nom_complet)}</h2>
        <span class="p-page-compte">${liste.length} image${liste.length > 1 ? 's' : ''}${p.audio ? ', 1 enregistrement' : ''}</span>
      </header>
      <div class="p-flux" id="p-flux">
        <div class="rangee p-intro"><section class="p-voix" aria-label="Sa voix"><p class="p-etiquette">Sa voix</p>${voix}</section>${mot}</div>
        ${flux.join('')}
      </div>
      <section class="p-annexe" aria-labelledby="p-div-titre"><h3 id="p-div-titre">Ce que les sources ne disent pas de la même façon</h3>
        <dl class="p-divergences">${p.divergences.map((d) => `<div><dt>${esc(d.sujet)}</dt><dd>${esc(d.texte)}${renvois(p, d.sources)}</dd></div>`).join('')}</dl></section>
      <section class="p-annexe" aria-labelledby="p-src-titre"><h3 id="p-src-titre">Sources</h3>
        <ol class="p-sources">${p.sources.map((s) => `<li id="source-${esc(s.id)}">${esc(s.editeur)}, « ${esc(s.titre)} »${s.date ? `, ${esc(s.date)}` : ''}. <a href="${esc(s.url)}" rel="noopener">Lire la source</a></li>`).join('')}</ol></section>
      <section class="p-annexe" aria-labelledby="p-cred-titre"><h3 id="p-cred-titre">Crédits</h3>
        <div class="p-credits">${p.audio ? `<p><b>Enregistrement.</b> ${esc(p.audio.credit)}</p>` : ''}<p>${esc(D.salle.voix)}</p>
        <ol class="p-credits-liste">${images.map((i) => `<li><b>${esc(i.legende)}.</b> ${G.credit(i)}</li>`).join('')}</ol></div></section>`;

    G.visionneuse(liste, numero, [{ id: p.id, titre: p.nom }], $('#p-flux'));
    // Le formulaire de réclamation, en bas de cette page : toutes les images de la personne, portrait compris.
    G.reclamation([{ titre: p.nom, images: [p.portrait && parId.get(p.portrait), ...liste].filter(Boolean) }], numero, { id: p.id, nom: p.nom });
    // Sous une voix, la musique baisse de 11 dB, comme sous les voix des salles ; sous une chanson, elle se tait tout à fait
    // (deux chansons ne se superposent jamais). Elle revient quand l'enregistrement s'arrête.
    const lecteur = $('.p-lecteur');
    if (lecteur) ecoute(lecteur, p.audio.duree);
    if (lecteur) {
      lecteur.addEventListener('play', () => window.togoMusique?.sousLaVoix(p.audio.nature === 'chanson' ? 'chanson' : true));
      ['pause', 'ended'].forEach((t) => lecteur.addEventListener(t, () => window.togoMusique?.sousLaVoix(false)));
    }
  }

  // Le lecteur de la voix : un bouton rond. À la première lecture, il se replie et l'onde se déplie depuis lui ; tant que
  // l'enregistrement joue, ses barres battent. L'onde est la barre de progression : elle se remplit, on la touche ou on la
  // glisse pour aller ailleurs, flèches, Origine et Fin au clavier. transform et opacity seulement.
  function ecoute(lecteur, prevue) {
    const boite = $('.p-ecoute'), bouton = $('.p-ecoute-bouton'), piste = $('.p-onde'), barres = [...piste.children], ecoule = $('.p-ecoule');
    const total = () => (Number.isFinite(lecteur.duration) && lecteur.duration > 0 ? lecteur.duration : prevue);
    const horloge = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const peindre = () => {
      const t = Math.min(lecteur.currentTime, total()), n = Math.round((t / total()) * barres.length);
      barres.forEach((b, k) => b.classList.toggle('lu', k < n));
      piste.setAttribute('aria-valuenow', String(Math.round(t)));
      piste.setAttribute('aria-valuetext', duree(t));
      ecoule.textContent = horloge(t);
    };
    const etat = () => {
      const joue = !lecteur.paused && !lecteur.ended;
      boite.classList.toggle('joue', joue);
      if (joue) boite.classList.add('ouverte');
      bouton.setAttribute('aria-pressed', String(joue));   // libellé fixe : l'état se dit par aria-pressed, une seule fois
    };
    ['play', 'pause', 'ended'].forEach((t) => lecteur.addEventListener(t, etat));
    lecteur.addEventListener('timeupdate', peindre);
    bouton.addEventListener('click', () => { if (lecteur.paused || lecteur.ended) lecteur.play().catch(() => {}); else lecteur.pause(); });
    const placer = (x) => { const r = piste.getBoundingClientRect(); lecteur.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * total(); peindre(); };
    // À la souris, la lecture va où l'on appuie. Au doigt, l'onde laisse défiler la page (touch-action: pan-y) : un toucher
    // bref déplace la lecture au lâcher, un glissé horizontal la fait suivre le doigt, un glissé vertical fait défiler.
    let doigt = null;
    piste.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      if (e.pointerType !== 'mouse') { doigt = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
      piste.setPointerCapture(e.pointerId); placer(e.clientX);
    });
    piste.addEventListener('pointermove', (e) => {
      if (doigt?.id === e.pointerId) {
        const dx = Math.abs(e.clientX - doigt.x), dy = Math.abs(e.clientY - doigt.y);
        if (dx > 8 && dx > dy) { doigt = null; piste.setPointerCapture(e.pointerId); }
      }
      if (piste.hasPointerCapture(e.pointerId)) placer(e.clientX);
    });
    piste.addEventListener('pointerup', (e) => { if (doigt?.id === e.pointerId) placer(e.clientX); doigt = null; });
    piste.addEventListener('pointercancel', () => { doigt = null; });
    piste.addEventListener('keydown', (e) => {
      const pas = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 }[e.key];
      if (pas === undefined && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      lecteur.currentTime = e.key === 'Home' ? 0 : e.key === 'End' ? total() : Math.min(total(), Math.max(0, lecteur.currentTime + pas));
      peindre();
    });
  }

  demarrer();
})();
