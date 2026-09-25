import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import CaseWorkspace from '../components/journey/CaseWorkspace';
import { FaArrowLeft } from 'react-icons/fa';

// /user/cases/:id, /advisor/cases/:id, /admin/cases/:id
export default function CaseWorkspacePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  return (
    <>
      <AppHeader breadcrumb="Case Workspace" action={<button className="ai-thm-btn outline" onClick={() => navigate(-1)}><FaArrowLeft /> Back</button>} />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <CaseWorkspace caseId={id} />
      </div>
    </>
  );
}
