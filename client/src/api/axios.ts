import axios from "axios";

let apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api",
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

//instance.defaults.headers.common["Authorization"] = AUTH_TOKEN;

export default apiClient;