import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api"; // Change this to your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------------- AUTH ---------------- */

export const login = async (data) => {
  const res = await api.post("/login", data);
  return res.data;
};

/* ---------------- ITEM TYPES ---------------- */

export const createItemType = async (data) => {
  const res = await api.post("/item-types", data);
  return res.data;
};

export const getItemTypes = async () => {
  const res = await api.get("/item-types");
  return res.data;
};

export const getItemByTag = async (tagId) => {
  const res = await api.get(`/items/tag/${tagId}`);
  return res.data;
};

/* ---------------- ITEMS ---------------- */

export const getItems = async (itemTypeId = '') => {
  const res = await api.get(`/items${itemTypeId ? `?itemType=${itemTypeId}` : ''}`);
  return res.data;
};

export const updateItem = async (id, data) => {
  const res = await api.put(`/items/${id}`, data);
  return res.data;
};

export const deleteItem = async (id) => {
  const res = await api.delete(`/items/${id}`);
  return res.data;
};

/* ---------------- STOCK ---------------- */

export const addStock = async (data) => {
  const res = await api.post("/stock/add", data);
  return res.data;
};

export const takeStock = async (data) => {
  const res = await api.post("/stock/take", data);
  return res.data;
};

export const getLogs = async (page = 1) => {
  const res = await api.get(`/stock/logs?page=${page}`);
  return res.data;
};
export const downloadReport = async (type, startDate, endDate) => {
  const endpoint = type === 'daily' ? '/reports/daily' : '/reports/activities';
  const res = await api.get(endpoint, {
    params: { startDate, endDate },
    responseType: 'blob'
  });
  return res.data;
};
