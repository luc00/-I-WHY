import React, { useEffect, useState } from 'react';

interface FramerSplashProps {
  onEnter: () => void;
}

const FRAMER_TEMPLATE_URL = 'https://left-jupiter-861053.framer.app';
const FADE_OUT_MS = 550;

export const FramerSplash: React.FC<FramerSplashProps> = ({ onEnter }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleArrowClick = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    window.setTimeout(() => {
      onEnter();
    }, FADE_OUT_MS);
  };

  // On narrow viewports (< 768px), scale the Framer canvas cleanly so "Let's Talk",
  // the right arrow, and "WHY?" remain centered and fully visible without clipping.
  const isCompactViewport = viewport.width < 768;
  const stageWidth = isCompactViewport ? 760 : viewport.width;
  const scaleFactor = isCompactViewport ? viewport.width / 760 : 1;
  const stageVisibleHeight = viewport.height / scaleFactor;

  return (
    <div
      data-testid="framer-splash"
      role="region"
      aria-label="Schermata introduttiva [I] WHY"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Centered Framer wrapper cropped at the bottom by 65px to hide "Made in Framer" */}
      <div
        style={{
          position: 'relative',
          width: isCompactViewport ? `${stageWidth}px` : '100vw',
          height: isCompactViewport ? `${stageVisibleHeight}px` : '100vh',
          transform: isCompactViewport ? `scale(${scaleFactor})` : 'none',
          transformOrigin: 'center center',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}
      >
        <iframe
          src={FRAMER_TEMPLATE_URL}
          title="Introduzione animata [I] WHY"
          allow="autoplay; fullscreen"
          style={{
            width: '100%',
            height: isCompactViewport
              ? `${Math.round(stageVisibleHeight + 65)}px`
              : 'calc(100vh + 65px)',
            border: 'none',
            display: 'block',
            backgroundColor: '#ffffff',
          }}
        />

        {/* Transparent clickable hotspot positioned directly over "Let's Talk" */}
        <button
          type="button"
          onClick={handleArrowClick}
          aria-label="Let's Talk — Entra in [I] WHY"
          title="Entra in [I] WHY"
          style={{
            position: 'absolute',
            top: isCompactViewport
              ? `${Math.round((stageVisibleHeight + 65) * 0.4)}px`
              : 'calc((100vh + 65px) * 0.395)',
            left: '20px',
            width: isCompactViewport ? '530px' : 'min(560px, 55vw)',
            height: '148px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 10,
          }}
        />

        {/* Transparent clickable hotspot positioned directly over the black arrow next to "Let's Talk" */}
        <button
          type="button"
          onClick={handleArrowClick}
          aria-label="Entra in [I] WHY"
          title="Entra in [I] WHY"
          style={{
            position: 'absolute',
            top: isCompactViewport
              ? `${Math.round((stageVisibleHeight + 65) * 0.4)}px`
              : 'calc((100vh + 65px) * 0.395)',
            right: '16px',
            width: '148px',
            height: '148px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
};
