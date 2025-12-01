import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardConfig, Dataset, PeerUser } from '../types';
import { COLORS } from '../constants';

const CHANNEL_NAME = 'spreadsheet-studio-sync';

type MessageType = 
  | 'HELLO' 
  | 'WELCOME' 
  | 'UPDATE_CONFIG' 
  | 'CURSOR_MOVE' 
  | 'LEAVE';

interface SyncMessage {
  type: MessageType;
  senderId: string;
  payload?: any;
}

export const useCollaboration = (
  dataset: Dataset | null,
  setDataset: (d: Dataset) => void,
  dashboardConfig: DashboardConfig | null,
  setDashboardConfig: (config: any, mode?: 'push' | 'replace') => void // Relaxed type to match useUndoRedo generic
) => {
  const [peers, setPeers] = useState<Map<string, PeerUser>>(new Map());
  const [myId] = useState(() => 'user-' + Math.random().toString(36).substring(2, 9));
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastCursorUpdate = useRef<number>(0);
  
  // Initialize Channel
  useEffect(() => {
    // Basic check for BroadcastChannel support
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const msg: SyncMessage = event.data;
      if (msg.senderId === myId) return;

      handleMessage(msg);
    };

    // Announce presence
    sendMessage('HELLO');

    // Cleanup
    return () => {
      sendMessage('LEAVE');
      channel.close();
    };
  }, []);

  // Broadcast Config Changes (Only if we initiated them)
  const broadcastConfigChange = useCallback((config: DashboardConfig) => {
    if (channelRef.current) {
        sendMessage('UPDATE_CONFIG', config);
    }
  }, []);

  // Mouse Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastCursorUpdate.current > 50) { // Throttle 50ms
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        sendMessage('CURSOR_MOVE', { x, y });
        lastCursorUpdate.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Helper to send messages
  const sendMessage = (type: MessageType, payload?: any) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type,
        senderId: myId,
        payload
      });
    }
  };

  const handleMessage = (msg: SyncMessage) => {
    switch (msg.type) {
      case 'HELLO':
        // New user joined. If we have data, welcome them with current state.
        updatePeer(msg.senderId, { lastActive: Date.now() });
        if (dataset && dashboardConfig) {
          sendMessage('WELCOME', { dataset, dashboardConfig });
        }
        break;

      case 'WELCOME':
        // We just joined, and someone sent us the state.
        if (!dataset && msg.payload.dataset) {
            console.log("Syncing Dataset from peer...");
            setDataset(msg.payload.dataset);
        }
        if (msg.payload.dashboardConfig) {
            // We use 'replace' to avoid adding initial sync to undo stack
            setDashboardConfig(msg.payload.dashboardConfig, 'replace'); 
        }
        break;

      case 'UPDATE_CONFIG':
        // Peer updated the dashboard
        if (msg.payload) {
            // Push to history so we can undo their changes if needed
            setDashboardConfig(msg.payload, 'push'); 
        }
        break;

      case 'CURSOR_MOVE':
        updatePeer(msg.senderId, { cursor: msg.payload, lastActive: Date.now() });
        break;

      case 'LEAVE':
        removePeer(msg.senderId);
        break;
    }
  };

  const updatePeer = (id: string, data: Partial<PeerUser>) => {
    setPeers(prev => {
      const newMap = new Map<string, PeerUser>(prev);
      const existing = newMap.get(id) || {
        id,
        name: `User ${id.substring(0, 4)}`,
        color: COLORS[newMap.size % COLORS.length],
        cursor: null,
        lastActive: Date.now()
      };
      newMap.set(id, { ...existing, ...data });
      return newMap;
    });
  };

  const removePeer = (id: string) => {
    setPeers(prev => {
      const newMap = new Map<string, PeerUser>(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  // Cleanup stale peers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPeers(prev => {
        let changed = false;
        const newMap = new Map<string, PeerUser>(prev);
        newMap.forEach((peer, id) => {
          if (now - peer.lastActive > 10000) { // 10s timeout
            newMap.delete(id);
            changed = true;
          }
        });
        return changed ? newMap : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    peers: Array.from(peers.values()),
    broadcastConfigChange
  };
};
