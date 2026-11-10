/**
 * Cloudinary — stockage des images de l'administration.
 *
 * Les images déposées depuis l'admin vont sur Cloudinary (`CLOUDINARY_URL`),
 * pas sur le disque éphémère du serveur. L'upload est signé serveur côté.
 * Si la variable n'est pas définie, le dépôt local (`UPLOAD_DIR`) prend le relais.
 */
let configured = false;
let cloudinary = null;

try {
  cloudinary = require("cloudinary").v2;
  const url = process.env.CLOUDINARY_URL || "";
  if (url) {
    cloudinary.config({ secure: true });
    configured = true;
  }
} catch {
  cloudinary = null;
}

function isConfigured() {
  return configured && cloudinary && Boolean(process.env.CLOUDINARY_URL);
}

function publicId(folder, base) {
  return `${String(folder || "misc").replace(/\/+$/g, "")}/${base}`;
}

async function uploadBuffer(buffer, { folder, name, mimetype }) {
  if (!isConfigured()) {
    throw new Error("Cloudinary non configuré (CLOUDINARY_URL manquante).");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "texas-grillz",
        public_id: name,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function deleteByUrl(url) {
  if (!isConfigured() || !url) return false;
  // URL : https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<name>.<ext>
  const match = String(url).match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+(?:\?.*)?$/i);
  if (!match) return false;
  const publicIdFromUrl = match[1];
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicIdFromUrl, { resource_type: "image" }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  isConfigured,
  uploadBuffer,
  deleteByUrl,
  publicId,
};
