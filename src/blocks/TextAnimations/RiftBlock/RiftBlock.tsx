import React, { memo, useMemo } from 'react';
import './RiftBlock.css';

interface RiftBlockProps {
  text: string;
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
  /** NEW: choose your font */
  fontFamily?: string;
}

const RiftBlock = memo(function RiftBlock({
  text,
  fontSize = 80,
  color = '#FF1E00FF',
  strokeColor = '#151515',
  strokeWidth = 6,
  className = '',
  fontFamily = `"Love Ya Like A Sister", cursive`
}: RiftBlockProps) {
  // Better unique ID so multiple identical texts don't share the same filter
  const filterId = useMemo(() => {
    const base = text.replace(/\s+/g, '-').toLowerCase();
    const rnd = Math.random().toString(36).slice(2, 7);
    return `rift-${base}-${rnd}`;
  }, [text]);

  const randomOffset1 = Math.random() * 2;
  const randomOffset2 = Math.random() * 2;
  const randomOffset3 = Math.random() * 2;
  const randomOffset4 = Math.random() * 2;
  const randomOffset5 = Math.random() * 2;
  const randomOffset6 = Math.random() * 2;

  return (
    <div className={`rift-block-wrapper ${className}`}>
      <svg
        className="rift-block-svg"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute' }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.028 0.05"
              numOctaves="3"
              seed="7"
              stitchTiles="stitch"
              result="noise"
            >
              <animate attributeName="baseFrequency" values="0.028 0.05; 0.04 0.06; 0.022 0.042; 0.035 0.058; 0.028 0.05" dur="2.7s" begin={`${randomOffset1}s`} repeatCount="indefinite" />
              <animate attributeName="baseFrequency" values="0.028 0.05; 0.032 0.053; 0.025 0.048; 0.028 0.05" dur="1.9s" begin={`${randomOffset2}s`} repeatCount="indefinite" additive="sum" />
              <animate attributeName="seed" values="7; 15; 23; 31; 42; 28; 19; 7" dur="1.3s" begin={`${randomOffset3}s`} repeatCount="indefinite" />
              <animate attributeName="seed" values="50; 65; 80; 95; 110; 50" dur="2.1s" begin={`${randomOffset4}s`} repeatCount="indefinite" additive="sum" />
            </feTurbulence>

            <feGaussianBlur in="noise" stdDeviation="0.6" result="softNoise" />

            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            >
              <animate attributeName="scale" values="5; 8; 4; 9; 6; 5" dur="0.8s" begin={`${randomOffset5}s`} repeatCount="indefinite" />
              <animate attributeName="scale" values="0; 2; -1; 3; 0" dur="1.5s" begin={`${randomOffset6}s`} repeatCount="indefinite" additive="sum" />
            </feDisplacementMap>

            <feComponentTransfer in="displaced" result="final">
              <feFuncA type="gamma" amplitude="1" exponent="0.9" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div
        className="rift-block-text"
        style={{
          fontFamily: fontFamily,
          fontWeight: 400,
          fontSynthesis: 'none',
          // (keep your existing styles)
          fontSize: `${fontSize}px`,
          color,
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          textShadow: `
    ${strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
    -${strokeWidth}px -${strokeWidth}px 0 ${strokeColor},
    ${strokeWidth}px -${strokeWidth}px 0 ${strokeColor},
    -${strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
    0 ${strokeWidth}px 0 ${strokeColor},
    ${strokeWidth}px 0 0 ${strokeColor},
    0 -${strokeWidth}px 0 ${strokeColor},
    -${strokeWidth}px 0 0 ${strokeColor}
  `,
          filter: `url(#${filterId})`,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision',
        }}
      >
        {text}
      </div>
    </div>
  );
});

export default RiftBlock;
