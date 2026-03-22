/**
 * ArchitectureGenerator
 * Converts text prompts into particle target positions forming architectural structures.
 * Uses procedural template-based generation with parameterization.
 */

export class ArchitectureGenerator {
    constructor() {
        this.spacing = 0.10; // particle spacing in meters
    }

    /**
     * Main entry: parse prompt and generate structure
     * Returns { targets, assignments, connections, loads, roles, metadata }
     */
    _generateTemplate(params) {
        switch (params.type) {
            case 'house': return this._templateHouse(params);
            case 'tower': return this._templateTower(params);
            case 'bridge': return this._templateBridge(params);
            case 'cathedral': return this._templateCathedral(params);
            case 'pyramid': return this._templatePyramid(params);
            case 'skyscraper': return this._templateSkyscraper(params);
            case 'dome': return this._templateDome(params);
            case 'arch': return this._templateArch(params);
            case 'temple': return this._templateTemple(params);
            case 'castle': return this._templateCastle(params);
            case 'wall': return this._templateWall(params);
            case 'stadium': return this._templateStadium(params);
            case 'cube': return this._templateCube(params);
            case 'sphere': return this._templateSphere(params);
            default: return this._templateHouse(params);
        }
    }

    generate(promptText, totalParticles) {
        const prompt = promptText.toLowerCase().trim();
        const params = this._parsePrompt(prompt);
        const baseSpacing = 0.10;

        // Auto-fit: iteratively scale up + reduce spacing until all particles are used.
        // Prefers bigger structures over denser packing for visual clarity.
        const minSpacing = 0.04;

        this.spacing = baseSpacing;
        let count = this._generateTemplate(params).positions.length / 3;

        // Iterate: scale up, then binary-search spacing
        for (let round = 0; round < 4 && count < totalParticles * 0.95; round++) {
            const deficit = totalParticles / Math.max(count, 1);
            params.scale *= Math.pow(deficit, 0.4); // grow structure

            // Binary-search spacing within this scale
            let lo = minSpacing, hi = Math.max(this.spacing, baseSpacing);
            for (let iter = 0; iter < 8; iter++) {
                const mid = (lo + hi) / 2;
                this.spacing = mid;
                const c = this._generateTemplate(params).positions.length / 3;
                if (c < totalParticles) {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            this.spacing = (lo + hi) / 2;
            count = this._generateTemplate(params).positions.length / 3;
        }

        let structure = this._generateTemplate(params);
        let structCount = structure.positions.length / 3;

        // Trim if overshot
        if (structCount > totalParticles) {
            structure.positions = new Float32Array(structure.positions.buffer, 0, totalParticles * 3);
            structure.roles = new Uint8Array(structure.roles.buffer, 0, totalParticles);
            structure.loads = new Float32Array(structure.loads.buffer, 0, totalParticles);
            structure.connections = structure.connections.filter(c => c.i < totalParticles && c.j < totalParticles);
            structCount = totalParticles;
        }

        const assignments = new Uint32Array(structCount);
        for (let i = 0; i < structCount; i++) {
            assignments[i] = i;
        }

        const allRoles = new Uint8Array(totalParticles);
        const allLoads = new Float32Array(totalParticles);
        allRoles.set(structure.roles.subarray(0, Math.min(structCount, totalParticles)));
        allLoads.set(structure.loads.subarray(0, Math.min(structCount, totalParticles)));

        this._calculateLoads(allLoads, structure.connections, allRoles, structCount);

        // Reset for next call
        this.spacing = baseSpacing;

        return {
            targets: structure.positions,
            assignments,
            connections: structure.connections,
            loads: allLoads,
            roles: allRoles,
            metadata: {
                type: params.type,
                particleCount: totalParticles,
                structuralParticles: structCount,
                ambientParticles: totalParticles - structCount,
                description: params.description,
            }
        };
    }

    _parsePrompt(prompt) {
        const params = {
            type: 'house',
            scale: 1.0,
            heightMul: 1.0,
            widthMul: 1.0,
            style: 'modern',
            floors: 5,
            count: 1,
            description: prompt,
        };

        // Structure type keywords
        const types = {
            'house': 'house', 'home': 'house', 'cabin': 'house', '집': 'house', '주택': 'house',
            'tower': 'tower', 'turret': 'tower', '탑': 'tower', '타워': 'tower',
            'bridge': 'bridge', '다리': 'bridge', '교량': 'bridge',
            'cathedral': 'cathedral', 'church': 'cathedral', '성당': 'cathedral', '교회': 'cathedral',
            'pyramid': 'pyramid', '피라미드': 'pyramid',
            'skyscraper': 'skyscraper', 'highrise': 'skyscraper', '빌딩': 'skyscraper', '고층': 'skyscraper', '마천루': 'skyscraper',
            'dome': 'dome', '돔': 'dome',
            'arch': 'arch', '아치': 'arch',
            'temple': 'temple', '신전': 'temple', '사원': 'temple',
            'castle': 'castle', 'fortress': 'castle', '성': 'castle', '성곽': 'castle',
            'wall': 'wall', '벽': 'wall',
            'stadium': 'stadium', '경기장': 'stadium', '스타디움': 'stadium',
            'cube': 'cube', '큐브': 'cube', '정육면체': 'cube',
            'sphere': 'sphere', '구': 'sphere', '구체': 'sphere',
            'building': 'skyscraper', '건물': 'skyscraper',
        };

        // Size modifiers
        const sizeModifiers = {
            'small': 0.5, 'tiny': 0.4, 'little': 0.5,
            'large': 2.0, 'big': 2.0, 'huge': 3.0, 'giant': 3.0, 'massive': 3.5,
            '작은': 0.5, '큰': 2.0, '거대한': 3.0,
        };

        // Style modifiers
        const styleModifiers = {
            'gothic': 'gothic', '고딕': 'gothic',
            'modern': 'modern', '모던': 'modern', '현대': 'modern',
            'classical': 'classical', '고전': 'classical',
        };

        // Height/width modifiers
        const heightMods = { 'tall': 2.0, 'short': 0.5, '높은': 2.0, '낮은': 0.5 };
        const widthMods = { 'wide': 2.0, 'narrow': 0.5, '넓은': 2.0, '좁은': 0.5 };

        // Parse
        const words = prompt.split(/\s+/);
        for (const word of words) {
            if (types[word]) params.type = types[word];
            if (sizeModifiers[word]) params.scale = sizeModifiers[word];
            if (styleModifiers[word]) params.style = styleModifiers[word];
            if (heightMods[word]) params.heightMul = heightMods[word];
            if (widthMods[word]) params.widthMul = widthMods[word];
        }

        // Extract floor count
        const floorMatch = prompt.match(/(\d+)\s*(층|floor|story|stories)/);
        if (floorMatch) params.floors = parseInt(floorMatch[1]);

        // Extract numeric count
        const countMatch = prompt.match(/(\d+)\s*(tower|arch|column|span|개|탑)/);
        if (countMatch) params.count = parseInt(countMatch[1]);

        return params;
    }

    // ==================== PRIMITIVE GENERATORS ====================

    _addParticlesAlongLine(arr, roles, roleType, x1, y1, z1, x2, y2, z2, spacing) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const count = Math.max(2, Math.floor(length / spacing));
        const startIdx = arr.length / 3;

        for (let i = 0; i <= count; i++) {
            const t = i / count;
            arr.push(x1 + dx * t, y1 + dy * t, z1 + dz * t);
            roles.push(roleType);
        }

        // Create chain connections
        const connections = [];
        for (let i = 0; i < count; i++) {
            connections.push({
                i: startIdx + i,
                j: startIdx + i + 1,
                restLength: length / count,
                stiffness: roleType === 2 ? 80 : (roleType === 3 ? 50 : 30),
                damping: 5.0,
            });
        }

        return { startIdx, endIdx: startIdx + count, connections };
    }

    _addParticlesAlongArc(arr, roles, roleType, cx, cy, cz, rx, ry, startAngle, endAngle, axis, spacing) {
        const arcLength = Math.abs(endAngle - startAngle) * Math.max(rx, ry);
        const count = Math.max(4, Math.floor(arcLength / spacing));
        const startIdx = arr.length / 3;

        for (let i = 0; i <= count; i++) {
            const t = startAngle + (endAngle - startAngle) * (i / count);
            let x, y, z;

            if (axis === 'y') {
                x = cx + Math.cos(t) * rx;
                y = cy + Math.sin(t) * ry;
                z = cz;
            } else if (axis === 'x') {
                x = cx;
                y = cy + Math.sin(t) * ry;
                z = cz + Math.cos(t) * rx;
            } else {
                x = cx + Math.cos(t) * rx;
                y = cy;
                z = cz + Math.sin(t) * ry;
            }

            arr.push(x, y, z);
            roles.push(roleType);
        }

        const connections = [];
        for (let i = 0; i < count; i++) {
            const segLen = arcLength / count;
            connections.push({
                i: startIdx + i,
                j: startIdx + i + 1,
                restLength: segLen,
                stiffness: 40,
                damping: 5.0,
            });
        }

        return { startIdx, endIdx: startIdx + count, connections };
    }

    _connectPoints(connections, idx1, idx2, restLength) {
        connections.push({
            i: idx1,
            j: idx2,
            restLength: restLength || 0.15,
            stiffness: 40,
            damping: 5.0,
        });
    }

    // ==================== TEMPLATES ====================

    _templateHouse(params) {
        const s = params.scale;
        const w = 3 * s * params.widthMul;
        const h = 3 * s * params.heightMul;
        const d = 4 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 corner columns
        const cols = [
            this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, w/2, 0, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, w/2, 0, d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, d/2, -w/2, h, d/2, sp),
        ];
        cols.forEach(c => connections.push(...c.connections));

        // Top beams (connecting column tops)
        const topBeams = [
            this._addParticlesAlongLine(positions, roles, 3, -w/2, h, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, w/2, h, -d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, w/2, h, d/2, -w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, -w/2, h, d/2, -w/2, h, -d/2, sp),
        ];
        topBeams.forEach(b => connections.push(...b.connections));

        // Base beams (foundation)
        const baseBeams = [
            this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, -d/2, w/2, 0, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, w/2, 0, -d/2, w/2, 0, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, w/2, 0, d/2, -w/2, 0, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, d/2, -w/2, 0, -d/2, sp),
        ];
        baseBeams.forEach(b => connections.push(...b.connections));

        // Roof ridge
        const ridgeH = h + 1.5 * s;
        const ridge = this._addParticlesAlongLine(positions, roles, 3, 0, ridgeH, -d/2, 0, ridgeH, d/2, sp);
        connections.push(...ridge.connections);

        // Roof rafters (4 lines from ridge ends to column tops)
        const rafters = [
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, d/2, -w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, d/2, w/2, h, d/2, sp),
        ];
        rafters.forEach(r => connections.push(...r.connections));

        // Mid-height horizontal beams (stiffening)
        const midH = h * 0.5;
        const midBeams = [
            this._addParticlesAlongLine(positions, roles, 4, -w/2, midH, -d/2, w/2, midH, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, midH, -d/2, w/2, midH, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, midH, d/2, -w/2, midH, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, -w/2, midH, d/2, -w/2, midH, -d/2, sp),
        ];
        midBeams.forEach(b => connections.push(...b.connections));

        // Cross-bracing on front and back
        const braces = [
            this._addParticlesAlongLine(positions, roles, 4, -w/2, 0, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, 0, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, -w/2, 0, d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, 0, d/2, -w/2, h, d/2, sp),
        ];
        braces.forEach(b => connections.push(...b.connections));

        // Wall surface fill
        const wallSp = sp * 2.5;
        const wallFaces = [
            { x0: -w/2, z0: -d/2, x1: w/2, z1: -d/2 },
            { x0: w/2, z0: -d/2, x1: w/2, z1: d/2 },
            { x0: w/2, z0: d/2, x1: -w/2, z1: d/2 },
            { x0: -w/2, z0: d/2, x1: -w/2, z1: -d/2 },
        ];
        for (const face of wallFaces) {
            const fdx = face.x1 - face.x0;
            const fdz = face.z1 - face.z0;
            const wallLen = Math.sqrt(fdx * fdx + fdz * fdz);
            const uSteps = Math.max(1, Math.floor(wallLen / wallSp));
            const vSteps = Math.max(1, Math.floor(h / wallSp));
            for (let u = 1; u < uSteps; u++) {
                for (let v = 1; v < vSteps; v++) {
                    positions.push(
                        face.x0 + fdx * (u / uSteps),
                        h * (v / vSteps),
                        face.z0 + fdz * (u / uSteps)
                    );
                    roles.push(3);
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateTower(params) {
        const s = params.scale;
        const floors = params.floors || 6;
        const baseW = 2 * s * params.widthMul;
        const floorH = 1.2 * s * params.heightMul;
        const taper = 0.92; // each floor slightly narrower
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        for (let f = 0; f < floors; f++) {
            const w = baseW * Math.pow(taper, f);
            const y0 = f * floorH;
            const y1 = (f + 1) * floorH;

            // 4 columns for this floor
            const corners = [
                [-w/2, -w/2], [w/2, -w/2], [w/2, w/2], [-w/2, w/2]
            ];

            const colSegments = [];
            for (const [cx, cz] of corners) {
                const col = this._addParticlesAlongLine(positions, roles, 2, cx, y0, cz, cx, y1, cz, sp);
                connections.push(...col.connections);
                colSegments.push(col);
            }

            // Horizontal beams at top of floor
            for (let i = 0; i < 4; i++) {
                const [x1, z1] = corners[i];
                const [x2, z2] = corners[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, y1, z1, x2, y1, z2, sp);
                connections.push(...beam.connections);
            }

            // Cross-bracing on two faces
            if (f % 2 === 0) {
                const brace1 = this._addParticlesAlongLine(positions, roles, 4,
                    corners[0][0], y0, corners[0][1], corners[2][0], y1, corners[2][1], sp);
                connections.push(...brace1.connections);
            } else {
                const brace1 = this._addParticlesAlongLine(positions, roles, 4,
                    corners[1][0], y0, corners[1][1], corners[3][0], y1, corners[3][1], sp);
                connections.push(...brace1.connections);
            }
        }

        // Spire
        const topY = floors * floorH;
        const spireH = 2 * s;
        const spire = this._addParticlesAlongLine(positions, roles, 2, 0, topY, 0, 0, topY + spireH, 0, sp);
        connections.push(...spire.connections);

        // Spire supports
        const topW = baseW * Math.pow(taper, floors - 1);
        const spireCorners = [
            [-topW/2, -topW/2], [topW/2, -topW/2], [topW/2, topW/2], [-topW/2, topW/2]
        ];
        for (const [cx, cz] of spireCorners) {
            const support = this._addParticlesAlongLine(positions, roles, 4, cx, topY, cz, 0, topY + spireH, 0, sp);
            connections.push(...support.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateBridge(params) {
        const s = params.scale;
        const span = 12 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const deckW = 2 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Deck beams (two parallel)
        const deck1 = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3, -deckW/2, span/2, h*0.3, -deckW/2, sp);
        const deck2 = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3, deckW/2, span/2, h*0.3, deckW/2, sp);
        connections.push(...deck1.connections, ...deck2.connections);

        // Cross beams on deck
        const deckLen = span;
        const crossCount = Math.floor(deckLen / (sp * 8));
        for (let i = 0; i <= crossCount; i++) {
            const x = -span/2 + (span * i / crossCount);
            const cross = this._addParticlesAlongLine(positions, roles, 3, x, h*0.3, -deckW/2, x, h*0.3, deckW/2, sp);
            connections.push(...cross.connections);
        }

        // Warren truss on each side
        const trussCount = 12;
        for (const zSide of [-deckW/2, deckW/2]) {
            for (let i = 0; i < trussCount; i++) {
                const x0 = -span/2 + (span * i / trussCount);
                const x1 = -span/2 + (span * (i + 1) / trussCount);
                const xMid = (x0 + x1) / 2;

                // Vertical
                const vert = this._addParticlesAlongLine(positions, roles, 2, x0, h*0.3, zSide, x0, h*0.3 + h*0.5, zSide, sp);
                connections.push(...vert.connections);

                // Diagonal up
                const diagUp = this._addParticlesAlongLine(positions, roles, 4, x0, h*0.3, zSide, xMid, h*0.3 + h*0.5, zSide, sp);
                connections.push(...diagUp.connections);

                // Diagonal down
                const diagDown = this._addParticlesAlongLine(positions, roles, 4, xMid, h*0.3 + h*0.5, zSide, x1, h*0.3, zSide, sp);
                connections.push(...diagDown.connections);
            }

            // Top chord
            const topChord = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3 + h*0.5, zSide, span/2, h*0.3 + h*0.5, zSide, sp);
            connections.push(...topChord.connections);
        }

        // Support columns at ends
        for (const xEnd of [-span/2, span/2]) {
            for (const zSide of [-deckW/2, deckW/2]) {
                const col = this._addParticlesAlongLine(positions, roles, 1, xEnd, 0, zSide, xEnd, h*0.3, zSide, sp);
                connections.push(...col.connections);
            }
        }

        // Middle support
        for (const zSide of [-deckW/2, deckW/2]) {
            const col = this._addParticlesAlongLine(positions, roles, 1, 0, 0, zSide, 0, h*0.3, zSide, sp);
            connections.push(...col.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCathedral(params) {
        const s = params.scale;
        const naveL = 10 * s;
        const naveW = 4 * s * params.widthMul;
        const naveH = 6 * s * params.heightMul;
        const aisleW = 2 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];
        const isGothic = params.style === 'gothic';
        const columnCount = 8;

        // Nave columns (two rows)
        for (let i = 0; i < columnCount; i++) {
            const z = -naveL/2 + (naveL * i / (columnCount - 1));

            // Left column
            const leftCol = this._addParticlesAlongLine(positions, roles, 2, -naveW/2, 0, z, -naveW/2, naveH, z, sp);
            connections.push(...leftCol.connections);

            // Right column
            const rightCol = this._addParticlesAlongLine(positions, roles, 2, naveW/2, 0, z, naveW/2, naveH, z, sp);
            connections.push(...rightCol.connections);

            // Pointed arch between columns (gothic) or round arch
            if (isGothic) {
                // Pointed arch: two arcs meeting at a point
                const peakH = naveH + 1.5 * s;
                const archL = this._addParticlesAlongLine(positions, roles, 5, -naveW/2, naveH, z, 0, peakH, z, sp);
                const archR = this._addParticlesAlongLine(positions, roles, 5, naveW/2, naveH, z, 0, peakH, z, sp);
                connections.push(...archL.connections, ...archR.connections);
            } else {
                // Round arch
                const arch = this._addParticlesAlongArc(positions, roles, 5,
                    0, naveH, z, naveW/2, 1.5 * s, Math.PI, 0, 'y', sp);
                connections.push(...arch.connections);
            }

            // Outer aisle columns
            const leftOuter = this._addParticlesAlongLine(positions, roles, 2,
                -naveW/2 - aisleW, 0, z, -naveW/2 - aisleW, naveH * 0.6, z, sp);
            const rightOuter = this._addParticlesAlongLine(positions, roles, 2,
                naveW/2 + aisleW, 0, z, naveW/2 + aisleW, naveH * 0.6, z, sp);
            connections.push(...leftOuter.connections, ...rightOuter.connections);

            // Flying buttresses
            const flyL = this._addParticlesAlongLine(positions, roles, 4,
                -naveW/2 - aisleW, naveH * 0.55, z, -naveW/2, naveH * 0.8, z, sp);
            const flyR = this._addParticlesAlongLine(positions, roles, 4,
                naveW/2 + aisleW, naveH * 0.55, z, naveW/2, naveH * 0.8, z, sp);
            connections.push(...flyL.connections, ...flyR.connections);
        }

        // Ridge beam
        const ridgeH = isGothic ? naveH + 1.5 * s : naveH + 1.5 * s;
        const ridge = this._addParticlesAlongLine(positions, roles, 3,
            0, ridgeH, -naveL/2, 0, ridgeH, naveL/2, sp);
        connections.push(...ridge.connections);

        // Apse (semicircle at one end)
        const apseR = naveW / 2;
        const apseCols = 6;
        for (let i = 0; i <= apseCols; i++) {
            const angle = -Math.PI/2 + Math.PI * (i / apseCols);
            const ax = Math.cos(angle) * apseR;
            const az = naveL/2 + Math.sin(angle) * apseR;
            const apseCol = this._addParticlesAlongLine(positions, roles, 2, ax, 0, az, ax, naveH * 0.8, az, sp);
            connections.push(...apseCol.connections);
        }

        // Front facade - rose window (circle of particles)
        const roseR = 1.2 * s;
        const roseCY = naveH * 0.6;
        const roseCZ = -naveL/2;
        const rosePoints = 24;
        const roseStartIdx = positions.length / 3;
        for (let i = 0; i < rosePoints; i++) {
            const angle = (2 * Math.PI * i) / rosePoints;
            positions.push(Math.cos(angle) * roseR, roseCY + Math.sin(angle) * roseR, roseCZ);
            roles.push(5);
        }
        // Connect rose window ring
        for (let i = 0; i < rosePoints; i++) {
            connections.push({
                i: roseStartIdx + i,
                j: roseStartIdx + ((i + 1) % rosePoints),
                restLength: 2 * Math.PI * roseR / rosePoints,
                stiffness: 30,
                damping: 5,
            });
        }

        // Spire
        const spire = this._addParticlesAlongLine(positions, roles, 2, 0, ridgeH, -naveL/2, 0, ridgeH + 4*s, -naveL/2, sp);
        connections.push(...spire.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templatePyramid(params) {
        const s = params.scale;
        const base = 6 * s * params.widthMul;
        const h = 5 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 edge lines from base corners to apex
        const corners = [
            [-base/2, 0, -base/2],
            [base/2, 0, -base/2],
            [base/2, 0, base/2],
            [-base/2, 0, base/2],
        ];

        for (const [cx, cy, cz] of corners) {
            const edge = this._addParticlesAlongLine(positions, roles, 2, cx, cy, cz, 0, h, 0, sp);
            connections.push(...edge.connections);
        }

        // Base edges
        for (let i = 0; i < 4; i++) {
            const [x1, y1, z1] = corners[i];
            const [x2, y2, z2] = corners[(i + 1) % 4];
            const baseEdge = this._addParticlesAlongLine(positions, roles, 1, x1, y1, z1, x2, y2, z2, sp);
            connections.push(...baseEdge.connections);
        }

        // Horizontal rings at regular heights
        const ringCount = 6;
        for (let r = 1; r < ringCount; r++) {
            const t = r / ringCount;
            const ringH = h * t;
            const ringW = base * (1 - t);

            const ringCorners = [
                [-ringW/2, ringH, -ringW/2],
                [ringW/2, ringH, -ringW/2],
                [ringW/2, ringH, ringW/2],
                [-ringW/2, ringH, ringW/2],
            ];

            for (let i = 0; i < 4; i++) {
                const [x1, y1, z1] = ringCorners[i];
                const [x2, y2, z2] = ringCorners[(i + 1) % 4];
                const ring = this._addParticlesAlongLine(positions, roles, 3, x1, y1, z1, x2, y2, z2, sp);
                connections.push(...ring.connections);
            }
        }

        // Cross-bracing on each face
        for (let i = 0; i < 4; i++) {
            const [x1, , z1] = corners[i];
            const [x2, , z2] = corners[(i + 1) % 4];
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;
            const brace = this._addParticlesAlongLine(positions, roles, 4, midX, 0, midZ, 0, h, 0, sp);
            connections.push(...brace.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateSkyscraper(params) {
        const s = params.scale;
        const floors = params.floors || 10;
        const baseW = 3 * s * params.widthMul;
        const baseD = 3 * s;
        const floorH = 1.0 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Core columns (4 inner)
        const coreW = baseW * 0.3;
        const coreCorners = [
            [-coreW/2, -coreW/2], [coreW/2, -coreW/2],
            [coreW/2, coreW/2], [-coreW/2, coreW/2]
        ];

        for (const [cx, cz] of coreCorners) {
            const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, floors * floorH, cz, sp);
            connections.push(...col.connections);
        }

        // Perimeter columns
        const periCount = 4; // columns per side
        for (let side = 0; side < 4; side++) {
            for (let p = 0; p < periCount; p++) {
                let x, z;
                const t = (p + 0.5) / periCount;

                switch (side) {
                    case 0: x = -baseW/2 + baseW * t; z = -baseD/2; break;
                    case 1: x = baseW/2; z = -baseD/2 + baseD * t; break;
                    case 2: x = baseW/2 - baseW * t; z = baseD/2; break;
                    case 3: x = -baseW/2; z = baseD/2 - baseD * t; break;
                }

                const col = this._addParticlesAlongLine(positions, roles, 2, x, 0, z, x, floors * floorH, z, sp);
                connections.push(...col.connections);
            }
        }

        // Floor beams and bracing every 2 floors
        for (let f = 0; f <= floors; f++) {
            const y = f * floorH;

            // Perimeter beams
            const fCorners = [
                [-baseW/2, -baseD/2], [baseW/2, -baseD/2],
                [baseW/2, baseD/2], [-baseW/2, baseD/2]
            ];

            for (let i = 0; i < 4; i++) {
                const [x1, z1] = fCorners[i];
                const [x2, z2] = fCorners[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, y, z1, x2, y, z2, sp);
                connections.push(...beam.connections);
            }

            // Core to perimeter beams (every other floor)
            if (f % 2 === 0 && f > 0) {
                for (const [cx, cz] of coreCorners) {
                    // Connect to nearest perimeter corner
                    const px = cx > 0 ? baseW/2 : -baseW/2;
                    const pz = cz > 0 ? baseD/2 : -baseD/2;
                    const beam = this._addParticlesAlongLine(positions, roles, 3, cx, y, cz, px, y, pz, sp);
                    connections.push(...beam.connections);
                }
            }

            // Cross-bracing (every 3rd floor)
            if (f > 0 && f % 3 === 0) {
                const prevY = (f - 3) * floorH;
                const brace = this._addParticlesAlongLine(positions, roles, 4,
                    -baseW/2, prevY, -baseD/2, baseW/2, y, -baseD/2, sp);
                connections.push(...brace.connections);
                const brace2 = this._addParticlesAlongLine(positions, roles, 4,
                    baseW/2, prevY, -baseD/2, -baseW/2, y, -baseD/2, sp);
                connections.push(...brace2.connections);
            }
        }

        // Wall surface fill - add particles on each wall face per floor
        const wallSp = sp * 2.5; // coarser grid for wall fill
        for (let f = 0; f < floors; f++) {
            const y0 = f * floorH;
            const y1 = (f + 1) * floorH;

            // 4 wall faces
            const wallFaces = [
                { x0: -baseW/2, z0: -baseD/2, x1: baseW/2, z1: -baseD/2 }, // front
                { x0: baseW/2, z0: -baseD/2, x1: baseW/2, z1: baseD/2 },   // right
                { x0: baseW/2, z0: baseD/2, x1: -baseW/2, z1: baseD/2 },   // back
                { x0: -baseW/2, z0: baseD/2, x1: -baseW/2, z1: -baseD/2 }, // left
            ];

            for (const face of wallFaces) {
                const dx = face.x1 - face.x0;
                const dz = face.z1 - face.z0;
                const wallLen = Math.sqrt(dx * dx + dz * dz);
                const uSteps = Math.max(1, Math.floor(wallLen / wallSp));
                const vSteps = Math.max(1, Math.floor(floorH / wallSp));

                for (let u = 1; u < uSteps; u++) {
                    for (let v = 1; v < vSteps; v++) {
                        const t = u / uSteps;
                        const s2 = v / vSteps;
                        positions.push(
                            face.x0 + dx * t,
                            y0 + floorH * s2,
                            face.z0 + dz * t
                        );
                        roles.push(3); // beam role for wall particles
                    }
                }
            }
        }

        // Top deck beams
        const topY = floors * floorH;
        const deckCorners = [
            [-baseW/2, -baseD/2], [baseW/2, -baseD/2],
            [baseW/2, baseD/2], [-baseW/2, baseD/2]
        ];
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = deckCorners[i];
            const [x2, z2] = deckCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, topY, z1, x2, topY, z2, sp);
            connections.push(...beam.connections);
        }

        // Spire only for tall buildings (6+ floors)
        if (floors >= 6) {
            const spire = this._addParticlesAlongLine(positions, roles, 2, 0, topY, 0, 0, topY + 3*s, 0, sp);
            connections.push(...spire.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateDome(params) {
        const s = params.scale;
        const r = 4 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Dynamic counts based on spacing — denser spacing = more elements
        const basePoints = Math.max(12, Math.round(2 * Math.PI * r / sp));
        const ribCount = Math.max(4, Math.round(Math.PI * r / (sp * 3)));
        const ringCount = Math.max(3, Math.round(Math.PI * r / (sp * 4)));

        // Base ring
        const baseStartIdx = positions.length / 3;
        for (let i = 0; i < basePoints; i++) {
            const angle = (2 * Math.PI * i) / basePoints;
            positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
            roles.push(1);
        }
        for (let i = 0; i < basePoints; i++) {
            connections.push({
                i: baseStartIdx + i,
                j: baseStartIdx + ((i + 1) % basePoints),
                restLength: 2 * Math.PI * r / basePoints,
                stiffness: 60,
                damping: 5,
            });
        }

        // Meridian ribs
        for (let i = 0; i < ribCount; i++) {
            const angle = (2 * Math.PI * i) / ribCount;
            const segCount = Math.max(8, Math.round(Math.PI * r / (2 * sp)));
            const startIdx = positions.length / 3;

            for (let j = 0; j <= segCount; j++) {
                const t = j / segCount;
                const phi = t * Math.PI / 2;
                const radius = r * Math.cos(phi);
                const y = h * Math.sin(phi);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                positions.push(x, y, z);
                roles.push(5);
            }

            for (let j = 0; j < segCount; j++) {
                connections.push({
                    i: startIdx + j,
                    j: startIdx + j + 1,
                    restLength: Math.PI * r / (2 * segCount),
                    stiffness: 50,
                    damping: 5,
                });
            }
        }

        // Parallel rings at different heights
        for (let ri = 1; ri < ringCount; ri++) {
            const t = ri / ringCount;
            const phi = t * Math.PI / 2;
            const ringR = r * Math.cos(phi);
            const ringY = h * Math.sin(phi);
            const ringPts = Math.max(6, Math.round(2 * Math.PI * ringR / sp));
            const ringStart = positions.length / 3;

            for (let i = 0; i < ringPts; i++) {
                const angle = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(angle) * ringR, ringY, Math.sin(angle) * ringR);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * ringR / ringPts,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateArch(params) {
        const s = params.scale;
        const w = 4 * s * params.widthMul;
        const h = 5 * s * params.heightMul;
        const d = 1 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Two parallel arches
        for (const z of [-d/2, d/2]) {
            // Left column
            const leftCol = this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, z, -w/2, h*0.6, z, sp);
            connections.push(...leftCol.connections);

            // Right column
            const rightCol = this._addParticlesAlongLine(positions, roles, 2, w/2, 0, z, w/2, h*0.6, z, sp);
            connections.push(...rightCol.connections);

            // Arch curve
            const arch = this._addParticlesAlongArc(positions, roles, 5,
                0, h*0.6, z, w/2, h*0.4, Math.PI, 0, 'y', sp);
            connections.push(...arch.connections);
        }

        // Cross beams between the two arches
        const crossCount = Math.max(6, Math.round(w / sp));
        for (let i = 0; i <= crossCount; i++) {
            const t = i / crossCount;
            const angle = Math.PI * t;
            const x = Math.cos(angle) * w/2;
            const y = h*0.6 + Math.sin(angle) * h*0.4;
            const cross = this._addParticlesAlongLine(positions, roles, 3, x, y, -d/2, x, y, d/2, sp);
            connections.push(...cross.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateTemple(params) {
        const s = params.scale;
        const w = 6 * s * params.widthMul;
        const d = 8 * s;
        const h = 5 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Platform/base
        const baseH = 0.5 * s;
        const baseCorners = [[-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]];
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = baseCorners[i];
            const [x2, z2] = baseCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 1, x1, baseH, z1, x2, baseH, z2, sp);
            connections.push(...beam.connections);
        }

        // Columns (perimeter)
        const colsPerSide = 6;
        for (let side = 0; side < 4; side++) {
            for (let c = 0; c < colsPerSide; c++) {
                const t = c / (colsPerSide - 1);
                let x, z;
                switch (side) {
                    case 0: x = -w/2 + w * t; z = -d/2; break;
                    case 1: x = w/2; z = -d/2 + d * t; break;
                    case 2: x = w/2 - w * t; z = d/2; break;
                    case 3: x = -w/2; z = d/2 - d * t; break;
                }

                const col = this._addParticlesAlongLine(positions, roles, 2, x, baseH, z, x, h, z, sp);
                connections.push(...col.connections);
            }
        }

        // Entablature (top beams)
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = baseCorners[i];
            const [x2, z2] = baseCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, h, z1, x2, h, z2, sp);
            connections.push(...beam.connections);
        }

        // Pediment (triangular gable on front and back)
        const peakH = h + 1.5 * s;
        for (const zEnd of [-d/2, d/2]) {
            const ped1 = this._addParticlesAlongLine(positions, roles, 3, -w/2, h, zEnd, 0, peakH, zEnd, sp);
            const ped2 = this._addParticlesAlongLine(positions, roles, 3, w/2, h, zEnd, 0, peakH, zEnd, sp);
            connections.push(...ped1.connections, ...ped2.connections);
        }

        // Ridge beam
        const ridge = this._addParticlesAlongLine(positions, roles, 3, 0, peakH, -d/2, 0, peakH, d/2, sp);
        connections.push(...ridge.connections);

        // Roof rafters
        const rafterCount = 6;
        for (let i = 0; i <= rafterCount; i++) {
            const z = -d/2 + d * (i / rafterCount);
            const raft1 = this._addParticlesAlongLine(positions, roles, 4, -w/2, h, z, 0, peakH, z, sp);
            const raft2 = this._addParticlesAlongLine(positions, roles, 4, w/2, h, z, 0, peakH, z, sp);
            connections.push(...raft1.connections, ...raft2.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCastle(params) {
        const s = params.scale;
        const w = 8 * s * params.widthMul;
        const d = 8 * s;
        const wallH = 4 * s * params.heightMul;
        const towerH = 6 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 corner towers
        const towerW = 1.5 * s;
        const towerCorners = [
            [-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]
        ];

        for (const [tx, tz] of towerCorners) {
            // Tower columns
            const tc = [
                [tx - towerW/2, tz - towerW/2],
                [tx + towerW/2, tz - towerW/2],
                [tx + towerW/2, tz + towerW/2],
                [tx - towerW/2, tz + towerW/2],
            ];

            for (const [cx, cz] of tc) {
                const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, towerH, cz, sp);
                connections.push(...col.connections);
            }

            // Tower top beams
            for (let i = 0; i < 4; i++) {
                const [x1, z1] = tc[i];
                const [x2, z2] = tc[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, towerH, z1, x2, towerH, z2, sp);
                connections.push(...beam.connections);
            }

            // Battlements (merlons)
            for (let i = 0; i < 4; i++) {
                const [cx, cz] = tc[i];
                const merlon = this._addParticlesAlongLine(positions, roles, 4, cx, towerH, cz, cx, towerH + 0.5*s, cz, sp);
                connections.push(...merlon.connections);
            }
        }

        // Curtain walls between towers
        const wallPairs = [
            [towerCorners[0], towerCorners[1]],
            [towerCorners[1], towerCorners[2]],
            [towerCorners[2], towerCorners[3]],
            [towerCorners[3], towerCorners[0]],
        ];

        for (const [[x1, z1], [x2, z2]] of wallPairs) {
            // Wall base
            const base = this._addParticlesAlongLine(positions, roles, 1, x1, 0, z1, x2, 0, z2, sp);
            connections.push(...base.connections);

            // Wall top
            const top = this._addParticlesAlongLine(positions, roles, 3, x1, wallH, z1, x2, wallH, z2, sp);
            connections.push(...top.connections);

            // Wall verticals
            const wallLen = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
            const vertCount = Math.floor(wallLen / (sp * 10));
            for (let v = 1; v < vertCount; v++) {
                const t = v / vertCount;
                const vx = x1 + (x2 - x1) * t;
                const vz = z1 + (z2 - z1) * t;
                const vert = this._addParticlesAlongLine(positions, roles, 2, vx, 0, vz, vx, wallH, vz, sp);
                connections.push(...vert.connections);
            }
        }

        // Gate (front wall)
        const gateH = wallH * 0.7;
        const gateW = 1.5 * s;
        const gateFrontZ = -d/2;
        const gateL = this._addParticlesAlongLine(positions, roles, 2, -gateW/2, 0, gateFrontZ, -gateW/2, gateH, gateFrontZ, sp);
        const gateR = this._addParticlesAlongLine(positions, roles, 2, gateW/2, 0, gateFrontZ, gateW/2, gateH, gateFrontZ, sp);
        connections.push(...gateL.connections, ...gateR.connections);

        // Gate arch
        const gateArch = this._addParticlesAlongArc(positions, roles, 5,
            0, gateH, gateFrontZ, gateW/2, gateW/2, Math.PI, 0, 'y', sp);
        connections.push(...gateArch.connections);

        // Keep (central tower)
        const keepW = 2 * s;
        const keepH = towerH * 1.2;
        const keepCorners = [
            [-keepW/2, -keepW/2], [keepW/2, -keepW/2],
            [keepW/2, keepW/2], [-keepW/2, keepW/2]
        ];

        for (const [cx, cz] of keepCorners) {
            const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, keepH, cz, sp);
            connections.push(...col.connections);
        }

        for (let i = 0; i < 4; i++) {
            const [x1, z1] = keepCorners[i];
            const [x2, z2] = keepCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, keepH, z1, x2, keepH, z2, sp);
            connections.push(...beam.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateWall(params) {
        const s = params.scale;
        const w = 10 * s * params.widthMul;
        const h = 3 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Bottom beam
        const bottom = this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, 0, w/2, 0, 0, sp);
        connections.push(...bottom.connections);

        // Top beam
        const top = this._addParticlesAlongLine(positions, roles, 3, -w/2, h, 0, w/2, h, 0, sp);
        connections.push(...top.connections);

        // Vertical studs
        const studCount = Math.floor(w / (sp * 8));
        for (let i = 0; i <= studCount; i++) {
            const x = -w/2 + w * (i / studCount);
            const stud = this._addParticlesAlongLine(positions, roles, 2, x, 0, 0, x, h, 0, sp);
            connections.push(...stud.connections);
        }

        // Cross bracing
        const braceCount = Math.floor(studCount / 2);
        for (let i = 0; i < braceCount; i++) {
            const x1 = -w/2 + w * (2*i / studCount);
            const x2 = -w/2 + w * ((2*i + 2) / studCount);
            const brace = this._addParticlesAlongLine(positions, roles, 4, x1, 0, 0, x2, h, 0, sp);
            connections.push(...brace.connections);
        }

        // Mid-height rail
        const mid = this._addParticlesAlongLine(positions, roles, 3, -w/2, h/2, 0, w/2, h/2, 0, sp);
        connections.push(...mid.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateStadium(params) {
        const s = params.scale;
        const r = 6 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Elliptical columns
        const colCount = 24;
        for (let i = 0; i < colCount; i++) {
            const angle = (2 * Math.PI * i) / colCount;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r * 0.7; // elliptical

            const col = this._addParticlesAlongLine(positions, roles, 2, x, 0, z, x, h, z, sp);
            connections.push(...col.connections);
        }

        // Tiers (horizontal rings at different heights)
        const tiers = 4;
        for (let t = 1; t <= tiers; t++) {
            const tierH = h * (t / tiers);
            const tierR = r + (t / tiers) * s; // slightly wider at top (rake angle)
            const ringStart = positions.length / 3;
            const ringPts = colCount;

            for (let i = 0; i < ringPts; i++) {
                const angle = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(angle) * tierR, tierH, Math.sin(angle) * tierR * 0.7);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * tierR / ringPts,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        // Radial beams connecting tiers
        for (let i = 0; i < colCount; i += 3) {
            const angle = (2 * Math.PI * i) / colCount;
            const innerR = r * 0.6;
            const x1 = Math.cos(angle) * innerR;
            const z1 = Math.sin(angle) * innerR * 0.7;
            const x2 = Math.cos(angle) * (r + s);
            const z2 = Math.sin(angle) * (r + s) * 0.7;

            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, 0.5*s, z1, x2, h, z2, sp);
            connections.push(...beam.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCube(params) {
        const s = params.scale;
        const size = 4 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        const h = size * params.heightMul;
        const w = size * params.widthMul;

        // 12 edges of a cube
        const corners = [
            [-w/2, 0, -w/2], [w/2, 0, -w/2], [w/2, 0, w/2], [-w/2, 0, w/2],
            [-w/2, h, -w/2], [w/2, h, -w/2], [w/2, h, w/2], [-w/2, h, w/2],
        ];

        // Bottom edges
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[(i+1)%4];
            const e = this._addParticlesAlongLine(positions, roles, 1, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }
        // Top edges
        for (let i = 4; i < 8; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[4 + (i-4+1)%4];
            const e = this._addParticlesAlongLine(positions, roles, 3, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }
        // Vertical edges
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[i+4];
            const e = this._addParticlesAlongLine(positions, roles, 2, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }

        // Face diagonals for stability
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[(i+1)%4 + 4];
            const e = this._addParticlesAlongLine(positions, roles, 4, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateSphere(params) {
        const s = params.scale;
        const r = 3 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Dynamic counts based on spacing
        const meridianCount = Math.max(6, Math.round(Math.PI * r / (sp * 2)));
        const segCount = Math.max(8, Math.round(Math.PI * r / sp));
        const ringCount = Math.max(4, Math.round(Math.PI * r / (sp * 3)));

        // Meridians
        for (let m = 0; m < meridianCount; m++) {
            const phi = (2 * Math.PI * m) / meridianCount;
            const startIdx = positions.length / 3;

            for (let j = 0; j <= segCount; j++) {
                const theta = Math.PI * (j / segCount);
                const x = r * Math.sin(theta) * Math.cos(phi);
                const y = r * Math.cos(theta) + r;
                const z = r * Math.sin(theta) * Math.sin(phi);
                positions.push(x, y, z);
                roles.push(5);
            }

            for (let j = 0; j < segCount; j++) {
                connections.push({
                    i: startIdx + j,
                    j: startIdx + j + 1,
                    restLength: Math.PI * r / segCount,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        // Parallel rings
        for (let ri = 1; ri < ringCount; ri++) {
            const theta = Math.PI * (ri / ringCount);
            const ringR = r * Math.sin(theta);
            const ringY = r * Math.cos(theta) + r;
            const ringPts = Math.max(6, Math.round(2 * Math.PI * ringR / sp));
            const ringStart = positions.length / 3;

            for (let i = 0; i < ringPts; i++) {
                const phi = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(phi) * ringR, ringY, Math.sin(phi) * ringR);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * ringR / ringPts,
                    stiffness: 35,
                    damping: 5,
                });
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== UTILITY ====================

    _generateAmbientParticles(structPositions, count, scale) {
        if (count <= 0) return new Float32Array(0);

        const positions = new Float32Array(count * 3);

        // Find bounding box of structure
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        const structCount = structPositions.length / 3;
        for (let i = 0; i < structCount; i++) {
            const x = structPositions[i * 3];
            const y = structPositions[i * 3 + 1];
            const z = structPositions[i * 3 + 2];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        const spread = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.5;

        // Scatter ambient particles loosely around the structure
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // Gaussian-like distribution around center
            const r = Math.random() * spread;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[idx] = cx + r * Math.sin(phi) * Math.cos(theta);
            positions[idx + 1] = Math.abs(cy + r * Math.sin(phi) * Math.sin(theta) * 0.5);
            positions[idx + 2] = cz + r * Math.cos(phi);
        }

        return positions;
    }

    _calculateLoads(loads, connections, roles, structCount) {
        // Simple top-down load propagation
        // Start with self-weight at top, propagate down via connections
        loads.fill(0);

        for (let i = 0; i < structCount; i++) {
            const role = roles[i];
            if (role === 1) loads[i] = 1.0;       // foundation
            else if (role === 2) loads[i] = 0.7;   // column
            else if (role === 3) loads[i] = 0.4;   // beam
            else if (role === 4) loads[i] = 0.3;   // brace
            else if (role === 5) loads[i] = 0.5;   // arch
        }
    }
}
