import React from 'react';
import { Activity, ListChecks, Sheet } from 'lucide-react';
import type { AppTab } from './Header';

interface MobileNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  workoutCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  workoutCount,
}) => {
  const tabs: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'registrar',
      label: 'Registrar',
      icon: <Activity className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'historial',
      label: workoutCount > 0 ? `Historial (${workoutCount})` : 'Historial',
      icon: <ListChecks className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'conexion',
      label: 'Sheets',
      icon: <Sheet className="w-5 h-5" aria-hidden="true" />,
    },
  ];

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F12]/96 backdrop-blur-md border-t border-white/10 pb-safe"
    >
      <div className="grid grid-cols-3 h-[60px] items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                active ? 'text-[#C6F806]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] font-semibold tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
