import { SlotInfo, SlotType } from './music';

export interface CommunityRoom {
  id: string;
  title: string;
  templateId: string;
  genre: string;
  bpm: number;
  progression: string[];
  creatorName: string;
  creatorAvatar: string;
  contactInfo: string; // e.g. "微信: guitar_ajie99" or "Discord: @bassman"
  recruitmentCall: string; // e.g. "急寻贝斯手！走根音即可稳过，今晚成团！"
  tags: string[];
  humanSlotsCount: number; // 1 to 4
  vacantRoles: SlotType[]; // which roles are still played by AI and waiting for human musicians
  likesCount: number;
  createdAt: string;
  isOfficialSeed?: boolean;
  slots: SlotInfo[];
}
