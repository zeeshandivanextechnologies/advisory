import React from 'react';
import { ENGAGEMENT_STEPS } from '../../utils/journey';
import { FiCheck } from 'react-icons/fi';

// Same look as the Start a Business stepper (stepper / step-item / step-circle)
export default function EngagementStepper({ status }) {
  const current = ENGAGEMENT_STEPS.findIndex(s => s.key === status);
  return (
    <div className="case-step-box mb-3">
      <div className="stepper">
        {ENGAGEMENT_STEPS.map((s, i) => {
          const done   = status === 'completed' ? true : i < current;
          const active = i === current && status !== 'completed';
          return (
            <div key={s.key} className="step-item">
              <div className={`step-circle ${done ? 'done' : active ? 'active' : 'pending'}`}>{done ? <FiCheck /> : i + 1}</div>
              <span className="step-label">{s.label}</span>
              {i < ENGAGEMENT_STEPS.length - 1 && <div className="step-line" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
