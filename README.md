# 🚀 Simulation de Missile Balistique M51 (3D & Physique)

Ce projet est une simulation interactive en temps réel d'un missile balistique stratégique M51. Il couple un **moteur physique newtonien** rigoureux avec une **visualisation 3D interactive** basée sur WebGL (Three.js).

Le but du projet est de simuler une trajectoire suborbitale réaliste (décollage, gravity turn, phase balistique, rentrée) tout en résolvant la problématique complexe de la synchronisation entre un référentiel inertiel (calculs physiques) et un référentiel terrestre en rotation (visuel).

## ✨ Fonctionnalités

* **Physique Réaliste :**
    * Intégration numérique via la méthode d'Euler.
    * Gestion des forces : Poussée ($F=q \cdot V_e$), Gravité newtonienne ($1/r^2$), Traînée atmosphérique ($\rho(h) \cdot v^2$).
    * Masse variable (consommation de carburant).
    * Modèle M51 : 54 tonnes, 700 kN de poussée, Isp 320s.
* **Guidage & Pilotage :**
    * Loi de guidage séquentielle : Montée verticale $\rightarrow$ Basculement (*The Kick*) $\rightarrow$ *Gravity Turn* naturel.
* **Visualisation 3D (Three.js) :**
    * Globe terrestre texturé avec positionnement géographique précis.
    * Départ calibré depuis le Centre Spatial Guyanais (Kourou).
    * Tracé de trajectoire dynamique (trace au sol rouge + trajectoire aérienne jaune).
    * Système de particules pour la flamme moteur.
* **Interaction Utilisateur :**
    * Manipulation du globe (rotation à la souris) sans perturber la physique du missile (calculs matriciels Monde $\leftrightarrow$ Local).
    * Zoom dynamique.
    * Télémétrie en temps réel dans la console.

## 🛠️ Installation et Lancement

Ce projet est une application web statique (HTML/JS). Aucune installation complexe (Node.js, Python) n'est requise pour le tester en local.

1.  **Cloner ou télécharger** le dépôt.
2.  **Lancer l'application :**
    * Ouvrez simplement le fichier `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).
    * *Note : Pour des raisons de sécurité liées aux textures (CORS), il est préférable d'utiliser un petit serveur local (ex: Live Server sur VSCode), mais cela devrait fonctionner en direct pour les textures distantes.*

## 🎮 Commandes

* **Barre Espace** : Lancer le missile (Mise à feu).
* **Clic Gauche + Glisser** : Faire tourner la Terre (fonctionne même pendant le vol !).
* **Molette Souris** : Zoomer / Dézoomer.
* **F12 (Console)** : Afficher les données de télémétrie (Altitude, Vitesse, Pitch, Impact).

## 📂 Structure du Projet

```text
├── index.html      # Point d'entrée, canvas et chargement des scripts
├── style.css       # Styles pour le plein écran et le fond noir
├── main.js         # Boucle d'animation principale et initialisation
├── scene.js        # Configuration Three.js (Caméra, Lumières, Globe, Contrôles)
└── missile.js      # Cœur du projet : Classe Missile, Moteur Physique & Logique de Vol