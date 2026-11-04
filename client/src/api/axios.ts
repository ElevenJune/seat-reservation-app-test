import axios, {isAxiosError} from "axios";
import { type EventError } from "@server/constants/types";
import { toast } from 'react-hot-toast'

let apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api",
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const cleanMessage = getApiErrorMessage(error);
    console.error("[Global API Error]", cleanMessage);
    const skipToast = error.config?.skipToast
    if(!skipToast)
      toast.error(cleanMessage, {position:"bottom-right"})
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (err.response) {
      const errData = err.response.data as EventError;
      return errData.error || `Server error (${err.response.status})`;
    } 
    return "Server is not reachable.";
  }
  
  if (err instanceof Error) {
    return err.message;
  }

  return "Unexpected error";
}

//instance.defaults.headers.common["Authorization"] = AUTH_TOKEN;

export default apiClient;