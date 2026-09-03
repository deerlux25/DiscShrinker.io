const configuredServerUrl = import.meta.env.VITE_COMPRESSION_SERVER_URL;

export const SERVER_URL = configuredServerUrl
  ? (configuredServerUrl.startsWith("http") ? configuredServerUrl : `https://${configuredServerUrl}`)
  : "http://localhost:3001";
