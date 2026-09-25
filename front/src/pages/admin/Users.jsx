import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, ConfirmModal } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { showToast } from '../../components/common/index';
import { FaUser } from 'react-icons/fa6';

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [meta,    setMeta]    = useState({ total: 0, page: 1, limit: 20 });
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { id, name, is_active }

  const load = useCallback((page = 1) => {
    setLoading(true);
    adminAPI.getUsers({ search, role: roleFilter, page, limit: 20 })
      .then(r => { setUsers(r.data.data); setMeta(r.data.meta); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { load(1); }, [load]);

  const toggleStatus = async () => {
    try {
      await adminAPI.toggleUserStatus(confirm.id);
      showToast(`User ${confirm.is_active ? 'deactivated' : 'activated'} successfully`);
      load(meta.page);
    } catch { showToast('Action failed', 'error'); }
    finally { setConfirm(null); }
  };

  return (
    <>
      <AppHeader breadcrumb="All Users" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>User Management</h4> 
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{meta.total} total users registered</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
              value={roleFilter} onChange={e => setRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="user">Users</option>
              <option value="advisor">Advisors</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">Registered Users</h5>
            <SearchInput value={search} onChange={v => setSearch(v)} placeholder="Search users…" />
          </div>

          {loading ? <Spinner /> : (
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Plan</th><th>Joined</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.length ? users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5>{u.full_name}</h5>
                      <p>{u.email}</p>
                      </div>
                    </td>
                    <td>{u.role}</td>
                    <td><Badge status={u.plan} /></td>
                    <td >{new Date(u.created_at).toLocaleDateString()}</td>
                    <td >
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
                    </td>
                    <td><Badge status={u.is_active ? 'active' : 'suspended'} /></td>
                    <td>
                      <button className="ai-thm-btn outline p-2"
                        onClick={() => setConfirm({ id: u.id, name: u.full_name, is_active: u.is_active })}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FaUser />} title="No users found" text="Try adjusting your search filters" /></td></tr>
                )}
              </tbody>
            </table>
            </div>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={toggleStatus}
        title={confirm?.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${confirm?.is_active ? 'deactivate' : 'activate'} ${confirm?.name}?`}
        danger={confirm?.is_active}
      />
    </>
  );
}
