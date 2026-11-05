import { getSupabaseBrowser } from './client';

/**
 * 静默匿名登录:任何写操作前调用,返回设备级稳定 uid。
 * supabase-js 会把匿名会话持久化到 localStorage,同一设备/浏览器身份不变。
 * 前置条件:Supabase 后台已开启 Anonymous Sign-Ins。
 */
export async function ensureAnonymousUser(): Promise<string> {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error('匿名登录失败: ' + (error?.message || '未知错误'));
  }
  return data.user.id;
}
