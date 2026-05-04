import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useState } from 'react';

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
    <div className="min-h-screen bg-background">
      <div className="flex">
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
        <div className="flex-1 flex flex-col min-w-0">
          <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
