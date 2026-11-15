import React, { useEffect, useState } from 'react';

interface FramerSplashProps {
  onEnter: () => void;
}

const FRAMER_TEMPLATE_URL = 'https://left-jupiter-861053.framer.app';
const FADE_OUT_MS = 550;

// Staggered shutter delays (ms) matching Framer's Text Shutter character flicker cadence
const CHAR_SHUTTER_DELAYS_MS = [0, 95, 35, 130, 65, 165, 85, 150, 200];
const TITLE_CHARS = ['L', 'e', 't', "'", 's', ' ', 'T', 'a', 'l', 'k'];

const FramerArrowSvg: React.FC = () => (
  <svg
    viewBox="0 0 113.757 94"
    width="114"
    height="94"
    style={{ overflow: 'visible', display: 'block' }}
    aria-hidden="true"
  >
    <path
      d="M 66.757 0 L 113.757 47 L 66.757 94 M 0 46.5 L 110.268 46.5"
      fill="transparent"
      stroke="#000000"
      strokeWidth="14"
      strokeMiterlimit="10"
    />
  </svg>
);

export const FramerSplash: React.FC<FramerSplashProps> = ({ onEnter }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [shutterCycle, setShutterCycle] = useState(0);
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

  const handleEnterClick = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    window.setTimeout(() => {
      onEnter();
    }, FADE_OUT_MS);
  };

  const handleRowHoverStart = () => {
    if (!isRowHovered) {
      setIsRowHovered(true);
      setShutterCycle((c) => c + 1);
    }
  };

  const handleRowHoverEnd = () => {
    setIsRowHovered(false);
  };

  // On narrow viewports (< 768px), scale the Framer canvas cleanly so "Let's Talk",
  // the right arrow, and "WHY?" remain centered and fully visible without clipping.
  const isCompactViewport = viewport.width < 768;
  const stageWidth = isCompactViewport ? 760 : viewport.width;
  const scaleFactor = isCompactViewport ? viewport.width / 760 : 1;
  const stageVisibleHeight = viewport.height / scaleFactor;
  const iframeHeight = Math.round(stageVisibleHeight + 65);

  // Match Framer's exact flex-end layout:
  // bottom "WHY?" graphic has aspect ratio ~4.013 within (stageWidth - 40px),
  // preceded by a 100px flex gap and the 130px "Let's Talk" + arrow row.
  const whyGraphicHeight = Math.max(0, stageWidth - 40) / 4.013;
  const rowTopInIframe = Math.max(0, Math.round(iframeHeight - whyGraphicHeight - 100 - 130 - 16));

  let visibleCharIdx = 0;
  const shutterAnimName = shutterCycle % 2 === 0 ? 'framerTextShutterA' : 'framerTextShutterB';

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
      <style>{`
        @keyframes framerTextShutterA {
          0% { opacity: 1; }
          18% { opacity: 0; }
          38% { opacity: 1; }
          58% { opacity: 0; }
          80% { opacity: 0.25; }
          100% { opacity: 1; }
        }
        @keyframes framerTextShutterB {
          0% { opacity: 1; }
          18% { opacity: 0; }
          38% { opacity: 1; }
          58% { opacity: 0; }
          80% { opacity: 0.25; }
          100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .framer-shutter-char {
            animation: none !important;
          }
        }
      `}</style>

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
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: `${iframeHeight}px`,
            flexShrink: 0,
          }}
        >
          <iframe
            src={FRAMER_TEMPLATE_URL}
            title="Introduzione animata [I] WHY"
            allow="autoplay; fullscreen"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              backgroundColor: '#ffffff',
            }}
          />

          {/* Interactive animated "Let's Talk" + arrows row preserving Framer's exact hover shutter, arrow slide & underline animation */}
          <button
            type="button"
            onClick={handleEnterClick}
            onMouseEnter={handleRowHoverStart}
            onMouseLeave={handleRowHoverEnd}
            onFocus={handleRowHoverStart}
            onBlur={handleRowHoverEnd}
            aria-label="Let's Talk — Entra in [I] WHY"
            title="Entra in [I] WHY"
            style={{
              position: 'absolute',
              top: `${rowTopInIframe}px`,
              left: 0,
              right: 0,
              height: '162px',
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: 'none',
              margin: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              overflow: 'hidden',
              zIndex: 10,
              textAlign: 'left',
            }}
          >
            {/* Left animated group: sliding left arrow + shutter-animated "Let's Talk" + collapsing underline */}
            <div
              style={{
                position: 'relative',
                height: '130px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            >
              {/* Left Arrow sliding in on hover */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '130px',
                  height: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isRowHovered ? 'translateX(0px)' : 'translateX(-150px)',
                  opacity: isRowHovered ? 1 : 0,
                  transition:
                    'transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease',
                  pointerEvents: 'none',
                }}
              >
                <FramerArrowSvg />
              </div>

              {/* "Let's Talk" sliding right + Text Shutter flicker + collapsing black underline */}
              <div
                style={{
                  position: 'relative',
                  height: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  transform: isRowHovered ? 'translateX(148px)' : 'translateX(20px)',
                  transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    margin: 0,
                    padding: 0,
                    color: '#000000',
                    fontSize: '143px',
                    lineHeight: '1em',
                    fontWeight: 400,
                    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                    letterSpacing: '-0.05em',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    pointerEvents: 'none',
                  }}
                >
                  {TITLE_CHARS.map((ch, idx) => {
                    if (ch === ' ') {
                      return (
                        <span key={idx} style={{ display: 'inline-block', width: '0.26em' }}>
                          {' '}
                        </span>
                      );
                    }
                    const delay =
                      CHAR_SHUTTER_DELAYS_MS[visibleCharIdx % CHAR_SHUTTER_DELAYS_MS.length];
                    visibleCharIdx += 1;
                    return (
                      <span
                        key={idx}
                        className="framer-shutter-char"
                        style={{
                          display: 'inline-block',
                          animation: `${shutterAnimName} 280ms steps(1, end) ${delay}ms 1 both`,
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>

                {/* 1px black underline collapsing on hover */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: '-14px',
                    bottom: 0,
                    height: '1px',
                    backgroundColor: '#050505',
                    transformOrigin: 'right center',
                    transform: isRowHovered ? 'scaleX(0)' : 'scaleX(1)',
                    transition: 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            </div>

            {/* Right Arrow sliding out on hover */}
            <div
              aria-hidden="true"
              style={{
                width: '130px',
                height: '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transform: isRowHovered ? 'translateX(150px)' : 'translateX(0px)',
                opacity: isRowHovered ? 0 : 1,
                transition:
                  'transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease',
                pointerEvents: 'none',
              }}
            >
              <FramerArrowSvg />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
