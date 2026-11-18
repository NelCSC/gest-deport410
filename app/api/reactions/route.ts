import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAllowedReactionType, isValidUuid } from '@/lib/security';

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
    return NextResponse.json({ mode: 'local', reactions: [] });
  }

  const postId = req.nextUrl.searchParams.get('postId');
  const query = supabase.from('reactions').select('id, post_id, visitor_id, reaction_type, created_at');
  const { data, error } = postId ? await query.eq('post_id', postId) : await query;

  if (error) {
    return NextResponse.json({ error: 'No se pudieron obtener las reacciones.' }, { status: 500 });
  }

  return NextResponse.json({ mode: 'supabase', reactions: data || [] });
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting anti-bots (máx. 20 reacciones por minuto por IP)
  const rate = checkRateLimit(req, 'reactions', 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Demasiadas solicitudes. Intenta nuevamente en ${rate.retryAfterSeconds} segundos.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.trim() : '';
    const reactionType = body?.reactionType;

    // 2. Validación estricta de datos
    if (!postId) {
      return NextResponse.json({ error: 'Identificador de publicación inválido.' }, { status: 400 });
    }
    if (!isValidUuid(visitorId)) {
      return NextResponse.json({ error: 'Identificador de visitante inválido.' }, { status: 400 });
    }
    if (!isAllowedReactionType(reactionType)) {
      return NextResponse.json(
        { error: 'Tipo de reacción no permitido.' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({
        mode: 'local',
        action: 'handled_locally',
      });
    }

    // 3. Verificar si ya reaccionó para alternar (quitar) o cambiar reacción
    const { data: existing, error: fetchError } = await supabase
      .from('reactions')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Error al consultar reacción previa.' }, { status: 500 });
    }

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Mismo botón: quitar reacción
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);
        if (deleteError) {
          return NextResponse.json({ error: 'No se pudo quitar la reacción.' }, { status: 500 });
        }
        return NextResponse.json({ mode: 'supabase', action: 'removed', reactionType: null });
      } else {
        // Cambiar tipo de reacción
        const { error: updateError } = await supabase
          .from('reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);
        if (updateError) {
          return NextResponse.json({ error: 'No se pudo actualizar la reacción.' }, { status: 500 });
        }
        return NextResponse.json({ mode: 'supabase', action: 'updated', reactionType });
      }
    }

    // Nueva reacción
    const { error: insertError } = await supabase.from('reactions').insert({
      post_id: postId,
      visitor_id: visitorId,
      reaction_type: reactionType,
    });

    if (insertError) {
      return NextResponse.json({ error: 'No se pudo registrar la reacción.' }, { status: 500 });
    }

    return NextResponse.json({ mode: 'supabase', action: 'created', reactionType }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Solicitud JSON inválida.' }, { status: 400 });
  }
}
