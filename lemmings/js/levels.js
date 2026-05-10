// Multi-level system with intentionally designed puzzles
// All levels share the same entrance and exit positions
const STANDARD_ENTRANCE = { x: 150, y: 140 };
const STANDARD_EXIT = { x: 1050, y: 580 };
const STANDARD_SKILLS = {
    blocker: 3,
    digger: 3,
    builder: 3,
    basher: 3,
    bomber: 3,
    climber: 3
};

const LEVEL_1 = {
    name: "Gathering Storm",
    designIntent: "Classic three-act cave: a crowded staging chamber, a lethal generator shaft, and a high exit buttress that demands deliberate builder, digger, and blocker play.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 11,
    entrance: STANDARD_ENTRANCE,
    exit: { x: 1020, y: 170 },
    skills: { ...STANDARD_SKILLS },
    sections: [
        {
            name: "entrance_platform",
            terrain: [
                { x: 80, y: 200, width: 200, height: 40, label: 'A' },
                { x: 780, y: 200, width: 400, height: 40, label: 'B' },
                { x: 855, y: 300, width: 150, height: 40, label: 'I' },
                { x: 900, y: 400, width: 200, height: 40, label: 'J' },
                { x: 350, y: 250, width: 400, height: 40, label: 'C' },
                { x: 260, y: 320, width: 120, height: 40, label: 'D' },
                { x: 260, y: 420, width: 500, height: 40, label: 'E' },
                { x: 260, y: 500, width: 100, height: 40, label: 'K' },
                { x: 260, y: 560, width: 500, height: 40, label: 'F' },
                { x: 880, y: 540, width: 50, height: 100, label: 'L' },
                { x: 185, y: 430, width: 75, height: 40, label: 'G' },
                { x: 110, y: 440, width: 75, height: 40, label: 'H' }
            ]
        },
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 },
                { x: 570, y: 0, width: 60, height: 700 }
            ]
        },
        {
            name: "floor_segments",
            terrain: [
                { x: 260, y: 640, width: 500, height: 60 },
                { x: 880, y: 640, width: 320, height: 60 }
            ]
        }
    ],
    water: [
        { x: 60, y: 650, width: 200, height: 50 },
        { x: 760, y: 650, width: 120, height: 50 }
    ],
    ground: null
};

const LEVEL_2 = {
    name: "Flooded Span",
    designIntent: "Bridge the waterlogged valley while tunneling through a central pillar; climbers and builders buy time while diggers and bashers carve a safe slope.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 12,
    entrance: STANDARD_ENTRANCE,
    exit: { x: 860, y: 640 },
    skills: { ...STANDARD_SKILLS },
    sections: [
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 }
            ]
        },
        {
            name: "entrance_perch",
            terrain: [
                { x: 80, y: 210, width: 200, height: 40, label: 'A' },
                { x: 0, y: 640, width: 340, height: 60, label: 'B' },
                { x: 200, y: 320, width: 160, height: 40, label: 'C' },
                { x: 300, y: 400, width: 120, height: 30, label: 'C1' } // midway catcher to prevent fatal fall
            ]
        },
        {
            name: "flooded_valley",
            terrain: [
                { x: 360, y: 640, width: 40, height: 60, label: 'D' }, // narrow lip before water
                { x: 430, y: 500, width: 150, height: 35, label: 'D1' }, // landing over first water span
                { x: 520, y: 640, width: 200, height: 60, label: 'E' },
                { x: 600, y: 560, width: 140, height: 30, label: 'E1' }, // midway step above the basin
                { x: 760, y: 640, width: 180, height: 60, label: 'F' },
                { x: 820, y: 520, width: 120, height: 30, label: 'F1' }, // step toward exit ramp
                { x: 430, y: 420, width: 150, height: 40, label: 'G' },
                { x: 640, y: 480, width: 60, height: 160, label: 'H' } // pillar to bash/dig through
            ]
        },
        {
            name: "exit_ramparts",
            terrain: [
                { x: 940, y: 580, width: 200, height: 40, label: 'I' },
                { x: 980, y: 500, width: 140, height: 40, label: 'J' },
                { x: 1030, y: 430, width: 90, height: 40, label: 'K' },
                { x: 880, y: 460, width: 80, height: 30, label: 'J1' } // extra perch before final climb
            ]
        }
    ],
    water: [
        { x: 340, y: 650, width: 180, height: 50 },
        { x: 700, y: 650, width: 140, height: 50 }
    ],
    ground: null
};

export const LEVELS = [LEVEL_1, LEVEL_2];

// Export individual levels for backwards compatibility
export { LEVEL_1, LEVEL_2 };

export default LEVELS;
