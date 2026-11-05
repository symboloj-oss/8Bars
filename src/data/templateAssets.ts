import { SlotType } from '../types/music';

// 模板预置音频切片清单(PRD 冷启动机制:空席位默认加载高品质 Loop)。
// 房主录制的 8 小节素材上传到 storage 桶 template-assets(路径:{templateId}/{slotType}.mp3|webm)
// 后,在这里登记即自动生效,无需发版。
// 播放优先级:真人 Take → 模板预置切片(本文件)→ AI 合成兜底。

const BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/template-assets`;

// 示例:音频上传后取消注释并替换为真实路径
export const TEMPLATE_ASSETS: Partial<Record<string, Partial<Record<SlotType, string>>>> = {
  // 'friday-pop': {
  //   drums: `${BUCKET_URL}/friday-pop/drums.mp3`,
  //   bass: `${BUCKET_URL}/friday-pop/bass.mp3`,
  // },
};

/** 取某模板某席位的预置音频 URL,未登记则返回 undefined(走 AI 合成兜底) */
export function getTemplateAsset(templateId: string, slotType: SlotType): string | undefined {
  return TEMPLATE_ASSETS[templateId]?.[slotType];
}
