const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Default dataset from prototype
const DEFAULT_DATA = {
  users: [],
  years: [
    { id: "1st Year", name: "1st Year", sections: ["A", "B", "C"] },
    { id: "2nd Year", name: "2nd Year", sections: ["A", "B"] },
    { id: "3rd Year", name: "3rd Year", sections: ["A"] },
    { id: "4th Year", name: "4th Year", sections: ["A"] }
  ],
  faculty: [
    { id: "f1", name: "Dr. Arun", acronym: "ARU", designation: "Professor", isMedicalLeave: false, remarks: "", image: "" },
    { id: "f2", name: "Dr. Kumar", acronym: "KUM", designation: "Associate Professor", isMedicalLeave: false, remarks: "", image: "" },
    { id: "f3", name: "Prof. Priya", acronym: "PRI", designation: "Assistant Professor", isMedicalLeave: false, remarks: "", image: "" },
    { id: "f4", name: "Dr. Meena", acronym: "MEE", designation: "Associate Professor", isMedicalLeave: false, remarks: "", image: "" },
    { id: "f5", name: "Prof. Suresh", acronym: "SUR", designation: "Assistant Professor", isMedicalLeave: false, remarks: "", image: "" },
    { id: "f6", name: "Prof. Ravi", acronym: "RAV", designation: "Assistant Professor", isMedicalLeave: false, remarks: "", image: "" }
  ],
  subjects: [
    { id: "s1", code: "MAT101", name: "Mathematics", year: "1st Year", section: "A", hours: 5, facultyId: "f1", isLab: false },
    { id: "s2", code: "PHY101", name: "Physics", year: "1st Year", section: "A", hours: 4, facultyId: "f2", isLab: false },
    { id: "s3", code: "CS101", name: "Programming", year: "1st Year", section: "A", hours: 5, facultyId: "f3", isLab: false },
    { id: "s4", code: "ENG101", name: "English", year: "1st Year", section: "A", hours: 4, facultyId: "f4", isLab: false },
    { id: "s5", code: "CHE101", name: "Chemistry", year: "1st Year", section: "A", hours: 4, facultyId: "f5", isLab: false },
    { id: "s6", code: "CS102", name: "Data Structures Lab", year: "1st Year", section: "A", hours: 6, facultyId: "f3", isLab: true },
    { id: "s7", code: "DB102", name: "DBMS", year: "2nd Year", section: "A", hours: 4, facultyId: "f6", isLab: false },
    { id: "s8", code: "OS201", name: "Operating Systems", year: "2nd Year", section: "A", hours: 5, facultyId: "f1", isLab: false },
    { id: "s9", code: "CN201", name: "Computer Networks", year: "2nd Year", section: "A", hours: 4, facultyId: "f2", isLab: false },
    { id: "s10", code: "JAVA201", name: "Java Programming", year: "2nd Year", section: "A", hours: 5, facultyId: "f3", isLab: false },
    { id: "s11", code: "MATH201", name: "Discrete Mathematics", year: "2nd Year", section: "A", hours: 4, facultyId: "f4", isLab: false },
    { id: "s12", code: "DS201L", name: "DBMS Lab", year: "2nd Year", section: "A", hours: 4, facultyId: "f6", isLab: true },
    { id: "s13", code: "MAT101B", name: "Mathematics", year: "1st Year", section: "B", hours: 5, facultyId: "f1", isLab: false },
    { id: "s14", code: "PHY101B", name: "Physics", year: "1st Year", section: "B", hours: 4, facultyId: "f2", isLab: false },
    { id: "s15", code: "CS101B", name: "Programming", year: "1st Year", section: "B", hours: 5, facultyId: "f3", isLab: false },
    { id: "s16", code: "ENG101B", name: "English", year: "1st Year", section: "B", hours: 4, facultyId: "f4", isLab: false }
  ],
  settings: [
    { id: 1, workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"], periodsPerDay: 7, breakAfter: 3 }
  ],
  timetables: [],
  imported_timetables: [],
  faculty_master_tt: [
    { id: 1, meta: {}, faculty: [], generated: null }
  ],
  faculty_acronym_map: []
};

const dbFilePath = process.env.VERCEL
  ? path.join('/tmp', 'database.json')
  : path.join(__dirname, '..', 'data', 'database.json');

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadLocalDb() {
  ensureDirectoryExistence(dbFilePath);
  try {
    if (fs.existsSync(dbFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
      let modified = false;
      for (const key of Object.keys(DEFAULT_DATA)) {
        if (!parsed[key]) {
          parsed[key] = DEFAULT_DATA[key];
          modified = true;
        }
      }
      if (modified) saveLocalDb(parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Error loading local DB, initializing default data:', e.message);
  }
  const initial = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveLocalDb(initial);
  return initial;
}

function saveLocalDb(data) {
  try {
    ensureDirectoryExistence(dbFilePath);
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local DB:', e.message);
  }
}

function parseOrFilter(orStr, row) {
  const clauses = orStr.split(',').map(c => c.trim());
  return clauses.some(clause => {
    const parts = clause.split('.');
    if (parts.length >= 3 && parts[1] === 'eq') {
      const col = parts[0];
      const val = parts.slice(2).join('.');
      return String(row[col]) === String(val);
    }
    return false;
  });
}

class LocalQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.orderCol = null;
    this.orderAsc = true;
    this.limitVal = null;
    this.operation = 'select';
    this.payload = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
  }

  select(cols = '*') {
    return this;
  }

  insert(items) {
    this.operation = 'insert';
    this.payload = Array.isArray(items) ? items : [items];
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  upsert(items, opts = {}) {
    this.operation = 'upsert';
    this.payload = Array.isArray(items) ? items : [items];
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push(row => String(row[col]) === String(val));
    return this;
  }

  neq(col, val) {
    this.filters.push(row => String(row[col]) !== String(val));
    return this;
  }

  or(filterStr) {
    this.filters.push(row => parseOrFilter(filterStr, row));
    return this;
  }

  order(col, opts = { ascending: true }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this.execute();
  }

  async execute() {
    const db = loadLocalDb();
    if (!db[this.tableName]) {
      db[this.tableName] = [];
    }
    let table = db[this.tableName];
    let resultData = null;
    let error = null;

    if (this.operation === 'insert') {
      const inserted = this.payload.map(item => ({ ...item }));
      table.push(...inserted);
      saveLocalDb(db);
      resultData = inserted;
    } else if (this.operation === 'upsert') {
      const upserted = [];
      for (const item of this.payload) {
        const pk = item.id !== undefined ? 'id' : Object.keys(item)[0];
        const idx = table.findIndex(r => String(r[pk]) === String(item[pk]));
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...item };
          upserted.push(table[idx]);
        } else {
          table.push({ ...item });
          upserted.push(item);
        }
      }
      saveLocalDb(db);
      resultData = upserted;
    } else if (this.operation === 'update') {
      const updated = [];
      table.forEach((row, i) => {
        const match = this.filters.every(fn => fn(row));
        if (match) {
          table[i] = { ...row, ...this.payload };
          updated.push(table[i]);
        }
      });
      saveLocalDb(db);
      resultData = updated;
    } else if (this.operation === 'delete') {
      const deleted = [];
      const remaining = [];
      table.forEach(row => {
        const match = this.filters.every(fn => fn(row));
        if (match) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      });
      db[this.tableName] = remaining;
      saveLocalDb(db);
      resultData = deleted;
    } else {
      let filtered = table.filter(row => this.filters.every(fn => fn(row)));
      if (this.orderCol) {
        filtered.sort((a, b) => {
          const vA = a[this.orderCol];
          const vB = b[this.orderCol];
          if (vA < vB) return this.orderAsc ? -1 : 1;
          if (vA > vB) return this.orderAsc ? 1 : -1;
          return 0;
        });
      }
      if (this.limitVal) {
        filtered = filtered.slice(0, this.limitVal);
      }
      resultData = JSON.parse(JSON.stringify(filtered));
    }

    if (this.isSingle) {
      if (!resultData || resultData.length === 0) {
        return { data: null, error: new Error(`Row not found in ${this.tableName}`) };
      }
      return { data: resultData[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: (resultData && resultData.length > 0) ? resultData[0] : null, error: null };
    }

    return { data: resultData, error: null };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

const localClient = {
  from: tableName => new LocalQueryBuilder(tableName)
};

// Check if Supabase should be used
let supabase = localClient;
const forceLocal = process.env.USE_LOCAL_DB === 'true' || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;

if (!forceLocal) {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log(`🌐 Supabase client initialized with ${process.env.SUPABASE_URL}`);
  } catch (e) {
    console.warn(`Supabase initialization failed, using local database:`, e.message);
    supabase = localClient;
  }
} else {
  console.log(`⚡ Using high-speed local persistent database (${dbFilePath}).`);
}

module.exports = { supabase, localClient };
