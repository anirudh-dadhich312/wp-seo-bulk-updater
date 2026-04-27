import { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Zap, ArrowRight, UploadCloud, Globe, ClipboardList,
  CheckCircle2, Users, Shield, TrendingUp, Layers,
  Menu, X, ArrowUpRight,
} from 'lucide-react';

/* ─── Three.js: Particle sphere ─────────────────────────────── */
function Particles() {
  const ref   = useRef();
  const count = 900;
  const mouse = useRef([0, 0]);

  useEffect(() => {
    const h = (e) => {
      mouse.current = [
        (e.clientX / window.innerWidth)  * 2 - 1,
       -(e.clientY / window.innerHeight) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#22d3ee'), // cyan
      new THREE.Color('#38bdf8'), // sky
      new THREE.Color('#818cf8'), // indigo
      new THREE.Color('#67e8f9'), // cyan-light
      new THREE.Color('#7dd3fc'), // sky-light
    ];
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const c = palette[i % palette.length];
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.04 + mouse.current[0] * 0.05;
    ref.current.rotation.x = clock.elapsedTime * 0.012 + mouse.current[1] * 0.03;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent vertexColors size={0.016} sizeAttenuation depthWrite={false} opacity={0.7} />
    </Points>
  );
}

function WireSphere() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.12;
    ref.current.rotation.x = clock.elapsedTime * 0.07;
  });
  return (
    <mesh ref={ref} position={[2.8, 0.5, -1]}>
      <icosahedronGeometry args={[1.1, 2]} />
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
    </mesh>
  );
}

/* ─── Custom cursor (landing-only) ──────────────────────────── */
function Cursor() {
  const mx = useMotionValue(-200); const my = useMotionValue(-200);
  const sx = useSpring(mx, { stiffness: 550, damping: 36 });
  const sy = useSpring(my, { stiffness: 550, damping: 36 });
  const lx = useSpring(mx, { stiffness: 85,  damping: 22 });
  const ly = useSpring(my, { stiffness: 85,  damping: 22 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const move = (e) => { mx.set(e.clientX); my.set(e.clientY); };
    const over = (e) => { if (e.target.closest('a,button')) setHover(true); };
    const out  = () => setHover(false);
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, [mx, my]);

  return (
    <>
      <motion.div style={{ x: sx, y: sy, translateX:'-50%', translateY:'-50%' }}
        animate={{ scale: hover ? 0 : 1 }}
        className="fixed top-0 left-0 z-[9999] pointer-events-none w-2.5 h-2.5 rounded-full bg-cyan-400"
        style={{ x: sx, y: sy, translateX:'-50%', translateY:'-50%', boxShadow:'0 0 10px 3px rgba(34,211,238,0.6)' }} />
      <motion.div style={{ x: lx, y: ly, translateX:'-50%', translateY:'-50%' }}
        animate={{ scale: hover ? 2 : 1 }}
        transition={{ scale: { duration: 0.2 } }}
        className="fixed top-0 left-0 z-[9998] pointer-events-none w-9 h-9 rounded-full"
        style={{ x: lx, y: ly, translateX:'-50%', translateY:'-50%', border:'1px solid rgba(34,211,238,0.4)' }} />
    </>
  );
}

/* ─── Scroll reveal ──────────────────────────────────────────── */
function Reveal({ children, className, delay = 0, y = 24 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Marquee ────────────────────────────────────────────────── */
function Marquee({ items, speed = 30, reverse = false }) {
  return (
    <div className="overflow-hidden border-y border-white/[0.07] py-3.5">
      <motion.div
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
      >
        {[...Array(4)].map((_, r) => (
          <span key={r} className="flex">
            {items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-5 mx-5">
                <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40">{item}</span>
                <span className="w-1 h-1 rounded-full bg-cyan-500/50 flex-shrink-0" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Count up ───────────────────────────────────────────────── */
function CountUp({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const num   = parseFloat(String(end).replace(/[^0-9.]/g, ''));
    const start = performance.now();
    const raf   = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * num));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar({ user }) {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
      scrolled ? 'bg-[#04101e]/85 backdrop-blur-xl border-b border-white/[0.06]' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            SEO Bulk Updater
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[['Features','#features'],['How it Works','#process'],['Plugins','#plugins']].map(([l, h]) => (
            <a key={h} href={h}
              className="text-sm text-white/55 hover:text-white transition-colors font-medium"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to="/app"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/10 hover:border-white/20 bg-white/[0.05] hover:bg-white/[0.09] transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="text-sm text-white/55 hover:text-white transition-colors font-medium"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Sign in</Link>
              <Link to="/register"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(o => !o)} className="md:hidden text-white/60 hover:text-white transition-colors">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-[#04101e]/98 backdrop-blur-xl border-t border-white/[0.06]">
            <div className="px-6 py-5 space-y-4">
              {[['Features','#features'],['How it Works','#process'],['Plugins','#plugins']].map(([l,h]) => (
                <a key={h} href={h} onClick={() => setOpen(false)}
                  className="block text-sm text-white/60 hover:text-white transition-colors font-medium">{l}</a>
              ))}
              <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
                {user ? (
                  <Link to="/app" className="block text-center py-3 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">Dashboard</Link>
                ) : (
                  <>
                    <Link to="/login" className="block text-center py-3 text-sm font-medium text-white/60 border border-white/10 rounded-xl">Sign in</Link>
                    <Link to="/register" className="block text-center py-3 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">Get started free</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero({ user }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Canvas background */}
      <div className="absolute inset-0 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 6], fov: 55 }} gl={{ antialias: true, alpha: true }}>
            <Particles />
            <WireSphere />
          </Canvas>
        </Suspense>
      </div>

      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-16 w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-300 tracking-widest uppercase"
              style={{ fontFamily: 'Space Mono, monospace' }}>WordPress SEO Automation</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(44px,8vw,96px)] font-black text-white leading-[1.02] tracking-tight mb-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Update Your SEO{' '}
            <span className="text-transparent" style={{
              backgroundImage: 'linear-gradient(135deg, #22d3ee, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}>
              Everywhere,
            </span>
            <br />At Once.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/65 text-lg leading-relaxed max-w-xl mb-10"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Bulk update meta titles, descriptions, and image alt tags across all your WordPress sites in minutes — not days. Works with Yoast, Rank Math, and AIOSEO.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3 mb-12"
          >
            {user ? (
              <Link to="/app"
                className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 transition-all duration-300"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link to="/register"
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 transition-all duration-300"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/login"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold text-white/75 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-all"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Sign in
                </Link>
              </>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="flex flex-wrap items-center gap-6"
          >
            {[
              { icon: CheckCircle2, text: 'No credit card' },
              { icon: Shield,       text: 'Secure by design' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-white/45 font-medium"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <Icon className="w-3.5 h-3.5 text-cyan-500" />{text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* App preview card */}
        <Reveal className="mt-20 max-w-4xl" y={36}>
          <div className="rounded-2xl border border-white/[0.10] overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(145deg, #071828, #060f1c)' }}>
            {/* Top accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
              <div className="flex gap-1.5">
                {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-md text-[10px] text-white/40 px-3 py-1 w-52 mx-auto text-center"
                  style={{ fontFamily: 'Space Mono, monospace' }}>
                  app.seo-bulk-updater.com
                </div>
              </div>
            </div>
            {/* Mock UI */}
            <div className="p-5 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-44 rounded-lg" style={{ background: 'rgba(255,255,255,0.18)' }} />
                  <div className="h-2.5 w-28 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div className="h-9 w-32 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>
                  <div className="h-2 w-16 rounded-full bg-white/50" />
                </div>
              </div>
              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.25)', bar: '#22d3ee' },
                  { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', bar: '#60a5fa' },
                  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)', bar: '#34d399' },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3.5 space-y-2.5"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <div className="h-2.5 w-12 rounded" style={{ background: `${c.bar}55` }} />
                    <div className="h-5 w-10 rounded-md" style={{ background: `${c.bar}40` }} />
                    <div className="h-1.5 w-16 rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>
              {/* Table rows */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-4 px-4 py-2.5 border-b" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  {['w-20','flex-1','w-16','w-14'].map((w, i) => (
                    <div key={i} className={`h-2 ${w} rounded`} style={{ background: 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
                {[
                  { w1:'80%', w2:'55%', color:'#22d3ee', status:'success' },
                  { w1:'100%',w2:'70%', color:'#22d3ee', status:'success' },
                  { w1:'60%', w2:'42%', color:'#fb923c', status:'warn' },
                  { w1:'90%', w2:'65%', color:'#22d3ee', status:'success' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 rounded" style={{ width: row.w1, background: 'rgba(255,255,255,0.18)' }} />
                      <div className="h-1.5 rounded" style={{ width: row.w2, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                    <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #04101e, transparent)' }} />
    </section>
  );
}

/* ─── Stats ──────────────────────────────────────────────────── */
function Stats() {
  const items = [
    { n: '10',   s: 'K+',  label: 'Pages updated\ndaily' },
    { n: '500',  s: '+',   label: 'WordPress\nsites managed' },
    { n: '3',    s: ' min',label: 'To update\n1,000 pages' },
    { n: '99',   s: '.9%', label: 'Uptime SLA' },
  ];
  return (
    <section className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)' }}>
          {items.map(({ n, s, label }, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="px-8 py-10 group hover:bg-white/[0.03] transition-colors duration-400"
                style={{ background: '#04101e' }}>
                <p className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight"
                  style={{ fontFamily: 'Syne, sans-serif' }}>
                  <CountUp end={n} suffix={s} />
                </p>
                <p className="text-sm text-white/50 whitespace-pre-line leading-relaxed"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────── */
function Features() {
  const list = [
    { n:'01', icon: UploadCloud,  c:'#22d3ee', title:'Bulk Meta Updates',     body:'Update thousands of meta titles and descriptions in a single CSV upload. Process entire site crawls in one job.' },
    { n:'02', icon: Layers,       c:'#38bdf8', title:'Auto Plugin Detection', body:'Detects Yoast, Rank Math, or AIOSEO automatically and writes to the correct meta keys — zero configuration.' },
    { n:'03', icon: TrendingUp,   c:'#818cf8', title:'Real-time Progress',    body:'Live SSE stream shows every success and failure row-by-row as it happens. No refresh, no guessing.' },
    { n:'04', icon: ClipboardList,c:'#34d399', title:'Full Audit Log',        body:'Every change logged with who, when, and what. Auto-expires after 90 days to keep your database clean.' },
    { n:'05', icon: Users,        c:'#fb923c', title:'Team Management',       body:'Invite teammates, assign roles — admin, team leader, member. Control site access per team.' },
    { n:'06', icon: Shield,       c:'#f87171', title:'Secure by Design',      body:'App passwords encrypted, JWT auth, rate limiting, per-organization data isolation from day one.' },
  ];

  return (
    <section id="features" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <Reveal>
            <p className="text-xs font-semibold text-cyan-400 tracking-[0.25em] uppercase mb-3"
              style={{ fontFamily: 'Space Mono, monospace' }}>What you get</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              Everything<br />you need.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-white/55 max-w-xs text-sm leading-relaxed"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Built for agencies, SEO teams, and freelancers managing WordPress at scale.
            </p>
          </Reveal>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {list.map((f, i) => (
            <Reveal key={f.n} delay={0} y={14}>
              <div className="group flex items-start gap-6 sm:gap-8 py-5 px-3 -mx-3 rounded-xl hover:bg-white/[0.035] transition-colors duration-300">
                <span className="text-xs text-white/30 mt-1 w-6 flex-shrink-0 font-mono">{f.n}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${f.c}18`, border: `1px solid ${f.c}38` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.c }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-cyan-300 transition-colors"
                    style={{ fontFamily: 'Syne, sans-serif' }}>{f.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed max-w-lg"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.body}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-1" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────── */
function Process() {
  const steps = [
    { n:'01', icon: Globe,       g:'from-cyan-500 to-blue-600',    title:'Connect your sites',   body:'Add WordPress sites via REST API app password. Install our lightweight bridge plugin in seconds.' },
    { n:'02', icon: UploadCloud, g:'from-blue-500 to-indigo-600',  title:'Upload a CSV',         body:'Prepare URLs, new titles, and descriptions in a simple spreadsheet. Upload to start the job.' },
    { n:'03', icon: TrendingUp,  g:'from-indigo-500 to-violet-600',title:'Watch live progress',  body:'Real-time updates show every page as it succeeds or fails — no refresh, no waiting.' },
  ];

  return (
    <section id="process" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-semibold text-cyan-400 tracking-[0.25em] uppercase mb-3"
            style={{ fontFamily: 'Space Mono, monospace' }}>Process</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}>
            Up and running<br />in minutes.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="group relative rounded-2xl p-7 border overflow-hidden h-full transition-all duration-400 hover:-translate-y-1"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="absolute top-4 right-5 text-[80px] font-black leading-none select-none pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.04)', fontFamily: 'Syne, sans-serif' }}>{s.n}</span>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.g} flex items-center justify-center mb-6 shadow-lg`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-white text-lg mb-3"
                  style={{ fontFamily: 'Syne, sans-serif' }}>{s.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.body}</p>
                {/* Hover top accent */}
                <div className="absolute top-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.6), transparent)' }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plugins ────────────────────────────────────────────────── */
function Plugins() {
  const items = [
    { name:'Yoast SEO',      initial:'Y', color:'#7c3aed', glow:'rgba(124,58,237,0.3)',  desc:'Most popular WordPress SEO plugin' },
    { name:'Rank Math',      initial:'R', color:'#0ea5e9', glow:'rgba(14,165,233,0.3)',  desc:'Advanced SEO suite with schema support' },
    { name:'All in One SEO', initial:'A', color:'#10b981', glow:'rgba(16,185,129,0.3)', desc:'Trusted by 3M+ WordPress sites' },
  ];

  return (
    <section id="plugins" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-semibold text-cyan-400 tracking-[0.25em] uppercase mb-3"
            style={{ fontFamily: 'Space Mono, monospace' }}>Compatibility</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.02] tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}>
            Works with<br />your plugin.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {items.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div className="group relative rounded-2xl border p-7 text-center transition-all duration-400 hover:-translate-y-1 overflow-hidden"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${p.glow.replace('0.3','0.1')}, transparent 65%)` }} />
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center font-black text-white text-2xl transition-transform group-hover:scale-110 duration-400"
                  style={{ background: p.color, boxShadow: `0 12px 36px ${p.glow}` }}>
                  {p.initial}
                </div>
                <h3 className="font-black text-white text-base mb-1.5"
                  style={{ fontFamily: 'Syne, sans-serif' }}>{p.name}</h3>
                <p className="text-xs text-white/55 mb-5"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{p.desc}</p>
                <div className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase"
                    style={{ fontFamily: 'Space Mono, monospace' }}>Auto-detected</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────── */
function CTA({ user }) {
  return (
    <section className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden border p-12 sm:p-20 text-center"
            style={{ background: 'linear-gradient(135deg, #071a2e 0%, #060e1f 60%, #0a1228 100%)', borderColor: 'rgba(6,182,212,0.2)' }}>
            {/* Glow accents */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.5), transparent)' }} />
            <motion.div
              animate={{ scale:[1,1.3,1], opacity:[0.12,0.22,0.12] }}
              transition={{ duration: 6, repeat: Infinity, ease:'easeInOut' }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
            <motion.div
              animate={{ scale:[1,1.2,1], opacity:[0.08,0.18,0.08] }}
              transition={{ duration: 8, repeat: Infinity, ease:'easeInOut', delay: 2 }}
              className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

            <div className="relative z-10">
              <Reveal>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5"
                  style={{ fontFamily: 'Syne, sans-serif' }}>
                  Ready to stop doing<br />SEO by hand?
                </h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="text-white/60 max-w-lg mx-auto text-lg leading-relaxed mb-10"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Join hundreds of SEO teams saving hours every week with automated bulk updates.
                </p>
              </Reveal>
              <Reveal delay={0.25} className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <Link to="/app"
                    className="group flex items-center gap-2 px-9 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-300"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register"
                      className="group flex items-center gap-2 px-9 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-2xl shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-300"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Create free account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link to="/login"
                      className="text-white/55 hover:text-white text-sm font-semibold transition-colors"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Sign in instead →
                    </Link>
                  </>
                )}
              </Reveal>
              <Reveal delay={0.35}>
                <p className="text-xs text-white/30 mt-7 tracking-wide"
                  style={{ fontFamily: 'Space Mono, monospace' }}>
                  No credit card required · 5-minute setup · Cancel anytime
                </p>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t py-10 px-6 lg:px-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>SEO Bulk Updater</span>
        </div>
        <p className="text-xs text-white/35" style={{ fontFamily: 'Space Mono, monospace' }}>
          © {new Date().getFullYear()} All rights reserved
        </p>
        <div className="flex items-center gap-6">
          {[['Login','/login'],['Register','/register'],['Request Access','/request-access']].map(([l,h]) => (
            <Link key={h} to={h}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{l}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
const TICKER = ['Yoast SEO','Rank Math','AIOSEO','Bulk Updates','Meta Titles','Descriptions','Alt Tags','CSV Import','Live Progress','Audit Logs','Team Roles','Multi-Site'];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing-cursor-none min-h-screen text-white overflow-x-hidden"
      style={{ background: '#04101e' }}>
      <Cursor />
      <Navbar user={user} />
      <Hero user={user} />
      <Marquee items={TICKER} speed={35} />
      <Stats />
      <Marquee items={TICKER} speed={28} reverse />
      <Features />
      <Process />
      <Plugins />
      <CTA user={user} />
      <Footer />
    </div>
  );
}
