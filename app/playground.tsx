"use client";

import { useMemo, useRef, useState } from "react";
import AnimatedCarousel, {
  type AnimatedCarouselHandle,
  type ArrowsStyle,
  type CarouselSlide,
  type EffectName,
  type PaginationStyle,
  type TextAnimationName,
  type TextPosition,
  type TransitionPreset,
} from "@/components/AnimatedCarousel";

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const thumb = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=240&h=150&q=60`;

const SLIDES: CarouselSlide[] = [
  {
    id: "valley",
    image: img("1469474968028-56623f02e42e"),
    thumbnail: thumb("1469474968028-56623f02e42e"),
    alt: "A sweeping mountain valley",
    eyebrow: "Chapter 01",
    title: "Where the river learns to bend",
    description: "Slow mornings, cold water and the kind of quiet that only exists far from the road.",
    cta: { label: "Explore the route →", href: "#" },
  },
  {
    id: "peaks",
    image: img("1506905925346-21bda4d32df4"),
    thumbnail: thumb("1506905925346-21bda4d32df4"),
    alt: "Mountain peaks above a misty forest",
    eyebrow: "Chapter 02",
    title: "Above the clouds, below the stars",
    description: "Ridge lines that look painted on. Every switchback is worth the climb.",
    cta: { label: "See the summit", href: "#" },
  },
  {
    id: "coast",
    image: img("1418065460487-3e41a6c84dc5"),
    thumbnail: thumb("1418065460487-3e41a6c84dc5"),
    alt: "Misty pine forest",
    eyebrow: "Chapter 03",
    title: "The forest keeps its secrets",
    description: "Fog muffles everything — footsteps, voices, even time.",
    textPosition: "center",
  },
  {
    id: "lake",
    image: img("1501785888041-af3ef285b470"),
    thumbnail: thumb("1501785888041-af3ef285b470"),
    alt: "A calm lake below mountains",
    eyebrow: "Chapter 04",
    title: "Still water runs deep",
    description: "A mirror for the sky and everything we bring with us.",
    cta: { label: "Read the story", href: "#" },
  },
  {
    id: "waves",
    image: img("1507525428034-b723cf961d3e"),
    thumbnail: thumb("1507525428034-b723cf961d3e"),
    alt: "A turquoise beach",
    eyebrow: "Chapter 05",
    title: "The sea always answers",
    description: "Salt, wind and a horizon that never quite gets closer.",
    textPosition: "bottom-right",
  },
  {
    id: "city",
    image: img("1477959858617-67f85cf4f1df"),
    thumbnail: thumb("1477959858617-67f85cf4f1df"),
    alt: "City skyline at dusk",
    eyebrow: "Chapter 06",
    title: "And then, the city lights",
    description: "Every journey ends where a new one starts.",
    cta: { label: "Start again", href: "#" },
  },
];

const EFFECTS: EffectName[] = ["slide", "fade", "coverflow", "cube", "flip", "stack", "zoom", "reveal", "dissolve", "orbit"];
const TRANSITIONS: TransitionPreset[] = ["spring", "snappy", "bouncy", "gentle", "smooth", "slow"];
const TEXT_ANIMS: TextAnimationName[] = ["rise", "mask", "letters", "blur", "fade", "slide", "none"];
const PAGINATIONS: PaginationStyle[] = ["dots", "bar", "numbers", "thumbnails", "none"];
const ARROWS: ArrowsStyle[] = ["sides", "bottom", "none"];
const POSITIONS: TextPosition[] = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];
const ACCENTS = ["#ff5a36", "#7c5cff", "#00c2a8", "#ffb800", "#ff3d8b", "#3b82f6"];

function Chips<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
            value === o ? "bg-white text-black" : "bg-white/[.06] text-white/70 hover:bg-white/[.12] hover:text-white"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/45">{label}</span>
        {hint && <span className="font-mono text-[11px] text-white/45">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl bg-white/[.04] px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/[.07]"
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

const DEFAULT_SLIDE_WIDTH: Record<EffectName, number> = {
  slide: 1, fade: 1, coverflow: 0.52, cube: 1, flip: 1, stack: 0.8, zoom: 1, reveal: 1, dissolve: 1, orbit: 0.42,
};

export default function Playground() {
  const [effect, setEffect] = useState<EffectName>("slide");
  const [transition, setTransition] = useState<TransitionPreset>("spring");
  const [textAnimation, setTextAnimation] = useState<TextAnimationName>("mask");
  const [textPosition, setTextPosition] = useState<TextPosition>("bottom-left");
  const [pagination, setPagination] = useState<PaginationStyle>("dots");
  const [arrows, setArrows] = useState<ArrowsStyle>("sides");
  const [autoplay, setAutoplay] = useState(true);
  const [interval, setIntervalMs] = useState(5000);
  const [loop, setLoop] = useState(true);
  const [kenBurns, setKenBurns] = useState(true);
  const [customWidth, setCustomWidth] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0.8);
  const [parallax, setParallax] = useState(0.35);
  const [stagger, setStagger] = useState(45);
  const [radius, setRadius] = useState(20);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const ref = useRef<AnimatedCarouselHandle>(null);

  // Apply the chosen text position to every slide in the demo.
  const items = useMemo(() => SLIDES.map((s) => ({ ...s, textPosition })), [textPosition]);

  const code = useMemo(() => {
    const lines = [
      `<AnimatedCarousel`,
      `  items={slides}`,
      `  effect="${effect}"`,
      `  transition="${transition}"`,
      `  textAnimation={{ type: "${textAnimation}", stagger: ${stagger} }}`,
      `  textPosition="${textPosition}"`,
      `  pagination="${pagination}"`,
      `  arrows="${arrows}"`,
      autoplay ? `  autoplay={${interval}}` : null,
      !loop ? `  loop={false}` : null,
      kenBurns ? `  kenBurns` : null,
      customWidth ? `  slideWidth={${slideWidth}}` : null,
      effect === "slide" ? `  parallax={${parallax}}` : null,
      radius !== 20 ? `  radius={${radius}}` : null,
      `  accentColor="${accent}"`,
      `/>`,
    ];
    return lines.filter(Boolean).join("\n");
  }, [effect, transition, textAnimation, stagger, textPosition, pagination, arrows, autoplay, interval, loop, kenBurns, customWidth, slideWidth, parallax, radius, accent]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="min-h-screen" style={{ "--accent": accent } as React.CSSProperties}>
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-col gap-3 lg:mb-10">
          <span className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{ color: accent }}>
            One file · zero dependencies
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Animated Carousel</h1>
          <p className="max-w-2xl text-white/60 sm:text-lg">
            Ten 3D effects, spring physics, swipe with momentum and animated captions. Change any setting below,
            then copy the code. The component lives in <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">components/AnimatedCarousel.tsx</code>.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <AnimatedCarousel
              ref={ref}
              key={effect /* fresh start per effect keeps the demo tidy */}
              items={items}
              effect={effect}
              transition={transition}
              textAnimation={{ type: textAnimation, stagger }}
              pagination={pagination}
              arrows={arrows}
              autoplay={autoplay ? interval : false}
              loop={loop}
              kenBurns={kenBurns}
              slideWidth={customWidth ? slideWidth : undefined}
              parallax={parallax}
              radius={radius}
              accentColor={accent}
              startIndex={index}
              onChange={setIndex}
              ariaLabel="Journey highlights"
            />

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="text-xs font-medium text-white/50">Your settings as code</span>
                <button type="button" onClick={copy} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20">
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-white/80">{code}</pre>
            </div>
          </section>

          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <Field label="Effect">
              <Chips value={effect} options={EFFECTS} onChange={setEffect} />
            </Field>
            <Field label="Motion">
              <Chips value={transition} options={TRANSITIONS} onChange={setTransition} />
            </Field>
            <Field label="Text animation">
              <Chips value={textAnimation} options={TEXT_ANIMS} onChange={setTextAnimation} />
            </Field>
            <Field label="Text stagger" hint={`${stagger}ms`}>
              <input type="range" min={0} max={150} step={5} value={stagger} onChange={(e) => setStagger(+e.target.value)} className="accent-[var(--accent)]" />
            </Field>
            <Field label="Text position">
              <div className="grid w-28 grid-cols-3 gap-1.5">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={p}
                    title={p}
                    onClick={() => setTextPosition(p)}
                    className={`aspect-square rounded-md transition ${textPosition === p ? "bg-[var(--accent)]" : "bg-white/10 hover:bg-white/20"}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Pagination">
              <Chips value={pagination} options={PAGINATIONS} onChange={setPagination} />
            </Field>
            <Field label="Arrows">
              <Chips value={arrows} options={ARROWS} onChange={setArrows} />
            </Field>

            <div className="flex flex-col gap-2">
              <Toggle label="Autoplay" checked={autoplay} onChange={setAutoplay} />
              {autoplay && (
                <Field label="Interval" hint={`${(interval / 1000).toFixed(1)}s`}>
                  <input type="range" min={1500} max={10000} step={500} value={interval} onChange={(e) => setIntervalMs(+e.target.value)} className="accent-[var(--accent)]" />
                </Field>
              )}
              <Toggle label="Loop" checked={loop} onChange={setLoop} />
              <Toggle label="Ken Burns zoom" checked={kenBurns} onChange={setKenBurns} />
              <Toggle label="Custom slide width" checked={customWidth} onChange={setCustomWidth} />
            </div>

            {customWidth && (
              <Field label="Slide width" hint={`${Math.round(slideWidth * 100)}%`}>
                <input type="range" min={0.3} max={1} step={0.02} value={slideWidth} onChange={(e) => setSlideWidth(+e.target.value)} className="accent-[var(--accent)]" />
              </Field>
            )}
            {!customWidth && (
              <p className="-mt-3 text-xs text-white/40">Using the effect default: {Math.round(DEFAULT_SLIDE_WIDTH[effect] * 100)}%</p>
            )}
            {effect === "slide" && (
              <Field label="Parallax" hint={parallax.toFixed(2)}>
                <input type="range" min={0} max={1} step={0.05} value={parallax} onChange={(e) => setParallax(+e.target.value)} className="accent-[var(--accent)]" />
              </Field>
            )}
            <Field label="Corner radius" hint={`${radius}px`}>
              <input type="range" min={0} max={40} step={1} value={radius} onChange={(e) => setRadius(+e.target.value)} className="accent-[var(--accent)]" />
            </Field>
            <Field label="Accent">
              <div className="flex gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Accent ${c}`}
                    onClick={() => setAccent(c)}
                    className={`h-7 w-7 rounded-full transition ${accent === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0b0b10]" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>

            <div className="flex gap-2 border-t border-white/10 pt-5">
              <button type="button" onClick={() => ref.current?.prev()} className="flex-1 rounded-xl bg-white/[.06] py-2 text-sm hover:bg-white/[.12]">
                ref.prev()
              </button>
              <button type="button" onClick={() => ref.current?.goTo(3)} className="flex-1 rounded-xl bg-white/[.06] py-2 text-sm hover:bg-white/[.12]">
                goTo(3)
              </button>
              <button type="button" onClick={() => ref.current?.next()} className="flex-1 rounded-xl bg-white/[.06] py-2 text-sm hover:bg-white/[.12]">
                ref.next()
              </button>
            </div>
          </aside>
        </div>

        <section className="mt-16 lg:mt-24">
          <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">Any JSX works too</h2>
          <p className="mb-6 max-w-2xl text-white/60">
            Pass children instead of <code className="font-mono text-sm">items</code>. Every child becomes a slide. This one uses the{" "}
            <code className="font-mono text-sm">stack</code> effect and a <code className="font-mono text-sm">bouncy</code> spring.
          </p>
          <div className="mx-auto max-w-3xl">
            <AnimatedCarousel effect="stack" transition="bouncy" aspectRatio="16 / 8" mobileAspectRatio="4 / 5" pagination="bar" arrows="bottom" accentColor="#7c5cff" ariaLabel="Testimonials">
              {[
                { q: "We replaced three slider libraries with one file. It just works.", n: "Amara O.", r: "Frontend lead", bg: "linear-gradient(135deg,#7c5cff,#3b1d8f)" },
                { q: "The swipe feels native on every phone we tested.", n: "Daniel K.", r: "Mobile engineer", bg: "linear-gradient(135deg,#ff5a36,#8f1d3b)" },
                { q: "Designers can tweak the motion without touching the code.", n: "Wanjiru M.", r: "Product designer", bg: "linear-gradient(135deg,#00c2a8,#0b4f6c)" },
                { q: "Accessible, keyboard friendly and respects reduced motion.", n: "Leo P.", r: "Accessibility advocate", bg: "linear-gradient(135deg,#ffb800,#a3410b)" },
              ].map((t) => (
                <div key={t.n} className="flex h-full flex-col justify-between p-6 sm:p-10" style={{ background: t.bg }}>
                  <span className="text-5xl leading-none opacity-50 sm:text-6xl">&ldquo;</span>
                  <p className="text-xl font-semibold leading-snug sm:text-3xl">{t.q}</p>
                  <div>
                    <div className="font-semibold">{t.n}</div>
                    <div className="text-sm opacity-70">{t.r}</div>
                  </div>
                </div>
              ))}
            </AnimatedCarousel>
          </div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-white/40">
          Photos from Unsplash. Swipe, drag, use ← → keys, or click a neighbouring slide.
        </footer>
      </div>
    </main>
  );
}
