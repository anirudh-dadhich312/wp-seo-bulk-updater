import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={submit}
        className="bg-white p-8 rounded-xl shadow-md w-96 space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-800">Create account</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input
          placeholder="Name"
          value={form.name}
          onChange={update('name')}
          className="w-full border rounded-md px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={update('email')}
          className="w-full border rounded-md px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={form.password}
          onChange={update('password')}
          className="w-full border rounded-md px-3 py-2"
        />
        <button
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>
        <p className="text-sm text-gray-500 text-center">
          Have an account?{' '}
          <Link to="/login" className="text-indigo-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
