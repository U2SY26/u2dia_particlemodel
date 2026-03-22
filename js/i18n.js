const LANG = {
    ko: {
        // App title
        appTitle: 'PARTICLE<br/>ARCHITECT',
        // Server
        offline: '오프라인',
        online: '온라인',
        // Buttons
        newSim: '+ 새 시뮬레이션',
        build: '빌드',
        // Top bar
        particles: '파티클',
        fps: 'fps',
        // Status
        ready: '준비',
        generating: '생성 중...',
        building: '구조 생성 중...',
        stable: '안정',
        error: '오류',
        releasing: '해제',
        forming: '형성',
        // Sections
        activeSim: '활성 시뮬레이션',
        physics: '물리',
        foundationMaterial: '기초 & 소재',
        environment: '환경',
        hazard: '재해 시뮬레이션',
        visual: '비주얼',
        aiChat: 'AI 채팅',
        // Physics params
        gravity: '중력',
        damping: '감쇠',
        springK: '스프링 강성',
        timeScale: '시간 배율',
        friction: '마찰',
        bounciness: '탄성',
        particleCount: '파티클 수',
        // Material params
        foundation: '기초 강도',
        density: '밀도',
        elasticity: '탄성률',
        yieldStrength: '항복 강도',
        // Environment params
        windX: '바람 X',
        windY: '바람 Y',
        windZ: '바람 Z',
        turbulence: '난류',
        viscosity: '점성',
        temperature: '온도 (K)',
        // Hazard params
        seismic: '지진',
        seismicFreq: '진동 주파수',
        snowLoad: '적설 하중',
        floodLevel: '침수 수위',
        // Visual params
        colorMode: '색상 모드',
        colorPrimary: '주 색상',
        colorSecondary: '보조 색상',
        brightness: '밝기',
        neonGlow: '네온 글로우',
        glowRadius: '글로우 반경',
        particleSize: '파티클 크기',
        opacity: '불투명도',
        background: '배경색',
        // Color modes
        byRole: '역할별',
        singleColor: '단일 색상',
        randomMix: '랜덤 혼합',
        gradient: '그라데이션',
        byVelocity: '속도별',
        // Chat
        chatPlaceholder: '물리법칙을 자연어로 설명해보세요...',
        chatWelcome: 'AI와 대화하며 물리 파라미터를 조정하세요',
        // Prompt
        promptPlaceholder: '구조를 입력하세요: 타워, 돔, 다리, 피라미드...',
        // Controls
        controlsHint: '회전: 드래그 | 줌: 스크롤 | 이동: 우클릭 드래그',
        // Presets
        presets: {
            '1층 주택': '1층 주택', '2층 건물': '2층 건물', '3층 건물': '3층 건물',
            '5층 아파트': '5층 아파트', '10층 오피스': '10층 오피스', '20층 타워': '20층 타워',
            '강철 고층빌딩': '강철 고층빌딩', '목조 주택': '목조 주택',
            '콘크리트 건물': '콘크리트 건물', '유리 건물': '유리 건물',
            '지진 내진 건물': '지진 내진 건물', '약한 기초 건물': '약한 기초 건물',
            '소형 인도교': '소형 인도교', '중형 다리': '중형 다리', '대형 현수교': '대형 현수교',
            '강풍 다리': '강풍 다리', '강철 트러스교': '강철 트러스교', '목재 다리': '목재 다리',
            '지진 다리 테스트': '지진 다리 테스트', '적설 다리': '적설 다리',
            '홍수 다리': '홍수 다리', '약한 기초 다리': '약한 기초 다리',
            '전망 타워': '전망 타워', '강풍 타워': '강풍 타워', '지진 타워': '지진 타워',
            '고딕 성당': '고딕 성당', '고전 사원': '고전 사원', '미니어처 성': '미니어처 성',
            '거대 피라미드': '거대 피라미드', '경기장': '경기장', '대형 돔': '대형 돔',
            '아치 게이트': '아치 게이트', '성벽': '성벽',
            '무중력 파티클': '무중력 파티클', '강한 중력': '강한 중력', '역중력': '역중력',
            '탄성 구조': '탄성 구조', '점성 유체': '점성 유체', '고온 플라즈마': '고온 플라즈마',
            '극저온 동결': '극저온 동결', '슬로우모션': '슬로우모션', '고속 시뮬': '고속 시뮬',
        },
        // Material & Ground
        materialSelect: '재질 & 지반',
        category: '카테고리',
        material: '재질',
        groundType: '지반 종류',
        foundationDepth: '기초 깊이',
        catArchitecture: '건축 구조',
        catSemiconductor: '반도체 소자',
        catBiomechanics: '생체 역학',
        catMaterials: '소재 과학',
        // Contribute
        contribute: '지식 기여',
        contributeDesc: '전문 지식을 공유하세요! 재질 데이터, 프리셋, 물리 공식 등을 기여할 수 있습니다. 건축, 반도체, 소재, 생명과학 등 모든 분야의 전문가를 환영합니다.',
        contributeName: '이름',
        contributeDomain: '전문 분야',
        contributeType: '기여 유형',
        contributeContent: '내용',
        contributeSubmit: '기여 제출',
        // Language
        langLabel: '한국어',
    },
    en: {
        appTitle: 'PARTICLE<br/>ARCHITECT',
        offline: 'OFFLINE',
        online: 'ONLINE',
        newSim: '+ NEW SIMULATION',
        build: 'BUILD',
        particles: 'particles',
        fps: 'fps',
        ready: 'Ready',
        generating: 'Generating...',
        building: 'Building structure...',
        stable: 'Stable',
        error: 'Error',
        releasing: 'Releasing',
        forming: 'Forming',
        activeSim: 'ACTIVE SIMULATION',
        physics: 'PHYSICS',
        foundationMaterial: 'FOUNDATION & MATERIAL',
        environment: 'ENVIRONMENT',
        hazard: 'HAZARD SIMULATION',
        visual: 'VISUAL',
        aiChat: 'AI CHAT',
        gravity: 'Gravity',
        damping: 'Damping',
        springK: 'Spring K',
        timeScale: 'Time Scale',
        friction: 'Friction',
        bounciness: 'Bounciness',
        particleCount: 'Particles',
        foundation: 'Foundation',
        density: 'Density',
        elasticity: 'Elasticity',
        yieldStrength: 'Yield Str.',
        windX: 'Wind X',
        windY: 'Wind Y',
        windZ: 'Wind Z',
        turbulence: 'Turbulence',
        viscosity: 'Viscosity',
        temperature: 'Temp (K)',
        seismic: 'Seismic',
        seismicFreq: 'Frequency',
        snowLoad: 'Snow Load',
        floodLevel: 'Flood Lv.',
        colorMode: 'Color Mode',
        colorPrimary: 'Primary',
        colorSecondary: 'Secondary',
        brightness: 'Brightness',
        neonGlow: 'Neon Glow',
        glowRadius: 'Glow Radius',
        particleSize: 'Particle Size',
        opacity: 'Opacity',
        background: 'Background',
        byRole: 'By Role',
        singleColor: 'Single Color',
        randomMix: 'Random Mix',
        gradient: 'Gradient',
        byVelocity: 'By Velocity',
        chatPlaceholder: 'Describe physics in natural language...',
        chatWelcome: 'Chat with AI to adjust physics parameters',
        promptPlaceholder: 'Enter structure: tower, dome, bridge, pyramid...',
        controlsHint: 'Orbit: drag | Zoom: scroll | Pan: right-drag',
        presets: {
            '1층 주택': '1F House', '2층 건물': '2F Building', '3층 건물': '3F Building',
            '5층 아파트': '5F Apartment', '10층 오피스': '10F Office', '20층 타워': '20F Tower',
            '강철 고층빌딩': 'Steel Skyscraper', '목조 주택': 'Wooden House',
            '콘크리트 건물': 'Concrete Building', '유리 건물': 'Glass Building',
            '지진 내진 건물': 'Seismic-Resistant', '약한 기초 건물': 'Weak Foundation',
            '소형 인도교': 'Small Footbridge', '중형 다리': 'Medium Bridge', '대형 현수교': 'Suspension Bridge',
            '강풍 다리': 'Windy Bridge', '강철 트러스교': 'Steel Truss Bridge', '목재 다리': 'Wooden Bridge',
            '지진 다리 테스트': 'Seismic Bridge', '적설 다리': 'Snow Bridge',
            '홍수 다리': 'Flood Bridge', '약한 기초 다리': 'Weak Bridge',
            '전망 타워': 'Observation Tower', '강풍 타워': 'Windy Tower', '지진 타워': 'Seismic Tower',
            '고딕 성당': 'Gothic Cathedral', '고전 사원': 'Classical Temple', '미니어처 성': 'Mini Castle',
            '거대 피라미드': 'Great Pyramid', '경기장': 'Stadium', '대형 돔': 'Large Dome',
            '아치 게이트': 'Arch Gate', '성벽': 'Castle Wall',
            '무중력 파티클': 'Zero Gravity', '강한 중력': 'Heavy Gravity', '역중력': 'Anti-Gravity',
            '탄성 구조': 'Elastic Structure', '점성 유체': 'Viscous Fluid', '고온 플라즈마': 'Hot Plasma',
            '극저온 동결': 'Cryo Freeze', '슬로우모션': 'Slow Motion', '고속 시뮬': 'Fast Forward',
        },
        materialSelect: 'MATERIAL & GROUND',
        category: 'Category',
        material: 'Material',
        groundType: 'Ground',
        foundationDepth: 'Foundation Depth',
        catArchitecture: 'Architecture',
        catSemiconductor: 'Semiconductors',
        catBiomechanics: 'Biomechanics',
        catMaterials: 'Materials Science',
        contribute: 'CONTRIBUTE',
        contributeDesc: 'Share your domain expertise! Submit materials, presets, or physics formulas. Experts from architecture, semiconductors, materials science, and biomechanics are welcome.',
        contributeName: 'Your Name',
        contributeDomain: 'Domain',
        contributeType: 'Type',
        contributeContent: 'Content',
        contributeSubmit: 'SUBMIT CONTRIBUTION',
        langLabel: 'English',
    },
};

let currentLang = localStorage.getItem('particleLang') || 'ko';

export function t(key) {
    return LANG[currentLang]?.[key] ?? LANG.ko[key] ?? key;
}

export function tPreset(name) {
    return LANG[currentLang]?.presets?.[name] ?? name;
}

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('particleLang', lang);
}

export function getAvailableLangs() {
    return Object.keys(LANG);
}
