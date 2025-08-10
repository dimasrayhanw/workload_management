// src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';

export const useWebSocket = (url: string) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => console.log('WebSocket closed');

    return () => ws.close();
  }, [url]);

  return data;
};