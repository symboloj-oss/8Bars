import type { Metadata } from 'next';
import { Inter, Noto_Sans_SC, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
import { cn } from "@/lib/utils";

// 字体体系:
// 标题展示 Space Grotesk(几何现代,音乐产品气质)
// 正文 Inter(拉丁)+ Noto Sans SC(中文,跨平台一致)
// 数字/时间码 JetBrains Mono(仅用于 BPM、小节拍数等数值)
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '8Bars - 和朋友一起完成一段音乐',
  description: '与朋友在线协作，录制并叠加 8 小节声部，一起完成一段音乐。',
  openGraph: {
    title: '8Bars - 和朋友一起完成一段音乐',
    description: '与朋友在线协作，录制并叠加 8 小节声部，一起完成一段音乐。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={cn(spaceGrotesk.variable, inter.variable, notoSansSC.variable, jetbrainsMono.variable, "font-sans")}
    >
      <head>
        {/* 首绘前主题脚本:在 React 渲染前先给 html 挂上 dark 类,避免主题闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('8bars_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 min-h-screen selection:bg-[#ff5522]/30 selection:text-zinc-900 dark:selection:text-white antialiased transition-colors duration-200">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
