import { SlotType } from '../types/music';
import charDrummerImg from '../assets/images/char_drummer_milo_1793852740129.jpg';
import charBassistImg from '../assets/images/char_bassist_gus_1793852741489.jpg';
import charGuitaristImg from '../assets/images/char_guitarist_cleo_1793852742383.jpg';
import charVocalistImg from '../assets/images/char_vocalist_nova_1793852742630.jpg';

export interface BandCharacter {
  id: string;
  slotType: SlotType;
  name: string;
  roleName: string;
  /** 人设标签(卡通人物,非动物) */
  persona: string;
  instrument: string;
  vibe: string;
  quote: string;
  imageUrl: string;
  accentColor: string;
}

// 四人乐队:卡通人物形象(热血鼓手少年 / 松弛贝斯大叔 / 文艺吉他少女 / 元气主唱)
export const BAND_CHARACTERS: Record<SlotType, BandCharacter> = {
  drums: {
    id: 'ali',
    slotType: 'drums',
    name: '阿力 (Ali)',
    roleName: '鼓手 · 节奏引擎',
    persona: '热血鼓手少年',
    instrument: '8小节原声套鼓 / 踩镲底鼓',
    vibe: '稳准狠 · 节奏发动机',
    quote: '“节拍交给我稳住，你们尽管自由发挥！”',
    imageUrl: charDrummerImg.src,
    accentColor: '#0ea5e9',
  },
  bass: {
    id: 'laobei',
    slotType: 'bass',
    name: '老贝 (Lao Bei)',
    roleName: '贝斯手 · 低音守护者',
    persona: '松弛贝斯大叔',
    instrument: 'Fender 4弦电贝斯 / Slap',
    vibe: '松弛微醺 · 灵魂低音炮',
    quote: '“踩死根音，低音一响整个乐队才有灵魂。”',
    imageUrl: charBassistImg.src,
    accentColor: '#f59e0b',
  },
  chords: {
    id: 'xiaoke',
    slotType: 'chords',
    name: '小柯 (Xiao Ke)',
    roleName: '节奏吉他 · 和弦提词',
    persona: '文艺吉他少女',
    instrument: '马丁原声木吉他 / Rhodes琴',
    vibe: '文艺治愈 · 温暖扫弦',
    quote: '“只要4个和弦，就能拼出整个世界的故事。”',
    imageUrl: charGuitaristImg.src,
    accentColor: '#10b981',
  },
  melody: {
    id: 'nova',
    slotType: 'melody',
    name: '诺娃 (Nova)',
    roleName: '主唱/主奏 · 灵魂高光',
    persona: '元气主唱少女',
    instrument: '复古镀铬动圈麦克风 / 独奏',
    vibe: '高光澎湃 · 情绪主导',
    quote: '“戴上耳机，把你的故事唱进这8个小节里！”',
    imageUrl: charVocalistImg.src,
    accentColor: '#ff5522',
  },
};

export function getCharacterForSlot(type: SlotType): BandCharacter {
  return BAND_CHARACTERS[type] || BAND_CHARACTERS.melody;
}
