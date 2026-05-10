// ============================================
// SCHEDULE & TIME SYSTEM
// Manages game time, school periods, and class schedules
// ============================================

// School periods throughout the day
export const SchoolPeriod = {
    BEFORE_SCHOOL: 'before_school',   // 6:00 - 8:00
    PERIOD_1: 'period_1',             // 8:00 - 9:30
    BREAK_1: 'break_1',               // 9:30 - 10:00
    PERIOD_2: 'period_2',             // 10:00 - 11:30
    LUNCH: 'lunch',                   // 11:30 - 12:30
    PERIOD_3: 'period_3',             // 12:30 - 14:00
    AFTER_SCHOOL: 'after_school',     // 14:00 - 18:00
    EVENING: 'evening'                // 18:00 - 22:00
};

// Period time ranges (in minutes from midnight)
const periodTimes = [
    { period: SchoolPeriod.BEFORE_SCHOOL, start: 6 * 60, end: 8 * 60 },
    { period: SchoolPeriod.PERIOD_1, start: 8 * 60, end: 9 * 60 + 30 },
    { period: SchoolPeriod.BREAK_1, start: 9 * 60 + 30, end: 10 * 60 },
    { period: SchoolPeriod.PERIOD_2, start: 10 * 60, end: 11 * 60 + 30 },
    { period: SchoolPeriod.LUNCH, start: 11 * 60 + 30, end: 12 * 60 + 30 },
    { period: SchoolPeriod.PERIOD_3, start: 12 * 60 + 30, end: 14 * 60 },
    { period: SchoolPeriod.AFTER_SCHOOL, start: 14 * 60, end: 18 * 60 },
    { period: SchoolPeriod.EVENING, start: 18 * 60, end: 22 * 60 }
];

// Class subjects
export const Subject = {
    ART: 'art',
    MUSIC: 'music',
    SCIENCE: 'science',
    JAPANESE: 'japanese',
    PE: 'pe'
};

// Which class is taught during each period
export const ClassSchedule = {
    [SchoolPeriod.PERIOD_1]: Subject.ART,
    [SchoolPeriod.PERIOD_2]: Subject.MUSIC,
    [SchoolPeriod.PERIOD_3]: Subject.SCIENCE
};

// Period display names
export const PeriodNames = {
    [SchoolPeriod.BEFORE_SCHOOL]: 'Before School',
    [SchoolPeriod.PERIOD_1]: 'Period 1 - Art',
    [SchoolPeriod.BREAK_1]: 'Morning Break',
    [SchoolPeriod.PERIOD_2]: 'Period 2 - Music',
    [SchoolPeriod.LUNCH]: 'Lunch Break',
    [SchoolPeriod.PERIOD_3]: 'Period 3 - Science',
    [SchoolPeriod.AFTER_SCHOOL]: 'After School',
    [SchoolPeriod.EVENING]: 'Evening'
};

// ============================================
// GAME TIME CLASS
// ============================================

export class GameTime {
    constructor() {
        // Start at 7:00 AM
        this.minutes = 7 * 60;
        this.dayNumber = 1;

        // Time scale: how many game minutes pass per real second
        // 60 = 1 real second = 1 game minute (full day in 24 real minutes)
        // 30 = 1 real second = 0.5 game minute (full day in 48 real minutes)
        this.timeScale = 30;

        // Pause time during certain states
        this.paused = false;
    }

    // Update time (call each frame with deltaTime in seconds)
    update(deltaTime) {
        if (this.paused) return;

        this.minutes += deltaTime * this.timeScale / 60;

        // Handle day rollover
        if (this.minutes >= 24 * 60) {
            this.minutes -= 24 * 60;
            this.dayNumber++;
        }

        // Clamp to reasonable hours (6 AM - 10 PM)
        // If past 10 PM, player should be sleeping
        if (this.minutes >= 22 * 60) {
            this.minutes = 22 * 60;
            this.paused = true;
        }
    }

    // Get current hour (0-23)
    getHour() {
        return Math.floor(this.minutes / 60);
    }

    // Get current minute (0-59)
    getMinute() {
        return Math.floor(this.minutes % 60);
    }

    // Get display string "HH:MM"
    getDisplayTime() {
        const hours = this.getHour();
        const mins = this.getMinute();
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Get current school period
    getCurrentPeriod() {
        for (const { period, start, end } of periodTimes) {
            if (this.minutes >= start && this.minutes < end) {
                return period;
            }
        }
        // Default to evening if outside defined hours
        return SchoolPeriod.EVENING;
    }

    // Get display name for current period
    getPeriodName() {
        return PeriodNames[this.getCurrentPeriod()] || 'Free Time';
    }

    // Check if school is in session (during class periods)
    isSchoolTime() {
        const period = this.getCurrentPeriod();
        return period === SchoolPeriod.PERIOD_1 ||
               period === SchoolPeriod.PERIOD_2 ||
               period === SchoolPeriod.PERIOD_3;
    }

    // Check if it's a break period (kids can be in hallway/playground)
    isBreakTime() {
        const period = this.getCurrentPeriod();
        return period === SchoolPeriod.BREAK_1 || period === SchoolPeriod.LUNCH;
    }

    // Get current class subject (null if not in class)
    getCurrentSubject() {
        const period = this.getCurrentPeriod();
        return ClassSchedule[period] || null;
    }

    // Advance time by a number of hours (for sleeping)
    advanceHours(hours) {
        this.minutes += hours * 60;

        // Handle day rollover
        if (this.minutes >= 24 * 60) {
            this.minutes -= 24 * 60;
            this.dayNumber++;
        }
    }

    // Sleep until morning
    sleepUntilMorning() {
        // If before 6 AM, just set to 7 AM
        // If after 6 AM, advance to next day 7 AM
        if (this.minutes < 6 * 60) {
            this.minutes = 7 * 60;
        } else {
            this.dayNumber++;
            this.minutes = 7 * 60;
        }
        this.paused = false;
    }

    // Set time directly (for debugging/testing)
    setTime(hours, mins = 0) {
        this.minutes = hours * 60 + mins;
        this.paused = false;
    }

    // Get minutes until next period
    getMinutesUntilNextPeriod() {
        for (const { period, start, end } of periodTimes) {
            if (this.minutes >= start && this.minutes < end) {
                return end - this.minutes;
            }
        }
        return 0;
    }

    // Pause/resume time
    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    // Check if time is paused
    isPaused() {
        return this.paused;
    }

    // Save time state
    toJSON() {
        return {
            minutes: this.minutes,
            dayNumber: this.dayNumber,
            paused: this.paused
        };
    }

    // Load time state
    fromJSON(data) {
        if (data) {
            this.minutes = data.minutes || 7 * 60;
            this.dayNumber = data.dayNumber || 1;
            this.paused = data.paused || false;
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Check where a kid NPC should be based on time
export function getKidLocation(gameTime) {
    const period = gameTime.getCurrentPeriod();

    switch (period) {
        case SchoolPeriod.BEFORE_SCHOOL:
            return 'village'; // Kids are in village before school
        case SchoolPeriod.PERIOD_1:
        case SchoolPeriod.PERIOD_2:
        case SchoolPeriod.PERIOD_3:
            return 'classroom'; // Kids are in their class
        case SchoolPeriod.BREAK_1:
        case SchoolPeriod.LUNCH:
            return 'schoolyard'; // Kids are on break at school
        case SchoolPeriod.AFTER_SCHOOL:
        case SchoolPeriod.EVENING:
        default:
            return 'village'; // Kids return to village
    }
}

// Get classroom for current subject
export function getCurrentClassroom(gameTime) {
    const subject = gameTime.getCurrentSubject();
    if (!subject) return null;

    // Map subjects to room names
    const roomMap = {
        [Subject.ART]: 'art',
        [Subject.MUSIC]: 'music',
        [Subject.SCIENCE]: 'science',
        [Subject.JAPANESE]: 'japanese',
        [Subject.PE]: 'gym'
    };

    return roomMap[subject] || null;
}
