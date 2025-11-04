# 🚀 Simulation Fusée-Sonde Éducative

Une simulation 3D interactive d'une fusée-sonde utilisant Three.js et les équations physiques complètes de la balistique.

## 📐 Modèle Physique

Cette simulation implémente un modèle physique complet basé sur :

### Forces appliquées à la fusée

| Force | Expression | Description |
|-------|-----------|-------------|
| **Poussée** | `T(t) = I_sp · ṁ · g₀` | Force fournie par les moteurs |
| **Poids** | `P = m · g(h)` | Gravité variable avec l'altitude |
| **Traînée** | `F_D = ½ρ(h) · C_D · A · v²` | Résistance de l'air |

### Équations différentielles

Le système d'équations gouvernant le mouvement :

```
dh/dt = v
dv/dt = [T(t) - F_D(h,v) - m·g(h)] / m
dm/dt = -ṁ  (pendant la combustion)
```

### Modèles atmosphériques

- **Gravité variable** : `g(h) = g₀ · (R_T / (R_T + h))²`
- **Densité de l'air** : `ρ(h) = ρ₀ · e^(-h/H)`
  - ρ₀ = 1.225 kg/m³ (au sol)
  - H = 8000 m (échelle de densité)

### Intégration numérique

La simulation utilise la **méthode de Runge-Kutta d'ordre 4 (RK4)** pour une précision optimale.

## 🎮 Fonctionnalités

### Configuration de la mission
- ✅ Choix du point de départ (latitude/longitude)
- ✅ Choix du point d'impact visé
- ✅ Paramètres de la fusée ajustables :
  - Masse initiale (20-200 kg)
  - Poussée (500-5000 N)
  - Temps de combustion (5-30 s)
  - Débit massique (0.5-5 kg/s)

### Visualisation 3D
- 🌍 Terre 3D avec texture réaliste haute résolution (NASA Blue Marble)
- 🚀 Fusée avec flammes animées
- 📈 Trajectoire en temps réel
- ⭐ Atmosphère et étoiles

### Tableau de bord en temps réel
- ⏱️ Temps de vol
- 📏 Altitude
- ⚡ Vitesse
- ⚖️ Masse instantanée
- 🔥 Poussée
- 🌍 Gravité à l'altitude actuelle
- 💨 Force de traînée
- 🌬️ Densité de l'air
- 🚀 Accélération
- 🏔️ Apogée maximum atteint
- ⚡ Vitesse maximum
- 📍 Phase de vol

### Contrôles interactifs
- 🖱️ **Clic gauche + drag** : Rotation de la Terre
- 🖱️ **Molette** : Zoom
- 🎯 **Sliders** : Ajustement des paramètres

## 🚀 Utilisation

1. Ouvrez `index.html` dans un navigateur moderne
2. Configurez les points de départ et d'arrivée
3. Ajustez les paramètres de la fusée
4. Cliquez sur **🚀 LANCER LA SIMULATION**
5. Observez la trajectoire et les données en temps réel !

## 📊 Phases de vol

1. **Propulsion 🔥** : Moteurs allumés, accélération maximale
2. **Montée balistique ⬆️** : Moteurs éteints, altitude croissante
3. **Descente ⬇️** : Retour vers la surface
4. **Atterrissage** : Impact au sol

## 🧮 Formules implémentées

### Équation de Tsiolkovski (Delta-V idéal)
```
Δv = I_sp · g₀ · ln(m₀/m_f)
```

### Accélération instantanée
```
a(t) = [T(t) - ½ρ(h)C_D·A·v² - m·g(h)] / m
```

### Interpolation de trajectoire
La trajectoire entre les deux points utilise une **interpolation sphérique (SLERP)** pour un mouvement réaliste sur la surface courbe de la Terre.

## 🎓 Contexte pédagogique

Cette simulation est conçue dans un **cadre strictement éducatif** pour comprendre :
- La mécanique du vol spatial
- L'intégration numérique d'équations différentielles
- La modélisation atmosphérique
- La visualisation 3D avec Three.js

## 🛠️ Technologies utilisées

- **Three.js** r128 : Rendu 3D
- **JavaScript ES6+** : Logique de simulation
- **HTML5/CSS3** : Interface utilisateur
- **Méthode RK4** : Intégration numérique

## 📝 Notes techniques

- Pas de temps : 0.05s pour stabilité numérique
- Échelle visuelle : 1 unité = 100 km
- Rayon Terre : 6.371 × 10⁶ m
- g₀ = 9.81 m/s²

## 🎯 Exemple de mission

**Fusée-sonde type :**
- Masse : 50 kg
- Poussée : 1500 N
- Temps de combustion : 10 s
- Débit : 2 kg/s

**Résultats attendus :**
- Apogée : ~15 km
- Vitesse max : ~200 m/s
- Temps de vol : ~60 s

---

**Créé avec ❤️ dans un cadre pédagogique**
