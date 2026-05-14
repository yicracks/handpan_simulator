import React from 'react';
import { motion } from 'motion/react';
import { HANDPAN_MODELS, HandpanModelKey } from '../hooks/useHandpanSynth';

interface HandpanProps {
  onNoteClick: (index: number) => void;
  activeNotes: number[];
  model: HandpanModelKey;
  rotationAngle?: number;
}

export const Handpan: React.FC<HandpanProps> = ({ onNoteClick, activeNotes, model, rotationAngle = 0 }) => {
  const currentModel = HANDPAN_MODELS[model];
  
  // Calculate positions for outer notes (all notes except the first "Ding")
  const numOuter = currentModel.notes.length - 1;
  const radius = 126;
  
  // Perfectly Equal Spacing with Zig-Zag Mapping
  const outerNotes = Array.from({ length: numOuter }).map((_, i) => {
    const n = i + 1; // Note index 1 to numOuter
    
    // Zig-zag position index: 0, 1, -1, 2, -2, 3, -3...
    const posIndex = n % 2 === 0 ? n / 2 : -(n - 1) / 2;
    
    // Angle starting from bottom (PI/2)
    const angle = (Math.PI / 2) + (posIndex * (2 * Math.PI / numOuter));

    return {
      x: 200 + radius * Math.cos(angle),
      y: 200 + radius * Math.sin(angle),
      radius: Math.max(34, 48 - (numOuter * 0.6))
    };
  });

  return (
    <div className="relative flex justify-center items-center w-full max-w-[500px] aspect-square mx-auto">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-2xl transition-all duration-300"
      >
        <defs>
          <radialGradient id="bodyGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={currentModel.bodyColor[0]} />
            <stop offset="70%" stopColor={currentModel.bodyColor[1]} />
            <stop offset="100%" stopColor={currentModel.bodyColor[2]} />
          </radialGradient>
          <radialGradient id="noteGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Rotatable Group */}
        <g style={{ transform: `rotate(${rotationAngle}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.1s ease-out' }}>
          {/* Main Body */}
          <circle
            cx="200"
            cy="200"
            r="190"
            fill="url(#bodyGradient)"
            className="stroke-[2] stroke-white/10"
          />

          {/* Central "Ding" */}
          <g>
            <motion.circle
              cx="200"
              cy="200"
              r="55"
              fill="url(#noteGradient)"
              stroke={activeNotes.includes(0) ? "#fff" : "rgba(255,255,255,0.1)"}
              strokeWidth="2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNoteClick(0)}
              className="cursor-pointer transition-colors duration-200"
            />
            <text
              x="200"
              y="205"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="rgba(255,255,255,0.4)"
              className="pointer-events-none font-sans"
              style={{ transform: `rotate(${-rotationAngle}deg)`, transformOrigin: `200px 200px` }}
            >
              0
            </text>
          </g>

          {/* Outer Notes */}
          {outerNotes.map((pos, i) => {
            const index = i + 1;
            const isActive = activeNotes.includes(index);
            return (
              <g key={index}>
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.radius}
                  fill="url(#noteGradient)"
                  stroke={isActive ? "#fff" : "rgba(255,255,255,0.1)"}
                  strokeWidth="2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNoteClick(index)}
                  className="cursor-pointer transition-colors duration-200"
                />
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill="rgba(255,255,255,0.4)"
                  className="pointer-events-none font-sans"
                  style={{ transform: `rotate(${-rotationAngle}deg)`, transformOrigin: `${pos.x}px ${pos.y}px` }}
                >
                  {index}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className={`absolute inset-0 pointer-events-none opacity-30 bg-radial from-current via-transparent to-transparent -z-10 rounded-full blur-3xl transition-colors duration-1000 ${currentModel.color}`} />
    </div>
  );
};
