import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { PeerUser } from '../types';

interface CursorOverlayProps {
  peers: PeerUser[];
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ peers }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {peers.map((peer) => (
        peer.cursor && (
          <motion.div
            key={peer.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              x: peer.cursor.x * window.innerWidth, 
              y: peer.cursor.y * window.innerHeight,
              opacity: 1,
              scale: 1
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 400,
              mass: 0.5
            }}
            className="absolute top-0 left-0 flex flex-col items-start"
          >
            <MousePointer2 
              size={24} 
              className="fill-current text-white drop-shadow-md"
              style={{ color: peer.color }} 
            />
            <div 
              className="ml-4 -mt-2 px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </div>
          </motion.div>
        )
      ))}
    </div>
  );
};
