import React from 'react';
import { User } from 'firebase/auth';

export type ActiveTab = 'executor' | 'notes' | 'awareness' | 'crypto';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  vaultUnlocked: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  authBusy: boolean;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'executor', label: 'Esecutore' },
  { id: 'notes', label: 'Note Private' },
  { id: 'awareness', label: 'Consapevolezza' },
  { id: 'crypto', label: 'Crittografia' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  user,
  vaultUnlocked,
  onGoogleSignIn,
  onGoogleSignOut,
  authBusy,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E6E4DD] bg-[#F8F7F4]/95 backdrop-blur-sm dark:border-[#1E232D] dark:bg-[#0B0D11]/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('executor')}
          className="font-display text-lg font-semibold tracking-tight text-[#14171C] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] dark:text-[#F1F3F5] whitespace-nowrap shrink-0"
        >
          [I] WHY
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isClickable = vaultUnlocked || item.id === 'crypto' || item.id === 'executor';
            const showUnderline = isActive && (vaultUnlocked || item.id === 'crypto');
            return (
              <button
                key={item.id}
                type="button"
                disabled={!isClickable}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
                  showUnderline
                    ? 'text-[#14171C] dark:text-[#F1F3F5]'
                    : 'text-[#5C6470] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:text-[#F1F3F5]'
                } ${!isClickable ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {item.label}
                {showUnderline && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-[#1D4ED8] dark:bg-[#60A5FA]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onGoogleSignOut}
              disabled={authBusy}
              className="rounded-lg border border-[#D4D0C7] bg-white px-4 py-2 text-xs font-medium text-[#14171C] transition-colors hover:bg-[#F2F0EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] disabled:opacity-50 dark:border-[#2A3140] dark:bg-[#141820] dark:text-[#F1F3F5] dark:hover:bg-[#1C222D] whitespace-nowrap shrink-0"
            >
              Esci da Google
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={authBusy}
              className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {authBusy ? 'Accesso...' : 'Accedi con Google'}
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row keeping header <= 15% mobile height */}
      <nav
        aria-label="Navigazione mobile"
        className="flex md:hidden items-center justify-between gap-2 overflow-x-auto border-t border-[#E6E4DD] px-4 py-1.5 dark:border-[#1E232D]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const isClickable = vaultUnlocked || item.id === 'crypto' || item.id === 'executor';
          const showUnderline = isActive && (vaultUnlocked || item.id === 'crypto');
          return (
            <button
              key={item.id}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectTab(item.id)}
              className={`px-1.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                showUnderline
                  ? 'text-[#1D4ED8] underline underline-offset-4 dark:text-[#60A5FA]'
                  : 'text-[#5C6470] dark:text-[#9CA3AF]'
              } ${!isClickable ? 'opacity-40' : ''}`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
