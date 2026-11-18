import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUuid, sanitizePlainText } from '@/lib/security';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !serviceKey ||
    url.includes('tu-proyecto.supabase.co') ||
    serviceKey.includes('tu-supabase-service-role')
  ) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ mode: 'local', comments: [] });
  }

  const postId = req.nextUrl.searchParams.get('postId');
  const query = supabase
    .from('comments')
    .select('id, post_id, visitor_id, author_alias, content, created_at')
    .order('created_at', { ascending: true });

  const { data, error } = postId ? await query.eq('post_id', postId) : await query;

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los comentarios.' }, { status: 500 });
  }

  return NextResponse.json({ mode: 'supabase', comments: data || [] });
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting anti-spam (máx. 6 comentarios por minuto por IP)
  const rate = checkRateLimit(req, 'comments', 6, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Has enviado varios comentarios seguidos. Espera ${rate.retryAfterSeconds} segundos antes de publicar otro.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    // 2. Honeypot anti-bots: si el campo oculto contiene texto, rechazar inmediatamente
    if (typeof body?.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json(
        { error: 'Solicitud rechazada por validación anti-spam.' },
        { status: 400 }
      );
    }

    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.trim() : '';
    const rawContent = typeof body?.content === 'string' ? body.content : '';
    const rawAlias = typeof body?.authorAlias === 'string' ? body.authorAlias : '';

    if (!postId) {
      return NextResponse.json({ error: 'Publicación no especificada.' }, { status: 400 });
    }
    if (!isValidUuid(visitorId)) {
      return NextResponse.json({ error: 'Identificador de visitante inválido.' }, { status: 400 });
    }

    // 3. Sanitización XSS y límites de longitud estrictos
    const cleanContent = sanitizePlainText(rawContent, 500);
    if (cleanContent.length < 2) {
      return NextResponse.json(
        { error: 'El comentario debe tener entre 2 y 500 caracteres válidos.' },
        { status: 400 }
      );
    }
    if (rawContent.trim().length > 500) {
      return NextResponse.json(
        { error: 'El comentario supera el máximo permitido de 500 caracteres.' },
        { status: 400 }
      );
    }

    const cleanAlias = sanitizePlainText(rawAlias, 30) || 'Visitante Anónimo';

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          mode: 'local',
          comment: {
            id: `local-cmt-${Date.now()}`,
            post_id: postId,
            visitor_id: visitorId,
            author_alias: cleanAlias,
            content: cleanContent,
            created_at: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        visitor_id: visitorId,
        author_alias: cleanAlias,
        content: cleanContent,
      })
      .select('id, post_id, visitor_id, author_alias, content, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'No se pudo guardar el comentario en la base de datos.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mode: 'supabase', comment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ mode: 'local', deleted: true });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData.user) {
    return NextResponse.json({ error: 'Sesión administrativa inválida.' }, { status: 401 });
  }

  const commentId = req.nextUrl.searchParams.get('id');
  if (!commentId) {
    return NextResponse.json({ error: 'Falta el ID del comentario.' }, { status: 400 });
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el comentario.' }, { status: 500 });
  }

  return NextResponse.json({ mode: 'supabase', deleted: true });
}
