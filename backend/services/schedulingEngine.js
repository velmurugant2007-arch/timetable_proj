/**
 * Scheduling Engine — ported from prototype lines 74-145.
 * Exact same algorithm: builds a conflict-aware timetable grid for a section.
 */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFacultyOccupancy(timetables, excludeKey) {
  const occ = {};
  Object.entries(timetables).forEach(([key, tt]) => {
    if (key === excludeKey || !tt.grid) return;
    Object.entries(tt.grid).forEach(([day, periods]) => {
      periods.forEach((cell, pIdx) => {
        if (cell && cell.facultyId && cell.facultyId !== 'unassigned') {
          const fids = cell.facultyId.split(',');
          fids.forEach(fid => {
            if (fid !== 'unassigned') {
              occ[fid] = occ[fid] || new Set();
              occ[fid].add(`${day}-${pIdx}`);
            }
          });
        }
      });
    });
  });
  return occ;
}

function buildYearLabOccupancy(timetables, currentYear, excludeKey) {
  const labOcc = {};
  Object.entries(timetables).forEach(([key, tt]) => {
    if (key === excludeKey || !tt.grid || tt.year !== currentYear) return;
    Object.entries(tt.grid).forEach(([day, periods]) => {
      periods.forEach((cell) => {
        if (cell && cell.isLab) {
          labOcc[cell.code] = labOcc[cell.code] || new Set();
          labOcc[cell.code].add(day);
        }
      });
    });
  });
  return labOcc;
}

function generateSectionTimetable(sectionSubjects, config, facultyOccupancy, shuffleOrder, yearLabOccupancy) {
  const { workingDays, periodsPerDay } = config;
  const grid = {};
  workingDays.forEach((d) => (grid[d] = Array(periodsPerDay).fill(null)));

  // Group subjects by name (for co-teaching labs/theory)
  const groupedSubjectsMap = new Map();
  sectionSubjects.forEach(s => {
    const key = s.name.trim().toLowerCase();
    if (!groupedSubjectsMap.has(key)) {
      groupedSubjectsMap.set(key, {
        ...s,
        facultyIds: [s.facultyId],
        facultyNames: [s.facultyName]
      });
    } else {
      const existing = groupedSubjectsMap.get(key);
      if (!existing.facultyIds.includes(s.facultyId)) {
        existing.facultyIds.push(s.facultyId);
        existing.facultyNames.push(s.facultyName);
      }
    }
  });
  const groupedSubjects = Array.from(groupedSubjectsMap.values());

  let ordered = shuffleOrder
    ? shuffle(groupedSubjects)
    : [...groupedSubjects].sort((a, b) => b.hours - a.hours);

  const remaining = {};
  ordered.forEach((s) => (remaining[s.id] = s.hours));
  const conflicts = [];
  
  const totalSlots = workingDays.length * periodsPerDay;
  const totalHours = ordered.reduce((a, s) => a + s.hours, 0);

  const isFree = (day, p, facultyIdOrIds) => {
    const fids = Array.isArray(facultyIdOrIds) ? facultyIdOrIds : [facultyIdOrIds];
    return fids.every(fid => {
      if (fid === 'unassigned') return true;
      if (!facultyOccupancy[fid]) return true;
      return !facultyOccupancy[fid].has(`${day}-${p}`);
    });
  };

  const markBusy = (day, p, facultyId) => {
    if (facultyId === 'unassigned') return;
    if (!facultyOccupancy[facultyId]) facultyOccupancy[facultyId] = new Set();
    facultyOccupancy[facultyId].add(`${day}-${p}`);
  };

  const placeCell = (day, p, sub) => {
    let hasConflict = false;
    sub.facultyIds.forEach((fid, idx) => {
      if (!isFree(day, p, fid)) {
        hasConflict = true;
        conflicts.push({ day, period: p, facultyName: sub.facultyNames[idx], subjectCode: sub.code });
      } else {
        markBusy(day, p, fid);
      }
    });

    grid[day][p] = {
      subjectId: sub.id,
      code: sub.code,
      name: sub.name,
      facultyId: sub.facultyIds.join(','),
      facultyName: sub.facultyNames.join(', '),
      conflict: hasConflict,
      isLab: !!sub.isLab
    };
    remaining[sub.id]--;
  };

  // STEP 1: Place LAB subjects in continuous blocks
  const labSubjects = ordered.filter(s => s.isLab);
  const sectionLabDays = new Set();
  
  // Define lunch index. Assuming periods before lunch = 4, so index 4 is after lunch.
  // A lab cannot cross from index < 4 to index >= 4.
  const lunchIdx = 4;
  const crossesLunch = (p, labHours) => p < lunchIdx && (p + labHours) > lunchIdx;

  for (const lab of labSubjects) {
    let placed = false;
    let labHours = Math.min(lab.hours, 4); // max 4 continuous hours per block
    
    // Find a day and starting period where `labHours` consecutive slots are empty and faculty is free
    for (const day of workingDays) {
      if (placed) break;
      
      // Constraint 1: Max 1 lab per day per section
      if (sectionLabDays.has(day)) continue;
      
      // Constraint 2: No identical labs across sections on the same day
      if (yearLabOccupancy && yearLabOccupancy[lab.code] && yearLabOccupancy[lab.code].has(day)) continue;

      for (let p = 0; p <= periodsPerDay - labHours; p++) {
        if (crossesLunch(p, labHours)) continue;

        let canPlace = true;
        for (let i = 0; i < labHours; i++) {
          if (grid[day][p + i] !== null || !isFree(day, p + i, lab.facultyIds)) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          for (let i = 0; i < labHours; i++) placeCell(day, p + i, lab);
          sectionLabDays.add(day);
          placed = true;
          break;
        }
      }
    }
    
    // Fallback if unable to find perfectly free slots (force place)
    if (!placed && remaining[lab.id] > 0) {
      for (const day of workingDays) {
        if (placed) break;
        
        if (sectionLabDays.has(day)) continue;
        if (yearLabOccupancy && yearLabOccupancy[lab.code] && yearLabOccupancy[lab.code].has(day)) continue;

        for (let p = 0; p <= periodsPerDay - labHours; p++) {
          if (crossesLunch(p, labHours)) continue;

          let hasEmpty = true;
          for (let i = 0; i < labHours; i++) {
            if (grid[day][p + i] !== null) hasEmpty = false;
          }
          if (hasEmpty) {
            for (let i = 0; i < labHours; i++) placeCell(day, p + i, lab);
            sectionLabDays.add(day);
            placed = true;
            break;
          }
        }
      }
    }
    
    // Extreme fallback: Ignore yearLabOccupancy and faculty conflicts, but STILL respect lunch and max 1 lab per day
    if (!placed && remaining[lab.id] > 0) {
      for (const day of workingDays) {
        if (placed) break;
        
        // CRITICAL CONSTRAINT: Only one lab per day per section
        if (sectionLabDays.has(day)) continue;

        for (let p = 0; p <= periodsPerDay - labHours; p++) {
          if (crossesLunch(p, labHours)) continue;

          let hasEmpty = true;
          for (let i = 0; i < labHours; i++) {
            if (grid[day][p + i] !== null) hasEmpty = false;
          }
          if (hasEmpty) {
            for (let i = 0; i < labHours; i++) placeCell(day, p + i, lab);
            sectionLabDays.add(day);
            placed = true;
            break;
          }
        }
      }
    }
  }

  // STEP 2: Place Theory Subjects - First period assignments
  const theorySubjects = ordered.filter(s => !s.isLab);
  
  // STEP 3: Fill remaining slots for Theory Subjects
  // Constraint: No continuous normal subjects (don't place if previous period has same subject)
  // Constraint: Try not to place the same subject in the same period index on previous days
  for (let p = 0; p < periodsPerDay; p++) {
    for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
      const day = workingDays[dayIdx];
      if (grid[day][p] !== null) continue; // Already occupied

      let bestSub = null;
      for (const sub of theorySubjects) {
        if (remaining[sub.id] <= 0) continue;
        
        // Non-continuous constraint (same day)
        if (p > 0 && grid[day][p - 1]?.subjectId === sub.id) continue;
        if (p < periodsPerDay - 1 && grid[day][p + 1]?.subjectId === sub.id) continue;
        
        // Spread constraint: Same period on previous days
        let samePeriodPreviousDays = false;
        for (let prevDayIdx = 0; prevDayIdx < dayIdx; prevDayIdx++) {
          if (grid[workingDays[prevDayIdx]][p]?.subjectId === sub.id) {
            samePeriodPreviousDays = true;
            break;
          }
        }
        if (samePeriodPreviousDays) continue;
        
        // Only pick if faculty is free
        if (isFree(day, p, sub.facultyIds)) {
          bestSub = sub;
          break;
        }
      }
      
      // If we couldn't find a perfectly valid subject, start relaxing constraints
      if (!bestSub) {
        // Relax: Spread constraint (Allow same period on previous days)
        for (const sub of theorySubjects) {
          if (remaining[sub.id] <= 0) continue;
          if (p > 0 && grid[day][p - 1]?.subjectId === sub.id) continue;
          if (p < periodsPerDay - 1 && grid[day][p + 1]?.subjectId === sub.id) continue;
          if (isFree(day, p, sub.facultyIds)) {
            bestSub = sub;
            break;
          }
        }
      }

      if (!bestSub) {
        // Relax: Faculty free
        bestSub = theorySubjects.find(sub => remaining[sub.id] > 0 && (p === 0 || grid[day][p - 1]?.subjectId !== sub.id));
      }
      
      if (!bestSub) {
        // Relax: Non-continuous
        bestSub = theorySubjects.find(sub => remaining[sub.id] > 0);
      }

      if (bestSub) {
        placeCell(day, p, bestSub);
      }
    }
  }

  return {
    grid,
    conflicts,
    totalHours,
    totalSlots,
    subjectCount: sectionSubjects.length,
  };
}

module.exports = {
  shuffle,
  buildFacultyOccupancy,
  buildYearLabOccupancy,
  generateSectionTimetable,
};
