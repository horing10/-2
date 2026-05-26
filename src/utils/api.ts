/**
 * Resolves the absolute URL for backend APIs when in relative modes,
 * automatically routing requests to port 3000 if accessed from alternative ports (e.g., 5173).
 */
export function getApiUrl(suffix: string): string {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // If a port is specified and is not 3000 (e.g., 5173), route to the backend server on port 3000.
    if (port && port !== '3000') {
      const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
      return `${protocol}//${hostname}:3000${cleanSuffix}`;
    }
  }
  return suffix;
}
