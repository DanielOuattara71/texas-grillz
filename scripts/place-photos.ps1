# Depose les JPEG optimises (incoming-whatsapp/web) aux emplacements attends par le site.
# Un plat = public/images/products/<id>.jpg  (detecte tout seul par ui/FoodMedia.tsx)
# Un lieu  = public/images/locations/<id>.jpg (reference dans data/locations.ts)
# Galerie  = public/images/gallery/<n>.jpg    (reference dans sections/Gallery.tsx)
$src = Join-Path $PSScriptRoot '..\incoming-whatsapp\web'
$pub = Join-Path $PSScriptRoot '..\public\images'

$map = [ordered]@{
  # --- Carte (miniature de ligne + tuile d'envie + top 5, automatiques) ---
  'wa-04.jpg' = 'products\brisket.jpg'      # planche de viandes fumees vue du dessus
  'wa-09.jpg' = 'products\ribs.jpg'         # pieces laquees + puree + crudites
  'wa-07.jpg' = 'products\chicken.jpg'      # poulet grille laque sur planche ovale

  # --- Adresses (section « Nos Lieux ») ---
  'wa-01.jpg' = 'locations\lyon-3.jpg'      # salle en service
  'wa-10.jpg' = 'locations\lyon-7.jpg'      # serveur aux plateaux, tee-shirt Texas Grillz
  'wa-14.jpg' = 'locations\villeurbanne.jpg' # bar et cocktails
  'wa-02.jpg' = 'locations\caluire.jpg'     # assiette grillade + plantain

  # --- Galerie (grille) ---
  'wa-06.jpg' = 'gallery\1.jpg'             # planche gravee TEXAS GRILLZ
  'wa-13.jpg' = 'gallery\2.jpg'             # grillades et accompagnements, vue du dessus
  'wa-05.jpg' = 'gallery\3.jpg'             # grande planche a partager
  'wa-12.jpg' = 'gallery\4.jpg'             # brochettes de gambas
  'wa-11.jpg' = 'gallery\5.jpg'             # assortiment brochettes / poulet / frites
  'wa-08.jpg' = 'gallery\6.jpg'             # planche sortant de cuisine
  'wa-03.jpg' = 'gallery\7.jpg'             # puree maison en bol

  # --- Page Histoire ---
  'wa-15.jpg' = 'histoire.jpg'              # double rapproche de wa-11, a remplacer par un tirage dedie
}

foreach ($entry in $map.GetEnumerator()) {
  $from = Join-Path $src $entry.Key
  $to   = Join-Path $pub $entry.Value
  $dir  = Split-Path $to -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  if (-not (Test-Path $from)) { Write-Output "MISSING  $($entry.Key)"; continue }
  Copy-Item $from $to -Force
  $kb = [math]::Round((Get-Item $to).Length / 1KB, 1)
  Write-Output ("{0,-12} -> {1,-32} {2} KB" -f $entry.Key, $entry.Value, $kb)
}

$total = (Get-ChildItem -Path (Join-Path $src '*.jpg') | Measure-Object -Property Length -Sum).Sum
Write-Output ("TOTAL WEB = {0} MB pour 15 visuels" -f [math]::Round($total / 1MB, 2))
Write-Output 'COPY_DONE'
