import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const pluginBadge = (p) => {
  const colors = {
    yoast: 'bg-purple-100 text-purple-700',
    rankmath: 'bg-blue-100 text-blue-700',
    aioseo: 'bg-green-100 text-green-700',
    generic: 'bg-gray-100 text-gray-700',
    unknown: 'bg-yellow-100 text-yellow-700',
  };
  return colors[p] || 'bg-gray-100 text-gray-700';
};

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = () => api.get('/sites').then((r) => setSites(r.data));

  useEffect(() => {
    load();
  }, []);

  const redetect = async (id) => {
    setBusy(id);
    try {
      await api.post(`/sites/${id}/redetect`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this site? This cannot be undone.')) return;
    await api.delete(`/sites/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Client Sites</h1>
        <Link
          to="/sites/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Add Site
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow divide-y">
        {sites.length === 0 && (
          <p className="p-6 text-gray-500">
            No sites yet — add your first client site to start bulk updating.
          </p>
        )}
        {sites.map((site) => (
          <div key={site._id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{site.name}</p>
              <p className="text-sm text-gray-500">{site.siteUrl}</p>
              <p className="text-xs mt-1">
                Plugin:{' '}
                <span
                  className={`px-2 py-0.5 rounded font-mono ${pluginBadge(site.detectedPlugin)}`}
                >
                  {site.detectedPlugin}
                </span>
              </p>
            </div>
            <div className="space-x-3 text-sm">
              <button
                onClick={() => redetect(site._id)}
                disabled={busy === site._id}
                className="text-indigo-600 hover:underline"
              >
                {busy === site._id ? 'Detecting…' : 'Redetect'}
              </button>
              <Link to={`/sites/${site._id}/edit`} className="text-gray-600 hover:underline">
                Edit
              </Link>
              <button
                onClick={() => remove(site._id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
