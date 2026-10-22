import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { categories } from "@/lib/categories";

type Viewport = { width: number; height: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Evidence Deck
 * The interaction remains scroll-driven on phones as well as desktop:
 * stacked -> fan -> a category layout that fits the available viewport.
 * Narrow screens finish in a 2x2 grid; wider screens finish in a single row.
 */
export function EvidenceDeck() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1024, height: 768 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    const syncViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });

    syncMotion();
    syncViewport();
    motionQuery.addEventListener("change", syncMotion);
    window.addEventListener("resize", syncViewport, { passive: true });

    return () => {
      motionQuery.removeEventListener("change", syncMotion);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const scrollableDistance = rect.height - window.innerHeight;
        setProgress(scrollableDistance > 0 ? clamp(-rect.top / scrollableDistance) : 1);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reducedMotion, viewport.width, viewport.height]);

  const narrow = viewport.width < 640;
  const rowLayout = viewport.width >= 680;
  const cinematicLayout = viewport.width >= 900 && viewport.height >= 620;
  const stageWidth = Math.max(280, Math.min(1152, viewport.width - (narrow ? 32 : 48)));
  const cardWidth = cinematicLayout
    ? 250
    : rowLayout
      ? Math.min(190, (stageWidth - 36) / 4)
      : Math.min(185, (stageWidth - 12) / 2);
  const cardHeight = cinematicLayout
    ? 380
    : rowLayout
      ? Math.max(190, Math.min(310, cardWidth * 1.52, viewport.height * 0.52))
      : Math.min(260, Math.max(190, viewport.height * 0.3));
  const stageHeight = cinematicLayout
    ? 420
    : rowLayout
      ? Math.min(400, Math.max(260, viewport.height * 0.65))
      : Math.min(560, Math.max(400, viewport.height * 0.78));

  const fanProgress = ease(clamp(progress / 0.5));
  const foldProgress = ease(clamp((progress - 0.6) / 0.35));

  const maxFanX = Math.max(0, Math.min(
    rowLayout ? (cinematicLayout ? 330 : 260) : 0,
    (stageWidth - cardWidth) / 2 - 8,
  ));
  const fanX = rowLayout
    ? [-maxFanX, -maxFanX / 3, maxFanX / 3, maxFanX]
    : [-1.5, -0.5, 0.5, 1.5].map((n) => n * cardWidth * 0.38);

  const rowSpacing = Math.max(0, (stageWidth - cardWidth - 16) / 3);
  const gridGapX = (cardWidth + 12) / 2;
  const gridGapY = (cardHeight + 12) / 2;

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: rowLayout ? "260vh" : "220svh" }}
      aria-label="The Evidence Deck"
    >
      <div className="sticky top-16 flex flex-col items-center justify-center overflow-hidden px-3"
        style={{ height: "calc(100svh - 4rem)" }}>
        <p
          className="mb-3 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:mb-6 sm:text-[11px] sm:tracking-[0.22em]"
          style={{ opacity: 1 - foldProgress * 0.55 }}
          aria-live="polite"
        >
          {reducedMotion
            ? "Choose a forensic path"
            : foldProgress > 0.72
              ? (rowLayout ? "Choose a forensic path" : "Choose a category")
              : fanProgress < 0.94
                ? "Scroll to open the deck"
                : "Four intake categories · one evidence standard"}
        </p>

        <div
          className="relative mx-auto w-full max-w-6xl"
          style={{ height: stageHeight + "px", perspective: "1600px" }}
        >
          {categories.map((category, index) => {
            const stackX = (index - 1.5) * 3;
            const stackY = index * -3;
            const stackRotation = (index - 1.5) * 1.4;
            const fanY = rowLayout
              ? [30, -10, -10, 30][index] ?? 0
              : [12, -6, -6, 12][index] ?? 0;
            const fanRotation = [-14, -5, 5, 14][index] ?? 0;

            let targetX: number;
            let targetY: number;
            if (rowLayout) {
              targetX = (index - 1.5) * rowSpacing;
              targetY = 0;
            } else {
              const column = index % 2;
              const row = Math.floor(index / 2);
              targetX = column === 0 ? -gridGapX : gridGapX;
              targetY = row === 0 ? -gridGapY : gridGapY;
            }

            const x = lerp(lerp(stackX, fanX[index] ?? 0, fanProgress), targetX, foldProgress);
            const y = lerp(lerp(stackY, fanY, fanProgress), targetY, foldProgress) - (active === index ? 10 : 0);
            const rotation = lerp(lerp(stackRotation, fanRotation, fanProgress), 0, foldProgress);
            const tiltX = lerp(lerp(12, rowLayout ? 5 : 3, fanProgress), 0, foldProgress);
            const isActive = active === index;

            return (
              <div
                key={category.id}
                className="absolute left-1/2 top-1/2 will-change-transform"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: "translate(-50%, -50%) translate3d(" + x + "px, " + y + "px, " + (isActive ? 34 : index * 2) + "px) rotateX(" + tiltX + "deg) rotateZ(" + rotation + "deg)",
                  transformStyle: "preserve-3d",
                  zIndex: isActive ? 20 : index + 1,
                  transition: isActive ? "transform 180ms ease-out" : "none",
                }}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null);
                }}
              >
                <Card
                  c={category}
                  lifted={isActive}
                  compact={!rowLayout || viewport.width < 900}
                  narrow={narrow}
                />
              </div>
            );
          })}
        </div>

        <p className="mt-3 max-w-xl text-center text-[10px] leading-relaxed text-muted-foreground/80 sm:mt-5 sm:text-xs">
          Select a category to open its dedicated analysis workflow.
        </p>
      </div>
    </section>
  );
}

function Card({
  c,
  lifted,
  compact,
  narrow,
}: {
  c: (typeof categories)[number];
  lifted: boolean;
  compact: boolean;
  narrow: boolean;
}) {
  const artSize = narrow ? "h-16 w-16" : compact ? "h-24 w-24" : "h-32 w-32 xl:h-40 xl:w-40";
  return (
    <Link
      to="/studio"
      search={{ mode: c.id }}
      className={[
        "group flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-card outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-[box-shadow,border-color] duration-200",
        lifted ? "border-primary/50 shadow-xl ring-1 ring-primary/20" : "hover:border-primary/30",
      ].join(" ")}
      aria-label={c.title + ": " + c.tagline}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground sm:px-5 sm:pt-5 sm:text-[10px] sm:tracking-[0.2em]">
        <span>{c.index}</span>
        <span className="truncate text-right">{c.tagline}</span>
      </div>
      <div className="grain relative mx-3 mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-secondary/60 sm:mx-4 sm:mt-3">
        <img
          src={c.art}
          alt=""
          width={1024}
          height={1024}
          loading="lazy"
          className={artSize + " object-contain transition-transform duration-500 group-hover:scale-[1.04]"}
        />
      </div>
      <div className={compact ? "p-3 sm:p-4" : "p-5"}>
        <h3 className={compact ? "font-serif text-2xl italic leading-none sm:text-3xl" : "font-serif text-3xl italic leading-none"}>
          {c.title}
        </h3>
        <p className={compact ? "mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground sm:text-xs" : "mt-2 text-sm leading-snug text-muted-foreground"}>
          {c.summary}
        </p>
      </div>
    </Link>
  );
}
