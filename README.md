# Togo, musée d'art et d'histoire

Un musée numérique, ouvert et libre, pour garder et montrer ce que l'on sait de l'histoire du Togo, de ses symboles et des personnes qui l'ont marqué. Projet personnel, non officiel.

**Visiter le musée** : https://togo-bibliotheque-histoire.vercel.app
(également sur https://nyawuwe.github.io/togo-bibliotheque-histoire/)

## Ce que l'on y trouve

- **Huit salles chronologiques**, de l'âge du fer à la République d'aujourd'hui, et une salle des symboles de la République et des hauts lieux de la nation. Chaque salle a son récit lu.
- **Ces Togolais(es) qui m'ont marqué** : une page par personne, avec sa voix quand un enregistrement authentique existe. Pour commencer : Sylvanus Olympio, Nicolas Grunitzky et Bella Bellow.
- **Une galerie** d'une centaine d'images d'archives et d'œuvres.
- Une version pour téléphone et une version pour ordinateur.

Chaque image et chaque son cite sa source, et sa licence quand elle est connue.

## Pourquoi

Retrouver une information fiable sur l'histoire du Togo ou sur une personnalité togolaise reste difficile : les sources sont dispersées, souvent introuvables en ligne. Ce musée les rassemble en un seul lieu, ouvert à tous et ouvert aux contributions. L'ambition : devenir une vraie plateforme d'archives, un musée numérique et un outil d'utilité publique.

## Contribuer

- **Une photo, un document, un témoignage, une correction** : par le formulaire « Proposer une contribution » de la version ordinateur, ou en ouvrant une *issue* sur ce dépôt.
- **Une image dont vous êtes l'auteur** : demandez son crédit ou son retrait par la page « Signaler une image » du site.
- **Une modification** : les demandes de fusion (*pull requests*) sont les bienvenues.

## Organisation du dépôt

Ce dépôt contient le site tel qu'il est publié : des pages statiques, sans serveur.

| Fichier ou dossier | Contenu |
| --- | --- |
| `index.html` | La visite (téléphone et tablette) |
| `ordinateur.html` | L'accueil pour ordinateur |
| `personnes.html` | Ces Togolais(es) qui m'ont marqué |
| `reclamation.html` | Signaler une image |
| `data/` | Les contenus : salles, personnes, galerie |
| `images/`, `audio/`, `polices/` | Les médias et les polices |

Pour le consulter en local, servez le dossier avec n'importe quel serveur statique, par exemple `python -m http.server`.

## Licences

Voir [LICENSE](LICENSE). En bref : le code est sous licence MIT, les textes écrits pour le musée sous CC BY-SA 4.0. Les images, les enregistrements et les polices restent chacun sous leur propre licence, indiquée dans les crédits du site.

## Auteur

Kevin Nyawuwe
