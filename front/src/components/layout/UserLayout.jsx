import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { notifAPI } from '../../services/api';

export default function UserLayout() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    notifAPI.list({ limit: 1 }).then(r => setUnread(r.data.meta?.unread || 0)).catch(() => {});
  }, []);
  return (
    <>
    {/* <div className="all-tp-main-section">
      <Sidebar unread={unread} />
      <div className="app-main"><Outlet /></div>
    </div> */}

     <div className=" all-tp-main-section">
  <Sidebar unread={unread} />
  <div className=" dashboard-right-side flex-grow-1 d-flex flex-column">
     <Outlet />
  </div>
</div>

    </>
  );
}
