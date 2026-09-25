import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { SCOPE_PAGES } from "../../utils/team";

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  // Limited team logins land on their first allowed page
  const allowed = SCOPE_PAGES[user?.admin_scope];
  if (allowed && !allowed.some(p => location.pathname.startsWith(p))) {
    return <Navigate to={allowed[0]} replace />;
  }

  return (
    <>
      {/* <div className="app-layout">
      <Sidebar />
      <div className="app-main"><Outlet /></div>
    </div> */}

      <div className=" all-tp-main-section">
        <Sidebar />
        <div className=" dashboard-right-side flex-grow-1 d-flex flex-column">
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
