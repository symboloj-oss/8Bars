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
  species: string;
  instrument: string;
  vibe: string;
  quote: string;
  imageUrl: string;
  accentColor: string;
}

export const BAND_CHARACTERS: Record<SlotType, BandCharacter> = {
  drums: {
    id: 'milo',
    slotType: 'drums',
    name: 'Milo 米洛',
    roleName: '鼓手 · 节奏引擎',
    species: '节拍酷兔 (Beat Bunny)',
    instrument: '8小节原声套鼓 / 踩镲底鼓',
    vibe: '稳准狠 · 节奏发动机',
    quote: '“节拍交给我稳住，你们尽管自由发挥！”',
    imageUrl: charDrummerImg,
    accentColor: '#0ea5e9',
  },
  bass: {
    id: 'gus',
    slotType: 'bass',
    name: 'Gus 巴斯',
    roleName: '贝斯手 · 低音守护者',
    species: '放克熊 (Groove Bear)',
    instrument: 'Fender 4弦电贝斯 / Slap',
    vibe: '松弛微醺 · 灵魂低音炮',
    quote: '“踩死根音，低音一响整个乐队才有灵魂。”',
    imageUrl: charBassistImg,
    accentColor: '#f59e0b',
  },
  chords: {
    id: 'cleo',
    slotType: 'chords',
    name: 'Cleo 克莱奥',
    roleName: '节奏吉他 · 和弦提词',
    species: '三花猫 (Calico Cat)',
    instrument: '马丁原声木吉他 / Rhodes琴',
    vibe: '文艺治愈 · 温暖扫弦',
    quote: '“只要4个和弦，就能拼出整个世界的故事。”',
    imageUrl: charGuitaristImg,
    accentColor: '#10b981',
  },
  melody: {
    id: 'nova',
    slotType: 'melody',
    name: 'Nova 诺娃',
    roleName: '主唱/主奏 · 灵魂高光',
    species: '热血柴犬 (Shiba Inu)',
    instrument: '复古镀铬动圈麦克风 / 独奏',
    vibe: '高光澎湃 · 情绪主导',
    quote: '“戴上耳机，把你的故事唱进这8个小节里！”',
    imageUrl: charVocalistImg,
    accentColor: '#ff5522',
  },
};

export function getCharacterForSlot(type: SlotType): BandCharacter {
  return BAND_CHARACTERS[type] || BAND_CHARACTERS.melody;
}
