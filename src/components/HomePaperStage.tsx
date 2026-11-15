import React, { useEffect, useRef, useState } from 'react';

interface HomePaperStageProps {
  children: React.ReactNode;
}

const FOLD_TEXTURE_LIGHT =
  'linear-gradient(180deg, #ffffff 0%, #fdfeff 31%, #f8fafc 33.4%, #ffffff 34.4%, #ffffff 65%, #f8fafc 67%, #ffffff 68%, #ffffff 100%)';

const FOLD_TEXTURE_DARK =
  'linear-gradient(180deg, #12161e 0%, #141923 31%, #0f131b 33.4%, #12161e 34.4%, #12161e 65%, #0f141c 67%, #12161e 68%, #12161e 100%)';

export const HomePaperStage: React.FC<HomePaperStageProps> = ({ children }) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [discoverPulse, setDiscoverPulse] = useState(0);
  const [isDiscoverAnimating, setIsDiscoverAnimating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotion();
    mediaQuery.addEventListener('change', syncMotion);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', syncMotion);
    };
  }, []);

  useEffect(() => {
    if (discoverPulse === 0 || prefersReducedMotion) return;
    setIsDiscoverAnimating(true);
    const timer = window.setTimeout(() => {
      setIsDiscoverAnimating(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [discoverPulse, prefersReducedMotion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || isInputFocused || isDiscoverAnimating || e.pointerType === 'touch') {
      return;
    }
    const el = sheetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const rotY = Math.max(-1.6, Math.min(1.6, nx * 1.6)).toFixed(2);
    const rotX = Math.max(-1.4, Math.min(1.4, -ny * 1.4)).toFixed(2);

    el.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
  };

  const resetTilt = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    }
  };

  const handleFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      setIsInputFocused(true);
      resetTilt();
    }
  };

  const handleBlurCapture = () => {
    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      const stillInside = Boolean(
        sheetRef.current &&
          active &&
          sheetRef.current.contains(active) &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
      );
      setIsInputFocused(stillInside);
    });
  };

  const handleTapAndDiscover = () => {
    setDiscoverPulse((c) => c + 1);
    resetTilt();
    if (sheetRef.current) {
      sheetRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      const firstInput = sheetRef.current.querySelector<HTMLElement>(
        '#why-query-input, #vault-passphrase, textarea, input'
      );
      if (firstInput) {
        window.setTimeout(() => {
          firstInput.focus({ preventScroll: true });
        }, 180);
      }
    }
  };

  return (
    <section
      data-testid="home-paper-stage"
      className="relative min-h-[calc(100vh-105px)] w-full overflow-x-hidden pb-20 pt-8 sm:pt-10"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0D1929 0%, #112236 32%, #0D141E 68%, #0B0D11 100%)'
          : 'linear-gradient(180deg, #C3ECFA 0%, #DAF4FC 28%, #EDF9FE 58%, #FFFFFF 88%, #FFFFFF 100%)',
      }}
    >
      <style>{`
        @keyframes homeFloatDoodle {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-5px) rotate(2.5deg); }
        }
        @keyframes homeArrowNudge {
          0%, 100% { transform: translate(0px, 0px) rotate(76deg); }
          50% { transform: translate(4px, 2px) rotate(79deg); }
        }
        @keyframes homeSheetEnter {
          0% { opacity: 0; transform: perspective(1200px) translateY(22px) rotateZ(-0.7deg) scale(0.985); }
          100% { opacity: 1; transform: perspective(1200px) translateY(0px) rotateZ(0deg) scale(1); }
        }
        @keyframes homeSheetDiscover {
          0% { transform: perspective(1200px) translateY(0px) rotateZ(0deg) scale(1); }
          32% { transform: perspective(1200px) translateY(-6px) rotateZ(-0.9deg) scale(1.012); }
          68% { transform: perspective(1200px) translateY(2px) rotateZ(0.5deg) scale(0.996); }
          100% { transform: perspective(1200px) translateY(0px) rotateZ(0deg) scale(1); }
        }
        @keyframes homeDoodleDriftA {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes homeDoodleDriftB {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(4px) rotate(-3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-anim-float, .home-anim-arrow, .home-anim-sheet-enter, .home-anim-discover, .home-anim-drift-a, .home-anim-drift-b {
            animation: none !important;
          }
        }
      `}</style>

      {/* Atmospheric drifting soft sky clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden"
      >
        <div
          className="absolute -left-24 top-6 h-56 w-[440px] rounded-full blur-3xl"
          style={{
            background: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.65)',
          }}
        />
        <div
          className="absolute right-[-60px] top-14 h-64 w-[520px] rounded-full blur-3xl"
          style={{
            background: isDark ? 'rgba(96, 165, 250, 0.07)' : 'rgba(255, 255, 255, 0.72)',
          }}
        />
        <div
          className="absolute left-1/2 top-28 h-48 w-[640px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: isDark ? 'rgba(148, 163, 184, 0.05)' : 'rgba(255, 255, 255, 0.55)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* Top floating hand-drawn "?" doodle & "Why I do it?" headline */}
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="home-anim-float mb-3 select-none"
            style={{ animation: 'homeFloatDoodle 4.5s ease-in-out infinite' }}
          >
            <svg
              width="48"
              height="56"
              viewBox="0 0 64 76"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#14171C] dark:text-[#E2E8F0]"
            >
              <path
                d="M19 25C19 14.5 27.5 8 37.5 8C47.5 8 54 14 54 22.5C54 31 44.5 34.5 39 39.5C35.8 42.4 35.5 46 35.5 49"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 24.5C15 12 25 4.5 37.5 4.5C50 4.5 58 12.2 58 22.8C58 32.8 47.5 36.8 41.5 41.8C38.8 44.1 38.6 47.2 38.6 49.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.7"
              />
              <rect
                x="31.5"
                y="57.5"
                width="9.5"
                height="9.5"
                rx="1.8"
                transform="rotate(-8 31.5 57.5)"
                stroke="currentColor"
                strokeWidth="2.8"
              />
            </svg>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-[#111317] sm:text-[46px] sm:leading-[1.08] dark:text-[#F8FAFC] [text-wrap:balance]">
            Why I do it?
          </h1>
        </div>

        {/* Central stage: Lateral "Tap and discover" arrow + Interactive folded white paper sheet */}
        <div className="relative mx-auto mt-8 max-w-[960px] sm:mt-10">
          {/* Lateral handwritten callout + hand-drawn arrow pointing to the sheet */}
          <div className="mb-4 flex items-center justify-start min-[1360px]:mb-0 min-[1360px]:block">
            <button
              type="button"
              onClick={handleTapAndDiscover}
              className="group relative inline-flex flex-col items-start text-left transition-transform duration-200 hover:translate-x-1 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] min-[1360px]:absolute min-[1360px]:-left-[164px] min-[1360px]:top-8 min-[1360px]:z-20"
            >
              <span
                className="inline-block -rotate-[9deg] text-[24px] font-bold leading-none text-[#252525] transition-colors group-hover:text-[#1D4ED8] sm:text-[26px] dark:text-[#E2E8F0] dark:group-hover:text-[#60A5FA]"
                style={{ fontFamily: "'Caveat', 'Fraunces', cursive" }}
              >
                Tap and discover
              </span>
              <svg
                aria-hidden="true"
                width="54"
                height="54"
                viewBox="0 0 48 45"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="home-anim-arrow ml-10 mt-1 text-[#262626] dark:text-[#CBD5E1]"
                style={{ animation: 'homeArrowNudge 2.6s ease-in-out infinite' }}
              >
                <path
                  d="M 38.275 34.58 C 36.139 37.77 33.092 40.569 29.995 42.203 C 27.541 43.492 24.334 44.391 20.979 44.742 C 18.135 45.037 15.058 45.082 12.835 44.862 C 10.52 44.63 8.393 44.178 5.213 43.254 C 1.474 42.171 0.45 41.716 0.094 40.99 C -0.03 40.741 -0.032 40.641 0.09 40.433 L 0.241 40.174 L 0.909 40.486 C 1.566 40.8 1.897 40.901 5.876 41.914 C 9.259 42.785 11.265 43.118 13.896 43.254 C 18.42 43.49 23.432 42.839 26.648 41.58 C 29.826 40.337 32.55 38.244 35.073 35.127 C 35.381 34.739 35.947 33.856 36.623 32.7 C 37.785 30.694 38.202 29.776 38.726 28.009 C 39.79 24.376 39.774 21.649 38.646 15.571 C 38.421 14.366 37.788 11.821 37.698 11.77 C 37.675 11.757 37.577 11.977 37.482 12.259 C 37.226 13.023 37.007 13.362 36.599 13.614 C 36.176 13.877 35.534 13.896 35.121 13.661 C 34.499 13.306 34.275 12.645 34.394 11.517 C 34.432 11.213 34.543 9.586 34.645 7.906 C 34.848 4.532 34.919 3.931 35.268 2.598 C 35.686 0.978 36.279 0.22 37.257 0.036 C 38.121 -0.124 38.94 0.254 39.489 1.061 C 39.641 1.296 40.036 2.144 40.363 2.953 C 41.05 4.669 41.273 5.092 41.984 6.031 C 42.656 6.918 43.646 7.927 45.335 9.453 C 48.301 12.113 48.162 11.974 47.831 12.062 C 47.428 12.168 44.499 11.002 42.953 10.121 C 41.865 9.501 41.245 9.039 40.342 8.188 C 39.986 7.857 39.692 7.59 39.68 7.593 C 39.668 7.596 39.854 8.048 40.096 8.592 C 41.164 11.009 42.178 16.083 42.417 20.241 C 42.607 23.63 42.197 26.263 40.966 29.464 C 40.302 31.2 39.42 32.861 38.275 34.58 Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Interactive 3D perspective container for the central white folded sheet */}
          <div style={{ perspective: '1200px' }}>
            <div
              ref={sheetRef}
              data-testid="home-paper-sheet"
              data-discover-count={discoverPulse}
              onPointerMove={handlePointerMove}
              onPointerLeave={resetTilt}
              onFocusCapture={handleFocusCapture}
              onBlurCapture={handleBlurCapture}
              style={{
                transformStyle: 'preserve-3d',
                backgroundImage: isDark ? FOLD_TEXTURE_DARK : FOLD_TEXTURE_LIGHT,
                transition: 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                animation: isDiscoverAnimating
                  ? 'homeSheetDiscover 520ms cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'homeSheetEnter 460ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="home-anim-sheet-enter relative z-10 w-full rounded-[4px] border border-black/[0.05] bg-white p-6 shadow-[0_24px_60px_-14px_rgba(14,21,23,0.14),0_4px_20px_rgba(14,21,23,0.06)] sm:p-10 dark:border-white/[0.08] dark:bg-[#12161E] dark:shadow-[0_24px_60px_-14px_rgba(0,0,0,0.55)]"
            >
              {/* Subtle horizontal folded-letter crease lines */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[33.5%] h-px bg-black/[0.022] dark:bg-white/[0.03]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[67%] h-px bg-black/[0.02] dark:bg-white/[0.025]"
              />

              {/* Existing Home contents rendered natively inside the white sheet */}
              <div className="relative z-10">{children}</div>
            </div>
          </div>

          {/* Framing hand-drawn doodles around the lower sky / white sheet edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none relative mx-auto mt-10 flex max-w-[960px] items-center justify-between px-4 text-[#1E232D] opacity-85 sm:px-10 dark:text-[#94A3B8]"
          >
            {/* Crescent moon & star */}
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              className="home-anim-drift-a"
              style={{ animation: 'homeDoodleDriftA 5.2s ease-in-out infinite' }}
            >
              <path
                d="M27.5 10.5C19.8 11.4 14 18.1 14.5 26C15 33.9 21.6 39.8 29.5 39.3C33.4 39.1 36.8 37.3 39.2 34.6C32.4 35.1 26.5 30 26 23.2C25.6 18.2 28.4 13.7 32.5 11.4C30.9 10.7 29.2 10.4 27.5 10.5Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M36 14V20M33 17H39"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>

            {/* Hand-drawn heart */}
            <svg
              width="38"
              height="38"
              viewBox="0 0 48 48"
              fill="none"
              className="home-anim-drift-b mt-6"
              style={{ animation: 'homeDoodleDriftB 4.6s ease-in-out infinite' }}
            >
              <path
                d="M24 39C24 39 10 29.6 10 19.2C10 14.4 13.7 11 18.2 11C21 11 23.1 12.6 24 14.5C24.9 12.6 27 11 29.8 11C34.3 11 38 14.4 38 19.2C38 29.6 24 39 24 39Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Little star */}
            <svg
              width="34"
              height="34"
              viewBox="0 0 48 48"
              fill="none"
              className="home-anim-drift-a mt-10 hidden sm:block"
              style={{ animation: 'homeDoodleDriftA 3.9s ease-in-out infinite' }}
            >
              <path
                d="M24 11L27.6 19.4L36.8 20.2L29.8 26.2L32 35.2L24 30.4L16 35.2L18.2 26.2L11.2 20.2L20.4 19.4L24 11Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Little daisy flower */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 48 48"
              fill="none"
              className="home-anim-drift-b mt-5"
              style={{ animation: 'homeDoodleDriftB 5.5s ease-in-out infinite' }}
            >
              <circle cx="24" cy="24" r="4.2" stroke="currentColor" strokeWidth="2.2" />
              <path
                d="M24 19.5C24 14 27.5 11.5 29.5 13.5C31.5 15.5 28.5 19.8 27 21.2M27.8 24C33 23.5 36 27 34 29C32 31 27.5 28.5 26 27M24 28.5C24 34 20.5 36.5 18.5 34.5C16.5 32.5 19.5 28.2 21 26.8M20.2 24C15 24.5 12 21 14 19C16 17 20.5 19.5 22 21M22 20.5C19 16 20 12 22.8 12C25 12 25.5 16 24.5 19.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Smiling little cloud */}
            <svg
              width="58"
              height="42"
              viewBox="0 0 68 48"
              fill="none"
              className="home-anim-drift-a"
              style={{ animation: 'homeDoodleDriftA 5.8s ease-in-out infinite' }}
            >
              <path
                d="M19 37H50C55.5 37 59.5 33 59.5 28C59.5 23.3 56 19.6 51.3 19.1C49.6 13.5 44.3 9.5 38 9.5C31.3 9.5 25.8 13.9 24.3 20C23.5 19.8 22.7 19.7 21.8 19.7C15.8 19.7 11 24.4 11 30.2C11 34 14.3 37 19 37Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M29 25.5C29.5 24.5 30.8 24.5 31.3 25.5M39.5 25.5C40 24.5 41.3 24.5 41.8 25.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M32 29.5C33.8 31.3 37 31.3 38.8 29.5"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
