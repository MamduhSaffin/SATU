export type ConnectivityState = 'online' | 'offline';

export function currentConnectivity(): ConnectivityState {
  if (typeof navigator === 'undefined') return 'offline';
  return navigator.onLine ? 'online' : 'offline';
}

export function subscribeConnectivity(
  listener: (state: ConnectivityState) => void,
): () => void {
  const online = () => listener('online');
  const offline = () => listener('offline');

  window.addEventListener('online', online);
  window.addEventListener('offline', offline);

  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
