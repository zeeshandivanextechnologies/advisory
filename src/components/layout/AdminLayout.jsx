import { Outlet} from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {

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
