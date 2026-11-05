import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

let client: SupabaseClient<Database> | null = null;

/**
 * 浏览器端 Supabase 客户端单例(惰性创建,避免 SSR 阶段触碰)
 * 所有读写经此入口,RLS 是唯一安全边界(详见 docs/architecture.md)
 */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
