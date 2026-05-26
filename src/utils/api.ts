/**
 * Resolves the absolute URL for backend APIs when in relative modes,
 * automatically routing requests to port 3000 if accessed from alternative ports (e.g., 5173).
 */
export function getApiUrl(suffix: string): string {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // If running in local environment on a non-backend port, proxy to 3000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && port !== '3000') {
        const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
        return `${protocol}//${hostname}:3000${cleanSuffix}`;
      }
    }
  }
  return suffix;
}
