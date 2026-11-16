// Transition écoute du musée du Togo. Sans dépendance.
// Courte transition AUTOMATIQUE après l'intro : aucun choix à faire.
// Expose window.afficherTransitionEcoute({ onFin, duree, image }).
//   onFin : appelé quand l'écran est retiré (fin du temps, ou passage par toucher, clic, Échap, Entrée).
//   duree : durée d'affichage en millisecondes avant le fondu de sortie (défaut 5000).
//   image : chemin de l'image des écouteurs (défaut "ecouteurs-suspendus.webp"), relatif à la page hôte.
//   vers  : (facultatif) fonction qui rend l'élément où les écouteurs se posent en partant, le bouton du son de la page :
//           ils s'y réduisent et s'y fondent pendant que le noir se lève (Web Animations, transform et opacity
//           seulement). Sans lui, ou sous mouvement réduit, l'écran part en fondu (court sous mouvement réduit).
// Une seule fois par visite (sessionStorage, partagé entre index.html et ordinateur.html) :
// déjà vue, la fonction appelle onFin tout de suite et n'affiche rien.
// Le son n'est pas décidé ici : le geste qui débloque l'audio reste celui de l'intro (« Entrer »).
(function () {
  'use strict';

  var CLE = 'togo-ecoute-vue';

  function afficherTransitionEcoute(options) {
    var opts = options || {};
    var dejaVue = false;
    try { dejaVue = sessionStorage.getItem(CLE) === '1'; sessionStorage.setItem(CLE, '1'); } catch (e) {}
    if (dejaVue) {
      if (typeof opts.onFin === 'function') opts.onFin();
      return { fermer: function () {} };
    }
    var duree = typeof opts.duree === 'number' ? opts.duree : 5000;

    var ecran = el('div', 'te-ecran');
    var scene = el('div', 'te-scene');
    var pivot = el('div', 'te-pivot');
    var bras = el('div', 'te-bras');
    var img = el('img', 'te-ecouteurs');
    img.src = opts.image || 'ecouteurs-suspendus.webp';
    img.alt = '';
    img.setAttribute('draggable', 'false');
    bras.appendChild(img);
    pivot.appendChild(bras);
    scene.appendChild(pivot);
    scene.setAttribute('aria-hidden', 'true');

    var message = el('p', 'te-message');
    message.setAttribute('role', 'status');
    message.textContent = 'L’expérience est meilleure avec des écouteurs';

    ecran.appendChild(scene);
    ecran.appendChild(message);
    document.body.appendChild(ecran);
    requestAnimationFrame(function () { ecran.classList.add('te-visible'); });

    var parti = false;
    function fermer() {
      if (parti) return;
      parti = true;
      clearTimeout(minuteur);
      document.removeEventListener('keydown', clavier);
      var oter = function () {
        if (!ecran.isConnected) return;
        ecran.remove();
        if (typeof opts.onFin === 'function') opts.onFin();
      };
      if (calme()) {
        // Mouvement réduit : un fondu court, rien d'autre.
        var f = ecran.animate ? ecran.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }) : null;
        if (f) f.onfinish = oter;
        setTimeout(oter, 400);
        return;
      }
      if (morph(oter)) return;
      ecran.addEventListener('transitionend', oter, { once: true });
      setTimeout(oter, 700); // filet si transitionend ne vient pas (onglet masqué)
      ecran.classList.remove('te-visible');
    }
    // Les écouteurs vont se poser sur le bouton du son : le centre de l'image rejoint celui du bouton en se réduisant à sa
    // taille, la scène entière portée d'un bloc (le balancement continue dedans), puis s'y fond ; le bouton les reçoit
    // d'une légère pulsation. Le fond noir passe sur un calque à part, pour se lever en opacité seule.
    function morph(fin) {
      var cible = typeof opts.vers === 'function' ? opts.vers() : null;
      if (!cible || !ecran.animate || !cible.getBoundingClientRect) return false;
      var r1 = cible.getBoundingClientRect(), r0 = img.getBoundingClientRect();
      if (!r1.width || !r1.height || !r0.width || r1.bottom < 0 || r1.top > innerHeight || r1.right < 0 || r1.left > innerWidth) return false;
      var cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      var dx = r1.left + r1.width / 2 - cx, dy = r1.top + r1.height / 2 - cy;
      var k = Math.max(0.04, Math.min(1, (r1.height * 1.6) / r0.height));
      var fond = el('div', 'te-fond');
      ecran.insertBefore(fond, ecran.firstChild);
      // L'image est peinte sur du noir : en vol au-dessus de la page, ce noir ferait un rectangle. Elle sert donc de
      // masque à elle-même, en luminance : le noir devient transparent, les écouteurs blancs restent.
      img.style.webkitMaskImage = img.style.maskImage = 'url("' + img.src + '")';
      img.style.maskMode = 'luminance';
      img.style.webkitMaskSize = img.style.maskSize = '100% 100%';
      ecran.classList.add('te-part');
      scene.style.transformOrigin = cx + 'px ' + cy + 'px';
      var d = 450;
      var vol = scene.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')', opacity: 1, offset: 0.78 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k * 0.8 + ')', opacity: 0 }
      ], { duration: d, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' });
      fond.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * 0.8, delay: d * 0.15, easing: 'ease-in-out', fill: 'forwards' });
      message.animate([{ opacity: getComputedStyle(message).opacity }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 180, fill: 'forwards' });
      vol.onfinish = function () {
        if (cible.animate) cible.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
        fin();
      };
      setTimeout(fin, d + 400); // filet si onfinish ne vient pas (onglet masqué)
      return true;
    }
    function clavier(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') fermer(); }

    var minuteur = setTimeout(fermer, duree);
    ecran.addEventListener('click', fermer);
    document.addEventListener('keydown', clavier);
    return { fermer: fermer };
  }

  function calme() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function el(balise, classe) {
    var n = document.createElement(balise);
    n.className = classe;
    return n;
  }

  window.afficherTransitionEcoute = afficherTransitionEcoute;
})();
