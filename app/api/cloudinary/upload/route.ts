import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    return NextResponse.json(
      { error: 'Cloudinary no está configurado en el servidor (.env.local).' },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'gest-deport410');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No se recibió ningún archivo válido.' }, { status: 400 });
    }

    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', file);
    cloudinaryForm.append('folder', folder);

    // Prefer signed upload when API key & secret are available; otherwise use unsigned preset
    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash('sha1').update(signatureString).digest('hex');

      cloudinaryForm.append('api_key', apiKey);
      cloudinaryForm.append('timestamp', String(timestamp));
      cloudinaryForm.append('signature', signature);
    } else if (uploadPreset) {
      cloudinaryForm.append('upload_preset', uploadPreset);
    } else {
      return NextResponse.json(
        {
          error:
            'Falta configurar NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET o CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.',
        },
        { status: 400 }
      );
    }

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryForm,
      }
    );

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Error al subir la imagen a Cloudinary.' },
        { status: uploadRes.status }
      );
    }

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error inesperado al procesar la subida a Cloudinary.',
      },
      { status: 500 }
    );
  }
}
