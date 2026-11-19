import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';

export type AppTab = 'registrar' | 'historial' | 'conexion';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  isConnected: boolean;
  hasAppsScript: boolean;
  isDemoMode: boolean;
  onPrimaryAction: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isConnected,
  hasAppsScript,
  isDemoMode,
  onPrimaryAction,
}) => {
  const isSheetReady = !isDemoMode && (isConnected || hasAppsScript);

  return (
    <header className="sticky top-0 z-30 bg-[#F4F5F7]/92 backdrop-blur-md border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-12 lg:h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('registrar');
          }}
          className="font-display text-xl lg:text-2xl font-extrabold tracking-tight text-[#0D0F12] whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <span aria-hidden="true" className="inline-flex items-end gap-[3px] h-4">
            <span className="w-[3px] h-2 bg-[#0D0F12] -skew-x-12" />
            <span className="w-[3px] h-3 bg-[#0D0F12] -skew-x-12" />
            <span className="w-[3px] h-4 bg-[#0D0F12] -skew-x-12" />
          </span>
          RunTracker Sheets
        </a>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#525866]">
          <button
            type="button"
            onClick={() => onSelectTab('registrar')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'registrar'
                ? 'text-[#0D0F12] border-[#0D0F12] font-semibold'
                : 'border-transparent hover:text-[#0D0F12]'
            }`}
          >
            Registrar
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('historial')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'historial'
                ? 'text-[#0D0F12] border-[#0D0F12] font-semibold'
                : 'border-transparent hover:text-[#0D0F12]'
            }`}
          >
            Historial
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('conexion')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'conexion'
                ? 'text-[#0D0F12] border-[#0D0F12] font-semibold'
                : 'border-transparent hover:text-[#0D0F12]'
            }`}
          >
            Google Sheets
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="min-h-[36px] lg:min-h-[40px] px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 bg-[#0D0F12] text-white hover:bg-[#1E2229] active:scale-[0.98]"
          >
            {isSheetReady ? (
              <>
                <Cloud className="w-4 h-4 text-[#C6F806]" aria-hidden="true" />
                <span>{isConnected ? 'Sheets OAuth' : 'Apps Script'}</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                <span>{isDemoMode ? 'Modo demo' : 'Conectar Sheets'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
