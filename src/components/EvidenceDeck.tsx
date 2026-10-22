import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { categories } from "@/lib/categories";

// Stack -> fan -> fold into grid, driven by scroll progress of a tall pinned section.
const FAN = [
  { x: -330, y: 30, r: -14 },
  { x: -110, y: -10, r: -5 },
  { x: 110, y: -10, r: 5 },
  { x: 330, y: 30, r: 14 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

export function EvidenceDeck() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = window.matchMedia("(min-width: 900px)");
    const onMq = () => setWide(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    if (reduce) { setP(0.5); return () => mq.removeEventListener("change", onMq); }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        setP(clamp(-r.top / total));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onMq);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!wide) {
    return (
      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-16 sm:grid-cols-2">
        {categories.map((c) => <Card key={c.id} c={c} lifted={false} />)}
      </section>
    );
  }

  const fan = ease(clamp(p / 0.5));
  const fold = ease(clamp((p - 0.6) / 0.35));

  return (
    <section ref={ref} className="relative h-[260vh]" aria-label="The Evidence Deck">
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
        <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-opacity"
          style={{ opacity: 1 - fold }}>
          {fan < 0.95 ? "Scroll to open the deck" : "Four intake categories · one evidence standard"}
        </p>
        <div className="relative h-[420px] w-full max-w-6xl" style={{ perspective: "1600px" }}>
          {categories.map((c, i) => {
            const f = FAN[i] ?? { x: 0, y: 0, r: 0 };
            const gx = (i - 1.5) * 270;
            const lift = active === i ? 1 : 0;
            const x = lerp(lerp(i * 6 - 9, f.x, fan), gx, fold);
            const y = lerp(lerp(i * -6, f.y, fan), 0, fold) - lift * 18;
            const r = lerp(lerp((i - 1.5) * 2, f.r, fan), 0, fold);
            const rx = lerp(lerp(18, 6, fan), 0, fold);
            return (
              <div key={c.id}
                className="absolute left-1/2 top-1/2 h-[380px] w-[250px] transition-transform duration-300 ease-out will-change-transform"
                style={{
                  transform: `translate(-50%,-50%) translate3d(${x}px,${y}px,${lift * 40}px) rotateX(${rx}deg) rotateZ(${r}deg)`,
                  zIndex: active === i ? 10 : i,
                }}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
                <Card c={c} lifted={active === i} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Card({ c, lifted }: { c: (typeof categories)[number]; lifted: boolean }) {
  return (
    <Link to="/methodology" hash={c.id}
      className={`group flex h-full min-h-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background ${lifted ? "ring-1 ring-primary/30" : ""}`}
      aria-label={`${c.title}: ${c.tagline}`}>
      <div className="flex items-center justify-between px-5 pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>{c.index}</span><span>{c.title}</span>
      </div>
      <div className="relative mx-4 mt-3 flex flex-1 items-center justify-center rounded-xl bg-secondary/60 grain">
        <img src={c.art} alt="" width={1024} height={1024} loading="lazy"
          className="h-40 w-40 object-contain transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-5">
        <h3 className="font-serif text-3xl italic">{c.title}</h3>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{c.summary}</p>
      </div>
    </Link>
  );
}
