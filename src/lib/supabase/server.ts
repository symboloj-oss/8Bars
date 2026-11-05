import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

/**
 * 服务端 Supabase 客户端(RSC 专用,只做公开读)。
 * 首版服务端只需要读公开行(SEO 元数据/存在性校验),不需要用户身份;
 * 未来接入真实账号体系时改为 @supabase/ssr 的 cookie 会话模式。
 */
export function getSupabaseServer() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
