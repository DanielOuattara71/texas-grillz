# Boucles vidéo

Ces fichiers **ne sont pas versionnés dans Git** (≈ 66 Mo, trop lourds pour un
dépôt ordinaire). Le site les attend dans ce dossier ; sans eux, la galerie et
le hero se rabattent sur leurs visuels de repli (`npm run check:media` le signale).

## Fichiers attendus

| Fichier | Poids actuel | Utilisé par |
| --- | --- | --- |
| `Animer_image_barbecue_et_fumée_20260927120505.mp4` | ~5 Mo | `Hero`, `Concept` |
| `Barbecue_grilling_meat_over_coals_20260927120421.mp4` | ~5 Mo | `Cravings` (tuile vedette), `HistoryPage` |
| `Download (6).mp4` | ~20 Mo | `Gallery` |
| `Download (7).mp4` | ~7 Mo | `Gallery` |
| `Download (8).mp4` | ~25 Mo | `Gallery` |
| `Download (10).mp4` | ~14 Mo | `Gallery` |

## Réencoder avant de déposer

Les exports smartphone d'origine sont bien trop lourds. Les réencoder en H.264
720p sans piste audio, c'est 10 à 20 fois plus léger pour une boucle muette :

```bash
ffmpeg -i "source.mp4" -vf "scale=1280:-2" -crf 30 -preset slow \
       -movflags +faststart -an "public/videos/Download (6).mp4"
```

Objectif : ~1–2 Mo par boucle, 720p suffit pour une vignette de 250 px de haut.

## Stockage

Pour partager ces médias hors de Git, deux options :

- **Git LFS** : `git lfs install && git lfs track "*.mp4"` (non activé ici : LFS
  n'est pas installé sur cette machine, et le dépôt n'a pas de remote).
- **Stockage objet / CDN** : déposer les MP4 sur le bucket qui sert déjà les
  photos, et pointer `src` sur l'URL publique.
