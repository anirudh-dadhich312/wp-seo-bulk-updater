import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Globe, ChevronDown, AlertCircle, ArrowRight, CheckCircle, X } from 'lucide-react';
import api from '../api/axios';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const PLUGIN_COLORS = {
  yoast:    'bg-purple-500/15 text-purple-300',
  rankmath: 'bg-blue-500/15 text-blue-300',
  aioseo:   'bg-emerald-500/15 text-emerald-300',
  generic:  'bg-gray-500/15 text-gray-400',
  unknown:  'bg-amber-500/15 text-amber-300',
};

export default function BulkUpdate() {
  const [sites,   setSites]   = useState([]);
  const [siteId,  setSiteId]  = useState('');
  const [file,    setFile]    = useState(null);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => { api.get('/sites').then((r) => setSites(r.data)); }, []);

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      setFile(f); setErr('');
    } else {
      setErr('Please upload a valid .csv file.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('siteId', siteId);
      fd.append('file', file);
      const { data } = await api.post('/jobs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      nav(`/jobs/${data._id}`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSite = sites.find((s) => s._id === siteId);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">New Bulk Update</h1>
        <p className="text-gray-400 text-sm mt-1">Choose a site and upload a CSV to update SEO metadata in bulk.</p>
      </motion.div>

      {/* Form card */}
      <motion.div variants={fadeUp} className="bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/20">

        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{err}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} className="space-y-6">

          {/* Step 1: Site selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
              <label className="text-sm font-semibold text-gray-200">Select Client Site</label>
            </div>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-3 border-2 border-white/10 bg-white/[0.06] text-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:border-indigo-500/70 focus:bg-white/[0.08] transition-all"
              >
                <option value="" className="bg-[#0f0f2a] text-gray-400">— choose a site —</option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id} className="bg-[#0f0f2a] text-white">
                    {s.name} ({s.detectedPlugin})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            {selectedSite && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
              >
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-xs text-indigo-300 font-medium truncate">{selectedSite.siteUrl}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${PLUGIN_COLORS[selectedSite.detectedPlugin] || 'bg-gray-500/15 text-gray-400'}`}>
                  {selectedSite.detectedPlugin}
                </span>
              </motion.div>
            )}
          </div>

          {/* Step 2: File upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
              <label className="text-sm font-semibold text-gray-200">Upload CSV File</label>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {!file ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? 'border-indigo-500/70 bg-indigo-500/10'
                    : 'border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5'
                }`}
              >
                <motion.div
                  animate={dragging ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    dragging ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/[0.05] border-white/10'
                  }`}
                >
                  <UploadCloud className={`w-7 h-7 ${dragging ? 'text-indigo-400' : 'text-gray-400'}`} />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-300">
                    Drop CSV here or <span className="text-indigo-400">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports .csv files only</p>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl"
              >
                <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-300 truncate">{file.name}</p>
                  <p className="text-xs text-emerald-500/70">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            <p className="text-xs text-gray-400 pl-1">
              Required columns:{' '}
              <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-gray-300">post_url</code>{' '}
              <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-gray-300">meta_title</code>{' '}
              <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-gray-300">meta_description</code>
            </p>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !file || !siteId}
            whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(99,102,241,0.35)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-shadow text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading…
              </>
            ) : (
              <> Upload & Preview <ArrowRight className="w-4 h-4" /> </>
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* CSV format reference */}
      <motion.div variants={fadeUp} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" /> CSV Format Reference
        </p>
        <pre className="text-xs text-indigo-300 font-mono overflow-x-auto leading-relaxed bg-black/20 rounded-xl p-3 border border-white/[0.06]">
{`post_url,meta_title,meta_description
https://clientsite.com/best-shoes/,"Best Running Shoes 2025","Reviewed 50 running shoes..."
https://clientsite.com/headphones/,"Top 10 Headphones","Our expert picks for 2025"`}
        </pre>
      </motion.div>
    </motion.div>
  );
}
