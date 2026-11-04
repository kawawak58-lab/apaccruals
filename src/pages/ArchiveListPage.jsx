import React, { useEffect, useState } from 'react';
import AllAccrualsPage from './AllAccrualsPage';
import { listAccrualSetups, formatDisplayDate } from '../lib/AccrualSetup';
import { canViewArchives } from '../lib/access';

export default function ArchiveListPage({ currentUser }) {
  const [setups, setSetups] = useState([]);
  const [setupId, setSetupId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!canViewArchives(currentUser)) return;
    let cancelled = false;
    listAccrualSetups().then((rows) => { if (!cancelled) setSetups(rows.filter((row) => row.is_archived)); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [currentUser]);
  if (!canViewArchives(currentUser)) return <div className="contentPage"><div className="inlineError">You do not have access to Archive List.</div></div>;
  const setupSelector = <>
    <div className="archiveSetupSelector">
      <select aria-label="Accrual Setup" title="Accrual Setup" className="select" value={setupId} onChange={(event) => setSetupId(event.target.value)}>
        <option value="">All archived setups</option>
        {setups.map((setup) => <option key={setup.id} value={setup.id}>{setup.name} · {formatDisplayDate(setup.cutoff_date)}</option>)}
      </select>
      {error && <div className="inlineError" role="alert">{error}</div>}
    </div>
  </>;
  return <AllAccrualsPage key={setupId || 'all-archived'} currentUser={currentUser} archived setupId={setupId} beforeFilters={setupSelector} />;
}
