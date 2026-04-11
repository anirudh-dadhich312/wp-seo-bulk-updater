import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('');

  useEffect(() => {
    api.get('/sites').then((r) => setSites(r.data));
  }, []);

  useEffect(() => {
    const params = siteId ? { siteId } : {};
    api.get('/audit', { params }).then((r) => setLogs(r.data));
  }, [siteId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Audit Log</h1>

      <div className="mb-4">
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="border rounded-md px-3 py-2 bg-white"
        >
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Post URL</th>
              <th className="text-left p-3">Field</th>
              <th className="text-left p-3">Old → New</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 && (
              <tr>
                <td colSpan="7" className="p-4 text-gray-500">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log._id}>
                <td className="p-3 text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-3">{log.site?.name}</td>
                <td className="p-3 text-indigo-600 max-w-xs truncate">{log.postUrl}</td>
                <td className="p-3">{log.field}</td>
                <td className="p-3 text-xs max-w-md">
                  <div className="text-red-600 line-through truncate">{log.oldValue || '∅'}</div>
                  <div className="text-green-600 truncate">{log.newValue || '∅'}</div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      log.action === 'rollback'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{log.performedBy?.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
