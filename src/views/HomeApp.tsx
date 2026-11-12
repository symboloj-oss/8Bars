"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 首页 = 乐队广场(入口页):创建乐队 / 进入别人的乐队
// 虚拟乐队舞台在 /room/[id],由 RoomView 承载
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CommunityRoom } from '../types/community';
import { createDefaultSlots } from '../data/templates';
import { audioEngine } from '../services/audioEngine';
import { listPublishedRooms, createRoom, updateRoomRecruitment } from '../lib/api/rooms';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useTemplates } from '../hooks/useTemplates';
import { RoomHeader } from '../components/RoomHeader';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { BandPlazaView } from '../components/BandPlazaView';

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();

  // 模板列表(来自 Supabase templates 表)
  const { templates } = useTemplates();

  // 广场房间列表(来自 Supabase,首次加载显示骨架屏)
  const [communityRooms, setCommunityRooms] = useState<CommunityRoom[]>([]);
  const [plazaLoading, setPlazaLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // 加载广场
  useEffect(() => {
    listPublishedRooms()
      .then((list) => setCommunityRooms(list))
      .catch((e) => console.warn('广场加载失败', e))
      .finally(() => setPlazaLoading(false));
  }, []);

  // 创建乐队:写入 Supabase 拿真实 id → 直接进入该乐队的舞台
  const handleCreateRoom = async (
    templateId: string,
    customTitle: string,
    creatorName: string
  ) => {
    const chosenTemplate = templates.find((t) => t.id === templateId);
    if (!chosenTemplate) {
      console.warn('模板不存在', templateId);
      return;
    }
    audioEngine.stop();
    try {
      const { id } = await createRoom({
        title: customTitle,
        templateId: chosenTemplate.id,
        bpm: chosenTemplate.bpm,
        progression: chosenTemplate.progression,
        creatorName,
        slots: createDefaultSlots(),
      });
      router.push(`/room/${id}`);
    } catch (e) {
      console.warn('创建乐队失败', e);
    }
  };

  // 进入别人的乐队:直达该乐队的舞台
  const handleSelectCommunityRoom = (commRoom: CommunityRoom) => {
    audioEngine.stop();
    router.push(`/room/${commRoom.id}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-[#ff5522]/20 transition-colors duration-200">
      <div className="flex flex-col gap-6">
        <RoomHeader
          isDark={isDark}
          lang={lang}
          onSetLang={setLang}
          t={t}
          variant="home"
          onToggleTheme={toggleTheme}
          onBackToPlaza={() => {}}
        />

        <main className="w-full flex flex-col gap-6">
          <BandPlazaView
            rooms={communityRooms}
            currentRoomId=""
            onSelectRoom={handleSelectCommunityRoom}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            loading={plazaLoading}
            t={t}
          />
        </main>
      </div>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <CreateRoomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateRoom={handleCreateRoom}
          templates={templates}
          t={t}
        />
      )}
    </div>
  );
}
