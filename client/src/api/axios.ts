import axios, {isAxiosError} from "axios";
import { type EventError } from "@server/constants/types";
import { SESSION_HEADER } from "@server/constants/routes";
import { toast } from 'react-hot-toast'
import { getOrCreateSessionId } from "../utils/utils";

// No default Content-Type: axios sets it itself when there is a body.
// Forcing it on a body-less POST makes Fastify reject the request (empty JSON body).
let apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api",
  timeout: 1000,
});

// Single place where the session is attached to requests.
apiClient.interceptors.request.use((config) => {
  config.headers.set(SESSION_HEADER, getOrCreateSessionId());
  return config;
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