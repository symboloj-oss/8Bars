"use client";
import React from 'react';
import { SlotType } from '../types/music';

// 4 位虚拟乐手 SVG 形象库(纯矢量,无损缩放)
// 兔子鼓手 / 小熊贝斯 / 猫咪吉他 / 柴犬主唱
interface BandFigureProps {
  slotType: SlotType;
  className?: string;
}

/* ============ 1. 兔子鼓手 ============ */
const BunnyDrummer: React.FC = () => (
  <svg viewBox="0 0 200 240" className="w-full h-full">
    <defs>
      <linearGradient id="figDrumRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff5e42" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="figCymbGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="figGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#111827" />
      </linearGradient>
    </defs>

    {/* 兔子长耳朵 */}
    <ellipse cx="80" cy="40" rx="12" ry="35" fill="#f8fafc" transform="rotate(-10 80 40)" />
    <ellipse cx="80" cy="42" rx="6" ry="24" fill="#fda4af" transform="rotate(-10 80 42)" />
    <ellipse cx="120" cy="40" rx="12" ry="35" fill="#f8fafc" transform="rotate(10 120 40)" />
    <ellipse cx="120" cy="42" rx="6" ry="24" fill="#fda4af" transform="rotate(10 120 42)" />

    {/* 耳机头梁 */}
    <path d="M 68 85 A 35 35 0 0 1 132 85" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
    <rect x="62" y="75" width="10" height="20" rx="4" fill="#ef4444" />
    <rect x="128" y="75" width="10" height="20" rx="4" fill="#ef4444" />

    {/* 兔子头部 */}
    <ellipse cx="100" cy="90" rx="36" ry="32" fill="#ffffff" />
    <polygon points="100,95 94,90 106,90" fill="#f472b6" />
    <path d="M 94 99 Q 100 104 106 99" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />

    {/* 酷炫墨镜 */}
    <rect x="72" y="80" width="24" height="15" rx="4" fill="url(#figGlassShade)" stroke="#0f172a" strokeWidth="2" />
    <rect x="104" y="80" width="24" height="15" rx="4" fill="url(#figGlassShade)" stroke="#0f172a" strokeWidth="2" />
    <line x1="96" y1="86" x2="104" y2="86" stroke="#0f172a" strokeWidth="3" />

    {/* 镲片(左右两侧) */}
    <line x1="30" y1="120" x2="30" y2="210" stroke="#94a3b8" strokeWidth="3" />
    <ellipse cx="30" cy="120" rx="25" ry="6" fill="url(#figCymbGold)" transform="rotate(-15 30 120)" />
    <line x1="170" y1="125" x2="170" y2="210" stroke="#94a3b8" strokeWidth="3" />
    <ellipse cx="170" cy="125" rx="25" ry="6" fill="url(#figCymbGold)" transform="rotate(15 170 125)" />

    {/* 身体/手臂+鼓棒 */}
    <rect x="85" y="118" width="30" height="30" rx="10" fill="#f1f5f9" />
    <line x1="75" y1="125" x2="60" y2="148" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />
    <line x1="60" y1="148" x2="75" y2="160" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
    <line x1="125" y1="125" x2="140" y2="148" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />
    <line x1="140" y1="148" x2="125" y2="160" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

    {/* 两个小挂通鼓 */}
    <rect x="52" y="145" width="40" height="24" rx="4" fill="url(#figDrumRed)" />
    <ellipse cx="72" cy="145" rx="20" ry="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
    <rect x="108" y="145" width="40" height="24" rx="4" fill="url(#figDrumRed)" />
    <ellipse cx="128" cy="145" rx="20" ry="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />

    {/* 前方大底鼓 */}
    <circle cx="100" cy="188" r="42" fill="url(#figDrumRed)" />
    <circle cx="100" cy="188" r="34" fill="#ffffff" stroke="#e2e8f0" strokeWidth="3" />
    {/* 底鼓正中的波形 Logo */}
    <path d="M 82 188 Q 88 188 92 180 T 100 188 T 108 196 T 118 188" fill="none" stroke="#ff5a36" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ============ 2. 小熊贝斯手 ============ */
const BearBassist: React.FC = () => (
  <svg viewBox="0 0 200 240" className="w-full h-full">
    <defs>
      <linearGradient id="figBearFur" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="figBassSunburst" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>

    {/* 小熊耳朵 */}
    <circle cx="70" cy="65" r="14" fill="#92400e" />
    <circle cx="70" cy="65" r="7" fill="#fcd34d" />
    <circle cx="130" cy="65" r="14" fill="#92400e" />
    <circle cx="130" cy="65" r="7" fill="#fcd34d" />

    {/* 小熊黄色渔夫帽 */}
    <path d="M 64 68 C 64 45 136 45 136 68 Z" fill="#facc15" />
    <path d="M 52 68 Q 100 62 148 68 L 152 74 Q 100 68 48 74 Z" fill="#eab308" />

    {/* 头部与胖脸颊 */}
    <ellipse cx="100" cy="85" rx="34" ry="28" fill="url(#figBearFur)" />
    <ellipse cx="100" cy="94" rx="16" ry="12" fill="#fef3c7" />
    <ellipse cx="100" cy="89" rx="6" ry="4" fill="#451a03" />
    {/* 享受音乐的闭眼(微笑曲线) */}
    <path d="M 78 82 Q 85 87 92 82" fill="none" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 108 82 Q 115 87 122 82" fill="none" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 96 98 Q 100 102 104 98" fill="none" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />

    {/* 身体:黄色夹克+白T恤+牛仔裤 */}
    <rect x="75" y="110" width="50" height="55" rx="12" fill="#facc15" />
    <rect x="88" y="110" width="24" height="55" fill="#f8fafc" />
    <rect x="74" y="160" width="22" height="45" rx="8" fill="#3b82f6" />
    <rect x="104" y="160" width="22" height="45" rx="8" fill="#3b82f6" />
    <ellipse cx="85" cy="210" rx="13" ry="7" fill="#94a3b8" />
    <ellipse cx="115" cy="210" rx="13" ry="7" fill="#94a3b8" />

    {/* 斜背的电贝斯 */}
    <g transform="rotate(-28 100 145)">
      <rect x="30" y="140" width="85" height="7" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
      <path d="M 20 137 L 30 140 L 30 147 L 22 149 Z" fill="#b45309" />
      <path d="M 110 130 C 135 125 150 140 145 155 C 140 170 120 170 105 160 C 95 150 100 135 110 130 Z" fill="url(#figBassSunburst)" stroke="#78350f" strokeWidth="2" />
      <ellipse cx="125" cy="148" rx="10" ry="6" fill="#ffffff" opacity="0.8" />
      <line x1="25" y1="143" x2="135" y2="143" stroke="#cbd5e1" strokeWidth="1.5" />
    </g>

    {/* 熊掌扶琴 */}
    <circle cx="68" cy="125" r="9" fill="#92400e" />
    <circle cx="128" cy="150" r="9" fill="#92400e" />
  </svg>
);

/* ============ 3. 猫咪吉他手 ============ */
const CatGuitarist: React.FC = () => (
  <svg viewBox="0 0 200 240" className="w-full h-full">
    <defs>
      <linearGradient id="figAcousticWood" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>

    {/* 猫咪尖耳朵 */}
    <polygon points="65,48 85,75 55,75" fill="#f97316" />
    <polygon points="68,54 80,73 58,73" fill="#fecdd3" />
    <polygon points="135,48 115,75 145,75" fill="#f97316" />
    <polygon points="132,54 120,73 142,73" fill="#fecdd3" />

    {/* 猫头轮廓与花纹 */}
    <ellipse cx="100" cy="85" rx="33" ry="26" fill="#fdba74" />
    <path d="M 85 85 Q 100 95 115 85 Q 125 105 100 108 Q 75 105 85 85 Z" fill="#ffffff" />
    <polygon points="100,92 96,88 104,88" fill="#f43f5e" />
    <path d="M 95 96 Q 100 99 105 96" fill="none" stroke="#7c2d12" strokeWidth="1.5" strokeLinecap="round" />

    {/* 黑框复古圆眼镜 */}
    <circle cx="85" cy="82" r="12" fill="none" stroke="#18181b" strokeWidth="3" />
    <circle cx="115" cy="82" r="12" fill="none" stroke="#18181b" strokeWidth="3" />
    <line x1="97" y1="82" x2="103" y2="82" stroke="#18181b" strokeWidth="3" />
    <circle cx="85" cy="82" r="3" fill="#18181b" />
    <circle cx="115" cy="82" r="3" fill="#18181b" />

    {/* 身体:绿色温暖毛衣+牛仔裤 */}
    <rect x="74" y="108" width="52" height="55" rx="12" fill="#65a30d" />
    <path d="M 88 108 Q 100 115 112 108" fill="none" stroke="#4d7c0f" strokeWidth="4" />
    <rect x="78" y="160" width="18" height="42" rx="7" fill="#1e3a8a" />
    <rect x="104" y="160" width="18" height="42" rx="7" fill="#1e3a8a" />

    {/* 怀抱的木吉他 */}
    <g transform="rotate(25 110 145)">
      <rect x="95" y="65" width="8" height="60" fill="#fde68a" stroke="#b45309" strokeWidth="1" />
      <path d="M 93 55 L 105 55 L 105 65 L 93 65 Z" fill="#78350f" />
      <path d="M 99 115 C 80 115 75 130 85 145 C 70 160 80 185 105 185 C 130 185 140 160 125 145 C 135 130 130 115 99 115 Z" fill="url(#figAcousticWood)" stroke="#78350f" strokeWidth="2" />
      <circle cx="102" cy="142" r="8" fill="#451a03" />
      <rect x="97" y="165" width="12" height="4" rx="1" fill="#78350f" />
    </g>

    {/* 猫爪按和弦与扫弦 */}
    <circle cx="116" cy="118" r="7" fill="#ffffff" />
    <circle cx="80" cy="142" r="7" fill="#ffffff" />
  </svg>
);

/* ============ 4. 柴犬主唱 ============ */
const ShibaVocalist: React.FC = () => (
  <svg viewBox="0 0 200 240" className="w-full h-full">
    <defs>
      <linearGradient id="figJacketRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <linearGradient id="figVintageMic" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>

    {/* 翘起的柴犬白尖尾巴 */}
    <path d="M 60 160 Q 40 145 50 130 Q 62 135 68 150 Z" fill="#ea580c" />
    <path d="M 45 133 Q 50 130 54 135 Z" fill="#ffffff" />

    {/* 柴犬三角形机敏耳朵 */}
    <polygon points="68,52 86,75 60,78" fill="#ea580c" />
    <polygon points="70,58 82,73 64,75" fill="#fed7aa" />
    <polygon points="132,52 114,75 140,78" fill="#ea580c" />
    <polygon points="130,58 118,73 136,75" fill="#fed7aa" />

    {/* 柴犬头部与白眉毛 */}
    <ellipse cx="100" cy="85" rx="34" ry="26" fill="#ea580c" />
    <path d="M 75 88 Q 100 102 125 88 Q 135 110 100 110 Q 65 110 75 88 Z" fill="#ffffff" />
    <circle cx="86" cy="74" r="3" fill="#ffffff" />
    <circle cx="114" cy="74" r="3" fill="#ffffff" />
    <circle cx="86" cy="82" r="3.5" fill="#18181b" />
    <circle cx="114" cy="82" r="3.5" fill="#18181b" />
    <polygon points="100,88 95,84 105,84" fill="#18181b" />

    {/* 激情放歌的大张嘴 */}
    <path d="M 92 92 Q 100 90 108 92 Q 108 106 100 106 Q 92 106 92 92 Z" fill="#991b1b" />
    <path d="M 96 102 Q 100 98 104 102" fill="#f43f5e" />

    {/* 红色帅气飞行员夹克 */}
    <rect x="72" y="108" width="56" height="55" rx="14" fill="url(#figJacketRed)" />
    <rect x="94" y="108" width="12" height="55" fill="#18181b" />
    <circle cx="84" cy="122" r="4" fill="#fbbf24" />
    {/* 牛仔裤与小红鞋 */}
    <rect x="76" y="160" width="18" height="42" rx="7" fill="#1e293b" />
    <rect x="106" y="160" width="18" height="42" rx="7" fill="#1e293b" />
    <ellipse cx="85" cy="204" rx="11" ry="6" fill="#ef4444" />
    <ellipse cx="115" cy="204" rx="11" ry="6" fill="#ef4444" />

    {/* 麦克风立架与复古鸟笼麦 */}
    <line x1="135" y1="85" x2="135" y2="215" stroke="#cbd5e1" strokeWidth="3" />
    <line x1="120" y1="215" x2="150" y2="215" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
    <rect x="127" y="75" width="16" height="22" rx="6" fill="url(#figVintageMic)" stroke="#475569" strokeWidth="1.5" transform="rotate(-15 135 85)" />
  </svg>
);

export const BandFigure: React.FC<BandFigureProps> = ({ slotType, className }) => {
  const figures: Record<SlotType, React.ReactNode> = {
    drums: <BunnyDrummer />,
    bass: <BearBassist />,
    chords: <CatGuitarist />,
    melody: <ShibaVocalist />,
  };
  return <div className={className}>{figures[slotType]}</div>;
};
