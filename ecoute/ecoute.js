// Transition écoute du musée du Togo. Sans dépendance.
// Courte transition AUTOMATIQUE après l'intro : aucun choix à faire.
// Expose window.afficherTransitionEcoute({ onFin, duree, image }).
//   onFin : appelé quand l'écran est retiré (fin du temps, ou passage par toucher, clic, Échap, Entrée).
//   duree : durée d'affichage en millisecondes avant le fondu de sortie (défaut 5000).
//   image : chemin de l'image des écouteurs (défaut "ecouteurs-suspendus.webp"), relatif à la page hôte.
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
      ecran.addEventListener('transitionend', oter, { once: true });
      setTimeout(oter, 700); // filet si transitionend ne vient pas (mouvement réduit, onglet masqué)
      ecran.classList.remove('te-visible');
    }
    function clavier(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') fermer(); }

    var minuteur = setTimeout(fermer, duree);
    ecran.addEventListener('click', fermer);
    document.addEventListener('keydown', clavier);
    return { fermer: fermer };
  }

  function el(balise, classe) {
    var n = document.createElement(balise);
    n.className = classe;
    return n;
  }

  window.afficherTransitionEcoute = afficherTransitionEcoute;
})();
