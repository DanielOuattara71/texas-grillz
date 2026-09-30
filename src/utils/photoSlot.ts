/**
 * Emplacement photo d'un plat, dérivé du chemin de son illustration :
 * "/images/products/brisket.svg" → "/images/products/brisket.jpg".
 * Dès que le JPEG est déposé dans `public/images/products/`, il prend le
 * relais tout seul (détection dans `ui/FoodMedia.tsx`), sans toucher au code.
 */
export const photoSlot = (illustration: string): string =>
  illustration.replace(/\.(svg|png)$/i, ".jpg");
