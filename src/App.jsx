import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Dice5, Copy, Music2, Mic2, Radio, Sliders, Zap, Globe2, RefreshCw, Sparkles, X, Plus, BrainCircuit, Loader2, ChevronDown, ChevronUp, Wand2, ArrowRight, Bot, Microscope, FileText, Lock, Unlock, Gem, Link2, FlaskConical, TestTube2, Info, Power, KeyRound, ShieldCheck, Eye, EyeOff, FileMusic, ScrollText, ZoomIn, ZoomOut, Flame, PenLine, Key, Settings, Crown, LogIn, LogOut, User, Wrench, BookOpen, Smartphone, Trophy, Disc, Lightbulb, Camera, Download } from 'lucide-react';

// === [云端配置区] 请填入您的私有 Firebase 配置 ===
const firebaseConfig = {
    apiKey: "AIzaSyASsWMYeVrWdwnzHNSNN-S4v-em7Wxn-fg",
    authDomain: "xcmm-auth-system.firebaseapp.com",
    projectId: "xcmm-auth-system",
    storageBucket: "xcmm-auth-system.firebasestorage.app",
    messagingSenderId: "766281113604",
    appId: "1:766281113604:web:318df802cd2fc7b2609551"
};

const PRIVATE_APP_ID = "xcmm-v1"; // 此 ID 必须与您的发卡机保持一致

// 安全初始化 Firebase
let firebaseApp, auth, db;
try {
    const config = typeof __firebase_config !== 'undefined' && __firebase_config ? JSON.parse(__firebase_config) : firebaseConfig;
    if (config.apiKey && config.apiKey !== "你的API_KEY") {
        firebaseApp = initializeApp(config);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

// === 外部常量与数据定义 ===

const strategies = [
  { value: "Balanced (平衡)", desc: "⚖️ 均衡混合：保持风格、乐器与氛围的完美比例，最稳妥的选择。" },
  { value: "Rhythmic Hybrid (节奏嫁接)", desc: "🥁 节奏嫁接：使用A风格的律动骨架，强行演奏B风格的乐器，产生律动反差。" },
  { value: "Timbral Shift (音色置换)", desc: "🎨 音色置换：保留原曲结构，但将乐器完全替换为异国或电子音色，听觉错位。" },
  { value: "Chaotic (混沌)", desc: "🌪️ 混沌实验：打破常规逻辑，随机制造强烈的风格冲突和不可预测的实验性听感。" },
  { value: "Mixx Pop (段落硬切)", desc: "🔀 段落硬切：强行将主歌(Verse)与副歌(Chorus)分配为极度反差的曲风，并使用突变音效过渡，制造听觉撕裂与多巴胺爆发。" }
];

// 数据库
const data = {
  styles: {
    "中国": [
      "Mandopop (华语流行)", "Cantopop (粤语流行)", "Hokkien Pop (台语流行/闽南语歌)", 
      "Chinese Traditional Opera (京剧/戏曲)", "Kunqu Opera (昆曲)", "Qinqiang (秦腔)",
      "Huangmei Opera (黄梅戏)", "Yue Opera (越剧)", "Peking Opera Percussion (京剧打击乐)",
      "Guqin Music (古琴曲)", "Chinese Rock (中国摇滚)", "Shaanxi Rock (西北/秦腔摇滚)",
      "C-Trap (中国陷阱)", "Sichuan Trap (川渝陷阱)", "Northwest Wind (西北风)", 
      "Jiangnan Sizhu (江南丝竹)", "Xintianyou (信天游)", "Pingtan (苏州评弹)", 
      "Chinese Orchestra (民乐团)", "Shidaiqu (老上海时代曲)",
      "Gufeng (古风流行)", "Hanmai (喊麦/MC)", "Taoist Chant (道教音乐)", "Buddhist Chant (佛教梵呗)",
      "Tibetan Throat Singing (藏式呼麦)", "Mongolian Long Song (蒙古长调)", "Kazakh Kui (哈萨克冬不拉奎)",
      "Yunnan Folk (云南原生态)", "Dong Folk Chorus (侗族大歌)", "Hakka Hill Songs (客家山歌)",
      "Xinjiang Uyghur Muqam (维吾尔木卡姆)", "Dongbei Errenzhuan (东北二人转-元素)", 
      "Hong Kong Disco (港风迪斯科)", "Nanyin (福建南音)", "Hwa-er (花儿/西北民歌)"
    ],
    "东南亚 (南洋)": [
      "V-Pop (越南流行)", "Vinahouse (越南浩室/越鼓)", "Bolero (越式波莱罗)", "Ca Tru (歌筹)",
      "T-Pop (泰国流行)", "Luk Thung (泰国田园歌)", "Mor Lam (伊桑/莫兰民谣)", "Thai Funk (泰式放克)",
      "Indo Pop (印尼流行)", "Dangdut (印尼当杜特)", "Gamelan (甘美兰)", "Sundanese Pop (巽他流行)",
      "OPM (菲律宾流行)", "Budots (菲律宾布多茨舞曲)", "Pinoy Rock (菲律宾摇滚)",
      "Dikir Barat (马来歌谣)", "Khmer Pop (柬埔寨流行)"
    ],
    "日本": [
      "J-Pop (日本流行)", "City Pop (城市流行)", "Enka (演歌)", "Visual Kei (视觉系)", 
      "Anime Song (动画歌曲)", "Shibuya-kei (涩谷系)", "J-Core (日本硬核)", "Kawaii Metal (可爱金属)", 
      "Gagaku (雅乐)", "Shamisen Rock (三味线摇滚)", "Game Music (游戏配乐风)", "Min'yo (日本民谣)",
      "Vocaloid Style (虚拟歌姬风)", "J-Jazz (日式爵士)", "Technopop (科技流行)", 
      "Denpa (电波歌)", "Ryukyu Folk (冲绳民谣/岛呗)", "Noh (能剧音乐)"
    ],
    "韩国": [
      "K-Pop (韩国流行/偶像)", "K-Ballad (韩式抒情)", "K-R&B (韩国节奏蓝调)", "K-Hip Hop (韩国嘻哈)", 
      "Korean Trot (Trot/韩国演歌)", "Techno Trot (电音Trot/Ppongjak)", 
      "K-Indie (韩国独立)", "K-Rock (韩国摇滚)", "Pansori (板索里/传统说唱)", 
      "Samul Nori (四物打击乐)", "Sanjo (散调/器乐独奏)", "Sinawi (神房曲/即兴合奏)", 
      "Jeongak (正乐/宫廷音乐)", "K-Drama OST (韩剧原声)"
    ],
    "中东/北非": [
      "Arabic Pop (阿拉伯流行)", "Raï (阿尔及利亚流行)", "Dabke (黎凡特舞曲)", "Shaabi (埃及街头音乐)",
      "Persian Classical (波斯古典)", "Turkish Psych Rock (土耳其迷幻摇滚/Anatolian Rock)", "Khaliji (海湾音乐)",
      "Sufi Whirling Music (苏菲旋转舞曲)", "Mahraganat (埃及电音街头)", "Gnawa (格纳瓦/摩洛哥)",
      "Andalusian Classical (安达卢西亚古典)", "Maqam (木卡姆调式)"
    ],
    "印度": [
      "Bollywood Item Number (宝莱坞歌舞)", "Hindustani Classical (北印度古典)", "Carnatic Music (南印度古典)", 
      "Bhangra (旁遮普邦格拉)", "Indian Pop (印度流行)", "Raga Rock (拉格摇滚)", "Sitar Fusion (西塔琴融合)",
      "Sufi Qawwali (苏菲卡瓦力)", "Goa Trance (果阿迷幻)", "Tamil Film Music (泰米尔电影音乐)", "Baul (孟加拉游吟民谣)"
    ],
    "俄罗斯/东欧": [
      "Russian Pop (俄语流行)", "Sovietwave (苏维埃波/怀旧合成器)", "Russian Chanson (俄式香颂/罪犯歌)",
      "Russian Hardbass (俄式硬低音)", "Russian Post-Punk (俄式后朋克/Doomer)", "Phonk (飘移/炸街)",
      "Balalaika Folk (巴拉莱卡民谣)", "Slavic Folk (斯拉夫民谣)", "Orthodox Chant (东正教圣咏)",
      "Turbo-Folk (涡轮民谣/巴尔干)", "Balkan Brass (巴尔干铜管)"
    ],
    "美国": [
      "Delta Blues (三角洲蓝调)", "Country (乡村音乐)", "New York Hip Hop (纽约嘻哈)", "Chicago House (芝加哥浩室)", 
      "Motown Soul (摩城灵魂乐)", "Bluegrass (蓝草音乐)", "Gospel (福音音乐)", "Atlanta Trap (亚特兰大陷阱)", 
      "Surf Rock (冲浪摇滚)", "Americana (美式根源)", "Jazz Fusion (融合爵士)", "Neo-Soul (新灵魂乐)",
      "East Coast Rap (东岸说唱)", "West Coast G-Funk (西岸放克)", "Appalachian Folk (阿巴拉契亚民谣)",
      "Detroit Techno (底特律科技)", "Miami Bass (迈阿密低音)", "Jersey Club (泽西俱乐部)", "Drill (钻头音乐)"
    ],
    "巴西": [
      "Samba (桑巴)", "Bossa Nova (波萨诺瓦)", "MPB (巴西流行音乐)", "Baile Funk (巴西放克)", 
      "Brazilian Phonk (巴西Phonk)", "Forró (福罗舞曲)", "Tropicalia (热带主义)", "Choro (修罗)",
      "Sertanejo (巴西乡村)", "Pagode (帕戈迪)", "Axé (阿谢)"
    ],
    "牙买加/加勒比": [
      "Reggae (雷鬼)", "Dancehall (舞厅雷鬼)", "Ska (斯卡)", "Dub (达布)", "Rocksteady (稳态摇滚)", 
      "Calypso (卡利普索)", "Soca (索卡)", "Mento (门托)", "Reggae Fusion (雷鬼融合)", 
      "Afro-Cuban Jazz (古巴爵士)", "Son Cubano (古巴颂乐)", "Mambo (曼波)", "Zouk (祖克乐)"
    ],
    "拉美 (其他)": [
      "Reggaeton (雷鬼动)", "Tango (探戈/阿根廷)", "Mariachi (墨西哥流浪乐队)", "Bachata (巴恰塔/多米尼加)", 
      "Cumbia (昆比亚)", "Salsa (萨尔萨)", "Merengue (梅伦格)", "Bolero (波莱罗)",
      "Norteño (墨西哥北部民谣)", "Latin Trap (拉美陷阱)", "Andean Folk (安第斯民谣)"
    ],
    "欧洲 (西/北)": [
      "French Chanson (法国香颂)", "Italo Disco (意式迪斯科)", "Flamenco (弗拉明戈)", "Britpop (英伦摇滚)", 
      "Gregorian Chant (格里高利圣咏)", "Polka (波尔卡)", "Celtic Folk (凯尔特民谣)", "German Schlager (德国流行民谣)", 
      "Eurobeat (欧陆节拍)", "UK Garage (英国车库)", "French House (法式浩室)", "Viking Folk (维京民谣)", 
      "Klezmer (克莱兹默犹太音乐)", "Irish Jig (爱尔兰吉格舞曲)", "Medieval Folk (中世纪民谣)", "Yé-yé (法式耶耶风)"
    ],
    "非洲": [
      "Afrobeat (非洲节奏/Fela Kuti风)", "Afrobeats (现代非洲流行)", "Highlife (高生活舞曲)", 
      "Tuareg Desert Blues (图阿雷格沙漠蓝调)", "Soukous (苏库斯)", "Amapiano (南非钢琴浩室)", 
      "Mbalax (姆巴拉赫)", "Kizomba (基宗巴)", "African Tribal Drums (非洲部落鼓乐)", 
      "Juju (朱朱音乐)", "Kwaito (南非克威托)"
    ],
    "电子/舞曲": [
      "Techno (工业/科技舞曲)", "Deep House (深邃浩室)", "Trance (恍惚舞曲)", "Dubstep (回响贝斯)", 
      "Drum and Bass (鼓打贝斯)", "Gabber (加贝/硬核舞曲)", "Synthwave (合成器波)", "IDM (智能舞曲)", 
      "UK Garage (英国车库舞曲)", "Hardstyle (硬派舞曲)", "Glitch Hop (故障嘻哈)", "Future Bass (未来贝斯)",
      "Tropical House (热带浩室)", "Ambient Techno (氛围科技)", "Breakcore (碎核)", "Vaporwave (蒸气波)", 
      "Lo-Fi House (低保真浩室)", "Hyperpop (超流行)", "Dungeon Synth (地牢合成器)", "Witch House (女巫浩室)",
      "Footwork (芝加哥步舞)", "Complextro (复杂电子)", "Speedcore (极速硬核)"
    ],
    "摇滚/金属": [
      "Heavy Metal (重金属)", "Punk Rock (朋克摇滚)", "Grunge (垃圾摇滚)", "Psychedelic Rock (迷幻摇滚)", 
      "Norwegian Black Metal (挪威黑金属)", "Shoegaze (盯鞋摇滚)", "Post-Rock (后摇)", "Math Rock (数摇)", 
      "Industrial Metal (工业金属)", "Folk Metal (民谣金属)", "Nu Metal (新金属)", "Symphonic Metal (交响金属)",
      "Emo (情绪摇滚)", "Pop Punk (流行朋克)", "Post-Punk (后朋克)", "Doom Metal (毁灭金属)", "Stoner Rock (石人摇滚)"
    ],
    "影视/古典": [
      "Orchestral (管弦乐)", "Baroque (巴洛克)", "Opera (歌剧)", "Epic Trailer Music (史诗预告片音乐)", 
      "Film Score (电影配乐)", "Minimalist Classical (极简古典)", "Gothic Symphony (哥特交响)", 
      "Romantic Era (浪漫主义)", "Impressionist (印象派)", "Chamber Music (室内乐)", 
      "Cyberpunk Score (赛博朋克配乐)", "Horror Score (恐怖配乐)", "Disney Style (迪士尼风格)"
    ],
    "爵士/氛围": [
      "Bebop (比波普爵士)", "Smooth Jazz (平滑爵士)", "Fusion Jazz (融合爵士)", "Lo-Fi Hip Hop (低保真嘻哈)", 
      "Dark Ambient (黑暗氛围)", "Drone (嗡鸣音乐)", "Vaporwave (蒸气波)", "Acid Jazz (酸性爵士)", 
      "Elevator Music (电梯音乐)", "Cool Jazz (酷爵士)", "Free Jazz (自由爵士)", 
      "New Age (新世纪音乐)", "Space Ambient (太空氛围)", "Bossa Jazz (波萨爵士)"
    ],
    "其它": [
      "Ska (斯卡)", "World Fusion (世界融合)", "Experimental Noise (实验噪音)", 
      "Musique Concrète (具体音乐)", "Spoken Word (念白)", "Acapella (阿卡贝拉)", 
      "Aboriginal Didgeridoo (澳洲原住民音乐)", "Mongolian Throat Singing (蒙古呼麦)", 
      "Sea Shanty (水手号子)", "Polynesian Chant (波利尼西亚吟唱)", "Maori Haka (毛利战舞)"
    ],
    "戏剧/剧院": [
      "Broadway Musical (百老汇音乐剧)", "Cabaret (卡巴莱歌舞/夜总会)", "Vaudeville (杂耍剧)"
    ],
    "互联网原生/缝合": [
      "Kawaii Future Bass (可爱未来贝斯)", "Digicore (数码核心)", "Deconstructed Club (解构俱乐部/前卫破碎)", "Bardcore (中世纪酒馆翻唱风)"
    ],
    "宗教/祭祀细分": [
      "Shamanic Ritual (萨满仪式音乐)", "Voodoo Drumming (巫毒鼓乐)"
    ]
  },
  instruments: {
    "CN中华/东方乐器": [
      "Erhu (二胡)", "Guzheng (古筝)", "Suona (唢呐)", "Pipa (琵琶)", "Guqin (古琴)", 
      "Dizi (竹笛)", "Yangqin (扬琴)", "Sanxian (三弦)", "Zhongruan (中阮)", "Liuqin (柳琴)",
      "Jinghu (京胡)", "Banhu (板胡)", "Bawu (巴乌)", "Xun (埙)", "Guanzi (管子)",
      "Hulusi (葫芦丝)", "Morin Khuur (马头琴)", "Xiao (箫)", "Sheng (笙)", 
      "Bianzhong (编钟)", "Gong (大锣)", "Tanggu (堂鼓)", "Muyu (木鱼)", "Paiban (拍板)", "Dombra (冬不拉)",
      "Shamisen (三味线)", "Koto (日本筝)", "Shakuhachi (尺八)",
      "Gayageum (伽倻琴)", "Haegeum (奚琴)", "Janggu (长鼓)", "Taepyeongso (太平箫)",
      "Dan Bau (独弦琴)", "Khene (芦笙)", "Gamelan Gong (甘美兰锣)", "Sitar (西塔琴)"
    ],
    "电子/采样 (Digital/FX)": [
      "808 Bass", "Synthesizer Arpeggios", "Theremin (特雷门琴)", "Otamatone (电音蝌蚪)", "Vocoder (声码器)", 
      "Sawtooth Lead (锯齿波主音)", "Square Wave Bass (方波贝斯)", "Glitch Samples (故障采样)", "Bitcrushed Drums (位碎鼓)",
      "Roland TR-909 Kick", "Yamaha DX7 E-Piano", "Moog Bass", "Acid 303 Squelch", "Wobble Bass", "Chiptune Leads",
      "Synthesizer V (虚拟歌手/AI人声)"
    ],
    "西洋/管弦乐器": [
      "Grand Piano (大钢琴)", "Violin Solo (小提琴独奏)", "Cello Section (大提琴组)", "Trumpet (小号)", "Saxophone (萨克斯)", 
      "Harp (竖琴)", "Church Organ (教堂管风琴)", "Bagpipes (风笛)", "Accordion (手风琴)", "Clarinet (单簧管)",
      "French Horn (圆号)", "Oboe (双簧管)", "Flute (长笛)", "Trombone (长号)", "Tuba (大号)", "Harpsichord (羽管键琴)"
    ],
    "流行/摇滚乐器": [
      "Stratocaster Guitar (斯特拉特吉他)", "Les Paul Guitar (Les Paul吉他)", "Precision Bass (P-Bass)", "Acoustic Guitar (木吉他)", 
      "Drum Kit (架子鼓)", "Overdrive Guitar (过载吉他)", "Slap Bass (击勾贝斯)", "Fender Rhodes (电钢琴)",
      "12-String Guitar (12弦吉他)", "Fretless Bass (无品贝斯)", "Hammond B3 Organ (哈蒙德风琴)", "Ukulele (尤克里里)"
    ],
    "打击/节奏乐器": [
      "Steel Drums (钢鼓)", "Taiko Drums (太鼓)", "Congas (康加鼓)", "Djembe (金贝鼓)", "Cowbell (牛铃)", 
      "Finger Snaps (响指)", "Handclaps (拍手)", "Tambourine (铃鼓)", "Gong (锣)", "Cajón (箱鼓)",
      "Bongos (邦戈鼓)", "Maracas (沙锤)", "Vibraslap (震荡器)", "Tabla (塔布拉鼓)", "Hang Drum (手碟)"
    ],
    "世界/部落乐器": [
      "Didgeridoo (迪吉里杜管)", "Kalimba (拇指琴)", "Pan Flute (排箫)", "Vuvuzela (呜呜祖拉)", 
      "Balalaika (巴拉莱卡-俄)", "Bayan (巴扬手风琴-俄)",
      "Berimbau (比林鲍-巴西)", "Cuica (摩擦鼓-巴西)", "Pandeiro (巴西铃鼓)",
      "Banjo (班卓琴)", "Harmonica (口琴)", "Ocarina (陶笛)", "Oud (乌德琴)", "Bouzouki (布祖基琴)", 
      "Balafon (巴拉丰)", "Duduk (都都克笛)", "Qanun (卡龙琴)", "Ney (奈伊笛)", "Darbuka (达布卡鼓)",
      "Hurdy-Gurdy (手摇风琴)", "Lyre (里拉琴)"
    ],
    "恐怖/怪诞乐器": [
      "Rubber chicken scream (尖叫鸡)", "Squeaky toy (吱吱响玩具)", "Waterphone (水琴)", "Aztec Death Whistle (死亡哨)", 
      "Out of tune Violin (走调小提琴)", "Toy Piano (玩具钢琴)", "Kazoo (卡祖笛)", "Circus Organ (马戏团风琴)",
      "Bowed Cymbal (琴弓拉镲)", "Reverse Piano (反向钢琴)", "Bone Flute (骨笛)"
    ],
    "环境/采样 (Foley)": [
      "Typewriter clicking (打字机声)", "Chainsaw revving (电锯声)", "Glass breaking (玻璃破碎)", "Rain sounds (雨声)", 
      "Subway train ambience (地铁环境音)", "Cat meowing (猫叫)", "Dial-up Modem (拨号上网声)", "Siren (警报)", "Gunshots (枪声)",
      "Vinyl Crackle (黑胶底噪)", "Heartbeat (心跳声)", "Forest Ambience (森林环境)", "City Traffic (城市交通)"
    ],
    "先锋/冷门乐器": [
      "Prepared Piano (加料钢琴)", "Mellotron (美乐特朗/老式采样琴)", "Glass Harmonica (玻璃琴)"
    ],
    "极度噪音": [
      "Bowed Metal (琴弓拉金属)", "Spring Reverb Crash (弹簧混响轰击)", "Tesla Coil (特斯拉线圈放电声)"
    ],
    "中国偏门乐器": [
      "Kouxian (口弦/拔簧)", "Chime Bells (碰铃/风铃)"
    ]
  },
  vocals: {
    "音色特质 (Tone)": [
      "Clean Vocal (清澈人声)", "Smoky Voice (烟嗓)", "Husky (沙哑)", "Breathiness (气声)", 
      "Falsetto (假音)", "Deep Bass Vocal (极低男声)", "Androgynous (中性嗓音)", "Soprano (女高音)", 
      "Raspy Voice (粗犷颗粒感)", "Velvety Voice (丝绒感/磁性)", "Nasal Tone (鼻音)", 
      "Ethereal Voice (空灵女声)", "Power Vocal (力量型人声/大歌嗓)"
    ],
    "流行/说唱技法 (Pop/Rap Technique)": [
      "Belting (怒音/强力爆发)", "R&B Runs (R&B转音)", "Melisma (花腔/多音节)", 
      "Vibrato (颤音)", "Yodeling (约德尔唱法)", "Mumble Rap (呢喃说唱)", 
      "Chopper Flow (快嘴机关枪)", "Triplet Flow (三连音说唱)", "Melodic Rap (旋律说唱)"
    ],
    "民族/戏曲唱腔 (Ethnic/Traditional)": [
      "Qingyi Vocal (京剧青衣腔)", "Laosheng Vocal (京剧老生腔)", "Kunqu Vocal (昆曲水磨腔)", 
      "Folk Mountain Song (原生态高亢山歌)", "Tibetan Throat Singing (藏族呼麦)", 
      "Mongolian Long Song (蒙古长调)", "Enka Vocal (日式演歌转音)", "Pansori Vocal (韩国板索里)", 
      "Islamic Call to Prayer (宣礼感吟唱)", "Celtic Keening (凯尔特悲叹唱法)"
    ],
    "摇滚/极端嗓 (Rock/Extreme)": [
      "Screaming (嘶吼/尖叫)", "Growling (死嗓/低吼)", "Pig Squeal (水喉/猪叫)", 
      "Fry Scream (撕裂音/黑嗓)", "False Chord (假声带咆哮)", "Punk Snarl (朋克式乖戾叫嚷)", 
      "Grunge Drawl (垃圾摇滚慵懒拖音)"
    ],
    "亚文化/特殊系 (Subculture/Character)": [
      "Kawaii Voice (萌音/萝莉音)", "Energetic Idol Vocal (元气偶像音)", "Yandere Whisper (病娇耳语)", 
      "Anime Opening Vocal (热血日漫腔)", "Boyband Unison (男团式齐唱)", "Vocaloid Tuning (V家电音/初音感)", 
      "Spoken Word (念白/诗歌朗诵)", "ASMR Whisper (ASMR级低语)", "Lazy/Bored Vocal (厌世慵懒音)"
    ],
    "合唱/群体 (Choir/Group)": [
      "Gospel Choir (黑人福音合唱团)", "Stadium Crowd Chant (万人体育场大合唱)", 
      "Gang Vocals (帮派式群喊/核嗓合唱)", "Children's Choir (空灵童声合唱)", 
      "Gregorian Monks (中世纪僧侣吟唱)", "Opera Chorus (史诗歌剧大合唱)", 
      "Acapella Group (阿卡贝拉纯人声团)", "Male/Female Duet (男女对唱/深情互动)"
    ],
    "电子/后期特效 (FX/Electronic)": [
      "Autotune Heavy (重度电音修音)", "Vocoder (声码器机器人声)", "Vocal Chops (人声切片/碎音)", 
      "Megaphone Effect (大喇叭/复古电话音)", "Reverse Vocal (反向倒放人声)", 
      "Glitch Vocal (故障卡顿人声)", "Robotic Voice (无感情AI机械音)", 
      "Pitch Shifted Down (降调恶魔音)", "Chipmunk Voice (升调花栗鼠音)"
    ],
    "微表情/生理声": [
      "Vocal Fry (极度慵懒气泡音)", "Sighing / Heavy Breathing (叹息与喘息)", "Crying / Sobbing Vocal (带哭腔演唱)"
    ],
    "戏剧化演绎": [
      "Manic Laughter (狂躁笑声)", "Preaching / Sermon (疯狂牧师布道)", "Drunk Mumbling (醉汉嘟囔)"
    ]
  },
  production: {
    "听感/质感 (Texture)": [
      "Overdrive (过载)", "Tube saturation (电子管饱和)", "Warm distortion (暖失真)", 
      "Crunch (嘎吱声)", "Rock tone (摇滚音色)", "8-bit crushed (位深破碎)", 
      "Clean tone (清音)", "Fuzz (法兹)", "Lo-fi (低保真)", "Hi-Fi (高保真)",
      "Tape Saturation (磁带饱和)", "Vinyl Crackle (黑胶质感)", "Dry (干声)", "Wet (湿声)"
    ],
    "空间/动态 (Spatial/Dynamics)": [
      "Wall of Sound (音墙)", "Cathedral Reverb (大教堂混响)", "Extreme sidechain (极端侧链)", 
      "Spatial Audio 8D (8D环绕)", "Autotune Heavy (重度自动修音)", "Stereo Widening (立体声加宽)",
      "Gated Reverb (门限混响)", "Ping Pong Delay (乒乓延迟)", "Reverse Reverb (反向混响)",
      "Compression (压缩)", "Panning Automation (声像自动化)", "Tremolo (颤音)",
      "Vocal Chops (人声切片)", "Tape Stop (磁带停止效果)", "Doppler Effect (多普勒效应)",
      "Granular Synthesis (颗粒合成)", "Time Stretching (时间拉伸)"
    ],
    "复古/特殊 (Retro/Special)": [
      "Lo-fi grainy tape (低保真磁带)", "Underwater muffling (水下闷音)", "Vinyl crackle (黑胶爆豆声)", 
      "Phone recording (电话录音音质)", "VHS Wobble (录像带抖动)", "Radio Static (收音机干扰)",
      "Broken Speaker (破损喇叭)", "Cassette Flutter (卡带抖动)", "Vintage Mic (复古麦克风)",
      "Glitch Stutter (故障卡顿)", "Phase Flanging (相位镶边)"
    ],
    "过渡/结构 (Transitions)": [
      "Beat Switch (节奏突变)", "Sudden Drop (突然下潜/静音)", 
      "Hyperpop Glitch (故障音效切分)", "Tape Stop (磁带停止音效)", 
      "Tempo Change (速度突变)", "Massive Bass Drop (重低音爆发)"
    ],
    "节奏/律动 (Rhythm/Groove)": [
      "Syncopation (切分音)", "Swing (摇摆律动)", "Shuffle (洗牌律动)", 
      "Four-on-the-floor (四四拍/动次打次)", "Polyrhythm (多重节奏)", 
      "Half-time (减半节奏)", "Double-time (加倍节奏)", "Breakbeat (碎拍)",
      "Downtempo (慢下拍)", "Off-beat (反拍)", "Syncopated Bass (切分贝斯)"
    ],
    "空间黑科技": [
      "Binaural Panning (双声道人头录音/贴耳)", "Haas Effect (哈斯效应/极宽假立体声)"
    ],
    "调制/动态": [
      "Stutter Effect (频闪/结巴切片效果)", "Phaser / Flanger Swirl (极度眩晕相位旋转)", "Radio EQ Sweeps (收音机频段扫频)"
    ]
  },
  vibes: {
    "情绪/情感 (Emotional)": [
      "Aggressive (攻击性)", "Nostalgic (怀旧)", "Manic (狂躁)", "Melancholy (忧郁)", 
      "Energetic (活力)", "Whimsical (怪诞/异想天开)", "Romantic (浪漫)", "Hopeful (充满希望)",
      "Angst (焦虑)", "Euphoric (愉悦)", "Sentimental (感伤)", "Rebellious (叛逆)", "Peaceful (宁静)"
    ],
    "环境/空间 (Atmospheric)": [
      "Ethereal (空灵)", "Haunting (萦绕/诡异)", "Dreamy (梦幻)", "Hypnotic (催眠)", 
      "Dark (黑暗)", "Spacious (宽广)", "Claustrophobic (幽闭)", "Mysterious (神秘)",
      "Industrial (工业感)", "Urban (都市感)", "Nature (自然感)", "Cosmic (宇宙感)",
      "Liminal (阈限感)", "Sacred (神圣)"
    ],
    "抽象/实验 (Experimental)": [
      "Experimental (实验性)", "Absurd (荒诞)", "Chaotic (混乱)", "Psychedelic (迷幻)", 
      "Uncomfortable (不安)", "Surreal (超现实)", "Glitchy (故障感)", "Dissonant (不协和)",
      "Abstract (抽象)", "Avant-garde (先锋)", "Occult (神秘学)", "Uncanny (怪诞/恐怖谷)"
    ],
    "风格/美学 (Aesthetic)": [
      "Groovy (律动)", "Cybernetic (赛博)", "Kawaii (可爱)", "Apocalyptic (末世)", 
      "Cinematic (电影感)", "Retro (复古)", "Futuristic (未来感)", "Minimalist (极简)",
      "Epic (史诗)", "Vintage (复古)", "Gothic (哥特)", "Luxury (奢华感)", "Ritualistic (仪式感)"
    ],
    "网络美学 (Aesthetics)": [
      "Y2K Aesthetic (千禧年风)", "Frutiger Aero (果味航空/清透异次元)", "Cottagecore (田园核心)", "Steampunk (蒸汽朋克)"
    ],
    "极致情感": [
      "Nihilistic (极度虚无/厌世)", "Triumphant (史诗般凯旋感)", "Paranoia (偏执/被害妄想感)"
    ]
  }
};

// 风格关联映射 (Smart Linkage)
const styleAssociations = {
  "Chinese Traditional Opera (京剧/戏曲)": { instruments: ["Jinghu (京胡)", "Gong (大锣)", "Paiban (拍板)", "Peking Opera Percussion (京剧打击乐)"] },
  "Kunqu Opera (昆曲)": { instruments: ["Dizi (竹笛)", "Sheng (笙)", "Pipa (琵琶)"] },
  "Qinqiang (秦腔)": { instruments: ["Banhu (板胡)", "Gong (大锣)"] },
  "Guqin Music (古琴曲)": { instruments: ["Guqin (古琴)", "Xiao (箫)"], vibes: ["Peaceful (宁静)", "Ethereal (空灵)"] },
  "Jiangnan Sizhu (江南丝竹)": { instruments: ["Erhu (二胡)", "Pipa (琵琶)", "Dizi (竹笛)", "Yangqin (扬琴)"] },
  "Northwest Wind (西北风)": { instruments: ["Suona (唢呐)", "Tanggu (堂鼓)"], vibes: ["Aggressive (攻击性)", "Energetic (活力)"] },
  "Hanmai (喊麦/MC)": { instruments: ["Synthesizer Arpeggios"], production: ["Autotune Heavy (重度自动修音)", "Sidechain (极端侧链)"] },
  "Taoist Chant (道教音乐)": { instruments: ["Gong (大锣)", "Muyu (木鱼)", "Sheng (笙)"], vibes: ["Sacred (神圣)"] },
  "Tibetan Throat Singing (藏式呼麦)": { instruments: ["Gong (大锣)", "Bone Flute (骨笛)"], vibes: ["Sacred (神圣)", "Hypnotic (催眠)"] },
  "Mongolian Long Song (蒙古长调)": { instruments: ["Morin Khuur (马头琴)", "Throat Singing (呼麦)"], vibes: ["Spacious (宽广)"] },
  "Kazakh Kui (哈萨克冬不拉奎)": { instruments: ["Dombra (冬不拉)"] },
  "Hong Kong Disco (港风迪斯科)": { instruments: ["Synthesizer Arpeggios", "Drum Kit (架子鼓)"], production: ["Vintage Mic (复古麦克风)"], vibes: ["Retro (复古)", "Groovy (律动)"] },
  "Enka (演歌)": { instruments: ["Shamisen (三味线)", "Orchestral (管弦乐)"], vibes: ["Sentimental (感伤)", "Nostalgic (怀旧)"] },
  "Gagaku (雅乐)": { instruments: ["Sho (笙-日)", "Hichiriki (筚篥-日)", "Biwa (琵琶-日)"], vibes: ["Sacred (神圣)"] },
  "Pansori (板索里/传统说唱)": { instruments: ["Janggu (长鼓)"], vibes: ["Dramatic (戏剧性)"] },
  "Samul Nori (四物打击乐)": { instruments: ["Kkwaenggwari (小锣)", "Janggu (长鼓)"], vibes: ["Energetic (活力)"] },
  "Bluegrass (蓝草音乐)": { instruments: ["Banjo (班卓琴)", "Acoustic Guitar (木吉他)", "Fiddle (小提琴)"] },
  "Delta Blues (三角洲蓝调)": { instruments: ["Acoustic Guitar (木吉他)", "Harmonica (口琴)"], vibes: ["Melancholy (忧郁)"] },
  "Techno (工业/科技舞曲)": { instruments: ["Roland TR-909 Kick", "Synthesizer Arpeggios"], production: ["Compression (压缩)"] },
  "Bossa Nova (波萨诺瓦)": { instruments: ["Acoustic Guitar (木吉他)", "Piano (钢琴)"], vibes: ["Relaxed (放松)"] },
  "Samba (桑巴)": { instruments: ["Berimbau (比林鲍)", "Cuica (摩擦鼓)", "Whistle (哨子)"], vibes: ["Energetic (活力)"] },
  "Reggae (雷鬼)": { instruments: ["Bass Guitar (贝斯)", "Hammond B3 Organ (哈蒙德风琴)"], production: ["Delay (延迟)"], vibes: ["Relaxed (放松)"] },
  "Dungeon Synth (地牢合成器)": { instruments: ["Synthesizer (合成器)", "Lo-fi Drums"], vibes: ["Dark (黑暗)", "Medieval (中世纪)"] }
};

// 智能纠错匹配器
const validateTags = (rawTags, dataset) => {
  if (!Array.isArray(rawTags)) return [];
  const validTags = Object.values(dataset).flat();
  return rawTags.map(tag => {
    if (validTags.includes(tag)) return tag;
    const match = validTags.find(vt => 
      vt.toLowerCase().startsWith(tag.toLowerCase()) || 
      vt.toLowerCase().includes(tag.toLowerCase())
    );
    return match || null;
  }).filter(t => t !== null);
};

// 辅助函数
const findCategory = (dataset, item) => {
  return Object.keys(dataset).find(key => dataset[key].includes(item));
};

// 拼装增强 Prompt 的函数
const formatEnhancerPrompt = (recipe, coreIdea) => {
    const techSpecs = [];
    if (recipe.styles?.length) techSpecs.push(`[Style: ${recipe.styles.join(", ")}]`);
    if (recipe.instruments?.length) techSpecs.push(`[Instruments: ${recipe.instruments.join(", ")}]`);
    if (recipe.vocals?.length) techSpecs.push(`[Vocals: ${recipe.vocals.join(", ")}]`);
    if (recipe.production?.length) techSpecs.push(`[Production: ${recipe.production.join(", ")}]`);
    if (recipe.vibes?.length) techSpecs.push(`[Vibe: ${recipe.vibes.join(", ")}]`);
    return `${techSpecs.join("\n")}\n\n${coreIdea}`;
};

const CompactTagGroup = ({ items = [], selected, onToggle, colorClass, borderColor, textColor, locked }) => (
  <div className="flex flex-wrap gap-2">
    {items.map(item => {
      const isSelected = selected.includes(item);
      return (
        <button key={item} onClick={() => onToggle(item)} className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm 2xl:text-base font-medium transition-all duration-200 border flex items-center gap-1 ${isSelected ? `${colorClass} text-white border-transparent shadow-md scale-105` : `bg-slate-800 ${borderColor} ${textColor} hover:bg-slate-700 hover:border-slate-600`}`}>{isSelected && locked && <Lock size={10} className="text-white/70" />}{item}</button>
      )
    })}
  </div>
);

const TinyTag = ({ label, color, onRemove }) => (
  <button onClick={onRemove} className={`flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded bg-slate-900 border ${color} text-[10px] md:text-xs xl:text-sm hover:bg-red-900/30 hover:border-red-500/30 hover:text-red-300 transition-colors group`}><span className="truncate max-w-[100px] md:max-w-[140px]">{label}</span><X size={8} className="group-hover:text-red-400"/></button>
);

const App = () => {

  // ==========================================
  // === 🚨 安全防御层 (Anti-theft & Security) ===
  // ==========================================
  
  useEffect(() => {
      // --- 1. 域名白名单绑定 (Domain Binding) ---
      const allowedDomains = ['xcmm.org', 'www.xcmm.org', 'localhost', '127.0.0.1'];
      const currentDomain = window.location.hostname;
      
      // Canvas 预览环境豁免
      const isCanvasPreview = true; 

      if (!allowedDomains.includes(currentDomain) && !isCanvasPreview) {
          // 彻底销毁页面 DOM
          document.body.innerHTML = `
            <div style="background:#0a0a0a;color:#ff3333;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
                <h1 style="font-size:32px;font-weight:900;">⛔ 未授权的运行环境</h1>
                <p style="color:#888;margin-top:10px;">Security Violation: Invalid Hostname [${currentDomain}]</p>
                <p style="color:#666;font-size:12px;margin-top:20px;">星辰妙漫 xcmm.org 专属授权</p>
            </div>`;
          return; 
      }
      return () => {};
  }, []);
  // ==========================================

  // === 授权与商业化状态 (植入逻辑) ===
  const [user, setUser] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [credits, setCredits] = useState(() => parseInt(localStorage.getItem('gemini_credits') || '3'));
  const [isPro, setIsPro] = useState(() => localStorage.getItem('gemini_is_pro') === 'true');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // === API 设置相关的本地化状态 ===
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || "");
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('gemini_api_url') || "https://generativelanguage.googleapis.com");
  const [apiModel, setApiModel] = useState(() => localStorage.getItem('gemini_api_model') || "gemini-2.5-flash"); 
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('xcmm_api_provider') || "gemini");

  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [tempApiUrl, setTempApiUrl] = useState("");
  const [tempApiModel, setTempApiModel] = useState("");
  const [tempApiProvider, setTempApiProvider] = useState("");

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState(null);
  const [apiTestMessage, setApiTestMessage] = useState("");

  const openSettings = () => {
      setTempApiKey(userApiKey);
      setTempApiUrl(apiBaseUrl);
      setTempApiModel(apiModel);
      setTempApiProvider(apiProvider);
      setApiTestStatus(null);
      setApiTestMessage("");
      setShowSettings(true);
  };

  const handleProviderSwitch = (provider) => {
      setTempApiProvider(provider);
      setApiTestStatus(null);
      setApiTestMessage("");
      if (provider === 'qwen') {
          setTempApiUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
          setTempApiModel("qwen-plus");
      } else {
          setTempApiUrl("https://generativelanguage.googleapis.com");
          setTempApiModel("gemini-2.5-flash");
      }
  };

  const testApiConnection = async () => {
      if (!tempApiKey.trim()) {
          setApiTestStatus('error');
          setApiTestMessage("请输入 API Key 进行测试");
          return;
      }
      setIsTestingApi(true);
      setApiTestStatus(null);
      setApiTestMessage("");

      let url, options;
      const testPrompt = "Hello"; 

      if (tempApiProvider === 'qwen') {
          const baseUrl = tempApiUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
          url = `${baseUrl}/chat/completions`;
          options = {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tempApiKey.trim()}`
              },
              body: JSON.stringify({
                  model: tempApiModel || "qwen-plus",
                  messages: [{ role: "user", content: testPrompt }]
              })
          };
      } else {
          const baseUrl = tempApiUrl || "https://generativelanguage.googleapis.com";
          const cleanUrl = baseUrl.trim().endsWith('/') ? baseUrl.trim().slice(0, -1) : baseUrl.trim();
          url = `${cleanUrl}/v1beta/models/${tempApiModel || 'gemini-2.5-flash'}:generateContent?key=${tempApiKey.trim()}`;
          options = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] })
          };
      }

      try {
          const response = await fetch(url, options);
          if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error?.message || errData.message || `HTTP ${response.status}`);
          }
          setApiTestStatus('success');
          setApiTestMessage("连通性测试通过！API 配置有效。");
      } catch (error) {
          setApiTestStatus('error');
          setApiTestMessage(`连通性测试失败: ${error.message}`);
      } finally {
          setIsTestingApi(false);
      }
  };

  const saveSettings = () => {
      const cleanUrl = tempApiUrl.trim().endsWith('/') ? tempApiUrl.trim().slice(0, -1) : tempApiUrl.trim();
      const cleanModel = tempApiModel.trim() || (tempApiProvider === 'qwen' ? "qwen-plus" : "gemini-2.5-flash"); 
      setUserApiKey(tempApiKey.trim());
      setApiBaseUrl(cleanUrl);
      setApiModel(cleanModel);
      setApiProvider(tempApiProvider);
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      localStorage.setItem('gemini_api_url', cleanUrl);
      localStorage.setItem('gemini_api_model', cleanModel);
      localStorage.setItem('xcmm_api_provider', tempApiProvider);
      setShowSettings(false);
      setToastMessage("API 配置已保存到本地缓存");
      setTimeout(() => setToastMessage(""), 3000);
  };

  const callAI = async (prompt) => {
      let url, options;
      if (apiProvider === 'qwen') {
          const baseUrl = apiBaseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
          url = `${baseUrl}/chat/completions`;
          options = {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userApiKey}`
              },
              body: JSON.stringify({
                  model: apiModel || "qwen-plus",
                  messages: [{ role: "user", content: prompt }]
              })
          };
      } else {
          const baseUrl = apiBaseUrl || "https://generativelanguage.googleapis.com";
          url = `${baseUrl}/v1beta/models/${apiModel || 'gemini-2.5-flash'}:generateContent?key=${userApiKey}`;
          options = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          };
      }

      const response = await fetch(url, options);
      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.message || `API Error (HTTP ${response.status})`);
      }
      const result = await response.json();
      
      if (apiProvider === 'qwen') {
          return result.choices?.[0]?.message?.content || "";
      } else {
          return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
  };

  const checkApiConfig = () => {
      if (!userApiKey) {
          openSettings();
          setToastMessage("使用 AI 功能前，请先配置您的 API Key");
          setTimeout(() => setToastMessage(""), 3000);
          return false;
      }
      return true;
  };

  // 状态管理
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedVocals, setSelectedVocals] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState([]);
  const [selectedVibes, setSelectedVibes] = useState([]);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSmartMixing, setIsSmartMixing] = useState(false); 
  const [copySuccess, setCopySuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isBaseLocked, setIsBaseLocked] = useState(false); 
  const [isChinaLocked, setIsChinaLocked] = useState(false); 
  
  // 科学控制变量
  const [tempo, setTempo] = useState("Auto"); 
  const [fusionStrategy, setFusionStrategy] = useState("Balanced (平衡)"); 
  const [isStrategyLinked, setIsStrategyLinked] = useState(false); 
  
  // 页面缩放控制 (zoomLevel)
  const [zoomLevel, setZoomLevel] = useState(1);
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // 智能关联开关
  const [isSmartLinkageEnabled, setIsSmartLinkageEnabled] = useState(true);
  
  // 悬停提示状态
  const [hoveredStrategyDesc, setHoveredStrategyDesc] = useState("");
  
  // 最终生成的 Prompt 文本
  const [finalPrompt, setFinalPrompt] = useState(""); 
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // AI 炼金面板相关状态
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false); 
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiRecipes, setAiRecipes] = useState(null); 

  // AI 分析相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  // 区域/分类控制状态
  const [activeStyleRegion, setActiveStyleRegion] = useState('中国'); 
  const [activeInstrumentCategory, setActiveInstrumentCategory] = useState('CN中华/东方乐器');
  const [activeVocalCategory, setActiveVocalCategory] = useState('音色特质 (Tone)');
  const [activeProductionCategory, setActiveProductionCategory] = useState('听感/质感 (Texture)');
  const [activeVibeCategory, setActiveVibeCategory] = useState('情绪/情感 (Emotional)');
  
  const [aiMode, setAiMode] = useState('inspiration');
  const [showLyricsModal, setShowLyricsModal] = useState(null);

  // 歌词模式下的企划大纲状态
  const [aiIntent, setAiIntent] = useState("");
  const [aiBlueprint, setAiBlueprint] = useState("");
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [showBlueprintArea, setShowBlueprintArea] = useState(false);
  
  // 新增：MIXX POP 极限过载控制台 (8个独立开关 - 八门遁甲)
  const [mixxPopBpm, setMixxPopBpm] = useState(false);
  const [mixxPopVocal, setMixxPopVocal] = useState(false);
  const [mixxPopDrop, setMixxPopDrop] = useState(false);
  const [mixxPopInst, setMixxPopInst] = useState(false);
  const [mixxPopSyllable, setMixxPopSyllable] = useState(false);
  const [mixxPopAntiDrop, setMixxPopAntiDrop] = useState(false);
  const [mixxPopFoley, setMixxPopFoley] = useState(false);
  const [mixxPopPersona, setMixxPopPersona] = useState(false);

  // 新增：深度排版单首歌词的 Loading 状态
  const [isGeneratingLyricsIndex, setIsGeneratingLyricsIndex] = useState(null);
  
  // 新增：生成分享长图的 Loading 状态
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const checkRegionHasSelection = (region) => data.styles[region] ? data.styles[region].some(style => selectedStyles.includes(style)) : false;
  const checkInstrumentCategoryHasSelection = (category) => data.instruments[category] ? data.instruments[category].some(inst => selectedInstruments.includes(inst)) : false;
  const checkVocalCategoryHasSelection = (category) => data.vocals[category] ? data.vocals[category].some(v => selectedVocals.includes(v)) : false;
  const checkProductionCategoryHasSelection = (category) => data.production[category] ? data.production[category].some(prod => selectedProduction.includes(prod)) : false;
  const checkVibeCategoryHasSelection = (category) => data.vibes[category] ? data.vibes[category].some(v => selectedVibes.includes(v)) : false;

  const revokePro = (msg) => {
      setIsPro(false);
      localStorage.removeItem('gemini_is_pro');
      localStorage.removeItem('xcmm_active_code');
      setToastMessage(`🚫 ${msg}`);
      setTimeout(() => setToastMessage(""), 5000);
  };

  useEffect(() => {
      const initAuth = async () => {
          if (firebaseApp && auth) {
              if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                  await signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
              } else {
                  // 【修复竞态条件 Bug】：等待 Firebase 从本地 IndexedDB 读取并恢复原有的登录状态
                  if (auth.authStateReady) {
                      await auth.authStateReady();
                  } else {
                      // 兼容极老版本 Firebase SDK 的后备方案
                      await new Promise(resolve => {
                          const unsub = onAuthStateChanged(auth, () => {
                              resolve();
                              unsub();
                          });
                      });
                  }
                  
                  // 只有当完全确认恢复后，当前仍然没有任何账号时，才强行分配一个游客身份
                  if (!auth.currentUser) {
                      await signInAnonymously(auth).catch(console.error);
                  }
              }
          }
      };
      initAuth();
      const unsubscribe = auth ? onAuthStateChanged(auth, setUser) : null;

      const setupDevice = async () => {
          let sid = localStorage.getItem('xcmm_device_id');
          if (!sid) {
              try {
                  const fpPromise = new Promise((resolve, reject) => {
                      if (window.FingerprintJS) {
                          resolve(window.FingerprintJS);
                      } else {
                          const script = document.createElement('script');
                          script.src = 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js';
                          script.onload = () => resolve(window.FingerprintJS);
                          script.onerror = reject;
                          document.head.appendChild(script);
                      }
                  });
                  const FingerprintJS = await fpPromise;
                  const fp = await FingerprintJS.load();
                  const result = await fp.get();
                  sid = result.visitorId.substring(0, 8).toUpperCase();
              } catch (e) {
                  console.warn("FingerprintJS 获取失败，降级为随机生成", e);
                  sid = Math.random().toString(36).substring(2, 10).toUpperCase();
              }
              localStorage.setItem('xcmm_device_id', sid);
          }
          setDeviceId(sid);
      };
      
      setupDevice();
      generateRandomMix(); 
      return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
      const verifyAndRestoreProStatus = async () => {
          if (!db || !user || !deviceId) return; 
          
          let currentIsPro = localStorage.getItem('gemini_is_pro') === 'true';
          let savedCode = localStorage.getItem('xcmm_active_code');

          if (!user.isAnonymous) {
              try {
                  const profileSnap = await getDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : PRIVATE_APP_ID, 'users', user.uid, 'account', 'profile'));
                  if (profileSnap.exists()) {
                      const profileData = profileSnap.data();

                      if (profileData.deviceId && profileData.deviceId !== deviceId) {
                          revokePro("您的账号已在其他设备登录，本地授权已下线！");
                          signOut(auth).then(() => signInAnonymously(auth)).catch(console.error);
                          return; 
                      }

                      if (profileData.activeCode && !savedCode) {
                          savedCode = profileData.activeCode;
                          currentIsPro = true; 
                      }
                  }
              } catch (e) {
                  console.warn("拉取用户私有配置失败", e);
              }
          }

          if (currentIsPro) {
              if (!savedCode) {
                  revokePro("由于系统安全升级，请重新输入您的激活码。");
                  return;
              }
              try {
                  const snap = await getDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : PRIVATE_APP_ID, 'public', 'data', 'activations', savedCode));
                  if (!snap.exists()) {
                      revokePro("您的授权码在云端不存在，权限已被收回！");
                  } else {
                      const d = snap.data();
                      if (d.status !== 'active') {
                          revokePro("您的授权码已被停用，权限已被收回！");
                      } else if (d.userId && d.userId !== user.uid) {
                          revokePro("该授权码已绑定其他云端账号，权限已被收回！请确保您登录了正确的账号。");
                      } else if (!d.userId && d.deviceId && d.deviceId !== deviceId) {
                          revokePro("设备标识异常，为保护账号安全，权限已被收回！");
                      } else {
                          setIsPro(true);
                          localStorage.setItem('gemini_is_pro', 'true');
                          localStorage.setItem('xcmm_active_code', savedCode);
                      }
                  }
              } catch (e) {
                  console.warn("云端查岗网络波动，暂不剥夺权限", e);
              }
          }
      };
      verifyAndRestoreProStatus();
  }, [user, deviceId]);

  const handleOpenPaywall = () => {
      if (!user || user.isAnonymous) {
          setPendingAction('paywall');
          setShowAuthModal(true);
          setToastMessage("🔒 永久授权需绑定至云端，请先登录或注册账号");
          setTimeout(() => setToastMessage(""), 4000);
      } else {
          setShowPaywall(true);
      }
  };

  const consumeCredit = () => {
      if (isPro) return true;
      if (credits > 0) {
          const next = credits - 1;
          setCredits(next);
          localStorage.setItem('gemini_credits', next.toString());
          return true;
      }
      handleOpenPaywall(); 
      return false;
  };

  const handleRedeemCode = async (code) => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode || !db || !user) {
          setToastMessage("⏳ 正在尝试安全连接云端...");
          setTimeout(() => setToastMessage(""), 2000);
          return;
      }

      if (user.isAnonymous) {
          setShowPaywall(false);
          setShowAuthModal(true);
          setToastMessage("🔒 请先注册或登录账号，以永久绑定该设备的授权");
          setTimeout(() => setToastMessage(""), 4000);
          return;
      }

      setIsRedeeming(true);
      try {
          const targetAppId = typeof __app_id !== 'undefined' ? __app_id : PRIVATE_APP_ID;
          const snap = await getDoc(doc(db, 'artifacts', targetAppId, 'public', 'data', 'activations', cleanCode));
          if (!snap.exists()) throw new Error("凭证码无效，请检查是否有拼写错误");
          
          const activationData = snap.data();
          if (activationData.status !== 'active') throw new Error("该凭证码已失效或被停用");
          
          if (activationData.userId && activationData.userId !== user.uid) {
              throw new Error("该凭证已绑定其他云端账号，请重新获取");
          }
          if (!activationData.userId && activationData.deviceId && activationData.deviceId !== deviceId) {
              throw new Error("该凭证已绑定其它设备，请重新获取");
          }

          try {
              await setDoc(doc(db, 'artifacts', targetAppId, 'public', 'data', 'activations', cleanCode), {
                  ...activationData,
                  userId: user.uid,
                  boundAt: new Date().toISOString()
              }, { merge: true });

              await setDoc(doc(db, 'artifacts', targetAppId, 'users', user.uid, 'account', 'profile'), {
                  activeCode: cleanCode,
                  deviceId: deviceId, 
                  updatedAt: new Date().toISOString()
              }, { merge: true });

          } catch (updateErr) {
              console.warn("更新云端绑定状态失败，但验证通过，依然放行本地", updateErr);
          }
          
          setIsPro(true);
          localStorage.setItem('gemini_is_pro', 'true');
          localStorage.setItem('xcmm_active_code', cleanCode); 
          setShowPaywall(false);
          setToastMessage("🎉 感谢您的捐赠！PRO 终身授权已永久绑定至您的账号。");
          setTimeout(() => setToastMessage(""), 4000);
      } catch (err) {
          setToastMessage(`❌ ${err.message}`);
          setTimeout(() => setToastMessage(""), 3000);
      } finally {
          setIsRedeeming(false);
      }
  };

  const handleAuthSubmit = async (e) => {
      e.preventDefault();
      if (!authEmail || !authPassword) {
          setToastMessage("请输入邮箱和密码");
          setTimeout(() => setToastMessage(""), 3000);
          return;
      }
      setAuthLoading(true);
      try {
          let userCredential;
          if (isLoginMode) {
              userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
              setToastMessage("✅ 登录成功！您的跨设备授权已就绪。");
          } else {
              userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
              setToastMessage("✅ 注册成功并已自动登录！");
          }
          setShowAuthModal(false);
          setAuthEmail("");
          setAuthPassword("");

          if (userCredential && userCredential.user) {
              const targetAppId = typeof __app_id !== 'undefined' ? __app_id : PRIVATE_APP_ID;
              await setDoc(doc(db, 'artifacts', targetAppId, 'users', userCredential.user.uid, 'account', 'profile'), {
                  deviceId: deviceId, 
                  updatedAt: new Date().toISOString()
              }, { merge: true }).catch(err => console.warn("宣示设备主权失败", err));
          }

          if (pendingAction === 'paywall') {
              setTimeout(() => {
                  setShowPaywall(true);
              }, 500);
              setPendingAction(null);
          }

      } catch (err) {
          setToastMessage(`❌ 认证失败: ${err.message}`);
      } finally {
          setAuthLoading(false);
          setTimeout(() => setToastMessage(""), 3000);
      }
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
          setIsPro(false);
          localStorage.removeItem('gemini_is_pro');
          localStorage.removeItem('xcmm_active_code');
          setToastMessage("✅ 已安全登出，本地授权已退出");
          setTimeout(() => setToastMessage(""), 3000);
          
          await signInAnonymously(auth);
      } catch (e) {
          console.error(e);
      }
  };

  // 新增：为长图分享专门定制的歌词高亮正则解析
  const getHighlightedLyrics = (text) => {
      if(typeof text !== 'string') return { __html: '' };
      let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // 将 [Chorus] 这种结构词高亮成赛博蓝
      html = html.replace(/(\[.*?\])/g, '<span style="color: #38bdf8; font-weight: bold; background: rgba(56, 189, 248, 0.1); padding: 2px 4px; border-radius: 4px;">$1</span>');
      // 将 (Foley sound) 这种效果指令高亮成荧光紫
      html = html.replace(/(\(.*?\))/g, '<span style="color: #d946ef; font-style: italic;">$1</span>');
      return { __html: html };
  };

  // 新增：生成高清企划海报的功能
  const generateShareImage = async () => {
      setIsGeneratingImage(true);
      setToastMessage("📸 正在渲染高清长图...");
      try {
          // 动态加载 html2canvas 库
          if (!window.html2canvas) {
              await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                  script.onload = resolve;
                  script.onerror = reject;
                  document.head.appendChild(script);
              });
          }
          
          const element = document.getElementById('share-image-node');
          if (element) {
              const canvas = await window.html2canvas(element, {
                  scale: 2, // 2倍超清抗锯齿
                  backgroundColor: '#020617', // 深邃暗黑底色
                  useCORS: true,
                  logging: false
              });
              
              const image = canvas.toDataURL('image/png', 1.0);
              const link = document.createElement('a');
              link.download = `星辰妙漫_AI企划案_${new Date().getTime()}.png`;
              link.href = image;
              link.click();
              
              setToastMessage("🎉 长图已保存到本地！快去炫耀吧！");
          }
      } catch (err) {
          setToastMessage(`❌ 长图生成失败: ${err.message}`);
      } finally {
          setIsGeneratingImage(false);
          setTimeout(() => setToastMessage(""), 4000);
      }
  };

  const copyToClipboard = (textToCopy) => {
    const text = typeof textToCopy === 'string' ? textToCopy : getFormattedIngredients().join(", ");
    if (!text || text.startsWith("请选择")) return;

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
    
    document.body.removeChild(textArea);
  };

  const applyAutoMix = (styles, instruments, vocals, production, vibes, keepLockedStyles = false, allowCustomTags = false) => {
    let finalStyles = [];
    if (keepLockedStyles && selectedStyles.length > 0) {
      finalStyles = selectedStyles; 
    } else {
      finalStyles = allowCustomTags ? styles : validateTags(styles, data.styles); 
    }

    if (isChinaLocked) {
        const hasChineseStyle = finalStyles.some(s => data.styles["中国"].includes(s));
        const chineseInstrumentsList = data.instruments["CN中华/东方乐器"];
        let validInsts = validateTags(instruments, data.instruments);
        const hasChineseInst = validInsts.some(i => chineseInstrumentsList.includes(i));

        if (!hasChineseStyle && !hasChineseInst) {
            if (!keepLockedStyles) {
                const randomCnStyle = data.styles["中国"][Math.floor(Math.random() * data.styles["中国"].length)];
                if (finalStyles.length > 0) finalStyles[0] = randomCnStyle; 
                else finalStyles.push(randomCnStyle);
            } else {
                const randomCnInst = chineseInstrumentsList[Math.floor(Math.random() * chineseInstrumentsList.length)];
                if (validInsts.length > 0) validInsts[0] = randomCnInst; 
                else validInsts.push(randomCnInst);
                instruments = validInsts;
            }
        }
    }

    const validInstruments = allowCustomTags ? instruments : validateTags(instruments, data.instruments); 
    const validVocals = allowCustomTags ? (vocals || []) : validateTags(vocals || [], data.vocals);
    const validProduction = allowCustomTags ? production : validateTags(production, data.production);
    const validVibes = allowCustomTags ? vibes : validateTags(vibes, data.vibes);

    setSelectedStyles(finalStyles);
    setSelectedInstruments(validInstruments);
    setSelectedVocals(validVocals);
    setSelectedProduction(validProduction);
    setSelectedVibes(validVibes);
    
    setFinalPrompt(""); 
    setAnalysisResult(""); 
    setToastMessage(""); 

    if (finalStyles.length > 0) { const cat = findCategory(data.styles, finalStyles[0]); if (cat) setActiveStyleRegion(cat); }
    if (validInstruments.length > 0) { const cat = findCategory(data.instruments, validInstruments[0]); if (cat) setActiveInstrumentCategory(cat); }
    if (validVocals.length > 0) { const cat = findCategory(data.vocals, validVocals[0]); if (cat) setActiveVocalCategory(cat); }
    if (validProduction.length > 0) { const cat = findCategory(data.production, validProduction[0]); if (cat) setActiveProductionCategory(cat); }
    if (validVibes.length > 0) { const cat = findCategory(data.vibes, validVibes[0]); if (cat) setActiveVibeCategory(cat); }
  };

  const generateTemplatePrompt = () => {
    const tempoStr = (tempo && tempo !== 'Auto') ? `[BPM: ${tempo}]` : "";
    const styleStr = selectedStyles.length > 0 ? `[Style: ${selectedStyles.join(" & ")}]` : "";
    const instStr = selectedInstruments.length > 0 ? `[Instruments: ${selectedInstruments.join(", ")}]` : "";
    const vocalStr = selectedVocals.length > 0 ? `[Vocals: ${selectedVocals.join(", ")}]` : "";
    const prodStr = selectedProduction.length > 0 ? `[Production: ${selectedProduction.join(", ")}]` : "";
    const vibeStr = selectedVibes.length > 0 ? `[Vibe: ${selectedVibes.join(", ")}]` : "";
    
    return [tempoStr, styleStr, instStr, vocalStr, prodStr, vibeStr].filter(s => s).join("\n");
  };

  const generateAiRefinedPrompt = async () => {
    if (selectedStyles.length === 0 && selectedInstruments.length === 0) return;
    if (!consumeCredit()) return; 
    if (!checkApiConfig()) return; 

    setIsSynthesizing(true);
    setFinalPrompt("✨ 炼金炉正在燃烧，正在融合元素...");
    
    const elements = `Styles: ${selectedStyles.join(", ")}\nInstruments: ${selectedInstruments.join(", ")}\nVocals: ${selectedVocals.join(", ")}\nProduction: ${selectedProduction.join(", ")}\nVibes: ${selectedVibes.join(", ")}\nTempo: ${tempo}`;
    const systemInstruction = `
      You are a master music producer (The Alchemist). 
      Your task is to take the selected "ingredients" and the fusion strategy "${fusionStrategy}" to synthesize a HIGH-QUALITY, professional SUNO AI Prompt.
      Ingredients: ${elements}
      Strategy: "${fusionStrategy}"
      Instructions: 
      1. Create a structured prompt string that flows logically.
      2. If "Tempo" is not Auto, include it clearly.
      3. Use SUNO's meta tag format like [Style: ...] where appropriate.
      4. Add a short descriptive sentence at the start explaining the sonic texture.
      5. Output ONLY the final prompt text.
      6. CRITICAL: If the strategy is 'Mixx Pop (段落硬切)', you MUST follow these specific rules: Assign Style A to [Verse] and a completely contrasting Style B to [Chorus]. You MUST insert transition tags like [Beat Switch] or [Sudden Drop] exactly at the boundary between Verse and Chorus.
    `;

    try {
      const resultText = await callAI(systemInstruction);
      setFinalPrompt(String(resultText || "AI 生成内容为空"));
    } catch (error) { 
      setFinalPrompt(`⚠️ 生成失败: ${error.message}\n请检查您的 API Key、模型名称或网络连通性。\n\n当前模版备份如下：\n` + generateTemplatePrompt()); 
    } finally { setIsSynthesizing(false); }
  };

  const handleGenerateClick = (type) => {
    if (type === 'template') setFinalPrompt(generateTemplatePrompt());
    else generateAiRefinedPrompt();
  };

  // 生成企划大纲 (A&R Blueprint)
  const generateBlueprint = async () => {
      if (!aiPrompt.trim()) { setAiError("请先输入原始歌词..."); return; }
      if (!consumeCredit()) return;
      if (!checkApiConfig()) return;

      setIsGeneratingBlueprint(true); setAiError("");
      
      const activeOverdrives = [
          mixxPopBpm ? "BPM断层 (速度撕裂)" : "",
          mixxPopVocal ? "唱腔分裂 (人声极度反差)" : "",
          mixxPopDrop ? "黄金坠落 (三段式Drop/静音深呼吸)" : "",
          mixxPopInst ? "洗脑器乐Hook (纯乐器Solo段)" : "",
          mixxPopSyllable ? "字数物理切割 (副歌三字经/单字弹射)" : "",
          mixxPopAntiDrop ? "反高潮/Dance Break (极简气声或纯电音舞曲间奏)" : "",
          mixxPopFoley ? "环境采样切刀 (非乐器音效如玻璃碎裂、枪械上膛强行打断)" : "",
          mixxPopPersona ? "多重人格对唱 (强行为每句分配不同性别/声线的演唱角色)" : ""
      ].filter(Boolean);
      
      const overdriveInstruction = activeOverdrives.length > 0 
          ? `\n\n【⚠️ 强制激活的极限手法】：${activeOverdrives.join("、")}。你必须在编排大纲中明确安排这些手法的切入点和听感效果！` 
          : "";

      const promptText = `
          你是一个顶级音乐总监（A&R）。用户提供了一段歌词，以及他的制作意图。
          请结合两者，用 150 字以内写一个极具张力的“编曲与演唱大纲（Blueprint）”。
          要求说明：主歌的情绪/乐器，副歌的突变/乐器（特别是段落硬切安排），以及人声的特殊处理安排。${overdriveInstruction}
          
          【用户歌词】：
          ${aiPrompt}
          
          【制作意图】：
          ${aiIntent || "未提供具体意图，请你根据歌词情感自由发挥，设计一个极具张力、带反差突变的编排方案。"}
          
          直接输出大纲文本，不需要任何多余的客套话。
      `;
      try {
          const result = await callAI(promptText);
          setAiBlueprint(String(result || "").trim());
          setShowBlueprintArea(true);
          setToastMessage("✨ 企划大纲已生成，您可以手动修改确认！");
          setTimeout(() => setToastMessage(""), 3000);
      } catch (error) {
          setAiError(`大纲生成失败: ${error.message}`);
      } finally {
          setIsGeneratingBlueprint(false);
      }
  };

  // 新增：专注深度编排单曲歌词的方法 (解决 AI 偷懒截断问题)
  const generateFullLyrics = async (e, recipe, index) => {
      e.stopPropagation(); 
      // 如果已经生成过了，直接打开
      if (recipe.enhanced_lyrics) {
          setShowLyricsModal(String(recipe.enhanced_lyrics));
          return;
      }

      if (!consumeCredit()) return;
      if (!checkApiConfig()) return;

      setIsGeneratingLyricsIndex(index);
      setToastMessage("🚀 算力全开！正在进行全曲深度编排，请稍候...");

      const isTrack2 = index >= 3; 
      let trackSpecificRules = "";

      if (!isTrack2) {
          trackSpecificRules = `
          === TRACK 1: 顶级商业流行编排 (Smooth & Commercial) ===
          - 核心要求：为这首商业流行歌曲进行平滑、悦耳的排版。
          - 标签格式：构建完美的传统结构 [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro]。
          - 细节指示：在歌词间隙插入柔和、专业的乐器和和声提示。例如 (Acoustic guitar strums softly), (Ooh~ ahh~ backing vocals), (Smooth piano build-up)。
          - 过渡处理：过渡必须是无缝、感人和自然的，绝不使用极端的突变。
          `;
      } else {
          let overdriveRules = "";
          if ([mixxPopBpm, mixxPopVocal, mixxPopDrop, mixxPopInst, mixxPopSyllable, mixxPopAntiDrop, mixxPopFoley, mixxPopPersona].some(Boolean)) {
              overdriveRules = `
              - ⚠️ 极限过载设定 (EXTREME OVERDRIVE CUSTOM SETTINGS ENABLED):
                请在副歌和过渡段强制应用以下手法：
                ${[
                     mixxPopBpm ? "BPM 断层: 在过渡处插入 [Tempo Shift], [Half-time], 或 [Double-time]。" : "",
                     mixxPopVocal ? "唱腔分裂: 主歌使用气声 [Whisper]/[Mumble]，副歌突变怒音 [Belting]/[Screaming] 或快嘴 [Chopper Flow]。" : "",
                     mixxPopDrop ? "黄金坠落: 过渡采用 [Pre-Chorus: Build up] -> (Deep breath... 1, 2!) -> [Chorus: Massive Bass Drop, <Style>]。" : "",
                     mixxPopInst ? "器乐 Hook: 副歌后插入洗脑的 [Instrumental Drop: <Specific Instrument>]。" : "",
                     mixxPopSyllable ? "字数物理切割: 将副歌改写为极短的碎片（如单字或三字词），例如 '不！退！让！'，逼迫引擎加速。" : "",
                     mixxPopAntiDrop ? "反高潮/Dance Break: 使用无鼓点气声 [Chorus: Minimalist Bass, Whisper]，或插入纯音乐 [Post-Chorus Dance Break: <Style>]。" : "",
                     mixxPopFoley ? "环境采样切刀: 在过渡处插入非乐器音效，如 (Glass shattering sound), (Gun cocking), 或 (System Glitch...)。" : "",
                     mixxPopPersona ? "多重人格对唱: 强制分配角色，如 (Female gentle voice): ... 和 (Male aggressive rapper): ...。" : ""
                ].filter(Boolean).map((r, i) => `${i + 1}. ${r}`).join('\n                ')}
              `;
          } else {
              overdriveRules = `
              - 保留主歌: 保持主歌意境，不加多余英文和破坏性提示。
              - 爆发副歌: 仅在副歌或过渡期加入气氛词 (Break it down! 等)，全曲不超过 2 个。
              `;
          }

          trackSpecificRules = `
          === TRACK 2: 极端 MIXX POP 编排 (Hard-cut & Overdrive) ===
          - 核心要求：打造极度撕裂、极具反差感的前卫听觉体验 (如 K-Pop/赛博朋克)。
          - 结构与硬切：必须为 [Verse] 分配安静/深情的曲风标签，为 [Chorus] 分配极度暴躁/电子的曲风标签。必须在主副歌交界处精确插入 [Beat Switch] 或 [Sudden Drop]。
          ${overdriveRules}
          `;
      }

      let overrideInstruction = "";
      if (aiBlueprint.trim() || aiIntent.trim()) {
          overrideInstruction = `
          🚨 **最高覆写指令 (ABSOLUTE OVERRIDE DIRECTIVE):**
          不管上面是什么 TRACK 的规则，你必须把以下用户的【企划大纲/意图】作为最高优先级：
          [USER INTENT]: ${aiIntent || "None"}
          [APPROVED BLUEPRINT]: ${aiBlueprint || "None"}
          如果大纲中存在强烈的冲突设计（硬切、戏曲变调等），请立刻作废 TRACK 1 的“平滑要求”，强制按照用户的冲突设计执行！
          `;
      }

      const promptText = `
      你是一个顶级音乐排版与制作人。任务：根据选定的【编曲配方】，将用户的【全篇原始歌词】进行工业级的结构化排版。

      【当前编曲配方】:
      - 风格: ${recipe.styles.join(', ')}
      - 乐器: ${recipe.instruments.join(', ')}
      - 氛围: ${recipe.vibes?.join(', ')}

      【用户原始全篇歌词】:
      ${aiPrompt}

      ${trackSpecificRules}

      ${overrideInstruction}

      🚨 语言强制锁定 (LANGUAGE LOCK):
      你必须 100% 保留原始中文歌词，绝对不允许将其翻译成英文！
      任何额外添加的垫音、和声或气氛词 (Ad-libs) 都必须极度克制，并且不能改变主体歌词的中文语境（可以使用简单的 Ooh, Ahh, 或是少量适配风格的短促词汇，但严禁自作主张加入大段英文歌词）。

      🚨 核心算力警告 (ANTI-TRUNCATION):
      你必须把所有的注意力用来处理**全首歌词**！
      **绝对不允许中途截断、省略（例如使用"..."）或遗漏后面的 Verse 2、Bridge、Outro 等段落！**
      就算歌词很长，也要完整地从头排版到尾！必须包含每一句原始歌词！

      直接输出排版后的歌词文本，不需要任何客套话，不要带 markdown 代码块。
      `;

      try {
          const resultText = await callAI(promptText);
          const cleanText = String(resultText || "").replace(/```[\s\S]*?\n/g, '').replace(/```/g, '').trim();
          
          // 将生成的歌词无痛存入当前的 Recipes 数组中
          const updatedRecipes = [...aiRecipes];
          updatedRecipes[index] = { ...updatedRecipes[index], enhanced_lyrics: cleanText };
          setAiRecipes(updatedRecipes);
          
          setShowLyricsModal(cleanText);
          setToastMessage("✅ 深度编排完成！全曲结构已就绪。");
      } catch (error) {
          setToastMessage(`❌ 编排失败: ${error.message}`);
      } finally {
          setIsGeneratingLyricsIndex(null);
          setTimeout(() => setToastMessage(""), 4000);
      }
  };

  const generateAiRecipe = async () => {
    if (!aiPrompt.trim()) { setAiError("请输入内容..."); return; }
    if (!consumeCredit()) return; 
    if (!checkApiConfig()) return;

    setIsAiGenerating(true); setAiError(""); setAiRecipes(null);
    let constraintText = isChinaLocked ? "MANDATORY: Each recipe MUST include at least one Chinese Style (from '中国') OR one Chinese Instrument (from 'CN中华/东方乐器')." : "";
    
    let instructions = "";
    if (aiMode === 'lyrics') {
        let blueprintInstruction = "";
        if (aiBlueprint.trim() || aiIntent.trim()) {
            blueprintInstruction = `
            🚨 **THE ABSOLUTE OVERRIDE DIRECTIVE (最高覆写指令):**
            The user has provided a specific production intent or an approved blueprint below. 
            THIS DIRECTIVE HAS THE HIGHEST PRIORITY OVER ALL OTHER RULES! 
            If the intent or blueprint requests "hard cuts", "sudden drops", or specific contrasting genres, you MUST prioritize it when selecting styles/instruments for ALL 6 RECIPES.
            
            [USER INTENT]: ${aiIntent || "None"}
            [APPROVED BLUEPRINT]: ${aiBlueprint || "None"}
            `;
        }

        instructions = `
            **CRITICAL INSTRUCTION FOR LYRICS ANALYSIS (DUAL-TRACK STRATEGY):**
            You are a MASTER RECORDING PRODUCER. Analyze the original lyrics: "${aiPrompt}".
            
            🚨 **GENRE COHESION DIRECTIVE (流派凝聚力与逻辑融合):**
            - Anchor Style: First, establish a clear core genre for each recipe.
            - Acoustic Cohesion: The selected Instruments, Vocals, and Production tags MUST mathematically and acoustically match the chosen Style. Do NOT randomly mix conflicting acoustic elements (e.g., do not pair "Guzheng" with "Detroit Techno" without a valid "World Fusion" justification; ensure "Autotune Heavy" pairs strictly with electronic/trap, not traditional acoustic).
            - Contrast vs. Chaos: For Track 2 (Mixx Pop), the extreme contrast happens BETWEEN Verse and Chorus. WITHIN each specific section, the musical elements MUST remain highly cohesive and professional.

            Create 6 DISTINCT sonic recipes based on the Dual-Track strategy.

            === TRACK 1: TOP-TIER COMMERCIAL POP (Recipes 1-3) ===
            - Vibe: Smooth, radio-ready, Grammy-level commercial production.
            - Tags: Use tags ONLY from the provided database.

            === TRACK 2: EXTREME MIXX POP (Recipes 4-6) ===
            - Vibe: Hyper-contrast, mind-blowing auditory tear (K-Pop/Cyberpunk style).
            - Tags: Free mode. Use creative, wild tags NOT in the database.

            ${blueprintInstruction}

            ${constraintText}
            
            🚨 **CRITICAL EFFICIENCY DIRECTIVE**: 
            DO NOT GENERATE THE ACTUAL LYRICS NOW! We only need the musical tags in this step to save compute. 
            You MUST set the "enhanced_lyrics" field to null for ALL 6 objects. The actual lyrics formatting will be done in a later step.

            Output strict JSON ARRAY containing 6 objects: { 
              "title": "...", 
              "reason": "...", 
              "styles": [...], 
              "instruments": [...], 
              "vocals": [...],
              "production": [...], 
              "vibes": [...],
              "enhanced_lyrics": null 
            }.
            "title" and "reason" MUST be in pure Simplified Chinese. Absolutely NO English translation of the core concepts. No markdown.
        `;
    } else if (aiMode === 'enhancer') {
         instructions = `
            You are a "Hardcore Music Feature Extractor".
            Goal: Extract technical sonic parameters from the user's input to COMPLEMENT their description.
            
            USER INPUT: "${aiPrompt}"
            
            🚨 **GENRE COHESION DIRECTIVE (流派凝聚力):**
            Ensure the inferred Instruments, Production, and Vocals logically match the extracted Styles. No random, conflicting acoustic pairings unless explicitly stated by the user.

            TASKS:
            1. Do NOT rephrase the user's input in the tags.
            2. EXTRACT & INFER technical parameters that are IMPLIED but missing from the text.
               - Rhythm/Style: (e.g. Syncopated, Polyrhythm, Trap, Ballad)
               - Instruments: (e.g. 808 Bass, Guzheng, Distortion Guitar)
               - Production: (e.g. Sidechain, Lo-fi, Wide Stereo)
               - Vibes: (e.g. Ethereal, Aggressive)
            3. Allow FREE-FORM tags (do not stick to database).
            
            Create 3 DISTINCT variations.
            
            Output strict JSON ARRAY containing 3 objects: { 
              "title": "...", 
              "reason": "...", 
              "styles": ["..."], 
              "instruments": ["..."], 
              "vocals": ["..."],
              "production": ["..."], 
              "vibes": ["..."],
              "enhanced_lyrics": null
            }.
            "title" and "reason" MUST be in Simplified Chinese. No markdown.
        `;
    } else {
        instructions = `
            You are a music production expert AI. Analyze description: "${aiPrompt}".
            
            🚨 **GENRE COHESION DIRECTIVE (流派凝聚力):**
            Ensure strict acoustic logic. The selected Instruments, Vocals, and Production MUST closely serve and match the core Styles. Avoid random, dissonant pairings.

            Create 6 DISTINCT sonic recipes.
            - Recipes 1-3: Use tags ONLY from the provided database. (Strict)
            - Recipes 4-6: Use creative, wild, or non-existent tags NOT in the database. (Free Mode)
            
            ${constraintText}
            Output strict JSON ARRAY containing 6 objects: { "title", "reason", "styles", "instruments", "vocals", "production", "vibes", "enhanced_lyrics": null }. "title" and "reason" MUST be in Simplified Chinese. No markdown.
        `;
    }
    
    const fullPrompt = `${instructions}\nDatabase structure: ${JSON.stringify(data)}`;

    try {
      const resultText = await callAI(fullPrompt);
      const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) setAiRecipes(parsed);
    } catch (error) { 
      setAiError(`炼金失败: ${error.message}`); 
    } finally { setIsAiGenerating(false); }
  };

  const generateRandomMix = () => {
    setIsAnimating(true); setCopySuccess(false);
    setTimeout(() => {
      const getRandom = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
      const allStyles = Object.values(data.styles).flat();
      const allInstruments = Object.values(data.instruments).flat();
      const allVocals = Object.values(data.vocals).flat();
      const allProduction = Object.values(data.production).flat(); 
      const allVibes = Object.values(data.vibes).flat(); 

      let s = (isBaseLocked && selectedStyles.length > 0) ? selectedStyles : getRandom(allStyles, 2);
      let i = getRandom(allInstruments, 3);
      let voc = getRandom(allVocals, 1);
      let p = getRandom(allProduction, 3);
      let v = getRandom(allVibes, 2);

      if (isChinaLocked) {
          const hasCnStyle = s.some(style => data.styles["中国"].includes(style));
          const hasCnInst = i.some(inst => data.instruments["CN中华/东方乐器"].includes(inst));
          if (!hasCnStyle && !hasCnInst) {
              const forceStyle = Math.random() > 0.5;
              if (forceStyle && !isBaseLocked) {
                  const cnStyles = data.styles["中国"];
                  const randomCnStyle = cnStyles[Math.floor(Math.random() * cnStyles.length)];
                  if (s.length > 0) s[0] = randomCnStyle; else s.push(randomCnStyle);
              } else {
                  const cnInsts = data.instruments["CN中华/东方乐器"];
                  const randomCnInst = cnInsts[Math.floor(Math.random() * cnInsts.length)];
                  if (i.length > 0) i[0] = randomCnInst; else i.push(randomCnInst);
              }
          }
      }
      applyAutoMix(s, i, voc, p, v, isBaseLocked);
      setIsAnimating(false);
    }, 400);
  };

  const generateStrategyBasedMix = async () => {
    if (!consumeCredit()) return; 
    if (!checkApiConfig()) return;
    setIsAnimating(true); setCopySuccess(false);
    
    let constraints = [];
    if (isBaseLocked && selectedStyles.length > 0) constraints.push(`LOCKED Styles: ${JSON.stringify(selectedStyles)}. Build around these.`);
    if (isChinaLocked) constraints.push(`MANDATORY: Include Chinese Style or Chinese Instruments.`);
    const strategyInstruction = strategies.find(s => s.value === fusionStrategy)?.desc || fusionStrategy;
    const systemInstruction = `
      You are a music curator AI. Select ingredients based on strategy: "${strategyInstruction}".
      Constraints: ${constraints.join("\n")}
      Output strict JSON object (NO markdown) with keys: "styles", "instruments", "vocals", "production", "vibes".
      Database: ${JSON.stringify(data)}
    `;
    try {
        const resultText = await callAI(systemInstruction);
        const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        const finalStyles = (isBaseLocked && selectedStyles.length > 0) ? selectedStyles : (parsed.styles || []);
        applyAutoMix(finalStyles, parsed.instruments || [], parsed.vocals || [], parsed.production || [], parsed.vibes || [], isBaseLocked);
        setToastMessage(`✨ 已根据「${fusionStrategy.split(' ')[0]}」策略完成炼成`);
        setTimeout(() => setToastMessage(""), 3000);
    } catch (error) { 
        console.error(error);
        generateRandomMix(); 
        setToastMessage(`⚠️ AI连接失败(${error.message})，已切换为随机融合`); 
        setTimeout(() => setToastMessage(""), 3000); 
    } finally { setIsAnimating(false); }
  };

  const generateSmartMix = async () => {
    if (!consumeCredit()) return; 
    if (!checkApiConfig()) return;
    setIsSmartMixing(true); setCopySuccess(false);
    
    let constraints = [];
    if (isBaseLocked && selectedStyles.length > 0) constraints.push(`LOCKED Styles: ${JSON.stringify(selectedStyles)}. Build around these.`);
    if (isChinaLocked) constraints.push(`MANDATORY: Include Chinese Style or Chinese Instruments.`);
    const systemInstruction = `
      You are a music curator AI. Create ONE unique, creatively balanced music fusion recipe.
      Constraints: ${constraints.join("\n")}
      Output strict JSON object (NO markdown) with keys: "styles", "instruments", "vocals", "production", "vibes".
      Database: ${JSON.stringify(data)}
    `;
    try {
      const resultText = await callAI(systemInstruction);
      const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const finalStyles = (isBaseLocked && selectedStyles.length > 0) ? selectedStyles : (parsed.styles || []);
      applyAutoMix(finalStyles, parsed.instruments || [], parsed.vocals || [], parsed.production || [], parsed.vibes || [], isBaseLocked);
    } catch (error) { 
      console.error(error);
      generateRandomMix();
      setToastMessage(`⚠️ 智能融合失败(${error.message})，已切换为随机融合`);
      setTimeout(() => setToastMessage(""), 3000); 
    } finally { setIsSmartMixing(false); }
  };

  const handleMainMixButtonClick = () => {
      if (isStrategyLinked) { generateStrategyBasedMix(); } else { generateRandomMix(); }
  };

  const analyzeMix = async () => {
    if (selectedStyles.length === 0 && selectedInstruments.length === 0) return;
    if (!consumeCredit()) return; 
    if (!checkApiConfig()) return;

    setIsAnalyzing(true); setAnalysisError(""); setAnalysisResult("");
    const promptText = `
      Please analyze the following music mix recipe:
      Styles: ${selectedStyles.join(", ")}
      Instruments: ${selectedInstruments.join(", ")}
      Vocals: ${selectedVocals.join(", ")}
      Production: ${selectedProduction.join(", ")}
      Vibes: ${selectedVibes.join(", ")}
      Your task is to write a descriptive analysis in Chinese, following this specific format and tone:
      "一种融合了[风格1特征]、[风格2特征]以及[其他元素]的风格，打造出[整体氛围]的[流派定义]风格，助力[目标人群/用途]实现[效果]。#[形容词1] #[形容词2]，在[元素A]部分营造[氛围A]，在[元素B]部分展现[特征B] #[情感描述]"
      Keep it creative, evocative, and professional. Output ONLY the text.
    `;
    try {
      const resultText = await callAI(promptText);
      setAnalysisResult(String(resultText || "分析内容为空"));
    } catch (error) { 
      setAnalysisError(`分析失败: ${error.message}`); 
    } finally { setIsAnalyzing(false); }
  };

  const clearAll = () => {
    if (isBaseLocked) { setSelectedInstruments([]); setSelectedVocals([]); setSelectedProduction([]); setSelectedVibes([]); } 
    else { setSelectedStyles([]); setSelectedInstruments([]); setSelectedVocals([]); setSelectedProduction([]); setSelectedVibes([]); }
    setCopySuccess(false); setAnalysisResult(""); setToastMessage(""); setFinalPrompt("");
  };

  const toggleSelection = (category, item) => {
    const setters = { styles: setSelectedStyles, instruments: setSelectedInstruments, vocals: setSelectedVocals, production: setSelectedProduction, vibes: setSelectedVibes };
    const currentValues = { styles: selectedStyles, instruments: selectedInstruments, vocals: selectedVocals, production: selectedProduction, vibes: selectedVibes };
    const current = currentValues[category];
    const setFn = setters[category];
    let nextSelection = [];
    if (current.includes(item)) { 
      nextSelection = current.filter(i => i !== item); 
      if (category === 'styles' && isSmartLinkageEnabled) {
          const matchedKey = Object.keys(styleAssociations).find(k => k === item || item.includes(k.split(' ')[0]));
          if (matchedKey) {
              const association = styleAssociations[matchedKey];
              const instrumentsToRemove = association.instruments || [];
              const productionToRemove = association.production || [];
              const vibesToRemove = association.vibes || [];
              if (instrumentsToRemove.length > 0) setSelectedInstruments(prev => prev.filter(i => !instrumentsToRemove.includes(i)));
              if (productionToRemove.length > 0) setSelectedProduction(prev => prev.filter(p => !productionToRemove.includes(p)));
              if (vibesToRemove.length > 0) setSelectedVibes(prev => prev.filter(v => !vibesToRemove.includes(v)));
          }
      }
    } else { 
      nextSelection = [...current, item]; 
      if (category === 'styles' && isSmartLinkageEnabled) {
          const matchedKey = Object.keys(styleAssociations).find(k => k === item || item.includes(k.split(' ')[0]));
          if (matchedKey) {
              const association = styleAssociations[matchedKey];
              const newInstruments = association.instruments || [];
              const newProduction = association.production || [];
              const newVibes = association.vibes || [];
              const instrumentsToAdd = newInstruments.filter(i => !selectedInstruments.includes(i));
              if (instrumentsToAdd.length > 0) setSelectedInstruments(prev => [...prev, ...instrumentsToAdd]);
              const productionToAdd = newProduction.filter(p => !selectedProduction.includes(p));
              if (productionToAdd.length > 0) setSelectedProduction(prev => [...prev, ...productionToAdd]);
              const vibesToAdd = newVibes.filter(v => !selectedVibes.includes(v));
              if (vibesToAdd.length > 0) setSelectedVibes(prev => [...prev, ...vibesToAdd]);
              const addedItems = [...instrumentsToAdd, ...productionToAdd, ...vibesToAdd];
              if (addedItems.length > 0) {
                  const simpleNames = addedItems.map(s => { const match = s.match(/\(([^)]+)\)/); return match ? match[1] : s.split(' ')[0]; }).join("、");
                  setToastMessage(`已自动关联核心元素：${simpleNames}`);
                  setTimeout(() => setToastMessage(""), 3500);
              }
          }
      }
    }
    setFn(nextSelection);
    setFinalPrompt("");
  };

  const getFormattedIngredients = () => {
     return [...selectedStyles, ...selectedInstruments, ...selectedVocals, ...selectedProduction, ...selectedVibes];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-pink-500 selection:text-white pb-12 relative overflow-x-hidden">
      
      {/* 快捷工具侧栏 (Floating Sidebar) */}
      <div className="fixed right-0 top-1/3 z-[50] flex flex-col gap-3">
          <a
              href="https://lucky-lebkuchen-1f8274.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/80 border-r-0 p-1.5 rounded-l-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 translate-x-[76px] hover:translate-x-0 cursor-pointer hover:bg-slate-800"
          >
              <div className="flex items-center justify-center shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all">
                  <Wrench size={18} className="text-white" />
              </div>
              <div className="flex flex-col px-3 justify-center w-[76px] overflow-hidden">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider leading-tight">Tool</span>
                  <span className="text-xs font-bold text-slate-200 whitespace-nowrap leading-tight group-hover:text-white mt-0.5">同音纠正</span>
              </div>
          </a>

          {/* 音乐原创本 滑块 */}
          <a
              href="https://pan.baidu.com/s/1Q1qj_xaDwUK_rcamBnENdA?pwd=jkdy"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/80 border-r-0 p-1.5 rounded-l-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 translate-x-[76px] hover:translate-x-0 cursor-pointer hover:bg-slate-800"
          >
              <div className="flex items-center justify-center shrink-0 w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-teal-500/50 group-hover:scale-105 transition-all">
                  <BookOpen size={18} className="text-white" />
              </div>
              <div className="flex flex-col px-3 justify-center w-[76px] overflow-hidden">
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider leading-tight">Docs</span>
                  <span className="text-xs font-bold text-slate-200 whitespace-nowrap leading-tight group-hover:text-white mt-0.5">音乐原创本</span>
              </div>
          </a>

          {/* 抖音关注 滑块 (带悬浮二维码) */}
          <div className="group flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/80 border-r-0 p-1.5 rounded-l-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 translate-x-[76px] hover:translate-x-0 cursor-pointer hover:bg-slate-800 relative">
              {/* 悬浮二维码卡片 */}
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                  <div className="bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-3 shadow-[0_0_30px_rgba(236,72,153,0.3)] flex flex-col items-center gap-2 w-48 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-violet-500"></div>
                      <img src="b229c667e311981bcf7ac21f357502a1.jpg" onError={(e) => { e.target.style.display = 'none'; }} alt="抖音二维码" className="w-full h-auto rounded-xl border border-slate-700/50" />
                      <div className="text-center mt-1">
                          <span className="block text-xs text-pink-300 font-bold mb-0.5">打开抖音扫一扫</span>
                          <span className="block text-[10px] text-slate-400 leading-tight">获取更多AI音乐灵感</span>
                      </div>
                  </div>
              </div>

              <div className="flex items-center justify-center shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg group-hover:shadow-pink-500/50 group-hover:scale-105 transition-all">
                  <Smartphone size={18} className="text-white" />
              </div>
              <div className="flex flex-col px-3 justify-center w-[76px] overflow-hidden">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider leading-tight">Follow</span>
                  <span className="text-xs font-bold text-slate-200 whitespace-nowrap leading-tight group-hover:text-white mt-0.5">抖音关注</span>
              </div>
          </div>
      </div>

      {/* === Paywall Modal (一机一码授权) === */}
      {showPaywall && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
                <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                        <Zap size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">炼金算力已耗尽</h2>
                    <p className="text-slate-400 mb-8">您当前的免费使用次数已用完。本项目由个人开发者维护，欢迎通过捐赠获取永久使用权限。</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {/* 左侧：闲鱼引导区 */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-yellow-500/50 transition-all flex flex-col h-full relative group shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            <div className="absolute -top-3 left-6 bg-yellow-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider text-slate-900 shadow-lg">Step 1. 闲鱼获取捐赠码</div>
                            <h3 className="text-lg font-bold text-slate-200 mb-1 mt-2">开发者捐赠包</h3>
                            <div className="text-3xl font-black text-white mb-4">¥99<span className="text-sm font-normal text-slate-500"> / 终身永久版</span></div>
                            <ul className="space-y-2 mb-6 flex-grow">
                                <li className="text-xs text-slate-400 flex items-center gap-2"><Sparkles size={12} className="text-yellow-400"/> 复制下方机器码，发给闲鱼掌柜</li>
                                <li className="text-xs text-slate-400 flex items-center gap-2"><Sparkles size={12} className="text-yellow-400"/> <span className="text-pink-400 font-bold">重要：</span>请主动提供您的【闲鱼会员名】以便售后重置</li>
                                <li className="text-xs text-slate-400 flex items-center gap-2"><Sparkles size={12} className="text-yellow-400"/> 拍下后将在聊天窗口获取专属激活凭证</li>
                            </ul>
                            <div className="bg-black/50 p-3 rounded-lg border border-slate-800 mb-4 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">您的机器码 (Device ID)</p>
                                <code className="text-lg font-mono font-bold text-yellow-400 select-all">{deviceId}</code>
                            </div>
                            <button 
                                onClick={() => {
                                    const searchKeyword = "星辰妙漫音乐炼金台"; 
                                    const textArea = document.createElement("textarea");
                                    textArea.value = searchKeyword;
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        setToastMessage("✅ 已复制搜索口令！请打开【闲鱼APP】粘贴搜索。");
                                        setTimeout(() => setToastMessage(""), 3000);
                                    } catch (err) {
                                        setToastMessage(`复制失败，请手动在闲鱼搜索: ${searchKeyword}`);
                                        setTimeout(() => setToastMessage(""), 3000);
                                    }
                                    document.body.removeChild(textArea);
                                }}
                                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 group-hover:scale-[1.02]"
                            >
                                <Copy size={16} /> 复制闲鱼搜索口令
                            </button>
                        </div>

                        {/* 右侧：卡密兑换区 */}
                        <div className="bg-slate-950 border border-purple-500/50 rounded-2xl p-6 hover:border-purple-400 transition-all flex flex-col h-full relative group shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                            <div className="absolute -top-3 left-6 bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider text-white shadow-lg">Step 2. 激活捐赠凭证</div>
                            <h3 className="text-lg font-bold text-purple-300 mb-1 mt-2 flex items-center gap-2">使用激活码</h3>
                            <p className="text-xs text-slate-400 mb-6 flex-grow">如果您已在闲鱼通过捐赠获取了包含 <strong>XCMM-PRO-</strong> 前缀的凭证码，请在此处输入以永久激活。</p>
                            
                            <div className="flex flex-col gap-3">
                                <input 
                                    type="text" 
                                    value={redeemCode}
                                    onChange={(e) => setRedeemCode(e.target.value)}
                                    placeholder="例如: XCMM-PRO-..." 
                                    className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm uppercase"
                                />
                                <button 
                                    onClick={() => handleRedeemCode(redeemCode)}
                                    disabled={isRedeeming}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 group-hover:scale-[1.02] disabled:opacity-50"
                                >
                                    {isRedeeming ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    {isRedeeming ? "正在校验云端..." : "验证捐赠并激活"}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-600 mt-6 flex items-center justify-center gap-1">
                        <Lock size={10}/> 捐赠与激活通过云端一机一码安全校验。
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* === Settings Modal === */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl relative p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="text-blue-400" size={20} />
                    本地 API 配置 (Local Config)
                </h3>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">API 供应商 (Provider)</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleProviderSwitch('gemini')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${tempApiProvider === 'gemini' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Google Gemini
                            </button>
                            <button 
                                onClick={() => handleProviderSwitch('qwen')}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${tempApiProvider === 'qwen' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                            >
                                阿里千问 (Qwen)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">API Key</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="输入您的 API Key..."
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-10 text-sm"
                            />
                            <Key size={16} className="absolute left-3 top-3 text-slate-500" />
                        </div>
                        <p className="text-[10px] text-slate-500">密钥仅保存在浏览器 localStorage 中，不会上传服务器。</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">API Base URL (接口地址)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={tempApiUrl}
                                onChange={(e) => setTempApiUrl(e.target.value)}
                                placeholder={tempApiProvider === 'qwen' ? "默认: https://dashscope.aliyuncs.com/compatible-mode/v1" : "默认: https://generativelanguage.googleapis.com"}
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-10 text-sm"
                            />
                            <Link2 size={16} className="absolute left-3 top-3 text-slate-500" />
                        </div>
                        <p className="text-[10px] text-slate-500">{tempApiProvider === 'qwen' ? "默认使用阿里云百炼 OpenAI 兼容接口地址。" : "如遇跨域 (CORS) 或网络阻断，可修改为自定义反向代理地址 (如 /gemini-api)。"}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">AI 模型 (Model Name)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={tempApiModel}
                                onChange={(e) => setTempApiModel(e.target.value)}
                                placeholder={tempApiProvider === 'qwen' ? "默认: qwen-plus" : "默认: gemini-2.5-flash"}
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-10 text-sm"
                            />
                            <Bot size={16} className="absolute left-3 top-3 text-slate-500" />
                        </div>
                        <p className="text-[10px] text-slate-500">{tempApiProvider === 'qwen' ? "可更改为 qwen-turbo, qwen-max 等模型。" : "可更改为 gemini-1.5-pro-latest 或 gemini-2.0-flash 等可用模型。"}</p>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col gap-4">
                    {apiTestStatus && (
                        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${apiTestStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {apiTestStatus === 'success' ? <ShieldCheck size={16} className="shrink-0" /> : <X size={16} className="shrink-0" />}
                            <span className="break-all">{String(apiTestMessage)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <button 
                            onClick={testApiConnection} 
                            disabled={isTestingApi || !tempApiKey}
                            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isTestingApi ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className={tempApiKey ? "text-yellow-400" : "text-slate-500"} />}
                            测试连通性
                        </button>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSettings(false)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all">取消</button>
                            <button onClick={saveSettings} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/20">保存配置</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* === Auth Modal (登录/注册) === */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden p-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                <button onClick={() => { setShowAuthModal(false); setPendingAction(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"><X size={20}/></button>
                
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <User className="text-blue-400" size={24} />
                    {isLoginMode ? '云端账号登录' : '注册新账号'}
                </h3>
                
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">邮箱 (Email)</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                required
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-10 text-sm"
                            />
                            <User size={16} className="absolute left-3 top-3 text-slate-500" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">密码 (Password)</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="******"
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-10 text-sm"
                            />
                            <KeyRound size={16} className="absolute left-3 top-3 text-slate-500" />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            {authLoading ? <Loader2 size={16} className="animate-spin" /> : (isLoginMode ? <LogIn size={16} /> : <User size={16} />)}
                            {isLoginMode ? '立即登录' : '注册账号'}
                        </button>
                    </div>
                </form>
                
                <div className="mt-4 text-center">
                    <button 
                        onClick={() => setIsLoginMode(!isLoginMode)} 
                        className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
                    >
                        {isLoginMode ? '没有账号？点击注册新账号' : '已有账号？点击此处登录'}
                    </button>
                </div>
                
                <div className="mt-6 p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        <Info size={12} className="inline mr-1 text-blue-400" />
                        登录云端账号后，您的激活码将与该账号永久绑定。未来在任何设备上只需登录此账号即可自动恢复 PRO 权限，且无需同步您的本地 API Key。
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* 歌词优化结果 Modal */}
      {showLyricsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10 shrink-0">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FileMusic className="text-indigo-400" size={18} />
                        AI 结构优化建议 (Structure Enhanced)
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-normal ml-2 tracking-wide hidden sm:inline-block">可直接编辑修改</span>
                    </h3>
                    <button onClick={() => setShowLyricsModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
                </div>
                
                {/* 替换为可编辑的 textarea */}
                <div className="p-4 bg-black/40 flex-1 overflow-hidden relative group">
                    <textarea 
                        value={String(showLyricsModal)}
                        onChange={(e) => setShowLyricsModal(e.target.value)}
                        placeholder="在这里可以进行最后的歌词与标签微调..."
                        spellCheck="false"
                        className="w-full h-full text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-transparent border border-slate-700/50 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none custom-scrollbar transition-all"
                    />
                    <div className="absolute top-6 right-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-slate-500 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">编辑内容会自动同步至截图</span>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 z-10 shrink-0">
                    <button 
                        onClick={generateShareImage}
                        disabled={isGeneratingImage}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50"
                    >
                        {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} 
                        {isGeneratingImage ? "渲染中..." : "📸 生成企划长图"}
                    </button>
                    <button 
                        onClick={() => copyToClipboard(showLyricsModal)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <Copy size={14} /> 纯文本复制
                    </button>
                </div>
            </div>

            {/* 隐藏的超清渲染舱 (只在截图时被读取) */}
            <div id="share-image-node" style={{ position: 'absolute', left: '-9999px', top: 0, width: '640px', padding: '40px', background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)', color: '#cbd5e1', fontFamily: 'sans-serif' }}>
                {/* 海报头部 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '25px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', padding: '12px', borderRadius: '14px', boxShadow: '0 10px 20px rgba(236,72,153,0.3)' }}>
                        <Sparkles size={28} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '1px' }}>星辰妙漫 炼金师 AI</h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>Suno 工业级编曲排版企划案</p>
                    </div>
                </div>
                
                {/* 高亮歌词内容 */}
                <div 
                    style={{ whiteSpace: 'pre-wrap', fontSize: '15px', lineHeight: '1.9', fontFamily: 'monospace', color: '#e2e8f0' }} 
                    dangerouslySetInnerHTML={getHighlightedLyrics(showLyricsModal)} 
                />
                
                {/* 海报底部引流信息 */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bot size={14} color="#64748b" />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Generated by xcmm.org</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', background: 'rgba(56,189,248,0.1)', padding: '4px 8px', borderRadius: '4px' }}>AI 音乐灵感发生器</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-slate-800/90 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md max-w-sm">
            <Link2 size={18} className="text-blue-400 shrink-0" />
            <span className="text-xs font-medium leading-snug">{String(toastMessage)}</span>
            <button onClick={() => setToastMessage("")} className="ml-auto text-slate-500 hover:text-white"><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 shadow-lg sticky top-0 z-20">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2 rounded-lg shadow-lg shadow-purple-500/20"><Sparkles size={20} className="text-white" fill="currentColor" /></div>
            <div className="flex items-baseline gap-2"><h1 className="text-xl md:text-2xl xl:text-3xl font-black tracking-tight bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">星辰妙漫 炼金师 AI</h1><span className="text-[10px] text-slate-500 font-mono border border-slate-700 rounded-full px-1.5 py-0.5">v4.0 Local</span></div>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 ml-4 mr-2">
              <button onClick={handleZoomOut} className="p-1 hover:text-white text-slate-400"><ZoomOut size={14}/></button>
              <span className="text-[10px] w-8 text-center text-slate-400">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 hover:text-white text-slate-400"><ZoomIn size={14}/></button>
            </div>
            
            {/* PRO 状态展示 */}
            {isPro ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)] mr-1">
                    <Crown size={14} /> 终身永久版
                </div>
            ) : (
                <button onClick={handleOpenPaywall} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all mr-1">
                    <Zap size={14} className="text-yellow-500" /> 试用 {credits} 次
                </button>
            )}

            {/* 云端账号模块 */}
            {(!user || user.isAnonymous) ? (
                <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white mr-2">
                    <User size={14} /> <span>登录 / 注册</span>
                </button>
            ) : (
                <div className="flex items-center gap-2 mr-2 bg-slate-800/50 rounded-lg pl-3 pr-1 py-1 border border-slate-700">
                    <span className="text-[10px] text-slate-400 max-w-[80px] truncate" title={user.email}>{user.email}</span>
                    <button onClick={handleLogout} className="flex items-center gap-1 p-1.5 rounded-md bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30" title="登出本地授权">
                        <LogOut size={12} />
                    </button>
                </div>
            )}

             {/* API 配置按钮 */}
             <button onClick={openSettings} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border ${!userApiKey ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}><Settings size={14} /> <span>API 配置</span></button>

             <button onClick={() => setIsSmartLinkageEnabled(!isSmartLinkageEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border ${isSmartLinkageEnabled ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="开启后，选中风格会自动关联对应的特色乐器和制作手法"><Link2 size={14} /> <span>{isSmartLinkageEnabled ? '关联开启' : '关联关闭'}</span></button>
             <button onClick={() => setIsAiPanelOpen(!isAiPanelOpen)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold shadow-lg transition-all transform active:scale-95 text-xs ring-2 ring-blue-500/20 ${isAiPanelOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400 hover:bg-slate-700'}`}><BrainCircuit size={14} /> <span>AI 炼金</span></button>
             <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>
             <button onClick={() => setIsChinaLocked(!isChinaLocked)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border ${isChinaLocked ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}><Gem size={14} /> <span>{isChinaLocked ? '中华炼金 ON' : '中华炼金'}</span></button>
             <button onClick={() => setIsBaseLocked(!isBaseLocked)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border ${isBaseLocked ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}><Lock size={14} /> <span>{isBaseLocked ? '基调已锁' : '基调锁定'}</span></button>
             <button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs font-medium border border-slate-700"><RefreshCw size={14} /> 重置</button>
            <button onClick={generateSmartMix} disabled={isSmartMixing || isAnimating} className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold shadow-lg transition-all transform active:scale-95 text-xs ${isSmartMixing ? 'bg-indigo-700 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'}`}>{isSmartMixing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} <span>智能融合</span></button>
            <button onClick={handleMainMixButtonClick} disabled={isSmartMixing || isAnimating} className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold shadow-lg transition-all transform active:scale-95 text-xs relative overflow-hidden group ${isStrategyLinked ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ring-2 ring-blue-500/30' : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white'}`}>{isAnimating ? <Loader2 size={14} className="animate-spin" /> : (isStrategyLinked ? <FlaskConical size={14} /> : <Dice5 size={14} />)}<span>{isStrategyLinked ? '策略融合' : '随机融合'}</span>{isStrategyLinked && <span className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors pointer-events-none"></span>}</button>
          </div>
        </div>
      </header>

      {/* AI Alchemy Lab */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isAiPanelOpen ? 'max-h-[2500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 mt-6">
            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl shadow-2xl p-4 md:p-6">
                
                {/* 模式切换 Tab */}
                <div className="flex gap-2 mb-4 bg-slate-950/50 p-1 rounded-lg border border-slate-700/50 w-fit">
                    <button onClick={() => setAiMode('inspiration')} className={`px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${aiMode === 'inspiration' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <Sparkles size={14} /> ✨ 画面灵感
                    </button>
                    <button onClick={() => setAiMode('lyrics')} className={`px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${aiMode === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <FileMusic size={14} /> 🎵 歌词结构
                    </button>
                    <button onClick={() => setAiMode('enhancer')} className={`px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${aiMode === 'enhancer' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <PenLine size={14} /> 📝 润色扩写
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                           {aiMode === 'inspiration' ? '描述你的灵感 (Describe Inspiration)' : aiMode === 'lyrics' ? '分析你的歌词 (Analyze Lyrics)' : '核心意图扩写 (Prompt Enhancer)'}
                        </h3>
                        <button onClick={() => setIsAiPanelOpen(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={
                                aiMode === 'inspiration' ? "例如：赛博朋克雨夜，失恋侦探在喝威士忌..." :
                                aiMode === 'lyrics' ? "粘贴你的歌词和段落结构（例如 [Verse], [Chorus]）..." :
                                "输入你的核心描述（例如：世界民族特色乐器混中国特色乐器），AI 将基于此进行创意扩散..."
                            }
                            className="w-full h-32 bg-black/40 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-base md:text-lg transition-all font-mono"
                        />
                        
                        {aiMode === 'lyrics' && (
                            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                                <input 
                                    type="text"
                                    value={aiIntent}
                                    onChange={(e) => setAiIntent(e.target.value)}
                                    placeholder="🎼 选填：你的制作意图 (例如: 主歌R&B铺垫，副歌突变至昆曲与重金属)"
                                    className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all font-sans"
                                />
                                
                                <div className="flex flex-wrap gap-2 items-center justify-between">
                                    <button 
                                        onClick={generateBlueprint}
                                        disabled={isGeneratingBlueprint || !aiPrompt.trim()}
                                        className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGeneratingBlueprint ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                                        先出个编排大纲 (AI Blueprint)
                                    </button>
                                </div>

                                {/* MIXX POP 极限过载控制台 */}
                                <div className="bg-black/30 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-300">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                        <Flame size={12} className="text-red-500" />
                                        MIXX POP 八门遁甲控制台 (独立测试)
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => setMixxPopBpm(!mixxPopBpm)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopBpm ? 'bg-red-900/50 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="在硬切处强制加入 [Tempo Shift] / [Double-time] 造成速度撕裂">
                                            ⏱️ BPM 断层 {mixxPopBpm ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopVocal(!mixxPopVocal)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopVocal ? 'bg-orange-900/50 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="主歌强制呢喃/气声，副歌强制嘶吼/快嘴，唱腔极度反差">
                                            🗣️ 唱腔分裂 {mixxPopVocal ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopDrop(!mixxPopDrop)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopDrop ? 'bg-amber-900/50 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="使用 (Deep breath... 1, 2!) 和 Massive Bass Drop 打造极具张力的坠落感">
                                            📉 黄金坠落 {mixxPopDrop ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopInst(!mixxPopInst)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopInst ? 'bg-rose-900/50 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="在副歌后独立插入一段极其洗脑的纯器乐 Solo 段落">
                                            🎸 器乐 Hook {mixxPopInst ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopSyllable(!mixxPopSyllable)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopSyllable ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="强制副歌改写为三字经或单字弹射，利用物理字数差异逼迫 Suno 加速">
                                            ✂️ 字数切割 {mixxPopSyllable ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopAntiDrop(!mixxPopAntiDrop)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopAntiDrop ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="放弃传统的重低音轰炸，使用极简气声的反高潮，或插入长达15秒的无歌词纯电音跳舞段落">
                                            🕳️ 反高潮 {mixxPopAntiDrop ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopFoley(!mixxPopFoley)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopFoley ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="在段落切换处，使用玻璃碎裂、枪械上膛、系统故障等极其强烈的非乐器环境音效强行打断">
                                            🎬 采样切刀 {mixxPopFoley ? 'ON' : 'OFF'}
                                        </button>
                                        <button onClick={() => setMixxPopPersona(!mixxPopPersona)} className={`px-2.5 py-1.5 rounded md:text-xs text-[10px] font-bold transition-all border ${mixxPopPersona ? 'bg-purple-900/50 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="强制分配人声轨道，例如主歌女声低语，副歌男声暴躁说唱+大合唱，营造多角色幻觉">
                                            🎭 人格分裂 {mixxPopPersona ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                </div>

                                {showBlueprintArea && (
                                    <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex justify-between items-center">
                                            <span>📝 AI 企划案 / 编排大纲 (可手动修改确认)</span>
                                            <button onClick={() => setShowBlueprintArea(false)} className="text-slate-500 hover:text-slate-300 p-1 bg-black/20 rounded"><X size={12}/></button>
                                        </label>
                                        <textarea
                                            value={aiBlueprint}
                                            onChange={(e) => setAiBlueprint(e.target.value)}
                                            placeholder="这里将显示 AI 的编排构思，您也可以直接在这里写下详细的大纲..."
                                            className="w-full h-24 bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3 text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-xs md:text-sm transition-all leading-relaxed font-sans"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                        {aiError ? <span className="text-red-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>{String(aiError)}</span> : <span></span>}
                        <button onClick={generateAiRecipe} disabled={isAiGenerating} className={`px-6 py-2 rounded-lg text-xs md:text-sm font-bold text-white shadow-lg disabled:opacity-50 flex items-center gap-2 ${aiMode === 'inspiration' ? 'bg-blue-600 hover:bg-blue-500' : aiMode === 'lyrics' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-amber-600 hover:bg-amber-500'}`}>{isAiGenerating ? <><Loader2 size={14} className="animate-spin" /> 思考中...</> : <><Wand2 size={14} /> {aiMode === 'inspiration' ? '生成配方' : aiMode === 'lyrics' ? '最终确认并生成 (Generate)' : '智能扩写'}</>}</button>
                    </div>
                </div>
                {aiRecipes && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 border-t border-slate-800 pt-6">
                    {aiRecipes.map((recipe, index) => (
                        <div key={index} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-blue-500/50 transition-all flex flex-col group cursor-pointer" 
                            onClick={() => {
                                if (aiMode === 'enhancer') {
                                    const fullText = formatEnhancerPrompt(recipe, aiPrompt);
                                    copyToClipboard(fullText);
                                } else {
                                    applyAutoMix(recipe.styles, recipe.instruments, recipe.vocals || [], recipe.production, recipe.vibes, isBaseLocked, index >= 3);
                                }
                            }}>
                            <div className="mb-3">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-bold text-blue-400 text-sm md:text-base group-hover:text-blue-300 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] text-blue-400">{index + 1}</span>{typeof recipe.title === 'string' ? recipe.title : JSON.stringify(recipe.title)}</h4>
                                      {index >= 3 && aiMode !== 'enhancer' && <span className="text-[9px] bg-amber-900/50 text-amber-200 px-1.5 py-0.5 rounded border border-amber-700/50 flex items-center gap-1"><Flame size={10}/> 自由模式</span>}
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-500 mt-1 line-clamp-2">{typeof recipe.reason === 'string' ? recipe.reason : JSON.stringify(recipe.reason)}</p>
                                </div>
                                <div className="space-y-1.5 flex-grow">
                                <div className="flex flex-wrap gap-1">
                                    {(index >= 3 || aiMode === 'enhancer' ? recipe.styles : validateTags(recipe.styles, data.styles)).slice(0, 2).map(t => <span key={typeof t === 'string' ? t : JSON.stringify(t)} className="text-[9px] md:text-[10px] lg:text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{typeof t === 'string' ? t : JSON.stringify(t)}</span>)}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                     {(index >= 3 || aiMode === 'enhancer' ? recipe.instruments : validateTags(recipe.instruments, data.instruments)).slice(0, 2).map(t => <span key={typeof t === 'string' ? t : JSON.stringify(t)} className="text-[9px] md:text-[10px] lg:text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{typeof t === 'string' ? t : JSON.stringify(t)}</span>)}
                                     {(recipe.vocals ? (index >= 3 || aiMode === 'enhancer' ? recipe.vocals : validateTags(recipe.vocals, data.vocals)).slice(0, 2) : []).map(t => <span key={typeof t === 'string' ? t : JSON.stringify(t)} className="text-[9px] md:text-[10px] lg:text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{typeof t === 'string' ? t : JSON.stringify(t)}</span>)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                   <div className={`w-full py-1.5 rounded group-hover:text-white text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center gap-1 ${aiMode === 'enhancer' ? 'bg-amber-900/50 text-amber-300 group-hover:bg-amber-600' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-600'}`}>
                                      {aiMode === 'enhancer' ? <><Copy size={10} /> 📋 复制最终成品 (Copy Result)</> : <><ArrowRight size={10} /> 应用</>}
                                   </div>
                                   {aiMode === 'lyrics' && (
                                     <button 
                                        onClick={(e) => generateFullLyrics(e, recipe, index)}
                                        disabled={isGeneratingLyricsIndex === index}
                                        className={`py-1.5 px-3 rounded text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center gap-1 border whitespace-nowrap min-w-[100px] ${recipe.enhanced_lyrics ? 'bg-indigo-900/50 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}`}
                                        title={recipe.enhanced_lyrics ? "查看已编排的完整歌词" : "算力全开，专注深度编排全曲歌词"}
                                     >
                                        {isGeneratingLyricsIndex === index ? (
                                            <><Loader2 size={12} className="animate-spin" /> 编排中...</>
                                        ) : recipe.enhanced_lyrics ? (
                                            <><ScrollText size={12} /> 查看歌词</>
                                        ) : (
                                            <><PenLine size={12} /> 深度编排全曲</>
                                        )}
                                     </button>
                                   )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      <main 
          className="w-full max-w-[1920px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2 transition-transform origin-top"
          style={{ zoom: zoomLevel }}
      >
        <div className="lg:col-span-7 space-y-6">
          {/* Styles */}
          <section className={`bg-slate-900/50 border rounded-xl p-4 md:p-5 relative overflow-hidden transition-all ${isBaseLocked ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Globe2 size={80} /></div>
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm md:text-base lg:text-lg font-bold text-slate-300 uppercase flex items-center gap-2"><Globe2 size={16} className="text-blue-500"/> Styles (风格)</h2>
                <div className="flex gap-2">
                    {isChinaLocked && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Gem size={10} /> CN Alchemy</span>}
                    {isBaseLocked && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><Lock size={10} /> Locked</span>}
                </div>
             </div>
             <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(data.styles).map(region => (
                    <button key={region} onClick={() => setActiveStyleRegion(region)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm xl:text-base font-bold transition-all relative ${activeStyleRegion === region ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      {region}{checkRegionHasSelection(region) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-1"></span>}
                    </button>
                ))}
             </div>
             <div className="min-h-[80px]">
                 <CompactTagGroup items={data.styles[activeStyleRegion]} selected={selectedStyles} onToggle={(item) => toggleSelection('styles', item)} colorClass="bg-blue-600 hover:bg-blue-500" borderColor="border-blue-500/30" textColor="text-blue-200" locked={isBaseLocked} />
             </div>
          </section>

          {/* Instruments */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 relative overflow-hidden transition-all hover:border-slate-700">
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Music2 size={80} /></div>
             <h2 className="text-sm md:text-base lg:text-lg font-bold text-slate-300 uppercase flex items-center gap-2 mb-4"><Music2 size={16} className="text-emerald-500"/> Instruments (乐器)</h2>
             <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(data.instruments).map(category => (
                    <button key={category} onClick={() => setActiveInstrumentCategory(category)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm xl:text-base font-bold transition-all relative ${activeInstrumentCategory === category ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      {category.split(' ')[0].split('/')[0]} {checkInstrumentCategoryHasSelection(category) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></span>}
                    </button>
                ))}
             </div>
             <div className="min-h-[80px]">
                 <CompactTagGroup items={data.instruments[activeInstrumentCategory]} selected={selectedInstruments} onToggle={(item) => toggleSelection('instruments', item)} colorClass="bg-emerald-600 hover:bg-emerald-500" borderColor="border-emerald-500/30" textColor="text-emerald-200" />
             </div>
          </section>

          {/* Vocals */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 relative overflow-hidden transition-all hover:border-slate-700">
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Mic2 size={80} /></div>
             <h2 className="text-sm md:text-base lg:text-lg font-bold text-slate-300 uppercase flex items-center gap-2 mb-4"><Mic2 size={16} className="text-pink-500"/> Vocals (人声)</h2>
             <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(data.vocals).map(category => (
                    <button key={category} onClick={() => setActiveVocalCategory(category)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm xl:text-base font-bold transition-all relative ${activeVocalCategory === category ? 'bg-pink-500/10 border-pink-500/50 text-pink-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      {category.split(' ')[0]} {checkVocalCategoryHasSelection(category) && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse ml-1"></span>}
                    </button>
                ))}
             </div>
             <div className="min-h-[80px]">
                 <CompactTagGroup items={data.vocals[activeVocalCategory]} selected={selectedVocals} onToggle={(item) => toggleSelection('vocals', item)} colorClass="bg-pink-600 hover:bg-pink-500" borderColor="border-pink-500/30" textColor="text-pink-200" />
             </div>
          </section>

          {/* Production */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 relative overflow-hidden transition-all hover:border-slate-700">
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sliders size={80} /></div>
             <h2 className="text-sm md:text-base lg:text-lg font-bold text-slate-300 uppercase flex items-center gap-2 mb-4"><Sliders size={16} className="text-orange-500"/> Production (制作)</h2>
             <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(data.production).map(category => (
                    <button key={category} onClick={() => setActiveProductionCategory(category)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm xl:text-base font-bold transition-all relative ${activeProductionCategory === category ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      {category.split(' ')[0]} {checkProductionCategoryHasSelection(category) && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse ml-1"></span>}
                    </button>
                ))}
             </div>
             <div className="min-h-[80px]">
                 <CompactTagGroup items={data.production[activeProductionCategory]} selected={selectedProduction} onToggle={(item) => toggleSelection('production', item)} colorClass="bg-orange-600 hover:bg-orange-500" borderColor="border-orange-500/30" textColor="text-orange-200" />
             </div>
          </section>

          {/* Vibes */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5 relative overflow-hidden transition-all hover:border-slate-700">
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Zap size={80} /></div>
             <h2 className="text-sm md:text-base lg:text-lg font-bold text-slate-300 uppercase flex items-center gap-2 mb-4"><Zap size={16} className="text-purple-500"/> Vibe (氛围)</h2>
             <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(data.vibes).map(category => (
                    <button key={category} onClick={() => setActiveVibeCategory(category)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm xl:text-base font-bold transition-all relative ${activeVibeCategory === category ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      {category.split(' ')[0]} {checkVibeCategoryHasSelection(category) && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse ml-1"></span>}
                    </button>
                ))}
             </div>
             <div className="min-h-[80px]">
                 <CompactTagGroup items={data.vibes[activeVibeCategory]} selected={selectedVibes} onToggle={(item) => toggleSelection('vibes', item)} colorClass="bg-purple-600 hover:bg-purple-500" borderColor="border-purple-500/30" textColor="text-purple-200" />
             </div>
          </section>
        </div>

        {/* 右侧：实时预览与输出 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-24 space-y-4">
            
            {/* 1. 当前选中摘要 */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 min-h-[100px]">
                <h4 className="text-[10px] font-semibold text-slate-500 mb-3 uppercase flex justify-between">炼金坩埚 (Selected Ingredients)<span className="text-slate-600 cursor-pointer hover:text-red-400" onClick={clearAll}>清空 (Clear All)</span></h4>
                {getFormattedIngredients().length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {selectedStyles.map(s => <TinyTag key={s} label={s} color="text-blue-400 border-blue-500/30" onRemove={() => toggleSelection('styles', s)}/>)}
                        {selectedInstruments.map(s => <TinyTag key={s} label={s} color="text-emerald-400 border-emerald-500/30" onRemove={() => toggleSelection('instruments', s)}/>)}
                        {selectedVocals.map(s => <TinyTag key={s} label={s} color="text-pink-400 border-pink-500/30" onRemove={() => toggleSelection('vocals', s)}/>)}
                        {selectedProduction.map(s => <TinyTag key={s} label={s} color="text-orange-400 border-orange-500/30" onRemove={() => toggleSelection('production', s)}/>)}
                        {selectedVibes.map(s => <TinyTag key={s} label={s} color="text-purple-400 border-purple-500/30" onRemove={() => toggleSelection('vibes', s)}/>)}
                    </div>
                ) : (<p className="text-xs md:text-sm text-slate-600 italic text-center py-2">请在左侧选择元素，或点击随机融合...</p>)}
            </div>
            
            {/* 2. 炼金控制面板 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
               <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                 <h4 className="text-xs md:text-sm font-bold text-slate-400 uppercase flex items-center gap-2"><FlaskConical size={14} className="text-pink-400"/> 炼金控制台 (Lab Controls)</h4>
                 
                 <button onClick={() => setIsStrategyLinked(!isStrategyLinked)} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all border ${isStrategyLinked ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`} title="开启后，顶部的「随机融合」按钮将执行下方选择的策略逻辑">
                    {isStrategyLinked ? <Power size={14} className="text-green-400"/> : <Power size={14} className="text-slate-500"/>}
                    <span>联动融合 {isStrategyLinked ? 'ON' : 'OFF'}</span>
                 </button>
               </div>
               
               <div className="flex items-center gap-4">
                 <div className="text-xs md:text-sm text-slate-500 w-16">Tempo</div>
                 <div className="flex-1 flex gap-2">
                   <button onClick={() => setTempo("Auto")} className={`px-3 py-1 rounded text-xs md:text-sm border ${tempo === "Auto" ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-900 border-slate-800 text-slate-500"}`}>Auto</button>
                   <input type="range" min="60" max="200" step="5" value={tempo === "Auto" ? 120 : tempo} onChange={(e) => setTempo(e.target.value)} className="flex-1 accent-pink-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mt-1.5"/>
                   <span className="text-xs md:text-sm font-mono w-12 text-right">{tempo === "Auto" ? "Auto" : `${tempo} BPM`}</span>
                 </div>
               </div>

               <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                    <div className="text-xs md:text-sm text-slate-500 flex items-center gap-2">
                        Fusion Strategy (融合策略)
                        {isStrategyLinked && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded">已联动</span>}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {strategies.map(st => (
                      <button key={st.value} onClick={() => setFusionStrategy(st.value)} onMouseEnter={() => setHoveredStrategyDesc(st.desc)} onMouseLeave={() => setHoveredStrategyDesc("")} className={`text-[10px] md:text-xs px-2 py-1.5 rounded border transition-all text-left ${fusionStrategy === st.value ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                        {st.value}
                      </button>
                    ))}
                 </div>
                 <div className="h-8 text-[10px] md:text-xs text-slate-400 bg-black/20 rounded p-2 flex items-center transition-all border border-slate-800/50">
                    <Info size={12} className="mr-2 text-indigo-400/70 shrink-0" />
                    <span className="line-clamp-2">{hoveredStrategyDesc || strategies.find(s => s.value === fusionStrategy)?.desc || "选择一种策略以决定融合的方式..."}</span>
                 </div>
               </div>
            </div>

            {/* 3. 生成与预览 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex justify-between items-center"><h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Sparkles size={14} className="text-yellow-400"/> Final Prompt</h3><span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">SUNO AI Ready</span></div>
              <div className="grid grid-cols-2 gap-px bg-slate-800 border-b border-slate-800">
                  <button onClick={() => handleGenerateClick('template')} className="py-3 px-2 hover:bg-slate-700/50 text-slate-300 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-colors group"><FileText size={14} className="text-blue-400 group-hover:scale-110 transition-transform"/> 🧬 结构化模版</button>
                  <button onClick={() => handleGenerateClick('ai')} disabled={isSynthesizing || getFormattedIngredients().length === 0} className="py-3 px-2 hover:bg-slate-700/50 text-slate-300 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-colors group disabled:opacity-50">{isSynthesizing ? <Loader2 size={14} className="animate-spin"/> : <TestTube2 size={14} className="text-purple-400 group-hover:scale-110 transition-transform"/>} 🧪 AI 智能炼成</button>
              </div>
              <div className="p-4 min-h-[160px] flex flex-col bg-black/20 relative">
                {finalPrompt ? (<pre className="font-mono text-sm md:text-base xl:text-lg text-slate-300 whitespace-pre-wrap leading-relaxed flex-grow animate-in fade-in">{String(finalPrompt)}</pre>) : (<div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 min-h-[120px]"><ArrowRight size={24} className="-rotate-45 opacity-20"/><p className="text-xs md:text-sm text-center px-4">先在左侧选材，再设置 BPM/策略，最后点击上方按钮生成引导词</p></div>)}
              </div>
              <div className="p-3 bg-slate-800/30 border-t border-slate-800 flex justify-end">
                <button onClick={() => copyToClipboard(finalPrompt)} disabled={!finalPrompt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${copySuccess ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-200 text-slate-900 hover:bg-white'}`}>{copySuccess ? <><RefreshCw size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}</button>
              </div>
            </div>

            {/* AI 深度分析卡片 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex justify-between items-center"><h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Microscope size={14} className="text-cyan-400"/> AI Sonic Analysis (深度分析)</h3></div>
              <div className="p-4 bg-slate-950/30">
                {!analysisResult && !isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-600 gap-3"><FileText size={32} className="opacity-20" /><p className="text-xs md:text-sm text-center max-w-[200px]">生成引导词后，点击下方按钮，让 AI 为您解读这份独一无二的音乐配方。</p><button onClick={analyzeMix} disabled={!finalPrompt} className="mt-2 px-4 py-1.5 rounded-full bg-slate-800 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-900/30 text-xs md:text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Sparkles size={12} /> ✨ 深度分析 (Analyze)</button></div>
                ) : (
                  <div className="space-y-3">{isAnalyzing ? (<div className="flex flex-col items-center justify-center py-8 gap-2"><Loader2 size={24} className="animate-spin text-cyan-500" /><span className="text-xs md:text-sm text-slate-500">正在解析声学特征...</span></div>) : (<div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><div className="text-sm md:text-base xl:text-lg text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{String(analysisResult)}</div>{analysisError && (<p className="text-red-400 text-xs mt-2">{String(analysisError)}</p>)}<div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-end"><button onClick={analyzeMix} className="text-[10px] md:text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"><RefreshCw size={10} /> 重新分析</button></div></div>)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;