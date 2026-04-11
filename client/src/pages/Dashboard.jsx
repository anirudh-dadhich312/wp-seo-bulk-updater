import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const statusColor = (s) => {
  if (s === 'completed') return 'text-green-600';
  if (s === 'running') return 'text-blue-600';
  if (s === 'failed') return 'text-red-600';
  return 'text-gray-600';
};

const Card = ({ title, value, link }) => (
  <Link to={link} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-3xl font-bold mt-1 text-gray-800">{value}</p>
  </Link>
);

export default function Dashboard() {
  const [stats, setStats] = useState({ sites: 0, jobs: 0, recent: [] });

  useEffect(() => {
    Promise.all([api.get('/sites'), api.get('/jobs')])
      .then(([sites, jobs]) => {
        setStats({
          sites: sites.data.length,
          jobs: jobs.data.length,
          recent: jobs.data.slice(0, 5),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card title="Client Sites" value={stats.sites} link="/sites" />
        <Card title="Total Jobs" value={stats.jobs} link="/bulk-update" />
        <Card title="New Bulk Update" value="+" link="/bulk-update" />
      </div>

      <h2 className="text-lg font-semibold mb-3 text-gray-800">Recent Jobs</h2>
      <div className="bg-white rounded-lg shadow divide-y">
        {stats.recent.length === 0 && (
          <div className="p-4 text-gray-500">No jobs yet — start with a new bulk update.</div>
        )}
        {stats.recent.map((job) => (
          <Link
            to={`/jobs/${job._id}`}
            key={job._id}
            className="block p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{job.site?.name || 'Unknown site'}</p>
                <p className="text-sm text-gray-500">
                  {job.totalRows} rows · {job.successCount} success · {job.failedCount} failed
                </p>
              </div>
              <span className={`text-sm font-medium ${statusColor(job.status)}`}>
                {job.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
