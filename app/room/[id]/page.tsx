import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RoomView } from '@/views/RoomView';
import { getSupabaseServer } from '@/lib/supabase/server';

// 点赞/席位实时变化,不做静态缓存
export const dynamic = 'force-dynamic';

type RoomPageProps = { params: Promise<{ id: string }> };

// 服务端预取房间元数据:SEO 标题 + 微信/小红书分享卡片
export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseServer();
  const { data: room } = await supabase
    .from('rooms')
    .select('title')
    .eq('id', id)
    .maybeSingle();

  if (!room) {
    return { title: '8Bars - 8小节极简乐器异步合奏' };
  }
  return {
    title: `${room.title} · 8Bars 合奏房间`,
    description: `进入 8Bars 合奏房间「${room.title}」,认领空缺席位,8 小节拼出一支乐队。`,
    openGraph: {
      title: `${room.title} · 8Bars 合奏房间`,
      description: '8小节积木式拼图,固定4席位,随时拼出完整乐队作品。',
      type: 'website',
    },
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  // 服务端存在性校验:房间不存在直接 404
  const supabase = getSupabaseServer();
  const { data: room } = await supabase.from('rooms').select('id').eq('id', id).maybeSingle();
  if (!room) notFound();

  return <RoomView roomId={id} />;
}
