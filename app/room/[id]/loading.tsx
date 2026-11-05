// 房间页服务端加载骨架(客户端还会再显示"正在装载乐队"的加载态)
export default function RoomLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fbfbfd] dark:bg-[#09090b] text-zinc-500 font-mono">
      <div className="w-10 h-10 rounded-2xl border-2 border-[#ff5522]/30 border-t-[#ff5522] animate-spin" />
      <span className="text-xs">正在装载 8 小节乐队…</span>
    </div>
  );
}
