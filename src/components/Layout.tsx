import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useState } from 'react';
import simboloDourado from '@/assets/SimboloDourado.svg';
import simboloBranco from '@/assets/SimboloBranco.svg';

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const handleSetCollapsed = (v: boolean) => {
    setIsSidebarCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  };

  const sidebarW = isSidebarCollapsed ? 64 : 256;

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={handleSetCollapsed}
        />
        {/* Spacer que empurra o conteúdo para a direita da sidebar fixa no desktop */}
        <div
          className="hidden xl:block shrink-0 transition-all duration-200"
          style={{ width: sidebarW }}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Símbolo decorativo de fundo */}
          <img src={simboloDourado} aria-hidden="true" className="block dark:hidden absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] lg:h-[90%] w-auto opacity-[0.07] pointer-events-none select-none" />
          <img src={simboloBranco} aria-hidden="true" className="hidden dark:block absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] lg:h-[90%] w-auto opacity-[0.03] pointer-events-none select-none" />
          <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 xl:pb-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <BottomNav onMenuOpen={() => setIsSidebarOpen(true)} />
    </div>
  );
};
