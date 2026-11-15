// Togo, musée d'art et d'histoire : la galerie de l'accueil pour ordinateur, ses deux films et le formulaire de
// réclamation de droits du pied de page. ordinateur.js ne charge ce script que lorsque la galerie ou le pied approche
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
  const srcset = (i) => i.tailles.map((w) => `${DOSSIER}${i.id}-${w}.webp ${w}w`).join(', ');
  const image = (i, sizes, alt = i.alt) => `<img src="${DOSSIER}${i.id}-${i.tailles[0]}.webp" srcset="${srcset(i)}" sizes="${sizes}" alt="${esc(alt)}" width="${i.largeur}" height="${i.hauteur}" loading="lazy" decoding="async" style="--max:${i.largeur}px;background-color:${esc(i.couleur ?? '#EEEAE4')}">`;

  // ---------- Crédits ----------
  const lien = (href, texte, rel = '') => `<a href="${esc(href)}"${rel ? ` rel="${rel}"` : ''}>${texte}</a>`;
  function credit(i) {
    if (i.source === 'pinterest') return i.auteur === 'non identifié' ? 'Image trouvée sur Pinterest, auteur non identifié.' : `Image trouvée sur Pinterest. ${esc(i.auteur)}.`;
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
    const masques = new Set(D.masques ?? []);
    const rang = new Map(D.themes.map((t, k) => [t.id, k]));
    const liste = D.images.filter((i) => rang.has(i.theme) && !masques.has(i.groupe) && !masques.has(i.id)).sort((a, b) => rang.get(a.theme) - rang.get(b.theme));
    const numero = new Map(liste.map((i, k) => [i.id, k + 1]));
    const parId = new Map(liste.map((i) => [i.id, i]));   // une image masquée ne sert pas non plus de vignette
    const themes = D.themes.map((t) => ({ ...t, images: liste.filter((i) => i.theme === t.id) })).filter((t) => t.images.length);
    $('#galerie-compte').textContent = `${liste.length} images`;

    $('#galerie-themes').innerHTML = themes.map((t, k) => `<section class="theme" aria-labelledby="theme-${esc(t.id)}">
      <header class="theme-tete"><span class="theme-num" aria-hidden="true">${deux(k + 1)}</span><h3 class="theme-titre" id="theme-${esc(t.id)}">${esc(t.titre)}</h3><span class="theme-compte">${t.images.length} images</span></header>
      ${rangees(t.images).map((row, n) => `<div class="rangee">${poser(row, n).map((p) => `<figure class="piece${p.just === 'end' ? ' vers-droite' : ''}" style="grid-column:${p.col};align-self:${p.a};justify-self:${p.just};--d:${p.d};--max:${p.i.largeur}px">
        <button type="button" class="piece-ouvrir" data-id="${esc(p.i.id)}" aria-haspopup="dialog">${image(p.i, `${((p.span * 91) / 12).toFixed(1)}vw`)}</button>
        <figcaption class="piece-legende" aria-hidden="true"><span class="piece-num">${numero.get(p.i.id)}</span>${esc(p.i.legende)}<span class="piece-source">${SOURCES[p.i.source]}</span></figcaption>
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
  function visionneuse(liste, numero, tousThemes) {
    const d = $('#visionneuse'), im = $('#v-img'), zone = $('.v-image', d);
    const titre = new Map(tousThemes.map((t) => [t.id, t.titre]));
    const boutons = new Map($$('.piece-ouvrir').map((b) => [b.dataset.id, b]));
    let k = 0, versFormulaire = false;
    // La taille affichée : la place disponible, jamais plus que la largeur réelle de l'image ; sizes suit, au pixel.
    const ajuster = () => {
      const i = liste[k];
      const w = Math.max(1, Math.floor(Math.min(i.largeur, zone.clientWidth, (zone.clientHeight * i.largeur) / i.hauteur)));
      im.style.width = `${w}px`;
      im.sizes = `${w}px`;
    };
    const montrer = (n) => {
      k = (n + liste.length) % liste.length;
      const i = liste[k];
      im.removeAttribute('srcset');
      im.removeAttribute('src');
      Object.assign(im, { width: i.largeur, height: i.hauteur, alt: i.alt });
      im.style.backgroundColor = i.couleur ?? '';
      $('#v-compte').textContent = `${numero.get(i.id)} sur ${liste.length}, ${titre.get(i.theme) ?? ''}`;
      $('#v-legende').textContent = i.alt;
      $('#v-credit').innerHTML = credit(i);
      ajuster();
      im.srcset = srcset(i);
      im.src = `${DOSSIER}${i.id}-${i.tailles[0]}.webp`;
    };
    $('#galerie-themes').addEventListener('click', (e) => {
      const b = e.target.closest('.piece-ouvrir');
      if (!b) return;
      d.showModal();
      montrer(liste.findIndex((i) => i.id === b.dataset.id));
      $('.v-fermer', d).focus();
    });
    $('.v-prec', d).addEventListener('click', () => montrer(k - 1));
    $('.v-suiv', d).addEventListener('click', () => montrer(k + 1));
    $('.v-fermer', d).addEventListener('click', () => d.close());
    d.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); montrer(k + (e.key === 'ArrowRight' ? 1 : -1)); }
    });
    // Un clic dans le vide autour de l'image ferme, comme Échap.
    d.addEventListener('click', (e) => { if (e.target === d || e.target.classList.contains('v-scene') || e.target === zone) d.close(); });
    addEventListener('resize', () => { if (d.open) ajuster(); });
    // Le focus revient sur l'image de la page que l'on regardait en dernier (celle qui a ouvert, si l'on n'a pas navigué).
    d.addEventListener('close', () => {
      im.removeAttribute('srcset');
      im.removeAttribute('src');
      if (versFormulaire) { versFormulaire = false; return; }
      boutons.get(liste[k].id)?.focus();
    });
    $('.v-signaler', d).addEventListener('click', (e) => {
      e.preventDefault();
      versFormulaire = true;
      const id = liste[k].id;
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

  // ---------- Réclamation de droits : un courriel préparé, aucun service tiers ----------
  // L'adresse n'est écrite en clair ni dans la page ni dans ce script : elle se compose au moment de l'envoi.
  const MORCEAUX = [[115, 126, 102, 124, 122, 124, 106, 112, 116, 114, 113, 102, 112, 106, 123, 110, 115], [108, 114, 102, 110, 113, 51, 104, 116, 114]];
  const destinataire = () => MORCEAUX.map((m) => String.fromCharCode(...m.map((c) => c - 5))).join(String.fromCharCode(64));

  function reclamation(themes, numero) {
    const f = $('#formulaire'), choix = $('#f-image');
    const avant = choix.value;
    choix.innerHTML = `<option value="">Choisir une image</option>${themes.map((t) => `<optgroup label="${esc(t.titre)}">${t.images.map((i) => `<option value="${esc(i.id)}">${numero.get(i.id)}. ${esc(i.legende)}</option>`).join('')}</optgroup>`).join('')}<option value="autre">Autre image (à décrire dans le message)</option>`;
    choix.value = avant;
    const parId = new Map(themes.flatMap((t) => t.images).map((i) => [i.id, i]));
    const val = (n) => (f.elements[n].value ?? '').trim();
    const TESTS = {
      nom: () => (val('nom') ? '' : 'Indiquez votre nom.'),
      courriel: () => (!val('courriel') ? 'Indiquez votre adresse électronique.' : f.elements.courriel.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('courriel')) ? 'Cette adresse électronique n\'est pas valide (exemple : nom@exemple.org).' : ''),
      image: () => (val('image') ? '' : 'Choisissez l\'image concernée, ou « Autre image ».'),
      demande: () => (val('demande') ? '' : 'Choisissez : créditer ou retirer l\'image.'),
      lien: () => (!val('lien') || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(val('lien')) ? '' : 'Ce lien n\'est pas une adresse web complète : elle commence par https://.'),
      message: () => (val('message') ? '' : 'Écrivez quelques mots sur votre demande.'),
    };
    const champs = (cle) => (cle === 'demande' ? $$('input[name="demande"]', f) : [f.elements[cle]]);
    const marquer = (cle) => {
      const msg = TESTS[cle](), e = $(`#e-${cle}`);
      e.textContent = msg;
      e.hidden = !msg;
      champs(cle).forEach((el) => (msg ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid')));
      return msg;
    };
    // Une erreur affichée se corrige à la saisie ; les autres n'apparaissent qu'à l'envoi.
    const corriger = (e) => { const cle = e.target.name; if (TESTS[cle] && !$(`#e-${cle}`).hidden) marquer(cle); };
    f.addEventListener('input', corriger);
    f.addEventListener('change', corriger);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fautes = Object.keys(TESTS).filter((cle) => marquer(cle));
      if (fautes.length) { champs(fautes[0])[0].focus(); return; }
      const id = val('image'), i = parId.get(id), dest = destinataire();
      const nomImage = i ? `${i.legende} (${i.id})` : 'autre image';
      const sujet = `Réclamation de droits : ${nomImage}`;
      const corps = [
        'Bonjour,', '',
        'Je vous écris au sujet d\'une image de la galerie de « Togo, musée d\'art et d\'histoire ».', '',
        `Image concernée : ${i ? `n° ${numero.get(i.id)}, ${i.legende} (${i.id}), source indiquée : ${SOURCES[i.source]}` : 'autre image, décrite dans le message'}`,
        `Demande : ${val('demande') === 'retirer' ? 'retirer l\'image' : 'créditer l\'image'}`,
        `Lien établissant mes droits : ${val('lien') || 'non fourni'}`, '',
        'Message :', val('message'), '',
        val('nom'), val('courriel'), '',
        `Page : ${location.origin}${location.pathname}#galerie`,
      ].join('\n');
      const a = document.createElement('a');
      a.href = `mailto:${dest}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps.replace(/\n/g, '\r\n'))}`;
      a.click();
      // Repli : le message préparé, à copier, et l'adresse, révélée seulement maintenant.
      $('#repli-adresse').innerHTML = `<a href="mailto:${dest}">${dest}</a>`;
      $('#repli-texte').value = `À : ${dest}\nObjet : ${sujet}\n\n${corps}`;
      $('#repli-etat').textContent = '';
      $('#repli').hidden = false;
      $('#repli').focus();
    });
    $('#repli-copier').addEventListener('click', async () => {
      const t = $('#repli-texte');
      let ok = false;
      try { await navigator.clipboard.writeText(t.value); ok = true; } catch {
        t.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
      }
      $('#repli-etat').textContent = ok ? 'Message copié.' : 'Copie impossible ici : sélectionnez le texte, puis Ctrl+C.';
    });
  }

  demarrer();
})();
