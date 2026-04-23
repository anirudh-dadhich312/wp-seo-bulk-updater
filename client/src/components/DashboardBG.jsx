import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const mouseState = { x: 0, y: 0 };

function ParticleField() {
  const ref = useRef();
  const count = 420;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const palette   = [
      [0.38, 0.35, 1.0],
      [0.55, 0.22, 0.96],
      [0.18, 0.40, 0.95],
      [0.70, 0.30, 0.90],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.018;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.009) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color"    array={colors}    count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function GlowOrb({ basePos, color, speed, amp }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.set(
      basePos[0] + Math.sin(t) * amp,
      basePos[1] + Math.cos(t * 0.73) * amp,
      basePos[2] + Math.sin(t * 0.51) * amp * 0.6,
    );
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.7, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        transparent
        opacity={0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function MouseParallax() {
  const { camera } = useThree();

  useEffect(() => {
    const onMove = (e) => {
      mouseState.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseState.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(() => {
    camera.position.x += (mouseState.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (-mouseState.y * 0.25 - camera.position.y) * 0.04;
  });

  return null;
}

const ORBS = [
  { basePos: [-5,  2.5, -4], color: '#4f46e5', speed: 0.28, amp: 1.6 },
  { basePos: [ 5, -2,   -5], color: '#7c3aed', speed: 0.22, amp: 1.3 },
  { basePos: [ 1,  4,   -6], color: '#2563eb', speed: 0.18, amp: 1.9 },
  { basePos: [-3, -4,   -3], color: '#6d28d9', speed: 0.32, amp: 1.1 },
];

export default function DashboardBG() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: false, alpha: false }}
        style={{ background: '#07071a' }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.08} />
        <ParticleField />
        {ORBS.map((o, i) => <GlowOrb key={i} {...o} />)}
        <MouseParallax />
      </Canvas>
    </div>
  );
}
