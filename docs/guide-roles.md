# Guide d'utilisation — Texas GrillZ (3 rôles)

# Super admin (propriétaire)

## Accès et rôle
Vous voyez tout : contenu commun, cartes et horaires de chaque restaurant, réservations de tous, comptes, restaurants, journal.
Votre bootstrap se fait par `ADMIN_EMAIL`/`ADMIN_PASSWORD` (premier démarrage) ou `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` (`scripts/create-super-admin.mjs`).

## Restaurants
- **Restaurants** → ajoutez (identifiant immuable, ex. `zone-4`), modifiez nom/adresse/téléphone, désactivez.
- La création copie la carte commune vers `<id>:menu` et les horaires par défaut vers `<id>:hours`.
- Suppression refusée tant qu'un compte y est rattaché. Bouton « Ajouter + créer le compte admin » recommandé.

## Équipe
- **Équipe** → créez chaque compte (email unique, nom, rôle, restaurant obligatoire pour un admin).
- Le mot de passe temporaire s'affiche **une seule fois** ; le compte a `must_change_password` jusqu'au premier changement.
- Vous pouvez changer rôle/restaurant, désactiver/réactiver (les sessions sont fermées), réinitialiser, supprimer.
- Protection : impossible de rétrograder/désactiver/supprimer le dernier super admin actif, ni de supprimer son propre compte.

## Réservations et journal
- Liste filtrée par restaurant ; export CSV filtré par le même filtre.
- **Journal** : qui a modifié quoi et quand (contenu, réservations, médias, comptes, restaurants) — jamais de mots de passe.

## Sécurité
- Session cookie `httpOnly` + `SameSite=lax`, `Secure` en prod, CORS limité à `FRONT_URL`.
- Les droits sont vérifiés côté serveur depuis la session, jamais depuis un paramètre client.

# Admin (gérant d'un seul restaurant)

## Ce que vous voyez
Uniquement votre restaurant : **Réservations, Carte, Photos des plats, Horaires, Médias, Mon compte**.
L'en-tête affiche votre nom, votre rôle et le nom de votre restaurant (non modifiable).

## Carte et photos
- **Carte** : ajoutez/dupliquez/supprimez/réordonnez les plats, catégorie en liste déroulante, prix en FCFA entier. « Copier la carte d'un autre restaurant » pour démarrer.
- **Photos des plats** : déposez une photo par plat ; sans photo le site dessine une assiette.
- Enregistrement sous `<votre restaurant>:menu` ; le site affiche pour ce restaurant seulement (`?lieu=<id>`), avec prix et envies mis à jour.

## Horaires
- Éditeur dédié lundi→dimanche (ouvert/fermé, ouverture/fermeture, `24:00` = minuit), « copier un jour sur les 7 jours » et « copier depuis un autre restaurant ».
- Enregistré sous `<votre restaurant>:hours` ; le statut ouvert/fermé est calculé à Abidjan.

## Réservations et médias
- Vos réservations uniquement, compteur de nouvelles, statut à changer, export CSV filtré sur vous, bouton **WhatsApp** par client.
- **Médias** : uniquement votre dossier `locations/<votre id>` (envoi et suppression). Impossible d'écrire le contenu global ou celui d'un autre restaurant (`403`).

## Premier accès et blocage
- Mot de passe temporaire → redirection vers **Mon compte** (12 caractères minimum, ferme les autres sessions).
- Si votre compte n'est rattaché à aucun restaurant : écran bloquant, aucune édition.

# Développeur (technique)

## Périmètre
- Lecture et **correction** de tout le contenu (commun + chaque restaurant) pour maintenance.
- **Journal** consultable pour diagnostiquer les problèmes d'édition.
- Ne gère **ni comptes ni restaurants** (onglets Équipe/Restaurants masqués, `403` côté serveur).

## Réservations et médias
- Réservations en **lecture seule** : consultation + filtre, mais changement de statut et export refusés (`403`).
- Médias en lecture seulement : lister pour diagnostiquer, envoi/suppression refusés.

## Points communs (tous les rôles)
- Le site public ne dépend jamais de l'API : sans backend, `src/data` prend le relais.
- Chaque écriture réussie **et refusée** (<id>:menu, réservation, média) est journalisée.
- Textes d'administration en français, sans jargon ; erreurs explicites (« Compte non rattaché… », « Dossier réservé à son restaurant »).
