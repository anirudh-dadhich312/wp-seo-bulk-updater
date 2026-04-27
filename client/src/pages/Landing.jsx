import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Zap, ArrowRight, UploadCloud, Globe, ClipboardList,
  CheckCircle2, Users, Shield, Clock, TrendingUp, Layers,
  Menu, X, ArrowUpRight,
} from 'lucide-react';

/* ─── Custom Cursor ──────────────────────────────────────────── */
function CustomCursor() {
  const cursorOuter = useRef(null);
  const cursorInner = useRef(null);
  const [hovered, setHovered] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, { stiffness: 400, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 400, damping: 30 });
  const lagX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const lagY = useSpring(mouseY, { stiffness: 100, damping: 20 });

  useEffect(() => {
    const move = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    const over = (e) => { if (e.target.closest('a, button, [data-cursor]')) setHovered(true); };
    const out  = () => setHovered(false);
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout',  out);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout',  out);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      <motion.div
        ref={cursorInner}
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: hovered ? 0 : 1 }}
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
      />
      <motion.div
        ref={cursorOuter}
        style={{ x: lagX, y: lagY, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: hovered ? 2.5 : 1, opacity: hovered ? 0.6 : 0.35 }}
        transition={{ scale: { duration: 0.2 } }}
        className="fixed top-0 left-0 w-10 h-10 border border-white rounded-full pointer-events-none z-[9998] mix-blend-difference"
      />
    </>
  );
}

/* ─── Grain texture overlay ──────────────────────────────────── */
function GrainOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9990] opacity-[0.035]"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '128px' }}
    />
  );
}

/* ─── Three.js: Interactive particle field ───────────────────── */
function ParticleField() {
  const ref = useRef();
  const count = 1200;
  const mouse = useRef([0, 0]);
  const { size } = useThree();

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [
        (e.clientX / size.width)  * 2 - 1,
        -(e.clientY / size.height) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [size]);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#c4b5fd'),
      new THREE.Color('#818cf8'),
    ];
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.035 + mouse.current[0] * 0.08;
    ref.current.rotation.x = t * 0.012 + mouse.current[1] * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent vertexColors size={0.022} sizeAttenuation depthWrite={false} opacity={0.7} />
    </Points>
  );
}

/* ─── Three.js: Distorted orb (hero center) ─────────────────── */
function DistortOrb() {
  const meshRef = useRef();
  const mouse = useRef([0, 0]);
  const { size } = useThree();

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [
        (e.clientX / size.width)  * 2 - 1,
        -(e.clientY / size.height) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [size]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.rotation.z = t * 0.08;
    meshRef.current.position.x += (mouse.current[0] * 0.4 - meshRef.current.position.x) * 0.04;
    meshRef.current.position.y += (mouse.current[1] * 0.3 - meshRef.current.position.y) * 0.04;
  });

  return (
    <Sphere ref={meshRef} args={[1.1, 80, 80]}>
      <MeshDistortMaterial
        color="#4338ca"
        attach="material"
        distort={0.45}
        speed={2.5}
        roughness={0}
        metalness={0.8}
        transparent
        opacity={0.35}
        wireframe={false}
      />
    </Sphere>
  );
}

/* ─── Three.js: Wireframe torus knot ────────────────────────── */
function WireKnot() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * 0.18;
    ref.current.rotation.y = clock.elapsedTime * 0.12;
  });
  return (
    <mesh ref={ref} position={[3.2, -1.2, -2]}>
      <torusKnotGeometry args={[0.6, 0.18, 180, 20]} />
      <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.25} />
    </mesh>
  );
}

/* ─── Animation helpers ──────────────────────────────────────── */
function Reveal({ children, className, delay = 0, y = 32 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealText({ text, className, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const words = text.split(' ');
  return (
    <span ref={ref} className={className} style={{ display: 'block', overflow: 'hidden' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={inView ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.07 }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Marquee strip ──────────────────────────────────────────── */
function Marquee({ items, speed = 30, reverse = false }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-white/[0.07] bg-white/[0.025] py-3.5">
      <motion.div
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        className="inline-flex gap-0"
      >
        {[...Array(4)].map((_, rep) => (
          <span key={rep} className="inline-flex items-center gap-0">
            {items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-5 mx-5">
                <span className="text-xs font-bold tracking-[0.22em] uppercase text-gray-500">{item}</span>
                <span className="w-1 h-1 rounded-full bg-indigo-500/60" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#050510]/85 backdrop-blur-2xl border-b border-white/[0.05]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[68px]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">SEO Bulk Updater</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {[['Features', '#features'], ['How it works', '#how-it-works'], ['Plugins', '#plugins']].map(([label, href]) => (
              <a key={href} href={href} className="text-xs font-semibold text-gray-500 hover:text-white tracking-widest uppercase transition-colors duration-300">
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link to="/app" className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-white/[0.08] border border-white/[0.12] rounded-xl hover:bg-white/[0.14] transition-all">
                Dashboard <ArrowUpRight className="w-3 h-3" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors tracking-wide">Sign in</Link>
                <Link to="/register" className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/30">
                  Get started <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen((o) => !o)} className="md:hidden w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a0a20]/97 backdrop-blur-2xl border-t border-white/[0.05] overflow-hidden"
          >
            <div className="px-6 py-5 space-y-4">
              {[['Features', '#features'], ['How it works', '#how-it-works'], ['Plugins', '#plugins']].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors">{label}</a>
              ))}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                {user ? (
                  <Link to="/app" className="block text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl">Dashboard</Link>
                ) : (
                  <>
                    <Link to="/login" className="block text-center py-2.5 text-sm font-medium text-gray-300 border border-white/10 rounded-xl">Sign in</Link>
                    <Link to="/register" className="block text-center py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl">Get started</Link>
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
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Three.js canvas */}
      <div className="absolute inset-0 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 5.5], fov: 55 }} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1.5} color="#6366f1" />
            <pointLight position={[-5, -3, -3]} intensity={0.8} color="#8b5cf6" />
            <ParticleField />
            <DistortOrb />
            <WireKnot />
          </Canvas>
        </Suspense>
      </div>

      {/* Multi-layer radial glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-indigo-700/[0.06] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-700/[0.05] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full flex flex-col items-center text-center pt-28 pb-16">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="w-full">
          {/* Pill badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] text-indigo-300 text-[11px] font-bold tracking-widest uppercase mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            WordPress SEO Automation
          </motion.div>

          {/* Hero headline */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="font-black leading-[0.92] tracking-[-0.03em] text-white">
              <span className="block text-[clamp(52px,10vw,130px)]">SCALE</span>
              <span className="block text-[clamp(52px,10vw,130px)] bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">YOUR SEO</span>
              <span className="block text-[clamp(52px,10vw,130px)]">EVERYWHERE</span>
            </h1>
          </motion.div>

          <motion.p variants={fadeUp} className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Bulk update meta titles, descriptions, and image alt tags across all your WordPress sites. Works with Yoast, RankMath, and AIOSEO.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            {user ? (
              <Link to="/app" className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 duration-300 min-h-[52px]">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 duration-300 min-h-[52px]">
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-gray-300 border border-white/10 bg-white/[0.04] rounded-2xl hover:bg-white/[0.09] hover:text-white transition-all backdrop-blur-sm min-h-[52px]">
                  Sign in
                </Link>
              </>
            )}
          </motion.div>

          {/* Trust bar */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {[
              { icon: CheckCircle2, text: 'No credit card' },
              { icon: Shield,       text: 'Secure by design' },
              { icon: Clock,        text: 'Live in 5 min' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-[11px] text-gray-600 font-semibold tracking-wide uppercase">
                <Icon className="w-3.5 h-3.5 text-indigo-500" />{text}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Preview mockup */}
        <Reveal className="mt-20 w-full max-w-4xl mx-auto" y={48}>
          <div className="relative rounded-2xl border border-white/[0.10] bg-[#0b0b1e] overflow-hidden shadow-[0_40px_120px_rgba(99,102,241,0.15)]">
            {/* Subtle top glow inside card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.025]">
              <div className="flex gap-1.5">
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-md text-[10px] text-gray-500 px-3 py-1 w-56 mx-auto text-center">
                  app.seo-bulk-updater.com
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-white/20 rounded-lg" />
                  <div className="h-2.5 w-32 bg-white/[0.09] rounded-lg" />
                </div>
                <div className="h-9 w-32 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
                  <div className="h-2 w-16 bg-white/50 rounded-full" />
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { bg: 'from-indigo-600/20 to-indigo-600/5', border: 'border-indigo-500/20', dot: 'bg-indigo-400', h: '72px' },
                  { bg: 'from-violet-600/20 to-violet-600/5', border: 'border-violet-500/20', dot: 'bg-violet-400', h: '72px' },
                  { bg: 'from-emerald-600/15 to-emerald-600/5', border: 'border-emerald-500/20', dot: 'bg-emerald-400', h: '72px' },
                ].map((c, i) => (
                  <div key={i} className={`bg-gradient-to-br ${c.bg} rounded-xl p-3.5 border ${c.border} space-y-2.5`}>
                    <div className={`w-5 h-5 rounded-lg ${c.dot} opacity-50`} />
                    <div className="h-5 w-10 bg-white/25 rounded-md" />
                    <div className="h-2 w-16 bg-white/[0.12] rounded" />
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03]">
                  {['w-24', 'flex-1', 'w-20', 'w-16'].map((w, i) => (
                    <div key={i} className={`h-2 ${w} bg-white/15 rounded`} />
                  ))}
                </div>
                {[
                  { pct: '82%', sub: '55%', color: 'bg-emerald-500', label: 'emerald' },
                  { pct: '100%', sub: '65%', color: 'bg-emerald-500', label: 'emerald' },
                  { pct: '60%', sub: '40%', color: 'bg-amber-500',   label: 'amber' },
                  { pct: '95%', sub: '75%', color: 'bg-emerald-500', label: 'emerald' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/30 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 rounded bg-white/18" style={{ width: row.pct }} />
                      <div className="h-1.5 rounded bg-white/[0.08]" style={{ width: row.sub }} />
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${row.color} opacity-80`} />
                    <div className="h-5 w-16 bg-white/[0.08] rounded-full border border-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050510] to-transparent pointer-events-none" />
    </section>
  );
}

/* ─── Marquee section ────────────────────────────────────────── */
const MARQUEE_ITEMS = ['Yoast SEO', 'Rank Math', 'AIOSEO', 'Bulk Updates', 'Meta Titles', 'Descriptions', 'Alt Tags', 'CSV Import', 'Live Progress', 'Audit Logs', 'Team Roles', 'Multi-Site'];

/* ─── Stats section ──────────────────────────────────────────── */
function StatsSection() {
  const stats = [
    { value: '10K+',  label: 'Pages\nupdated daily',        color: 'text-indigo-400' },
    { value: '500+',  label: 'WordPress\nsites managed',    color: 'text-violet-400' },
    { value: '3 min', label: 'To update\n1,000 pages',      color: 'text-blue-400' },
    { value: '99.9%', label: 'Uptime\nSLA',                 color: 'text-emerald-400' },
  ];

  return (
    <section className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-4">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-600">By the numbers</p>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
          {stats.map(({ value, label, color }, i) => (
            <Reveal key={value} delay={i * 0.08}>
              <div className="bg-[#050510] px-6 py-10 text-center space-y-2 hover:bg-white/[0.025] transition-colors duration-300">
                <p className={`text-4xl sm:text-5xl font-black tracking-tight ${color}`}>{value}</p>
                <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed font-medium">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features (editorial layout) ───────────────────────────── */
function FeaturesSection() {
  const features = [
    { n: '01', icon: UploadCloud,  color: '#6366f1', title: 'Bulk Meta Updates',      body: 'Update thousands of meta titles and descriptions in a single CSV upload. Process entire site crawls in one job.' },
    { n: '02', icon: Layers,       color: '#8b5cf6', title: 'Auto Plugin Detection',   body: 'Detects Yoast, Rank Math, or AIOSEO automatically and writes to the right meta keys — zero configuration.' },
    { n: '03', icon: TrendingUp,   color: '#3b82f6', title: 'Real-time Progress',      body: 'Live job progress via SSE. See successes and failures row-by-row as they happen, no page refresh needed.' },
    { n: '04', icon: ClipboardList,color: '#10b981', title: 'Full Audit Log',          body: 'Every change is logged: who did it, when, and what changed. Auto-expires after 90 days to keep your DB clean.' },
    { n: '05', icon: Users,        color: '#f59e0b', title: 'Team Management',         body: 'Invite teammates, set roles — admin, team leader, member — and control site access per team.' },
    { n: '06', icon: Shield,       color: '#ef4444', title: 'Secure by Design',        body: 'App passwords encrypted at rest, JWT auth, rate limiting, and per-organization data isolation from day one.' },
  ];

  return (
    <section id="features" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-indigo-500 mb-3">What you get</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">
              Everything<br />you need.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-gray-500 max-w-xs text-sm leading-relaxed lg:text-right">
              Built for SEO teams, agencies, and freelancers who manage WordPress at scale.
            </p>
          </Reveal>
        </div>

        <div className="divide-y divide-white/[0.05]">
          {features.map((f, i) => (
            <Reveal key={f.n} delay={0} y={16}>
              <div className="group flex items-start gap-5 sm:gap-8 py-6 hover:bg-white/[0.025] px-4 -mx-4 rounded-xl transition-all duration-300 cursor-default">
                <span className="text-xs font-bold text-gray-700 mt-1 w-6 flex-shrink-0 font-mono">{f.n}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base mb-1 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-lg">{f.body}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-1" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: '01', icon: Globe,       color: 'from-indigo-500 to-blue-500',   title: 'Connect your sites',     body: 'Add WordPress sites via REST API app password. Install our lightweight bridge plugin in 30 seconds.' },
    { n: '02', icon: UploadCloud, color: 'from-violet-500 to-purple-500', title: 'Upload a CSV',           body: 'Prepare URLs, new titles, and descriptions in a simple spreadsheet. Upload to kick off the job.' },
    { n: '03', icon: TrendingUp,  color: 'from-purple-500 to-pink-500',   title: 'Watch live progress',   body: 'Real-time updates show exactly which pages succeeded or failed — no refresh, no guessing.' },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-violet-500 mb-3">Process</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">
            Up and running<br />in minutes.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5 lg:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div className="relative group p-7 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent hover:border-indigo-500/30 hover:from-indigo-500/[0.05] transition-all duration-500">
                <div className="absolute top-5 right-5 font-black text-5xl text-white/[0.04] leading-none select-none">{s.n}</div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-6 shadow-xl`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-black text-white text-lg mb-3 leading-tight">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plugin compatibility ───────────────────────────────────── */
function PluginsSection() {
  const plugins = [
    { name: 'Yoast SEO',      color: '#7c3aed', bg: 'from-purple-600/20 to-purple-600/5', border: 'border-purple-500/20', initial: 'Y', desc: 'Most popular WordPress SEO plugin' },
    { name: 'Rank Math',      color: '#0891b2', bg: 'from-cyan-600/20 to-cyan-600/5',     border: 'border-cyan-500/20',   initial: 'R', desc: 'Advanced SEO suite with schema' },
    { name: 'All in One SEO', color: '#059669', bg: 'from-emerald-600/20 to-emerald-600/5', border: 'border-emerald-500/20', initial: 'A', desc: 'Trusted by 3M+ WordPress sites' },
  ];

  return (
    <section id="plugins" className="py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-emerald-500 mb-3">Compatibility</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">
            Works with your<br />SEO plugin.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {plugins.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div className={`group p-7 rounded-2xl border ${p.border} bg-gradient-to-b ${p.bg} hover:scale-[1.02] transition-all duration-300 text-center`}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 font-black text-white text-2xl shadow-2xl"
                  style={{ background: `${p.color}`, boxShadow: `0 12px 40px ${p.color}40` }}>
                  {p.initial}
                </div>
                <h3 className="font-black text-white text-base mb-1.5">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{p.desc}</p>
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold tracking-wide uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-detected
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA section ────────────────────────────────────────────── */
function CTASection({ user }) {
  return (
    <section className="py-24 px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 lg:p-20 text-center border border-white/[0.07]"
            style={{ background: 'linear-gradient(135deg, #0f0f2e 0%, #120d28 40%, #0a1128 100%)' }}>
            {/* Animated glows */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600 rounded-full blur-[120px] pointer-events-none"
            />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            <div className="relative z-10">
              <RevealText
                text="Ready to stop doing SEO by hand?"
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-6"
              />
              <Reveal delay={0.3}>
                <p className="text-gray-400 max-w-lg mx-auto text-base sm:text-lg leading-relaxed mb-10">
                  Join hundreds of SEO teams and agencies saving hours every week.
                </p>
              </Reveal>
              <Reveal delay={0.45} className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <Link to="/app" className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 duration-300">
                    Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 duration-300">
                      Create free account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link to="/login" className="inline-flex items-center px-8 py-4 text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                      Sign in instead
                    </Link>
                  </>
                )}
              </Reveal>
              <Reveal delay={0.55}>
                <p className="text-[11px] text-gray-700 mt-6 font-semibold tracking-wide uppercase">No credit card required · 5-minute setup · Cancel anytime</p>
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
    <footer className="border-t border-white/[0.05] py-10 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-white tracking-tight">SEO Bulk Updater</span>
        </div>
        <p className="text-[11px] text-gray-700 font-semibold tracking-widest uppercase">© {new Date().getFullYear()} All rights reserved</p>
        <div className="flex items-center gap-5">
          {[['Login', '/login'], ['Register', '/register'], ['Request Access', '/request-access']].map(([label, href]) => (
            <Link key={href} to={href} className="text-[11px] font-semibold text-gray-600 hover:text-gray-300 transition-colors tracking-wide uppercase">{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#050510] text-white cursor-none">
      <CustomCursor />
      <GrainOverlay />
      <Navbar user={user} />
      <Hero user={user} />
      <Marquee items={MARQUEE_ITEMS} speed={35} />
      <StatsSection />
      <Marquee items={MARQUEE_ITEMS} speed={28} reverse />
      <FeaturesSection />
      <HowItWorks />
      <PluginsSection />
      <CTASection user={user} />
      <Footer />
    </div>
  );
}
