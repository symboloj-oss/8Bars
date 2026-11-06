import { useState, useEffect } from 'react';
import { RoomTemplate } from '../types/music';
import { listTemplates } from '../lib/api/templates';

// 模板列表(来自 Supabase templates 表):挂载时拉取,失败静默降级为空数组
export function useTemplates(): { templates: RoomTemplate[]; loading: boolean } {
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    listTemplates()
      .then((list) => {
        if (!cancelled) setTemplates(list);
      })
      .catch((e) => console.warn('模板列表加载失败', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, loading };
}
