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
    return { title: '8Bars - 和朋友一起完成一段音乐' };
  }
  return {
    title: `${room.title} · 8Bars 合奏房间`,
    description: `进入 8Bars 合奏房间「${room.title}」，选择一个声部并录制 8 小节，和朋友一起完成一段音乐。`,
    openGraph: {
      title: `${room.title} · 8Bars 合奏房间`,
      description: `加入「${room.title}」合奏房间，选择一个声部并录制 8 小节，和朋友一起完成一段音乐。`,
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
