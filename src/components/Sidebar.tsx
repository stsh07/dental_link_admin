// src/components/Sidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  UserCheck,
  Lock,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import LogoutPopup from "../popups/logoutPopup";
import dentalLinkLogo from "../assets/dentalLink_logo.svg";

const STORAGE_KEY = "sidebar:collapsed";
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  const onAppointmentsPath = useMemo(
    () => location.pathname.startsWith("/appointments"),
    [location.pathname]
  );
  const [appointmentsOpen, setAppointmentsOpen] = useState<boolean>(onAppointmentsPath);
  useEffect(() => setAppointmentsOpen(onAppointmentsPath), [onAppointmentsPath]);

  // Logout modal state
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLogoutOpen(true);
  };

  const doLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.dispatchEvent(new Event("auth-logout"));
      setLogoutOpen(false);
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const linkBase = `
    w-full flex items-center
    ${collapsed ? "justify-center px-0" : "px-6 justify-start"}
    py-3 text-left transition-colors rounded-none
  `;
  const linkActive = "bg-[#30B8DE] text-white";
  const linkInactive = "text-gray-700 hover:bg-gray-50";

  const subLinkBase = `
    w-full block
    ${collapsed ? "px-0 text-center" : "px-12 text-left"}
    py-3 transition-colors text-base rounded-none
  `;
  const subLinkActive = "bg-[#30B8DE] text-white";
  const subLinkInactive = "text-gray-600 hover:bg-gray-50";

  const NavItem = ({
    to,
    Icon,
    label,
  }: {
    to: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      title={collapsed ? label : undefined}
      end={to === "/dashboard"}
    >
      <Icon className={`w-5 h-5 ${collapsed ? "" : "mr-3"}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return (
    <aside
      className={`${collapsed ? "w-20" : "w-64"} bg-white shadow-sm relative flex flex-col transition-all duration-300 ease-in-out`}
      aria-label="Sidebar"
    >
      <div className={`p-6 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && <img src={dentalLinkLogo} alt="DentalLink Logo" className="h-6 w-auto" />}
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          className={`text-gray-600 hover:text-[#30B8DE] ${collapsed ? "mx-auto" : ""}`}
        >
          <Menu className={`${collapsed ? "w-5 h-5" : "w-6 h-6"}`} />
        </button>
      </div>

      <nav className={`${collapsed ? "mt-0" : "mt-2"} flex-1 space-y-1`}>
        <NavItem to="/dashboard" Icon={LayoutDashboard} label="Dashboard" />

        {collapsed ? (
          <NavItem to="/appointments/active" Icon={Calendar} label="Appointments" />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setAppointmentsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              aria-expanded={appointmentsOpen}
              aria-controls="appointments-submenu"
            >
              <span className="flex items-center">
                <Calendar className="w-5 h-5 mr-3" />
                Appointments
              </span>
              {appointmentsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {appointmentsOpen && (
              <div id="appointments-submenu" className="space-y-1">
                <NavLink
                  to="/appointments/active"
                  className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}
                >
                  Active Appointments
                </NavLink>
                <NavLink
                  to="/appointments/history"
                  className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}
                >
                  Appointments History
                </NavLink>
              </div>
            )}
          </>
        )}

        <NavItem to="/patients" Icon={Users} label="Patients" />
        <NavItem to="/services" Icon={Stethoscope} label="Services" />
        <NavItem to="/reviews" Icon={FileText} label="Reviews" />
        <NavItem to="/doctors" Icon={UserCheck} label="Doctors" />
        <NavItem to="/change-password" Icon={Lock} label="Change Password" />
      </nav>

      <button
        onClick={openLogout}
        className={`flex items-center w-full text-left ${collapsed ? "justify-center px-0" : "px-6 justify-start"} py-3 text-gray-700 hover:bg-gray-50 transition-colors`}
        title={collapsed ? "Logout" : undefined}
      >
        <LogOut className={`w-5 h-5 ${collapsed ? "" : "mr-3"}`} />
        {!collapsed && <span>Logout</span>}
      </button>

      {logoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <LogoutPopup
            onCancel={() => !loggingOut && setLogoutOpen(false)}
            onConfirm={doLogout}
            loading={loggingOut}
          />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
