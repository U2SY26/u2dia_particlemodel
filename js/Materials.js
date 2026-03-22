/**
 * Materials.js — Real-world material & ground property database (SI units)
 *
 * Every value uses SI base units:
 *   density       kg/m³
 *   youngsModulus  Pa  (N/m²)
 *   poissonRatio   –  (dimensionless, 0–0.5)
 *   yieldStrength  Pa
 *   thermalExpansion 1/K
 *   thermalConductivity W/(m·K)
 *   specificHeat   J/(kg·K)
 *   meltingPoint   K
 *   hardness       Mohs (1–10) — qualitative, for display
 *
 * Particle-scale conversion:
 *   Given particle spacing `s` (m), each particle represents a cube of side s.
 *   particleMass   = density × s³
 *   springStiffness = youngsModulus × s   (linear spring equivalent)
 *   dampingCoeff   = 2 × sqrt(springStiffness × particleMass) × dampingRatio
 */

// ============================================================
//  STRUCTURAL / ARCHITECTURAL MATERIALS
// ============================================================
export const MATERIALS = {
    // --- Metals ---
    steel_structural: {
        name: { ko: '구조용 강철 (SS400)', en: 'Structural Steel (SS400)' },
        category: 'architecture',
        density: 7850,
        youngsModulus: 200e9,
        poissonRatio: 0.30,
        yieldStrength: 245e6,
        thermalExpansion: 12e-6,
        thermalConductivity: 50,
        specificHeat: 500,
        meltingPoint: 1700,
        hardness: 5,
        dampingRatio: 0.02,
        color: '#8899aa',
    },
    steel_high: {
        name: { ko: '고강도 강철 (SM570)', en: 'High-Strength Steel (SM570)' },
        category: 'architecture',
        density: 7850,
        youngsModulus: 200e9,
        poissonRatio: 0.30,
        yieldStrength: 450e6,
        thermalExpansion: 12e-6,
        thermalConductivity: 50,
        specificHeat: 500,
        meltingPoint: 1700,
        hardness: 6,
        dampingRatio: 0.015,
        color: '#667788',
    },
    aluminum_6061: {
        name: { ko: '알루미늄 6061-T6', en: 'Aluminum 6061-T6' },
        category: 'architecture',
        density: 2700,
        youngsModulus: 69e9,
        poissonRatio: 0.33,
        yieldStrength: 276e6,
        thermalExpansion: 23.6e-6,
        thermalConductivity: 167,
        specificHeat: 896,
        meltingPoint: 855,
        hardness: 3,
        dampingRatio: 0.01,
        color: '#ccccdd',
    },
    titanium: {
        name: { ko: '티타늄 합금 (Ti-6Al-4V)', en: 'Titanium Alloy (Ti-6Al-4V)' },
        category: 'materials',
        density: 4430,
        youngsModulus: 114e9,
        poissonRatio: 0.34,
        yieldStrength: 880e6,
        thermalExpansion: 8.6e-6,
        thermalConductivity: 6.7,
        specificHeat: 526,
        meltingPoint: 1933,
        hardness: 6,
        dampingRatio: 0.01,
        color: '#99aabb',
    },
    copper: {
        name: { ko: '구리', en: 'Copper' },
        category: 'materials',
        density: 8960,
        youngsModulus: 117e9,
        poissonRatio: 0.34,
        yieldStrength: 70e6,
        thermalExpansion: 16.5e-6,
        thermalConductivity: 401,
        specificHeat: 385,
        meltingPoint: 1358,
        hardness: 3,
        dampingRatio: 0.02,
        color: '#cc8844',
    },

    // --- Concrete & Masonry ---
    concrete_normal: {
        name: { ko: '일반 콘크리트 (25MPa)', en: 'Normal Concrete (25MPa)' },
        category: 'architecture',
        density: 2400,
        youngsModulus: 25e9,
        poissonRatio: 0.20,
        yieldStrength: 25e6,
        thermalExpansion: 10e-6,
        thermalConductivity: 1.0,
        specificHeat: 880,
        meltingPoint: 1500,
        hardness: 6,
        dampingRatio: 0.05,
        color: '#999999',
    },
    concrete_high: {
        name: { ko: '고강도 콘크리트 (60MPa)', en: 'High-Strength Concrete (60MPa)' },
        category: 'architecture',
        density: 2500,
        youngsModulus: 38e9,
        poissonRatio: 0.20,
        yieldStrength: 60e6,
        thermalExpansion: 10e-6,
        thermalConductivity: 1.2,
        specificHeat: 880,
        meltingPoint: 1500,
        hardness: 7,
        dampingRatio: 0.04,
        color: '#888888',
    },
    brick: {
        name: { ko: '벽돌', en: 'Brick' },
        category: 'architecture',
        density: 1900,
        youngsModulus: 15e9,
        poissonRatio: 0.15,
        yieldStrength: 10e6,
        thermalExpansion: 6e-6,
        thermalConductivity: 0.7,
        specificHeat: 840,
        meltingPoint: 1800,
        hardness: 6,
        dampingRatio: 0.06,
        color: '#aa5533',
    },

    // --- Wood ---
    wood_pine: {
        name: { ko: '소나무 (연목)', en: 'Pine (Softwood)' },
        category: 'architecture',
        density: 510,
        youngsModulus: 12e9,
        poissonRatio: 0.35,
        yieldStrength: 40e6,
        thermalExpansion: 5e-6,
        thermalConductivity: 0.12,
        specificHeat: 1700,
        meltingPoint: 573, // ignition, not melting
        hardness: 2,
        dampingRatio: 0.08,
        color: '#ccaa66',
    },
    wood_oak: {
        name: { ko: '참나무 (경목)', en: 'Oak (Hardwood)' },
        category: 'architecture',
        density: 750,
        youngsModulus: 14e9,
        poissonRatio: 0.35,
        yieldStrength: 60e6,
        thermalExpansion: 5e-6,
        thermalConductivity: 0.17,
        specificHeat: 1700,
        meltingPoint: 573,
        hardness: 4,
        dampingRatio: 0.06,
        color: '#886644',
    },
    bamboo: {
        name: { ko: '대나무', en: 'Bamboo' },
        category: 'architecture',
        density: 700,
        youngsModulus: 20e9,
        poissonRatio: 0.30,
        yieldStrength: 100e6,
        thermalExpansion: 3e-6,
        thermalConductivity: 0.15,
        specificHeat: 1600,
        meltingPoint: 573,
        hardness: 3,
        dampingRatio: 0.04,
        color: '#aacc55',
    },

    // --- Glass & Ceramics ---
    glass: {
        name: { ko: '건축용 유리', en: 'Architectural Glass' },
        category: 'architecture',
        density: 2500,
        youngsModulus: 70e9,
        poissonRatio: 0.22,
        yieldStrength: 50e6, // tensile
        thermalExpansion: 9e-6,
        thermalConductivity: 1.0,
        specificHeat: 840,
        meltingPoint: 1400,
        hardness: 6,
        dampingRatio: 0.01,
        color: '#aaddee',
    },

    // ============================================================
    //  SEMICONDUCTOR MATERIALS
    // ============================================================
    silicon: {
        name: { ko: '실리콘 (Si)', en: 'Silicon (Si)' },
        category: 'semiconductor',
        density: 2330,
        youngsModulus: 130e9,
        poissonRatio: 0.28,
        yieldStrength: 7000e6, // fracture strength
        thermalExpansion: 2.6e-6,
        thermalConductivity: 150,
        specificHeat: 700,
        meltingPoint: 1687,
        hardness: 7,
        dampingRatio: 0.001,
        color: '#4466aa',
    },
    germanium: {
        name: { ko: '게르마늄 (Ge)', en: 'Germanium (Ge)' },
        category: 'semiconductor',
        density: 5323,
        youngsModulus: 103e9,
        poissonRatio: 0.26,
        yieldStrength: 5500e6,
        thermalExpansion: 5.9e-6,
        thermalConductivity: 60,
        specificHeat: 320,
        meltingPoint: 1211,
        hardness: 6,
        dampingRatio: 0.001,
        color: '#5577bb',
    },
    gallium_arsenide: {
        name: { ko: '갈륨비소 (GaAs)', en: 'Gallium Arsenide (GaAs)' },
        category: 'semiconductor',
        density: 5320,
        youngsModulus: 85.5e9,
        poissonRatio: 0.31,
        yieldStrength: 2000e6,
        thermalExpansion: 5.73e-6,
        thermalConductivity: 55,
        specificHeat: 330,
        meltingPoint: 1511,
        hardness: 5,
        dampingRatio: 0.001,
        color: '#6688cc',
    },
    silicon_carbide: {
        name: { ko: '탄화규소 (SiC)', en: 'Silicon Carbide (SiC)' },
        category: 'semiconductor',
        density: 3210,
        youngsModulus: 410e9,
        poissonRatio: 0.14,
        yieldStrength: 3440e6,
        thermalExpansion: 4e-6,
        thermalConductivity: 490,
        specificHeat: 750,
        meltingPoint: 3100,
        hardness: 9.5,
        dampingRatio: 0.001,
        color: '#334455',
    },
    sio2_oxide: {
        name: { ko: '이산화규소 (SiO₂)', en: 'Silicon Dioxide (SiO₂)' },
        category: 'semiconductor',
        density: 2200,
        youngsModulus: 73e9,
        poissonRatio: 0.17,
        yieldStrength: 1100e6,
        thermalExpansion: 0.5e-6,
        thermalConductivity: 1.4,
        specificHeat: 730,
        meltingPoint: 1986,
        hardness: 7,
        dampingRatio: 0.001,
        color: '#ddeeff',
    },

    // ============================================================
    //  BIOMECHANICS MATERIALS
    // ============================================================
    bone_cortical: {
        name: { ko: '피질골 (경골)', en: 'Cortical Bone' },
        category: 'biomechanics',
        density: 1900,
        youngsModulus: 18e9,
        poissonRatio: 0.30,
        yieldStrength: 130e6,
        thermalExpansion: 20e-6,
        thermalConductivity: 0.32,
        specificHeat: 1300,
        meltingPoint: 1670,
        hardness: 3.5,
        dampingRatio: 0.05,
        color: '#eeddcc',
    },
    bone_cancellous: {
        name: { ko: '해면골 (다공성)', en: 'Cancellous Bone (Spongy)' },
        category: 'biomechanics',
        density: 500,
        youngsModulus: 0.5e9,
        poissonRatio: 0.30,
        yieldStrength: 5e6,
        thermalExpansion: 20e-6,
        thermalConductivity: 0.3,
        specificHeat: 1300,
        meltingPoint: 1670,
        hardness: 2,
        dampingRatio: 0.10,
        color: '#ffeecc',
    },
    cartilage: {
        name: { ko: '연골', en: 'Cartilage' },
        category: 'biomechanics',
        density: 1100,
        youngsModulus: 0.8e6, // very soft
        poissonRatio: 0.45,
        yieldStrength: 3e6,
        thermalExpansion: 100e-6,
        thermalConductivity: 0.5,
        specificHeat: 3400,
        meltingPoint: 373, // denatures
        hardness: 1,
        dampingRatio: 0.30,
        color: '#ccddff',
    },
    muscle: {
        name: { ko: '근육 조직', en: 'Muscle Tissue' },
        category: 'biomechanics',
        density: 1060,
        youngsModulus: 12e3, // very soft
        poissonRatio: 0.49, // nearly incompressible
        yieldStrength: 0.1e6,
        thermalExpansion: 200e-6,
        thermalConductivity: 0.5,
        specificHeat: 3500,
        meltingPoint: 373,
        hardness: 0.5,
        dampingRatio: 0.50,
        color: '#cc4444',
    },
    tendon: {
        name: { ko: '힘줄 (건)', en: 'Tendon' },
        category: 'biomechanics',
        density: 1120,
        youngsModulus: 1.5e9,
        poissonRatio: 0.40,
        yieldStrength: 100e6,
        thermalExpansion: 100e-6,
        thermalConductivity: 0.5,
        specificHeat: 3400,
        meltingPoint: 373,
        hardness: 1.5,
        dampingRatio: 0.10,
        color: '#eebb88',
    },
    dna_fiber: {
        name: { ko: 'DNA 이중나선', en: 'DNA Double Helix' },
        category: 'biomechanics',
        density: 1700,
        youngsModulus: 0.3e9,
        poissonRatio: 0.35,
        yieldStrength: 10e6,
        thermalExpansion: 50e-6,
        thermalConductivity: 0.2,
        specificHeat: 2000,
        meltingPoint: 363, // denatures ~90°C
        hardness: 1,
        dampingRatio: 0.20,
        color: '#44aaff',
    },
    cell_membrane: {
        name: { ko: '세포막', en: 'Cell Membrane' },
        category: 'biomechanics',
        density: 1000,
        youngsModulus: 1e3, // extremely soft
        poissonRatio: 0.499,
        yieldStrength: 1e3,
        thermalExpansion: 500e-6,
        thermalConductivity: 0.2,
        specificHeat: 4000,
        meltingPoint: 373,
        hardness: 0.1,
        dampingRatio: 0.60,
        color: '#88cc88',
    },

    // ============================================================
    //  ADVANCED / COMPOSITE MATERIALS
    // ============================================================
    carbon_fiber: {
        name: { ko: '탄소섬유 (CFRP)', en: 'Carbon Fiber (CFRP)' },
        category: 'materials',
        density: 1600,
        youngsModulus: 230e9,
        poissonRatio: 0.27,
        yieldStrength: 3500e6,
        thermalExpansion: -0.5e-6, // negative!
        thermalConductivity: 7,
        specificHeat: 800,
        meltingPoint: 3800,
        hardness: 7,
        dampingRatio: 0.01,
        color: '#222222',
    },
    graphene: {
        name: { ko: '그래핀', en: 'Graphene' },
        category: 'materials',
        density: 2267,
        youngsModulus: 1000e9, // 1 TPa!
        poissonRatio: 0.19,
        yieldStrength: 130e9,
        thermalExpansion: -8e-6,
        thermalConductivity: 5000,
        specificHeat: 700,
        meltingPoint: 4800,
        hardness: 10,
        dampingRatio: 0.001,
        color: '#333344',
    },
    rubber: {
        name: { ko: '천연 고무', en: 'Natural Rubber' },
        category: 'materials',
        density: 920,
        youngsModulus: 0.01e9,
        poissonRatio: 0.499,
        yieldStrength: 20e6,
        thermalExpansion: 200e-6,
        thermalConductivity: 0.15,
        specificHeat: 2000,
        meltingPoint: 453,
        hardness: 1,
        dampingRatio: 0.30,
        color: '#444444',
    },
    aerogel: {
        name: { ko: '에어로젤', en: 'Aerogel' },
        category: 'materials',
        density: 3, // lightest solid!
        youngsModulus: 1e6,
        poissonRatio: 0.20,
        yieldStrength: 16e3,
        thermalExpansion: 2e-6,
        thermalConductivity: 0.015,
        specificHeat: 1000,
        meltingPoint: 1473,
        hardness: 0.5,
        dampingRatio: 0.10,
        color: '#eeeeff',
    },
    diamond: {
        name: { ko: '다이아몬드', en: 'Diamond' },
        category: 'materials',
        density: 3510,
        youngsModulus: 1220e9,
        poissonRatio: 0.07,
        yieldStrength: 2800e6,
        thermalExpansion: 1e-6,
        thermalConductivity: 2200,
        specificHeat: 520,
        meltingPoint: 4000,
        hardness: 10,
        dampingRatio: 0.001,
        color: '#ffffff',
    },
};

// ============================================================
//  GROUND / SURFACE TYPES
// ============================================================
export const GROUNDS = {
    rock: {
        name: { ko: '암반 (화강암)', en: 'Bedrock (Granite)' },
        bearingCapacity: 10e6,   // Pa — max pressure before failure
        friction: 0.70,
        bounciness: 0.15,
        damping: 0.95,
        settlement: 0.0,        // m per MN/m² load
        color: '#555566',
    },
    asphalt: {
        name: { ko: '아스팔트', en: 'Asphalt' },
        bearingCapacity: 1.5e6,
        friction: 0.65,
        bounciness: 0.10,
        damping: 0.93,
        settlement: 0.002,
        color: '#333333',
    },
    concrete_ground: {
        name: { ko: '콘크리트 기초', en: 'Concrete Foundation' },
        bearingCapacity: 5e6,
        friction: 0.60,
        bounciness: 0.12,
        damping: 0.94,
        settlement: 0.001,
        color: '#777777',
    },
    compacted_soil: {
        name: { ko: '다짐 토양', en: 'Compacted Soil' },
        bearingCapacity: 0.3e6,
        friction: 0.55,
        bounciness: 0.05,
        damping: 0.88,
        settlement: 0.01,
        color: '#886644',
    },
    clay: {
        name: { ko: '점토 (진흙)', en: 'Clay (Mud)' },
        bearingCapacity: 0.1e6,
        friction: 0.30,
        bounciness: 0.02,
        damping: 0.80,
        settlement: 0.05,
        color: '#665533',
    },
    sand: {
        name: { ko: '모래', en: 'Sand' },
        bearingCapacity: 0.15e6,
        friction: 0.45,
        bounciness: 0.03,
        damping: 0.82,
        settlement: 0.03,
        color: '#ccbb88',
    },
    gravel: {
        name: { ko: '자갈', en: 'Gravel' },
        bearingCapacity: 0.5e6,
        friction: 0.60,
        bounciness: 0.08,
        damping: 0.86,
        settlement: 0.008,
        color: '#999977',
    },
    ice: {
        name: { ko: '얼음', en: 'Ice' },
        bearingCapacity: 2e6,
        friction: 0.05,
        bounciness: 0.20,
        damping: 0.97,
        settlement: 0.0,
        color: '#aaddff',
    },
    water: {
        name: { ko: '수면', en: 'Water Surface' },
        bearingCapacity: 0,
        friction: 0.01,
        bounciness: 0.30,
        damping: 0.70,
        settlement: 1.0, // sinks
        color: '#224488',
    },
};

// ============================================================
//  CATEGORIES
// ============================================================
export const CATEGORIES = {
    architecture: {
        name: { ko: '건축 구조', en: 'Architecture' },
        icon: '🏛',
        description: {
            ko: '건물, 교량, 탑 등 건축 구조물 시뮬레이션',
            en: 'Buildings, bridges, towers and architectural structures',
        },
        params: ['gravity', 'damping', 'springK', 'timeScale', 'friction', 'bounciness',
                 'foundation', 'density', 'elasticity', 'yieldStrength',
                 'windX', 'windY', 'windZ', 'turbulence',
                 'seismic', 'seismicFreq', 'snowLoad', 'floodLevel'],
    },
    semiconductor: {
        name: { ko: '반도체 소자', en: 'Semiconductors' },
        icon: '💎',
        description: {
            ko: '실리콘 웨이퍼, 결정 격자, 박막 구조 시뮬레이션',
            en: 'Silicon wafers, crystal lattices, thin-film structures',
        },
        params: ['gravity', 'damping', 'springK', 'timeScale',
                 'density', 'elasticity', 'yieldStrength',
                 'temperature', 'thermalExpansion', 'latticeConstant'],
    },
    biomechanics: {
        name: { ko: '생체 역학', en: 'Biomechanics' },
        icon: '🧬',
        description: {
            ko: '뼈, 연골, 근육, DNA 등 생체 구조 시뮬레이션',
            en: 'Bone, cartilage, muscle, DNA — biological structures',
        },
        params: ['gravity', 'damping', 'springK', 'timeScale', 'friction',
                 'density', 'elasticity', 'yieldStrength',
                 'viscosity', 'temperature', 'osmotic'],
    },
    materials: {
        name: { ko: '소재 과학', en: 'Materials Science' },
        icon: '🔬',
        description: {
            ko: '복합재, 나노소재, 금속 합금 등 소재 특성 연구',
            en: 'Composites, nanomaterials, metal alloys — material properties',
        },
        params: ['gravity', 'damping', 'springK', 'timeScale',
                 'density', 'elasticity', 'yieldStrength',
                 'temperature', 'thermalExpansion',
                 'viscosity', 'friction'],
    },
};

// ============================================================
//  HELPER: Convert material properties → particle physics params
// ============================================================
export function materialToPhysics(materialKey, spacing = 0.06) {
    const mat = MATERIALS[materialKey];
    if (!mat) return null;

    const s = spacing;
    const s3 = s * s * s;
    const particleMass = mat.density * s3;
    const springK = mat.youngsModulus * s;
    // Critical damping: c_crit = 2 * sqrt(k * m)
    const criticalDamping = 2 * Math.sqrt(springK * particleMass);
    const dampingCoeff = criticalDamping * mat.dampingRatio;
    // Convert to Verlet damping factor (0–1 range)
    // damping ≈ 1 - (dampingCoeff * dt / mass), clamped
    const verletDamping = Math.max(0.80, Math.min(0.999, 1.0 - mat.dampingRatio * 2));

    return {
        materialKey,
        particleMass,
        springStiffness: Math.min(springK, 1e6), // cap for stability
        damping: verletDamping,
        yieldStrength: mat.yieldStrength,
        density: mat.density,
        thermalExpansion: mat.thermalExpansion,
        thermalConductivity: mat.thermalConductivity,
        meltingPoint: mat.meltingPoint,
        poissonRatio: mat.poissonRatio,
        color: mat.color,
    };
}

export function groundToPhysics(groundKey) {
    const g = GROUNDS[groundKey];
    if (!g) return null;
    return {
        groundKey,
        friction: g.friction,
        bounciness: g.bounciness,
        damping: g.damping,
        bearingCapacity: g.bearingCapacity,
        settlement: g.settlement,
        color: g.color,
    };
}
