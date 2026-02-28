import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// --- Auth ---
export const register = (data) => api.post('/auth/register', data).then((r) => r.data);
export const login = (data) => api.post('/auth/login', data).then((r) => r.data);
export const logout = () => api.post('/auth/logout').then((r) => r.data);
export const getMe = () => api.get('/auth/me').then((r) => r.data);

// --- Trips ---
export const getTrips = () => api.get('/trips').then((r) => r.data);
export const searchTrips = (params) => api.get('/trips/search', { params }).then((r) => r.data);
export const getTrip = (id) => api.get(`/trips/${id}`).then((r) => r.data);
export const createTrip = (data) => api.post('/trips', data).then((r) => r.data);
export const updateTrip = (id, data) => api.put(`/trips/${id}`, data).then((r) => r.data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`).then((r) => r.data);
export const updateTripSettings = (id, data) => api.patch(`/trips/${id}/settings`, data).then((r) => r.data);

// --- Members & join requests ---
export const requestJoin = (tripId) => api.post(`/trips/${tripId}/request-join`).then((r) => r.data);
export const inviteMember = (tripId, email) => api.post(`/trips/${tripId}/invite`, { email }).then((r) => r.data);
export const getJoinRequests = (tripId) => api.get(`/trips/${tripId}/requests`).then((r) => r.data);
export const resolveJoinRequest = (tripId, requestId, action) =>
  api.patch(`/trips/${tripId}/requests/${requestId}`, { action }).then((r) => r.data);
export const removeMember = (tripId, userId) =>
  api.delete(`/trips/${tripId}/members/${userId}`).then((r) => r.data);
export const setMemberRole = (tripId, userId, role) =>
  api.patch(`/trips/${tripId}/members/${userId}/role`, { role }).then((r) => r.data);

// --- Day Entries ---
export const addDay = (tripId, data) => api.post(`/trips/${tripId}/days`, data).then((r) => r.data);
export const updateDay = (tripId, dayId, data) =>
  api.put(`/trips/${tripId}/days/${dayId}`, data).then((r) => r.data);
export const deleteDay = (tripId, dayId) =>
  api.delete(`/trips/${tripId}/days/${dayId}`).then((r) => r.data);
export const batchAddDays = (tripId, days) =>
  api.post(`/trips/${tripId}/days/batch`, { days }).then((r) => r.data);

// --- Messages ---
export const getTripMessages = (tripId, type = 'group') =>
  api.get(`/trips/${tripId}/messages`, { params: { type } }).then((r) => r.data);
export const sendTripMessage = (tripId, content, type = 'group') =>
  api.post(`/trips/${tripId}/messages`, { content }, { params: { type } }).then((r) => r.data);

// --- Notifications ---
export const getNotifications = () => api.get('/notifications').then((r) => r.data);
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data);

// --- Admin ---
export const adminGetUsers = () => api.get('/admin/users').then((r) => r.data);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);
export const adminGetTrips = () => api.get('/admin/trips').then((r) => r.data);
export const adminDeleteTrip = (id) => api.delete(`/admin/trips/${id}`).then((r) => r.data);
export const adminGetAnalytics = () => api.get('/admin/analytics').then((r) => r.data);

// --- Chat ---
export const sendChatMessage = (payload) => api.post('/chat', payload).then((r) => r.data);
export const optimizeSchedule = (tripId, dayId) =>
  api.post('/chat/optimize', { tripId, dayId }).then((r) => r.data);

// --- Weather ---
export const getWeatherForecast = (location) =>
  api.get('/weather/forecast', { params: { location } }).then((r) => r.data);
export const getCurrentWeather = (location) =>
  api.get('/weather/current', { params: { location } }).then((r) => r.data);

// --- Places ---
export const getNearbyPlaces = (location, type = 'tourist_attraction', radius = 2000) =>
  api.get('/places/nearby', { params: { location, type, radius } }).then((r) => r.data);
export const searchPlaces = ({ query, location, type, radius, opennow }) =>
  api.get('/places/search', { params: { query, location, type, radius, opennow } }).then((r) => r.data);

// --- Health ---
export const getHealth = () => api.get('/health').then((r) => r.data);
