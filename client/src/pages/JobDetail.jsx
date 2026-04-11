import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const statusBadge = (s) => {
  const colors = {
    pending: 'bg-gray-200 text-gray-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
  };
  return colors[s] || 'bg-gray-200 text-gray-700';
};

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState([]);
  const pollRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/jobs/${id}`);
    setJob(data);
    if (!editing) setRows(data.rows);
    return data;
  };

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line
  }, [id]);

  // Auto-poll while running
  useEffect(() => {
    if (job?.status === 'running') {
      pollRef.current = setInterval(load, 2000);
      return () => clearInterval(pollRef.current);
    }
    // eslint-disable-next-line
  }, [job?.status]);

  if (!job) return <div className="text-gray-500">Loading…</div>;

  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  };

  const saveRows = async () => {
    await api.put(`/jobs/${id}/rows`, { rows });
    setEditing(false);
    load();
  };

  const runJob = async () => {
    if (!window.confirm(`Run bulk update for ${job.totalRows} posts on ${job.site?.name}?`)) return;
    await api.post(`/jobs/${id}/run`);
    load();
  };

  const rollback = async () => {
    if (!window.confirm('Roll back all successful changes from this job?')) return;
    await api.post(`/jobs/${id}/rollback`);
    load();
  };

  const downloadReport = async () => {
    const res = await api.get(`/jobs/${id}/report`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${id}-report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const progress =
    job.totalRows > 0
      ? Math.round(((job.successCount + job.failedCount) / job.totalRows) * 100)
      : 0;

  return (
    <div>
      <Link to="/bulk-update" className="text-sm text-indigo-600 mb-4 inline-block">
        ← New Bulk Update
      </Link>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{job.site?.name}</h1>
          <p className="text-sm text-gray-500">
            {job.site?.siteUrl} · plugin:{' '}
            <span className="font-mono text-indigo-600">{job.site?.detectedPlugin}</span>{' '}
            · status: <strong>{job.status}</strong>
          </p>
          <p className="text-sm mt-1 text-gray-700">
            {job.totalRows} rows · {job.successCount} success · {job.failedCount} failed
          </p>
        </div>
        <div className="space-x-2">
          {job.status === 'draft' && (
            <>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 border rounded-md text-sm"
              >
                {editing ? 'Cancel Edit' : 'Edit Rows'}
              </button>
              {editing && (
                <button
                  onClick={saveRows}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm"
                >
                  Save Edits
                </button>
              )}
              <button
                onClick={runJob}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
              >
                ▶ Run Bulk Update
              </button>
            </>
          )}
          {job.status === 'completed' && (
            <>
              <button
                onClick={downloadReport}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Download Report
              </button>
              <button
                onClick={rollback}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Rollback
              </button>
            </>
          )}
        </div>
      </div>

      {job.status === 'running' && (
        <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
          <p className="font-medium text-blue-900">Running… auto-refreshing every 2s</p>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-900 mt-1">{progress}% complete</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Meta Title</th>
              <th className="text-left p-3">Meta Description</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="p-3 text-indigo-600 max-w-xs truncate">{r.postUrl}</td>
                <td className="p-3">
                  {editing ? (
                    <input
                      value={r.newTitle || ''}
                      onChange={(e) => updateRow(i, 'newTitle', e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  ) : (
                    r.newTitle
                  )}
                </td>
                <td className="p-3">
                  {editing ? (
                    <input
                      value={r.newDescription || ''}
                      onChange={(e) => updateRow(i, 'newDescription', e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  ) : (
                    r.newDescription
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(r.status)}`}
                  >
                    {r.status}
                  </span>
                  {r.error && <p className="text-xs text-red-600 mt-1">{r.error}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
