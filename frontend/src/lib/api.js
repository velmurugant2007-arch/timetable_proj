import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/* ------------------------------------------------------------------ */
/*  AUTH                                                                 */
/* ------------------------------------------------------------------ */
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

/* ------------------------------------------------------------------ */
/*  YEARS                                                               */
/* ------------------------------------------------------------------ */
export const yearsApi = {
  getAll: () => api.get('/years'),
  create: (name) => api.post('/years', { name }),
  update: (id, name) => api.put(`/years/${id}`, { name }),
  delete: (id) => api.delete(`/years/${id}`),
  addSection: (id, section) => api.post(`/years/${id}/sections`, { section }),
  updateSection: (id, section, newSection) => api.put(`/years/${id}/sections/${section}`, { newSection }),
  deleteSection: (id, section) => api.delete(`/years/${id}/sections/${section}`),
};

/* ------------------------------------------------------------------ */
/*  SUBJECTS                                                            */
/* ------------------------------------------------------------------ */
export const subjectsApi = {
  getAll: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
  bulkImport: (data) => api.post('/subjects/bulk-import', data),
  bulkUpdateCode: (data) => api.put('/subjects/bulk-update-code', data),
};

/* ------------------------------------------------------------------ */
/*  FACULTY                                                             */
/* ------------------------------------------------------------------ */
export const facultyApi = {
  getAll: () => api.get('/faculty'),
  getRaw: () => api.get('/faculty/raw'),
  create: (data) => api.post('/faculty', data),
  update: (id, data) => api.put(`/faculty/${id}`, data),
  delete: (id) => api.delete(`/faculty/${id}`),
  getSchedule: (id) => api.get(`/faculty/${id}/schedule`),
};

/* ------------------------------------------------------------------ */
/*  TIMETABLES                                                          */
/* ------------------------------------------------------------------ */
export const timetablesApi = {
  getAll: () => api.get('/timetables'),
  getOne: (key) => api.get(`/timetables/${key}`),
  generate: (data) => api.post('/timetables/generate', data),
  save: (key) => api.put(`/timetables/${key}`),
  editCell: (key, data) => api.put(`/timetables/${key}/cell`, data),
};

/* ------------------------------------------------------------------ */
/*  EXPORT                                                            */
/* ------------------------------------------------------------------ */
export const exportApi = {
  email: (data) => api.post('/export/email', data),
};

/* ------------------------------------------------------------------ */
/*  SETTINGS                                                            */
/* ------------------------------------------------------------------ */
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

/* ------------------------------------------------------------------ */
/*  MASTER TIMETABLE                                                    */
/* ------------------------------------------------------------------ */
export const masterTimetableApi = {
  getSheets: (formData) => api.post('/master-timetable/sheets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  importAndGenerate: (formData) => api.post('/master-timetable/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: () => api.get('/master-timetable'),
};

/* ------------------------------------------------------------------ */
/*  IMPORTED TIMETABLES (.docx)                                         */
/* ------------------------------------------------------------------ */
export const importedTimetableApi = {
  uploadDocx: (formData) => api.post('/imported-timetables/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: () => api.get('/imported-timetables'),
};

/* ------------------------------------------------------------------ */
/*  FACULTY MASTER TIMETABLE                                          */
/* ------------------------------------------------------------------ */
export const facultyMasterTTApi = {
  upload: (formData) => api.post('/faculty-master-tt/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadMapping: (formData) => api.post('/faculty-master-tt/acronym-mapping', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: () => api.get('/faculty-master-tt'),
  getIndividual: (acronym) => api.get(`/faculty-master-tt/${acronym}/schedule`),
  generate: () => api.post('/faculty-master-tt/generate'),
  clear: (type = 'all') => api.delete(`/faculty-master-tt/clear?type=${type}`),
};

export const abstractApi = {
  getAbstract: () => api.get('/abstract'),
};

export default api;
