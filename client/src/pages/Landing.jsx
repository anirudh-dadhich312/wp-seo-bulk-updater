import { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Zap, ArrowRight, UploadCloud, Globe, ClipboardList,
  CheckCircle2, Users, Shield, Clock, TrendingUp, Layers,
  Star, ChevronRight, Menu, X,
} from 'lucide-react';

/* ─── Three.js star field ──────────────────────────────────── */
function StarField() {
  const ref = useRef();
  const count = 800;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.04;
    ref.current.rotation.x += delta * 0.015;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#818cf8" size={0.018} sizeAttenuation depthWrite={false} opacity={0.55} />
    </Points>
  );
}

function FloatingNodes() {
  const groupRef = useRef();
  const nodes = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 4,
      speed: 0.3 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
    }))
  ), []);

  useFrame(({ clock }) => {
    groupRef.current.children.forEach((mesh, i) => {
      const t = clock.elapsedTime;
      mesh.position.y = nodes[i].y + Math.sin(t * nodes[i].speed + nodes[i].offset) * 0.4;
      mesh.rotation.x = t * 0.3;
      mesh.rotation.y = t * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, n.z]}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#8b5cf6' : '#a78bfa'} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Animation variants ───────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

function Reveal({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: fadeUp.hidden, visible: { ...fadeUp.visible, transition: { ...fadeUp.visible.transition, delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Navbar ───────────────────────────────────────────────── */
function Navbar({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#07071a]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl shadow-black/30' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">SEO Bulk Updater</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {[['Features', '#features'], ['How it works', '#how-it-works'], ['Plugins', '#plugins']].map(([label, href]) => (
              <a key={href} href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to="/app" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign in</Link>
                <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
                  Get started free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen((o) => !o)} className="md:hidden w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#0d0d28]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-4 space-y-3">
          {[['Features', '#features'], ['How it works', '#how-it-works'], ['Plugins', '#plugins']].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block text-sm text-gray-300 hover:text-white py-1.5 transition-colors">{label}</a>
          ))}
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
            {user ? (
              <Link to="/app" className="text-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-center py-2.5 text-sm font-medium text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors">Sign in</Link>
                <Link to="/register" className="text-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl">Get started free</Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
function Hero({ user }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Three.js canvas */}
      <div className="absolute inset-0 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ antialias: false, alpha: true }}>
            <StarField />
            <FloatingNodes />
          </Canvas>
        </Suspense>
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6">
              <Zap className="w-3 h-3" />
              WordPress SEO Automation
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Scale Your SEO{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Across Every
              </span>{' '}
              WordPress Site
            </motion.h1>

            {/* Sub */}
            <motion.p variants={fadeUp} className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Bulk update meta titles, descriptions, and image alt tags across all your WordPress sites in minutes — not days. Works with Yoast, RankMath, and AIOSEO.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow w-full sm:w-auto justify-center min-h-[48px]">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow w-full sm:w-auto justify-center min-h-[48px]">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-gray-300 border border-white/10 bg-white/[0.04] rounded-2xl hover:bg-white/[0.08] hover:text-white transition-all w-full sm:w-auto justify-center min-h-[48px] backdrop-blur-sm">
                    Sign in
                  </Link>
                </>
              )}
            </motion.div>

            {/* Trust row */}
            <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { icon: CheckCircle2, text: 'No credit card required' },
                { icon: Shield, text: 'SOC 2 ready infrastructure' },
                { icon: Clock, text: 'Setup in under 5 minutes' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />{text}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Preview card */}
        <Reveal className="mt-20 max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white/[0.06] rounded-md text-[10px] text-gray-500 px-3 py-1 w-48 mx-auto text-center">wp-seo-bulk-updater.vercel.app</div>
              </div>
            </div>
            {/* Mock UI */}
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-40 bg-white/10 rounded-md" />
                  <div className="h-2.5 w-24 bg-white/5 rounded-md" />
                </div>
                <div className="h-8 w-24 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl opacity-80" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['bg-indigo-500/20', 'bg-violet-500/20', 'bg-emerald-500/20'].map((c, i) => (
                  <div key={i} className={`${c} rounded-xl p-3 border border-white/[0.06] space-y-2`}>
                    <div className="h-3 w-16 bg-white/10 rounded" />
                    <div className="h-5 w-10 bg-white/20 rounded font-bold" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                {[85, 62, 100, 45, 91].map((pct, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 rounded bg-white/10" style={{ width: `${pct}%` }} />
                      <div className="h-1.5 rounded bg-white/5" style={{ width: `${pct * 0.6}%` }} />
                    </div>
                    <div className="h-4 w-12 bg-emerald-500/30 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07071a] to-transparent pointer-events-none" />
    </section>
  );
}

/* ─── Stats bar ────────────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { value: '10,000+', label: 'Pages updated daily' },
    { value: '500+',    label: 'WordPress sites managed' },
    { value: '3 min',   label: 'Avg. time to bulk update 1,000 pages' },
    { value: '99.9%',   label: 'Uptime SLA' },
  ];

  return (
    <section className="border-y border-white/[0.06] bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <Reveal key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Problem section ──────────────────────────────────────── */
function ProblemSection() {
  const problems = [
    {
      emoji: '⏳',
      title: 'Manual updates eat your entire day',
      body: 'Logging into each WordPress site one by one, editing meta fields by hand. One hundred pages takes hours — and you still have fifty more sites to go.',
    },
    {
      emoji: '🔌',
      title: 'Every plugin stores data differently',
      body: 'Yoast, RankMath, AIOSEO — they all use different meta keys. There\'s no universal tool that handles all three without custom development.',
    },
    {
      emoji: '🚫',
      title: 'No audit trail or rollback',
      body: 'Something breaks after a bulk SEO change and you have no idea what changed, on which page, or who did it. Starting over from scratch.',
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">The problem</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3 mb-4">SEO at scale is broken</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg">Every agency and in-house team hits the same wall when they need to update SEO metadata across dozens of sites.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="h-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 group">
                <div className="text-3xl mb-4">{p.emoji}</div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: Globe,
      title: 'Connect your sites',
      body: 'Add your WordPress sites with a REST API app password. No plugins needed beyond our lightweight bridge.',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      step: '02',
      icon: UploadCloud,
      title: 'Upload a CSV',
      body: 'Prepare a simple spreadsheet with URLs, new titles, and descriptions. Upload it to start the job.',
      color: 'from-violet-500 to-purple-500',
    },
    {
      step: '03',
      icon: TrendingUp,
      title: 'Watch it happen live',
      body: 'Real-time progress updates show you exactly which pages succeeded or failed — no page refresh needed.',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">How it works</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3 mb-4">Up and running in minutes</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg">Three simple steps to automate your entire SEO workflow.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {/* Connector line - desktop only */}
          <div className="hidden lg:block absolute top-14 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-500/50 via-violet-500/50 to-purple-500/50" />

          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.12}>
              <div className="relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div className="absolute top-5 right-5 text-4xl font-black text-white/[0.04]">{s.step}</div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─────────────────────────────────────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: UploadCloud,
      title: 'Bulk Meta Updates',
      body: 'Update thousands of meta titles and descriptions in a single CSV upload. Process entire site crawls in one go.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      icon: Layers,
      title: 'Auto Plugin Detection',
      body: 'Automatically detects whether your site uses Yoast, RankMath, or AIOSEO and writes to the right meta keys.',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Progress',
      body: 'Live job progress via SSE — see successes and failures row by row as they happen without refreshing.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: ClipboardList,
      title: 'Full Audit Log',
      body: 'Every change is logged with who did it, when, and what changed. Auto-expires after 90 days to keep your DB clean.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Users,
      title: 'Team Management',
      body: 'Invite teammates, assign roles (admin, team leader, member), and control which sites each team can see.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: Shield,
      title: 'Secure by Design',
      body: 'App passwords encrypted at rest, JWT auth, rate limiting, per-organization data isolation built in from day one.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Features</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3 mb-4">Everything you need</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg">Built for SEO teams, agencies, and freelancers who manage WordPress at scale.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div className="group h-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl border ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plugin compatibility ─────────────────────────────────── */
function PluginsSection() {
  const plugins = [
    { name: 'Yoast SEO',   color: 'from-purple-500 to-violet-600',  initial: 'Y', desc: 'Most popular WordPress SEO plugin' },
    { name: 'Rank Math',   color: 'from-blue-500 to-cyan-600',      initial: 'R', desc: 'Advanced SEO suite with schema support' },
    { name: 'All in One SEO', color: 'from-emerald-500 to-teal-600', initial: 'A', desc: 'Trusted by 3M+ WordPress sites' },
  ];

  return (
    <section id="plugins" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Compatibility</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3 mb-4">Works with your SEO plugin</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg">Auto-detected at runtime — just connect your site and we handle the rest.</p>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {plugins.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mx-auto mb-4 shadow-xl font-black text-white text-xl`}>
                  {p.initial}
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500">{p.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Supported
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA section ──────────────────────────────────────────── */
function CTASection({ user }) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 via-violet-900/30 to-purple-900/40 overflow-hidden p-10 sm:p-16 text-center">
            {/* Glow blobs */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs font-semibold text-indigo-300">
                <Star className="w-3 h-3" /> Start automating today
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
                Ready to stop doing{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  SEO by hand?
                </span>
              </h2>
              <p className="text-gray-300 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
                Join hundreds of SEO teams and agencies who use SEO Bulk Updater to save hours every week.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {user ? (
                  <Link to="/app" className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow min-h-[52px]">
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow min-h-[52px]">
                      Create free account <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link to="/login" className="inline-flex items-center px-6 py-4 text-sm font-semibold text-gray-300 hover:text-white transition-colors min-h-[52px]">
                      Sign in instead <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500">No credit card required · Setup in 5 minutes</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">SEO Bulk Updater</span>
        </div>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} SEO Bulk Updater. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {[['Login', '/login'], ['Register', '/register']].map(([label, href]) => (
            <Link key={href} to={href} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <Navbar user={user} />
      <Hero user={user} />
      <StatsBar />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <PluginsSection />
      <CTASection user={user} />
      <Footer />
    </div>
  );
}
