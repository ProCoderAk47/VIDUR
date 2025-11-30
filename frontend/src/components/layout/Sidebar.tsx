import { NavLink } from '@/components/NavLink';
import { 
  LayoutDashboard, 
  Scale, 
  CalendarDays,
  Calendar as CalendarList,
  FileSearch, 
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const Sidebar = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/cases', icon: Scale, label: 'Cases' },
    { to: '/schedule', icon: CalendarList, label: 'Schedule' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/evidence', icon: FileSearch, label: 'Evidence Checker' },
    { to: '/ai-analysis', icon: Sparkles, label: 'AI Analysis' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/vidur logo.jpg" 
            alt="VIDUR Logo" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-bold text-lg text-foreground">VIDUR</h1>
            <p className="text-xs text-muted-foreground">Legal Assistant</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-border">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-foreground">{user?.username}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          onClick={() => logout()}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
