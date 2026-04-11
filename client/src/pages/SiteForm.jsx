import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const Field = ({ label, hint, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input {...props} className="w-full border rounded-md px-3 py-2" />
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

export default function SiteForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    siteUrl: '',
    username: '',
    appPassword: '',
    notes: '',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/sites/${id}`).then((r) => setForm({ ...r.data, appPassword: '' }));
    }
  }, [id]);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (id) await api.put(`/sites/${id}`, form);
      else await api.post('/sites', form);
      nav('/sites');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <Link to="/sites" className="text-sm text-indigo-600 mb-4 inline-block">
        ← Back to sites
      </Link>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        {id ? 'Edit Site' : 'Add Client Site'}
      </h1>
      <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow space-y-4">
        {err && <p className="text-red-600 text-sm">{err}</p>}

        <Field
          label="Site Name"
          value={form.name}
          onChange={update('name')}
          placeholder="My Client Brand"
          required
        />
        <Field
          label="Site URL"
          value={form.siteUrl}
          onChange={update('siteUrl')}
          placeholder="https://clientsite.com"
          required
        />
        <Field
          label="WP Username"
          value={form.username}
          onChange={update('username')}
          placeholder="admin"
          required
        />
        <Field
          label={id ? 'Application Password (leave blank to keep current)' : 'Application Password'}
          type="password"
          value={form.appPassword}
          onChange={update('appPassword')}
          required={!id}
          hint="Generate in WP Admin → Users → Profile → Application Passwords"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={update('notes')}
            className="w-full border rounded-md px-3 py-2"
            rows="3"
          />
        </div>

        <button
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Save Site'}
        </button>
        <p className="text-xs text-gray-500">
          On save: connection is tested and the SEO plugin is auto-detected.
        </p>
      </form>
    </div>
  );
}
