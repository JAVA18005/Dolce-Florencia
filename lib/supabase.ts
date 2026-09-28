// lib/supabase.ts — Cliente de Supabase con la service role key (SOLO servidor).
//
// REGLA: este módulo usa SUPABASE_SERVICE_ROLE_KEY y jamás debe importarse desde
// un componente 'use client' ni enviarse esas variables al navegador.
// Se instancia de forma perezosa (lazy) para no depender del entorno al importar.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!cliente) {
    const url = process.env.SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!url || !serviceKey) {
      throw new Error('Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
    }
    cliente = createClient(url, serviceKey, {
      auth: {
        // Client de servidor: sin persistencia ni refresh automático de sesión.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cliente;
}