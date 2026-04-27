import {
  Suspense, useRef, useMemo, useState, useEffect, useCallback,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import {
  motion, useInView, useMotionValue, useSpring, AnimatePresence,
  useTransform, useScroll,
} from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Zap, ArrowRight, UploadCloud, Globe, ClipboardList,
  CheckCircle2, Users, Shield, Clock, TrendingUp, Layers,
  Menu, X, ArrowUpRight,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════
   GLSL SHADERS
═══════════════════════════════════════════════════════ */
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform vec2  uMouse;
  varying vec2  vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i+vec2(1,0)), u.x),
      mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(0.8,-0.6,0.6,0.8);
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.1 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t  = uTime * 0.055;

    // mouse warp
    vec2 m  = uMouse * 0.5 + 0.5;
    float md = length(uv - m);
    uv += (m - uv) * 0.12 * smoothstep(0.6, 0.0, md);

    vec2 q = vec2(fbm(uv + t), fbm(uv + vec2(5.2, 1.3)));
    vec2 r = vec2(
      fbm(uv + q + vec2(1.7, 9.2) + 0.15*t),
      fbm(uv + q + vec2(8.3, 2.8) + 0.13*t)
    );
    float f = fbm(uv + r);

    vec3 col = mix(vec3(0.0, 0.0, 0.01),  vec3(0.04, 0.0, 0.12),  clamp(f*2.0,0.0,1.0));
    col       = mix(col, vec3(0.12, 0.03, 0.38), clamp(f*f*3.5,0.0,1.0));
    col       = mix(col, vec3(0.28, 0.08, 0.70), clamp(pow(f,3.0)*4.0,0.0,1.0));
    col       = mix(col, vec3(0.55, 0.20, 1.00), clamp(pow(f,5.0)*6.0,0.0,1.0));

    // vignette
    vec2 vc = vUv - 0.5;
    col *= 1.0 - dot(vc,vc) * 2.2;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ══════════════════════════════════════════════════════
   THREE.JS COMPONENTS
═══════════════════════════════════════════════════════ */
function ShaderBackground() {
  const matRef = useRef();
  const mouse  = useRef(new THREE.Vector2(0, 0));
  const target = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const onMove = (e) => {
      target.current.set(
        (e.clientX / window.innerWidth)  * 2 - 1,
       -(e.clientY / window.innerHeight) * 2 + 1,
      );
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    mouse.current.lerp(target.current, 0.035);
    matRef.current.uniforms.uTime.value  = clock.elapsedTime;
    matRef.current.uniforms.uMouse.value = mouse.current;
  });

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), []);

  return (
    <mesh position={[0, 0, -3]} scale={[20, 12, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

function ParticleSwarm() {
  const ref   = useRef();
  const count = 1800;
  const mouse = useRef([0, 0]);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [
        (e.clientX / window.innerWidth)  * 2 - 1,
       -(e.clientY / window.innerHeight) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#c4b5fd'),
      new THREE.Color('#4f46e5'),
    ];
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 7;
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
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.04  + mouse.current[0] * 0.06;
    ref.current.rotation.x = t * 0.013 + mouse.current[1] * 0.04;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent vertexColors size={0.019} sizeAttenuation
        depthWrite={false} opacity={0.65}
      />
    </Points>
  );
}

function MouseOrb() {
  const meshRef = useRef();
  const mouse   = useRef({ x: 0, y: 0 });
  const { size, camera } = useThree();

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = {
        x:  (e.clientX / size.width)  * 2 - 1,
        y: -(e.clientY / size.height) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [size]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.position.x += (mouse.current.x * 2.2 - meshRef.current.position.x) * 0.06;
    meshRef.current.position.y += (mouse.current.y * 1.6 - meshRef.current.position.y) * 0.06;
    meshRef.current.rotation.x = t * 0.3;
    meshRef.current.rotation.y = t * 0.2;
    const pulse = 1 + Math.sin(t * 1.5) * 0.07;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[0.55, 4]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#4c1d95"
        emissiveIntensity={0.6}
        wireframe={false}
        roughness={0.1}
        metalness={0.9}
        transparent opacity={0.55}
      />
    </mesh>
  );
}

function FloatingRings() {
  const r1 = useRef(); const r2 = useRef(); const r3 = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (r1.current) { r1.current.rotation.x = t*0.22; r1.current.rotation.y = t*0.14; }
    if (r2.current) { r2.current.rotation.x = -t*0.18; r2.current.rotation.y = t*0.2; }
    if (r3.current) { r3.current.rotation.z = t*0.12; r3.current.rotation.x = t*0.1; }
  });
  return (
    <>
      <mesh ref={r1} position={[3.5, 1.5, -1.5]}>
        <torusGeometry args={[0.8, 0.02, 16, 80]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.3} />
      </mesh>
      <mesh ref={r2} position={[-3, -1.2, -1]}>
        <torusGeometry args={[0.55, 0.015, 16, 80]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} />
      </mesh>
      <mesh ref={r3} position={[2, -2.5, -2]}>
        <torusKnotGeometry args={[0.4, 0.06, 120, 16]} />
        <meshBasicMaterial color="#4f46e5" wireframe transparent opacity={0.25} />
      </mesh>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   CURSOR
═══════════════════════════════════════════════════════ */
function CustomCursor() {
  const mx = useMotionValue(-200); const my = useMotionValue(-200);
  const sx = useSpring(mx, { stiffness: 500, damping: 35 });
  const sy = useSpring(my, { stiffness: 500, damping: 35 });
  const lx = useSpring(mx, { stiffness: 90,  damping: 22 });
  const ly = useSpring(my, { stiffness: 90,  damping: 22 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const move = (e) => { mx.set(e.clientX); my.set(e.clientY); };
    const over = (e) => { if (e.target.closest('a,button,[data-hover]')) setActive(true); };
    const out  = () => setActive(false);
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
      <motion.div
        style={{ x: sx, y: sy, translateX:'-50%', translateY:'-50%' }}
        className="fixed top-0 left-0 z-[9999] pointer-events-none w-2 h-2 bg-white rounded-full mix-blend-difference"
      />
      <motion.div
        style={{ x: lx, y: ly, translateX:'-50%', translateY:'-50%' }}
        animate={{ scale: active ? 2.8 : 1, opacity: active ? 0.5 : 0.25 }}
        transition={{ scale:{ duration: 0.25 } }}
        className="fixed top-0 left-0 z-[9998] pointer-events-none w-10 h-10 rounded-full border border-white mix-blend-difference"
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   GRAIN OVERLAY
═══════════════════════════════════════════════════════ */
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function GrainOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9990] opacity-[0.032]"
      style={{ backgroundImage: GRAIN_SVG, backgroundSize: '128px', backgroundRepeat: 'repeat' }} />
  );
}

/* ══════════════════════════════════════════════════════
   MAGNETIC BUTTON
═══════════════════════════════════════════════════════ */
function MagneticBtn({ children, className, to, onClick, strength = 0.35 }) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14 });
  const sy = useSpring(y, { stiffness: 180, damping: 14 });

  const move = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width  / 2)) * strength);
    y.set((e.clientY - (rect.top  + rect.height / 2)) * strength);
  };
  const leave = () => { x.set(0); y.set(0); };

  const Comp = to ? Link : 'button';
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onMouseMove={move} onMouseLeave={leave} className="inline-block">
      <Comp to={to} onClick={onClick} className={className}>{children}</Comp>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   COUNT UP
═══════════════════════════════════════════════════════ */
function CountUp({ target, duration = 2200, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const end   = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    const raf = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * end));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ══════════════════════════════════════════════════════
   TEXT REVEAL (clip-path)
═══════════════════════════════════════════════════════ */
function ClipReveal({ children, className, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden' }}>
      <motion.div
        initial={{ y: '105%', opacity: 0 }}
        animate={inView ? { y: '0%', opacity: 1 } : {}}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function Reveal({ children, className, delay = 0, y = 30 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   MARQUEE
═══════════════════════════════════════════════════════ */
function Marquee({ items, speed = 32, dir = 1 }) {
  return (
    <div className="overflow-hidden py-4 border-y border-white/[0.06]">
      <motion.div
        animate={{ x: dir > 0 ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
      >
        {[...Array(4)].map((_, r) => (
          <span key={r} className="flex items-center">
            {items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-6 mx-6">
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/25">{item}</span>
                <span className="w-1 h-1 rounded-full bg-indigo-500/40 flex-shrink-0" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════ */
function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(3,3,9,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif' }} className="text-sm font-bold text-white tracking-tight">SEO Bulk Updater</span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {[['Features','#features'],['Process','#process'],['Plugins','#plugins']].map(([l,h]) => (
            <a key={h} href={h} style={{ fontFamily:'Space Grotesk,sans-serif' }}
              className="text-[11px] font-semibold text-white/40 hover:text-white tracking-[0.18em] uppercase transition-colors duration-300">{l}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <MagneticBtn to="/app" className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white border border-white/10 hover:border-white/20 bg-white/[0.05] hover:bg-white/[0.08] transition-all" style={{ fontFamily:'Space Grotesk,sans-serif' }}>
              Dashboard <ArrowUpRight className="w-3 h-3" />
            </MagneticBtn>
          ) : (
            <>
              <Link to="/login" style={{ fontFamily:'Space Grotesk,sans-serif' }}
                className="text-[11px] font-semibold text-white/40 hover:text-white tracking-[0.15em] uppercase transition-colors">Sign in</Link>
              <MagneticBtn to="/register"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30">
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </MagneticBtn>
            </>
          )}
        </div>

        <button onClick={() => setOpen(o => !o)} className="md:hidden text-white/50 hover:text-white transition-colors">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="md:hidden overflow-hidden bg-[#030309]/98 border-t border-white/[0.05]">
            <div className="px-6 py-5 space-y-4">
              {[['Features','#features'],['Process','#process'],['Plugins','#plugins']].map(([l,h]) => (
                <a key={h} href={h} onClick={() => setOpen(false)}
                  className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-white transition-colors">{l}</a>
              ))}
              <div className="pt-3 border-t border-white/[0.05] space-y-2.5">
                {user ? (
                  <Link to="/app" className="block text-center py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl">Dashboard</Link>
                ) : (
                  <>
                    <Link to="/login" className="block text-center py-3 text-sm font-medium text-white/60 border border-white/10 rounded-xl">Sign in</Link>
                    <Link to="/register" className="block text-center py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl">Get started free</Link>
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

/* ══════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════ */
function Hero({ user }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Full-screen WebGL canvas */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0,0,5], fov: 50 }} gl={{ antialias: true, alpha: false }}>
            <color attach="background" args={['#030309']} />
            <ambientLight intensity={0.3} />
            <pointLight position={[4, 4, 4]} intensity={2} color="#6366f1" />
            <pointLight position={[-4,-3,-3]} intensity={1} color="#8b5cf6" />
            <ShaderBackground />
            <ParticleSwarm />
            <MouseOrb />
            <FloatingRings />
          </Canvas>
        </Suspense>
      </div>

      {/* Gradient vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, rgba(3,3,9,0.5) 80%, rgba(3,3,9,0.95) 100%)' }} />

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 pt-28 pb-16 w-full">
        <div className="max-w-5xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.16,1,0.3,1] }}
            className="flex items-center gap-3 mb-10"
          >
            <span className="w-8 h-px bg-indigo-500" />
            <span style={{ fontFamily: 'Space Mono, monospace' }}
              className="text-[10px] text-indigo-400 tracking-[0.3em] uppercase">WordPress SEO Automation</span>
          </motion.div>

          {/* Hero headline — massive mixed typography */}
          <div className="mb-10">
            <ClipReveal delay={0.3}>
              <h1
                style={{ fontFamily: 'Syne, sans-serif', lineHeight: '0.9', letterSpacing: '-0.03em' }}
                className="text-[clamp(58px,12vw,160px)] font-black text-white"
              >
                BULK
              </h1>
            </ClipReveal>
            <ClipReveal delay={0.42}>
              <div className="flex items-end gap-4 sm:gap-8">
                <h1
                  style={{ fontFamily: 'Syne, sans-serif', lineHeight: '0.9', letterSpacing: '-0.03em' }}
                  className="text-[clamp(58px,12vw,160px)] font-black"
                  data-text="UPDATE"
                >
                  <span className="text-transparent" style={{
                    WebkitTextStroke: '2px rgba(255,255,255,0.25)',
                  }}>UPDATE</span>
                </h1>
                <p style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  className="text-white/40 text-sm sm:text-base leading-snug max-w-[180px] mb-4 sm:mb-6 flex-shrink-0">
                  Meta titles, descriptions &amp; alt tags — across every WordPress site
                </p>
              </div>
            </ClipReveal>
            <ClipReveal delay={0.54}>
              <h1
                style={{ fontFamily: 'Syne, sans-serif', lineHeight: '0.9', letterSpacing: '-0.03em' }}
                className="text-[clamp(58px,12vw,160px)] font-black"
              >
                <span className="text-indigo-400">YOUR</span>
                {' '}SEO
              </h1>
            </ClipReveal>
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7, ease: [0.16,1,0.3,1] }}
            className="flex flex-wrap items-center gap-4"
          >
            {user ? (
              <MagneticBtn to="/app"
                className="group flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/50"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </MagneticBtn>
            ) : (
              <>
                <MagneticBtn to="/register"
                  className="group flex items-center gap-2.5 px-8 py-4 bg-white text-black font-bold rounded-2xl text-sm transition-all hover:bg-white/90 shadow-2xl shadow-white/10"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </MagneticBtn>
                <MagneticBtn to="/login"
                  className="flex items-center gap-2 px-8 py-4 border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-semibold rounded-2xl text-sm transition-all"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Sign in
                </MagneticBtn>
              </>
            )}

            <div style={{ fontFamily: 'Space Mono, monospace' }}
              className="flex items-center gap-2 text-white/30 text-[10px] tracking-widest uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
              No card required
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="absolute bottom-8 right-6 lg:right-12 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-12 bg-gradient-to-b from-transparent via-white/30 to-transparent"
          />
          <span style={{ fontFamily:'Space Mono,monospace' }}
            className="text-[9px] text-white/25 tracking-[0.3em] uppercase [writing-mode:vertical-rl]">Scroll</span>
        </motion.div>
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #030309, transparent)' }} />
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════ */
function Stats() {
  const stats = [
    { n: '10',  s: 'K+', label: 'Pages updated\nper day' },
    { n: '500', s: '+',  label: 'WordPress\nsites managed' },
    { n: '3',   s: ' min', label: 'To update\n1,000 pages' },
    { n: '99',  s: '.9%', label: 'Uptime\nSLA' },
  ];

  return (
    <section className="py-28 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="flex items-center gap-3 mb-16">
          <span className="w-8 h-px bg-white/20" />
          <span style={{ fontFamily:'Space Mono,monospace' }}
            className="text-[10px] text-white/30 tracking-[0.3em] uppercase">By the numbers</span>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-white/[0.05] border border-white/[0.05] rounded-2xl overflow-hidden">
          {stats.map(({ n, s, label }, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="p-8 sm:p-10 group hover:bg-white/[0.025] transition-colors duration-500">
                <p style={{ fontFamily:'Syne,sans-serif', lineHeight:1 }}
                  className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight">
                  <CountUp target={n} suffix={s} />
                </p>
                <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
                  className="text-xs text-white/30 whitespace-pre-line leading-relaxed font-medium">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   FEATURES (editorial numbered list)
═══════════════════════════════════════════════════════ */
function Features() {
  const list = [
    { n:'01', icon: UploadCloud,  c:'#6366f1', title:'Bulk Meta Updates',     body:'Upload a single CSV and update thousands of meta titles and descriptions in one shot. Process entire site crawls.' },
    { n:'02', icon: Layers,       c:'#8b5cf6', title:'Auto Plugin Detection', body:'Yoast, Rank Math, AIOSEO — auto-detected at runtime. We write to the right keys. Zero configuration required.' },
    { n:'03', icon: TrendingUp,   c:'#3b82f6', title:'Real-time Progress',    body:'Live SSE stream shows every success and failure row by row as it happens. No polling, no refresh, no guessing.' },
    { n:'04', icon: ClipboardList,c:'#10b981', title:'Full Audit Log',        body:'Every change logged: who, when, what. Auto-expires after 90 days to keep your database lean and clean.' },
    { n:'05', icon: Users,        c:'#f59e0b', title:'Team Management',       body:'Invite teammates, assign roles — admin, team leader, member. Control which sites each team can access.' },
    { n:'06', icon: Shield,       c:'#ef4444', title:'Secure by Design',      body:'App passwords encrypted, JWT auth, rate limiting, per-org data isolation. Built secure from day one.' },
  ];

  return (
    <section id="features" className="py-28 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <Reveal>
            <p style={{ fontFamily:'Space Mono,monospace' }}
              className="text-[10px] text-indigo-400 tracking-[0.3em] uppercase mb-4">Capabilities</p>
            <h2 style={{ fontFamily:'Syne,sans-serif', lineHeight:0.92, letterSpacing:'-0.03em' }}
              className="text-[clamp(40px,7vw,90px)] font-black text-white">
              Everything<br />you need.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
              className="text-white/35 max-w-xs text-sm leading-relaxed lg:text-right">
              Built for agencies, SEO teams, and freelancers who manage WordPress at scale.
            </p>
          </Reveal>
        </div>

        <div className="divide-y divide-white/[0.05]">
          {list.map((f, i) => (
            <Reveal key={f.n} delay={0} y={12}>
              <div className="group flex items-start gap-6 sm:gap-10 py-5 sm:py-6 px-3 -mx-3 rounded-xl hover:bg-white/[0.025] transition-all duration-400">
                <span style={{ fontFamily:'Space Mono,monospace' }}
                  className="text-xs text-white/20 mt-1.5 w-6 flex-shrink-0">{f.n}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background:`${f.c}15`, border:`1px solid ${f.c}28` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.c }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontFamily:'Syne,sans-serif' }}
                    className="font-bold text-white text-base mb-1.5 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                  <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
                    className="text-sm text-white/30 leading-relaxed max-w-lg">{f.body}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/15 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-1.5" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   PROCESS (how it works)
═══════════════════════════════════════════════════════ */
function Process() {
  const steps = [
    { n:'01', icon:Globe,       g:'from-indigo-600 to-blue-600',   title:'Connect your sites',   body:'Add WordPress sites via REST API app password. Install our 30-second bridge plugin.' },
    { n:'02', icon:UploadCloud, g:'from-violet-600 to-purple-600', title:'Upload a CSV',         body:'Prepare URLs, new titles, and descriptions. Upload and kick off the bulk job.' },
    { n:'03', icon:TrendingUp,  g:'from-purple-600 to-pink-600',   title:'Watch it live',        body:'Real-time progress — every success and failure visible as it happens.' },
  ];

  return (
    <section id="process" className="py-28 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="mb-16">
          <p style={{ fontFamily:'Space Mono,monospace' }}
            className="text-[10px] text-violet-400 tracking-[0.3em] uppercase mb-4">Process</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', lineHeight:0.92, letterSpacing:'-0.03em' }}
            className="text-[clamp(40px,7vw,90px)] font-black text-white">
            Up &amp; running<br />in minutes.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="group relative p-7 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.025]
                hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden h-full">
                {/* Large ghost number */}
                <span style={{ fontFamily:'Syne,sans-serif' }}
                  className="absolute -top-2 -right-1 text-[7rem] font-black text-white/[0.03] leading-none select-none pointer-events-none">{s.n}</span>

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.g} flex items-center justify-center mb-7 shadow-xl`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 style={{ fontFamily:'Syne,sans-serif' }}
                  className="font-black text-white text-xl mb-3 leading-tight">{s.title}</h3>
                <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
                  className="text-sm text-white/30 leading-relaxed">{s.body}</p>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.08), transparent 70%)' }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   PLUGINS
═══════════════════════════════════════════════════════ */
function Plugins() {
  const items = [
    { name:'Yoast SEO',      initial:'Y', color:'#7c3aed', glow:'rgba(124,58,237,0.35)', desc:'Most popular WordPress SEO plugin' },
    { name:'Rank Math',      initial:'R', color:'#0ea5e9', glow:'rgba(14,165,233,0.35)',  desc:'Advanced SEO suite with schema support' },
    { name:'All in One SEO', initial:'A', color:'#10b981', glow:'rgba(16,185,129,0.35)', desc:'Trusted by 3M+ WordPress sites' },
  ];

  return (
    <section id="plugins" className="py-28 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="mb-16">
          <p style={{ fontFamily:'Space Mono,monospace' }}
            className="text-[10px] text-emerald-400 tracking-[0.3em] uppercase mb-4">Compatibility</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', lineHeight:0.92, letterSpacing:'-0.03em' }}
            className="text-[clamp(40px,7vw,90px)] font-black text-white">
            Works with<br />your plugin.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
          {items.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div className="group relative p-7 rounded-2xl border border-white/[0.06] bg-white/[0.025]
                hover:border-white/[0.12] transition-all duration-500 text-center overflow-hidden">
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${p.glow.replace('0.35','0.12')}, transparent 70%)` }} />

                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5
                  text-white text-2xl font-black shadow-2xl transition-transform group-hover:scale-110 duration-400"
                  style={{ background: p.color, boxShadow:`0 16px 48px ${p.glow}` }}>
                  {p.initial}
                </div>
                <h3 style={{ fontFamily:'Syne,sans-serif' }}
                  className="font-black text-white text-base mb-1.5">{p.name}</h3>
                <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
                  className="text-xs text-white/30 mb-5">{p.desc}</p>
                <div className="inline-flex items-center gap-2" style={{ fontFamily:'Space Mono,monospace' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 tracking-widest uppercase font-bold">Auto-detected</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   CTA
═══════════════════════════════════════════════════════ */
function CTA({ user }) {
  return (
    <section className="py-28 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden border border-indigo-500/15 p-12 sm:p-20 lg:p-28">
            {/* Shader-like animated background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-1/2 opacity-30"
                style={{ background: 'conic-gradient(from 0deg at 50% 50%, #030309, #1e1b4b, #4c1d95, #6d28d9, #4f46e5, #3730a3, #1e1b4b, #030309)' }}
              />
              <div className="absolute inset-0" style={{ backdropFilter:'blur(60px)', background:'rgba(3,3,9,0.65)' }} />
              <motion.div
                animate={{ scale:[1,1.4,1], opacity:[0.15,0.35,0.15] }}
                transition={{ duration:7, repeat:Infinity, ease:'easeInOut' }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                style={{ background:'radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)' }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <ClipReveal>
                <h2 style={{ fontFamily:'Syne,sans-serif', lineHeight:0.92, letterSpacing:'-0.03em' }}
                  className="text-[clamp(40px,8vw,110px)] font-black text-white mb-6">
                  Stop doing<br />SEO by hand.
                </h2>
              </ClipReveal>
              <Reveal delay={0.3}>
                <p style={{ fontFamily:'Space Grotesk,sans-serif' }}
                  className="text-white/40 max-w-md mx-auto text-base sm:text-lg leading-relaxed mb-10">
                  Join hundreds of SEO teams and agencies saving hours every week with automated bulk updates.
                </p>
              </Reveal>
              <Reveal delay={0.45} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {user ? (
                  <MagneticBtn to="/app"
                    className="group flex items-center gap-2.5 px-10 py-4 bg-white text-black font-black rounded-2xl text-sm shadow-2xl shadow-white/10 hover:bg-white/90 transition-all"
                    style={{ fontFamily:'Syne,sans-serif' }}>
                    Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </MagneticBtn>
                ) : (
                  <>
                    <MagneticBtn to="/register"
                      className="group flex items-center gap-2.5 px-10 py-4 bg-white text-black font-black rounded-2xl text-sm shadow-2xl shadow-white/10 hover:bg-white/90 transition-all"
                      style={{ fontFamily:'Syne,sans-serif' }}>
                      Create free account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </MagneticBtn>
                    <Link to="/login" style={{ fontFamily:'Space Grotesk,sans-serif' }}
                      className="text-white/40 hover:text-white text-sm font-semibold transition-colors">
                      Sign in instead →
                    </Link>
                  </>
                )}
              </Reveal>
              <Reveal delay={0.6}>
                <p style={{ fontFamily:'Space Mono,monospace' }}
                  className="text-[10px] text-white/20 tracking-[0.25em] uppercase mt-8">
                  No credit card · 5-minute setup · Cancel anytime
                </p>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-10 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span style={{ fontFamily:'Syne,sans-serif' }} className="text-sm font-bold text-white">SEO Bulk Updater</span>
        </div>
        <p style={{ fontFamily:'Space Mono,monospace' }}
          className="text-[10px] text-white/20 tracking-[0.25em] uppercase">
          © {new Date().getFullYear()} All rights reserved
        </p>
        <div className="flex items-center gap-6">
          {[['Login','/login'],['Register','/register'],['Request Access','/request-access']].map(([l,h]) => (
            <Link key={h} to={h} style={{ fontFamily:'Space Mono,monospace' }}
              className="text-[10px] text-white/20 hover:text-white/60 tracking-[0.2em] uppercase transition-colors">{l}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════
   PAGE ROOT
═══════════════════════════════════════════════════════ */
const TICKER = ['Yoast SEO','Rank Math','AIOSEO','Bulk Updates','Meta Titles','Descriptions','Alt Tags','CSV Import','Live Progress','Audit Logs','Team Roles','Multi-Site'];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#030309] text-white overflow-x-hidden" style={{ cursor:'none' }}>
      <CustomCursor />
      <GrainOverlay />
      <Navbar user={user} />
      <Hero   user={user} />
      <Marquee items={TICKER} speed={38} dir={1} />
      <Stats />
      <Marquee items={TICKER} speed={28} dir={-1} />
      <Features />
      <Process />
      <Plugins />
      <CTA    user={user} />
      <Footer />
    </div>
  );
}
