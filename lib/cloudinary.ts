const MAX_IMAGE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Formato no admitido. Sube una imagen JPG, PNG o WEBP.';
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `La imagen supera el límite de ${MAX_IMAGE_MB} MB. Elige una más ligera.`;
  }
  return null;
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 960;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo desde el dispositivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen a Cloudinary (vía /api/cloudinary/upload o preset unsigned).
 * Si Cloudinary aún no está configurado en .env.local, comprime la imagen localmente para vista previa.
 */
export async function uploadTournamentImage(
  file: File,
  folder: 'noticias' | 'jugadores'
): Promise<{ url: string; source: 'cloudinary' | 'local' }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && !cloudName.includes('tu-cloud-name')) {
    // Primero intentar vía ruta API del servidor (soporta subida firmada y segura)
    const apiForm = new FormData();
    apiForm.append('file', file);
    apiForm.append('folder', `gest-deport410/${folder}`);

    try {
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: apiForm,
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.url) {
          return { url: payload.url, source: 'cloudinary' };
        }
      }
    } catch {
      // Continuar con unsigned preset si aplica
    }

    if (uploadPreset && !uploadPreset.includes('tu-upload-preset')) {
      const directForm = new FormData();
      directForm.append('file', file);
      directForm.append('upload_preset', uploadPreset);
      directForm.append('folder', `gest-deport410/${folder}`);

      const directRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: directForm }
      );
      const directData = await directRes.json();
      if (!directRes.ok || !directData.secure_url) {
        throw new Error(
          directData?.error?.message || 'No se pudo subir la imagen a Cloudinary.'
        );
      }
      return { url: directData.secure_url, source: 'cloudinary' };
    }
  }

  // Respaldo optimizado en navegador cuando Cloudinary aún no tiene credenciales
  const dataUrl = await compressImageToDataUrl(file);
  return { url: dataUrl, source: 'local' };
}
