import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function CentralShape() {
  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.8}>
      <mesh>
        <icosahedronGeometry args={[1.8, 1]} />
        <MeshDistortMaterial
          color="#6366f1"
          distort={0.45}
          speed={2.5}
          roughness={0.05}
          metalness={0.95}
          emissive="#4338ca"
          emissiveIntensity={0.4}
        />
      </mesh>
    </Float>
  );
}

function OrbitingOrbs() {
  const group = useRef();
  const inner = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.28;
    group.current.rotation.x = t * 0.08;
    inner.current.rotation.y = -t * 0.45;
    inner.current.rotation.z = t * 0.12;
  });

  const orbs = [
    { pos: [3.2, 0, 0], scale: 0.28, color: '#8b5cf6' },
    { pos: [-3.0, 0.8, 0], scale: 0.22, color: '#06b6d4' },
    { pos: [0, 3.2, 0.5], scale: 0.26, color: '#ec4899' },
    { pos: [2.2, -2.2, -0.8], scale: 0.16, color: '#a78bfa' },
    { pos: [-2.0, 2.0, 1.2], scale: 0.2, color: '#22d3ee' },
  ];

  const innerOrbs = [
    { pos: [2.2, 0, 0], scale: 0.14, color: '#f472b6' },
    { pos: [-2.2, 0, 0], scale: 0.12, color: '#34d399' },
    { pos: [0, 2.2, 0], scale: 0.16, color: '#fbbf24' },
  ];

  return (
    <>
      <group ref={group}>
        {orbs.map((o, i) => (
          <mesh key={i} position={o.pos} scale={o.scale}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial
              color={o.color}
              emissive={o.color}
              emissiveIntensity={1.2}
              roughness={0.05}
              metalness={0.9}
            />
          </mesh>
        ))}
      </group>
      <group ref={inner}>
        {innerOrbs.map((o, i) => (
          <mesh key={i} position={o.pos} scale={o.scale}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={o.color}
              emissive={o.color}
              emissiveIntensity={1.5}
              roughness={0.05}
              metalness={0.9}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Rings() {
  const r1 = useRef();
  const r2 = useRef();
  const r3 = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    r1.current.rotation.x = t * 0.18;
    r1.current.rotation.z = t * 0.12;
    r2.current.rotation.y = t * 0.22;
    r2.current.rotation.z = -t * 0.1;
    r3.current.rotation.x = -t * 0.15;
    r3.current.rotation.y = t * 0.08;
  });

  return (
    <>
      <mesh ref={r1}>
        <torusGeometry args={[2.8, 0.018, 16, 120]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.7} transparent opacity={0.7} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[3.4, 0.012, 16, 120]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} transparent opacity={0.5} />
      </mesh>
      <mesh ref={r3}>
        <torusGeometry args={[2.2, 0.022, 16, 100]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} transparent opacity={0.55} />
      </mesh>
    </>
  );
}

function ParticleField() {
  const count = 600;
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  const colors = useMemo(() => {
    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#ec4899'),
      new THREE.Color('#a78bfa'),
    ];
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, []);

  useFrame((state) => {
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.018;
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.008;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef([0, 0]);

  useEffect(() => {
    const handler = (e) => {
      mouse.current = [
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      ];
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useFrame(() => {
    camera.position.x += (mouse.current[0] * 0.8 - camera.position.x) * 0.04;
    camera.position.y += (mouse.current[1] * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.15} />
      <pointLight position={[6, 6, 6]} intensity={3} color="#6366f1" />
      <pointLight position={[-6, -6, -6]} intensity={1.5} color="#8b5cf6" />
      <pointLight position={[0, 6, -6]} intensity={1} color="#06b6d4" />
      <pointLight position={[0, -6, 6]} intensity={0.8} color="#ec4899" />

      <Stars radius={80} depth={60} count={4000} factor={4} saturation={0} fade speed={0.6} />
      <CentralShape />
      <OrbitingOrbs />
      <Rings />
      <ParticleField />
      <CameraRig />
    </Canvas>
  );
}
