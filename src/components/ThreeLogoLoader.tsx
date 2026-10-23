import { useEffect, useRef, useState } from "react";

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

type LoaderProps = { durationMs?: number };

export function ThreeLogoLoader({ durationMs = 3200 }: LoaderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pipertrace:intro-seen") === "1") {
        setVisible(false);
        return;
      }
      sessionStorage.setItem("pipertrace:intro-seen", "1");
    } catch {
      // Private mode may block session storage; show the intro for this mount.
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduceMotion ? 550 : durationMs;
    const exitAt = Math.max(220, total - 620);
    const exitTimer = window.setTimeout(() => setExiting(true), exitAt);
    const removeTimer = window.setTimeout(() => setVisible(false), total);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [durationMs]);

  useEffect(() => {
    if (!visible || !mountRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let alive = true;
    let animationFrame = 0;
    let renderer: any;
    let geometry: any;
    let particles: any;
    let ringA: any;
    let ringB: any;
    let ringC: any;
    let resizeObserver: ResizeObserver | undefined;
    let removeResize: (() => void) | undefined;
    const mount = mountRef.current;
    const started = performance.now();

    const startScene = async () => {
      try {
        // External Three.js is intentionally lazy-loaded: it is used only for this brief intro.
        const moduleUrl: string = THREE_CDN;
        const THREE = await import(/* @vite-ignore */ moduleUrl);
        if (!alive || !mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
        camera.position.set(0, 0, 8.5);

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(mount.clientWidth, mount.clientHeight, false);
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-hidden", "true");

        const ringMaterial = (color: number, opacity: number) => new THREE.MeshBasicMaterial({
          color, transparent: true, opacity, wireframe: true, depthWrite: false,
        });
        ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.0045, 5, 140), ringMaterial(0xb2dbe0, 0.42));
        ringB = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.003, 4, 160), ringMaterial(0xf7f7f4, 0.17));
        ringC = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.004, 4, 120), ringMaterial(0x6ab1bd, 0.27));
        ringA.rotation.set(0.8, 0.2, 0.2);
        ringB.rotation.set(1.1, -0.55, 0.45);
        ringC.rotation.set(-0.5, 0.6, -0.25);
        scene.add(ringA, ringB, ringC);

        const count = 240;
        const positions = new Float32Array(count * 3);
        const phases = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const radius = 1.3 + Math.random() * 1.25;
          const angle = Math.random() * Math.PI * 2;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 3.8;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
          phases[i] = Math.random() * Math.PI * 2;
        }
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
        particles = new THREE.Points(geometry, new THREE.PointsMaterial({
          color: 0xeaf8f8, size: 0.022, transparent: true, opacity: 0.68, depthWrite: false,
          blending: THREE.AdditiveBlending, sizeAttenuation: true,
        }));
        scene.add(particles);

        const resize = () => {
          if (!alive || !mount) return;
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        if ("ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(mount);
        } else {
          window.addEventListener("resize", resize);
          removeResize = () => window.removeEventListener("resize", resize);
        }

        const render = (now: number) => {
          if (!alive) return;
          const t = (now - started) * 0.00018;
          ringA.rotation.y += 0.0016;
          ringA.rotation.z = 0.2 + Math.sin(t * 2.8) * 0.12;
          ringB.rotation.x += 0.0007;
          ringB.rotation.y -= 0.0011;
          ringC.rotation.z -= 0.0014;
          particles.rotation.y = t * 0.8;
          particles.rotation.x = Math.sin(t) * 0.08;
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };
        resize();
        animationFrame = window.requestAnimationFrame(render);
      } catch {
        // The logo animation remains useful if WebGL or the CDN is unavailable.
      }
    };

    void startScene();
    return () => {
      alive = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      removeResize?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      geometry?.dispose();
      if (ringA) { ringA.geometry.dispose(); ringA.material.dispose(); }
      if (ringB) { ringB.geometry.dispose(); ringB.material.dispose(); }
      if (ringC) { ringC.geometry.dispose(); ringC.material.dispose(); }
      if (particles) particles.material.dispose();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`pipertrace-intro ${exiting ? "is-exiting" : ""}`} role="status" aria-label="Loading PiperTrace">
      <div className="pipertrace-intro-glow" />
      <div ref={mountRef} className="pipertrace-intro-scene" />
      <div className="pipertrace-intro-content">
        <img className="pipertrace-intro-logo" src="/pipertrace-mark.svg" alt="" fetchPriority="high" />
        <p className="pipertrace-intro-name">PiperTrace</p>
        <p className="pipertrace-intro-kicker">FORENSIC SIGNAL WORKSPACE</p>
        <div className="pipertrace-intro-progress"><span /></div>
      </div>
      <div className="pipertrace-intro-footer"><span>INTEGRITY FIRST</span><span>LOCAL-FIRST ANALYSIS</span></div>
    </div>
  );
}
