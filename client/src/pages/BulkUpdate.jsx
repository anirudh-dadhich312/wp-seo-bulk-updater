import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function BulkUpdate() {
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get('/sites').then((r) => setSites(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('siteId', siteId);
      fd.append('file', file);
      const { data } = await api.post('/jobs/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      nav(`/jobs/${data._id}`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">New Bulk Update</h1>
      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow space-y-4">
        {err && <p className="text-red-600 text-sm">{err}</p>}

        <div>
          <label className="block text-sm font-medium mb-1">Client Site</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 bg-white"
          >
            <option value="">— choose a site —</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.detectedPlugin})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            required
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-2">
            Required columns: <code className="bg-gray-100 px-1 rounded">post_url, meta_title, meta_description</code>
          </p>
        </div>

        <button
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Uploading…' : 'Upload & Preview'}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-md text-sm">
        <p className="font-medium text-blue-900 mb-2">CSV Format Example</p>
        <pre className="text-xs text-blue-900 font-mono overflow-x-auto">
{`post_url,meta_title,meta_description
https://clientsite.com/best-shoes/,"Best Running Shoes 2025","Reviewed 50 running shoes..."
https://clientsite.com/headphones/,"Top 10 Headphones","Our expert picks for 2025"`}
        </pre>
      </div>
    </div>
  );
}
