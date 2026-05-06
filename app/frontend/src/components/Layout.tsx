import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  FileBarChart,
  History,
  MapPin,
  Shield,
  Radio,
  Building2,
  Layers,
  ScanFace,
  FileSearch,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/monitor', label: 'Monitoramento', icon: Monitor },
  { path: '/cameras', label: 'Câmeras', icon: Radio },
  { path: '/reports', label: 'Relatórios', icon: FileBarChart },
  { path: '/history', label: 'Histórico', icon: History },
  { path: '/zones', label: 'Zonas', icon: MapPin },
  { path: '/sectors', label: 'Setores', icon: Building2 },
  { path: '/groups', label: 'Grupos', icon: Layers },
  { path: '/facial-recognition', label: 'Rec. Facial', icon: ScanFace },
  { path: '/facial-reports', label: 'Rel. Facial', icon: FileSearch },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0F172A] text-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E293B] border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-lg font-bold">Scopum Tech</h1>
              <p className="text-xs text-slate-400">Vídeo Monitoramento</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">Sistema Ativo</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}