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
        <audio class="p-lecteur" controls preload="none" src="${esc(p.audio.fichier)}"></audio>
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
    if (lecteur) {
      lecteur.addEventListener('play', () => window.togoMusique?.sousLaVoix(p.audio.nature === 'chanson' ? 'chanson' : true));
      ['pause', 'ended'].forEach((t) => lecteur.addEventListener(t, () => window.togoMusique?.sousLaVoix(false)));
    }
  }

  demarrer();
})();
