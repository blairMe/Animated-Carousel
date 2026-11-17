"use client";

/**
 * AnimatedCarousel — a single-file, zero-dependency animated carousel for React 19.
 *
 * Copy this file into any React project (Next.js, Vite, Remix, …). It only imports React.
 * Styles are bundled in this file and injected once, so no CSS / Tailwind setup is needed.
 *
 *   <AnimatedCarousel
 *     items={[{ image: "/a.jpg", title: "Hello", description: "World" }]}
 *     effect="coverflow"          // slide | fade | coverflow | cube | flip | stack | zoom | reveal | dissolve | orbit
 *     transition="bouncy"         // spring | snappy | bouncy | gentle | smooth | slow | { type, ... }
 *     textAnimation="mask"        // rise | fade | blur | mask | letters | slide | none
 *     autoplay={5000}
 *   />
 *
 * Every slide position is a continuous number, and an "effect" is just a function that turns
 * "how far is this slide from the centre" (d) into CSS. Dragging, springs and autoplay all feed
 * the same number, so every effect works with swipe, momentum and looping for free.
 * You can pass your own effect function too — see `CarouselEffect` below.
 */

import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/* ────────────────────────────────────────────────────────────────────────── */
/* Types                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type TextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CarouselSlide = {
  id?: string | number;
  /** Image URL. Covers the whole slide. */
  image?: string;
  alt?: string;
  /** Smaller image for the thumbnails pagination (falls back to `image`). */
  thumbnail?: string;
  /** Small label above the title. */
  eyebrow?: ReactNode;
  /** Plain strings are split into words / letters and animated. */
  title?: ReactNode;
  description?: ReactNode;
  cta?: { label: ReactNode; href?: string; target?: string; onClick?: () => void };
  /** Any custom JSX. Rendered on top of the image, under the text. */
  content?: ReactNode;
  /** Override the carousel's text position for this slide. */
  textPosition?: TextPosition;
  /** Dark gradient behind the text. Defaults to true when the slide has an image and text. */
  overlay?: boolean;
  /** Any CSS background (colour, gradient) for slides without an image. */
  background?: string;
};

export type EffectContext = {
  /** Distance from the centre in slides: 0 = active, 1 = next, -1 = previous (fractional while moving). */
  d: number;
  index: number;
  count: number;
  /** Rendered width of one slide in px (0 before the first measurement). */
  slideWidthPx: number;
  stageWidthPx: number;
  gap: number;
  /** 0–1 */
  parallax: number;
};

export type EffectStyle = {
  transform?: string;
  transformOrigin?: string;
  opacity?: number;
  zIndex?: number;
  filter?: string;
  clipPath?: string;
  /** Transform for the image layer only (parallax, zoom…). */
  mediaTransform?: string;
  mediaFilter?: string;
};

export type CarouselEffect = (ctx: EffectContext) => EffectStyle;

export type EffectDefinition = {
  render: CarouselEffect;
  /** Default slide width (fraction of the carousel width) for this effect. */
  slideWidth: number;
};

export type EffectName =
  | "slide"
  | "fade"
  | "coverflow"
  | "cube"
  | "flip"
  | "stack"
  | "zoom"
  | "reveal"
  | "dissolve"
  | "orbit";

export type EasingName =
  | "linear"
  | "easeInOutCubic"
  | "easeOutQuint"
  | "easeOutExpo"
  | "easeInOutQuart"
  | "easeOutBack";

export type CarouselTransition =
  | { type: "spring"; stiffness?: number; damping?: number; mass?: number }
  | { type: "tween"; duration?: number; easing?: EasingName | [number, number, number, number] };

export type TransitionPreset = "spring" | "snappy" | "bouncy" | "gentle" | "smooth" | "slow" | "instant";

export type TextAnimationName = "rise" | "fade" | "blur" | "mask" | "letters" | "slide" | "none";

export type TextAnimation = {
  type?: TextAnimationName;
  /** ms per element. Default 800 */
  duration?: number;
  /** ms between each word / letter. Default 45 (letters: 22) */
  stagger?: number;
  /** ms before the first element starts. Default 120 */
  delay?: number;
};

export type PaginationStyle = "dots" | "bar" | "numbers" | "thumbnails" | "none";
export type ArrowsStyle = "sides" | "bottom" | "none";

/** Options you can change per breakpoint through `responsive`. */
export type ResponsiveOptions = {
  effect?: EffectName | EffectDefinition | CarouselEffect;
  transition?: TransitionPreset | CarouselTransition;
  textAnimation?: TextAnimationName | TextAnimation;
  textPosition?: TextPosition;
  slideWidth?: number;
  gap?: number;
  parallax?: number;
  kenBurns?: boolean;
  arrows?: boolean | ArrowsStyle;
  pagination?: PaginationStyle;
  radius?: number;
};

export type AnimatedCarouselProps = ResponsiveOptions & {
  /** Slides as data. */
  items?: CarouselSlide[];
  /** Or pass any JSX as children — each child becomes a slide. */
  children?: ReactNode;
  /** Replace the default slide body (image + text) with your own render. */
  renderSlide?: (item: CarouselSlide, state: { index: number; active: boolean }) => ReactNode;

  /** `true` = 5000ms, or a number of ms. */
  autoplay?: boolean | number;
  pauseOnHover?: boolean;
  loop?: boolean;
  startIndex?: number;
  draggable?: boolean;
  keyboard?: boolean;

  /** CSS aspect-ratio, e.g. "16 / 9". Ignored when `height` is set. */
  aspectRatio?: string;
  /** Aspect ratio when the carousel is narrower than 640px. Default "4 / 5". */
  mobileAspectRatio?: string;
  /** Fixed height, e.g. 480 or "70vh". */
  height?: number | string;
  /** CSS perspective for 3D effects (px). Default 1400. */
  perspective?: number;
  accentColor?: string;
  /** Show the play / pause button when autoplay is on. Default true. */
  showPlayButton?: boolean;
  /** Per-breakpoint overrides keyed by min carousel width in px: `{ 0: {...}, 768: {...} }`. */
  responsive?: Record<number, ResponsiveOptions>;
  /** Respect the user's "reduce motion" OS setting. Default true. */
  respectReducedMotion?: boolean;

  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  onChange?: (index: number) => void;
};

export type AnimatedCarouselHandle = {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  play: () => void;
  pause: () => void;
  getIndex: () => number;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Small helpers                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const mod = (v: number, n: number) => ((v % n) + n) % n;
/** Wrap a distance into [-n/2, n/2) so looping picks the shortest side. */
const wrap = (d: number, n: number) => mod(d + n / 2, n) - n / 2;
const r = (v: number, p = 3) => Math.round(v * 10 ** p) / 10 ** p;

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      const de = dx(t);
      if (Math.abs(e) < 1e-5 || Math.abs(de) < 1e-6) break;
      t -= e / de;
    }
    return sy(clamp(t, 0, 1));
  };
}

const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutQuint: (t) => 1 - (1 - t) ** 5,
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  easeOutBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};

export const transitionPresets: Record<TransitionPreset, CarouselTransition> = {
  spring: { type: "spring", stiffness: 170, damping: 26 },
  snappy: { type: "spring", stiffness: 420, damping: 38 },
  bouncy: { type: "spring", stiffness: 260, damping: 15 },
  gentle: { type: "spring", stiffness: 70, damping: 18 },
  smooth: { type: "tween", duration: 750, easing: "easeInOutCubic" },
  slow: { type: "tween", duration: 1500, easing: "easeInOutQuart" },
  instant: { type: "tween", duration: 0, easing: "linear" },
};

type NormalizedTransition =
  | { type: "spring"; stiffness: number; damping: number; mass: number }
  | { type: "tween"; duration: number; ease: (t: number) => number };

function normalizeTransition(t: TransitionPreset | CarouselTransition | undefined): NormalizedTransition {
  const v = typeof t === "string" ? transitionPresets[t] ?? transitionPresets.spring : t ?? transitionPresets.spring;
  if (v.type === "spring") {
    return { type: "spring", stiffness: v.stiffness ?? 170, damping: v.damping ?? 26, mass: v.mass ?? 1 };
  }
  const easing = v.easing ?? "easeInOutCubic";
  return {
    type: "tween",
    duration: Math.max(0, v.duration ?? 700),
    ease: Array.isArray(easing) ? cubicBezier(...easing) : EASINGS[easing] ?? EASINGS.easeInOutCubic,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Effects                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const translate = (d: number, gap: number) => `translate3d(calc(${r(d * 100)}% + ${r(d * gap)}px), 0, 0)`;
const fallbackWidth = (w: number) => (w > 0 ? w : 800);

export const carouselEffects: Record<EffectName, EffectDefinition> = {
  /** Classic track with a parallax image layer. */
  slide: {
    slideWidth: 1,
    render: ({ d, gap, parallax }) => {
      const c = clamp(d, -1, 1);
      return {
        transform: translate(d, gap),
        mediaTransform: parallax > 0 ? `translate3d(${r(-c * parallax * 25)}%, 0, 0) scale(${r(1 + parallax * 0.5)})` : undefined,
      };
    },
  },

  /** Cross-fade with a gentle settle-in zoom. */
  fade: {
    slideWidth: 1,
    render: ({ d }) => {
      const a = Math.abs(d);
      return {
        opacity: Math.sqrt(clamp(1 - a, 0, 1)),
        zIndex: Math.round(100 - a * 10),
        mediaTransform: `scale(${r(1 + Math.min(a, 1) * 0.08)})`,
      };
    },
  },

  /** Album-art coverflow. */
  coverflow: {
    slideWidth: 0.52,
    render: ({ d }) => {
      const a = Math.abs(d);
      const c = clamp(d, -1, 1);
      const x = a <= 1 ? d * 0.72 : Math.sign(d) * (0.72 + (a - 1) * 0.42);
      return {
        transform: `translate3d(${r(x * 100)}%, 0, ${r(-Math.min(a, 3) * 140)}px) rotateY(${r(-c * 48)}deg)`,
        zIndex: Math.round(100 - a * 10),
        filter: `brightness(${r(1 - Math.min(a, 1) * 0.4)})`,
        opacity: clamp(3.4 - a, 0, 1),
      };
    },
  },

  /** Rotating 3D cube. */
  cube: {
    slideWidth: 1,
    render: ({ d, slideWidthPx }) => {
      const a = Math.abs(d);
      if (a >= 1) return { opacity: 0 };
      const w = fallbackWidth(slideWidthPx);
      return {
        transformOrigin: `50% 50% ${r(-w / 2)}px`,
        transform: `translateZ(${r(-Math.sin(a * Math.PI) * w * 0.18)}px) rotateY(${r(d * 90)}deg)`,
        filter: `brightness(${r(1 - a * 0.55)})`,
        zIndex: Math.round(100 - a * 10),
      };
    },
  },

  /** Card flip around the vertical axis. */
  flip: {
    slideWidth: 1,
    render: ({ d, slideWidthPx }) => {
      const a = Math.abs(d);
      if (a >= 1) return { opacity: 0 };
      const w = fallbackWidth(slideWidthPx);
      return {
        transform: `translateZ(${r(-Math.sin(a * Math.PI) * w * 0.3)}px) rotateY(${r(d * 180)}deg)`,
        zIndex: Math.round(100 - a * 10),
      };
    },
  },

  /** A deck of cards: the top card is thrown aside, the next one rises. */
  stack: {
    slideWidth: 0.8,
    render: ({ d }) => {
      const a = Math.abs(d);
      if (d <= 0) {
        return {
          transform: `translate3d(${r(d * 118)}%, ${r(a * 6)}%, 0) rotate(${r(d * 12)}deg)`,
          opacity: clamp(1.6 - a, 0, 1),
          zIndex: 150,
        };
      }
      return {
        transform: `translate3d(${r(d * 7)}%, 0, 0) scale(${r(1 - d * 0.07)})`,
        filter: `brightness(${r(1 - Math.min(d, 3) * 0.14)})`,
        opacity: clamp(3.2 - d, 0, 1),
        zIndex: Math.round(100 - d * 10),
      };
    },
  },

  /** The current slide flies toward you, the next one emerges from behind. */
  zoom: {
    slideWidth: 1,
    render: ({ d }) => {
      const a = Math.abs(d);
      if (d < 0) {
        return {
          transform: `scale(${r(1 + a * 0.45)})`,
          opacity: clamp(1 - a * 1.4, 0, 1),
          filter: `blur(${r(a * 8)}px)`,
          zIndex: 120,
        };
      }
      return {
        transform: `scale(${r(1 - Math.min(a, 1) * 0.28)})`,
        opacity: clamp(1.4 - a, 0, 1),
        zIndex: Math.round(100 - a * 10),
      };
    },
  },

  /** A curtain wipe: the next slide slices in over the current one. */
  reveal: {
    slideWidth: 1,
    render: ({ d }) => {
      const a = Math.abs(d);
      if (a >= 1) return { opacity: 0 };
      if (d > 0) {
        return {
          clipPath: `inset(0 0 0 ${r(d * 100)}%)`,
          zIndex: 120,
          mediaTransform: `scale(${r(1 + d * 0.18)})`,
        };
      }
      return {
        transform: `translate3d(${r(d * 30)}%, 0, 0)`,
        filter: `brightness(${r(1 - a * 0.6)})`,
        zIndex: 100,
      };
    },
  },

  /** Dreamy blur dissolve. */
  dissolve: {
    slideWidth: 1,
    render: ({ d }) => {
      const a = Math.min(Math.abs(d), 1);
      return {
        opacity: Math.sqrt(1 - a),
        filter: a > 0.001 ? `blur(${r(a * 18)}px) saturate(${r(1 + a)})` : undefined,
        transform: `scale(${r(1 + a * 0.06)})`,
        zIndex: Math.round(100 - a * 10),
      };
    },
  },

  /** Slides orbit on a 3D ring. */
  orbit: {
    slideWidth: 0.42,
    render: ({ d, count, slideWidthPx, gap }) => {
      const step = 360 / Math.max(count, 6);
      const rad = (step * Math.PI) / 180;
      const w = fallbackWidth(slideWidthPx);
      const radius = (w / 2 + gap) / Math.tan(rad / 2);
      const angle = d * step;
      const facing = Math.cos((angle * Math.PI) / 180);
      return {
        transform: `translateZ(${r(-radius)}px) rotateY(${r(angle)}deg) translateZ(${r(radius)}px)`,
        filter: `brightness(${r(0.35 + 0.65 * Math.max(0, facing))})`,
        opacity: clamp((facing + 0.35) * 2, 0, 1),
        zIndex: Math.round(100 + facing * 50),
      };
    },
  },
};

function resolveEffect(effect: AnimatedCarouselProps["effect"]): EffectDefinition {
  if (!effect) return carouselEffects.slide;
  if (typeof effect === "string") return carouselEffects[effect] ?? carouselEffects.slide;
  if (typeof effect === "function") return { render: effect, slideWidth: 1 };
  return effect;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hooks                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Text animation                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function AnimatedText({ text, mode, startIndex }: { text: ReactNode; mode: TextAnimationName; startIndex: number }) {
  if (typeof text !== "string") {
    return (
      <span className="acx-anim acx-block" style={{ "--i": startIndex } as CSSProperties}>
        {text}
      </span>
    );
  }
  const words = text.split(/\s+/).filter(Boolean);
  let i = startIndex;
  return (
    <span aria-label={text}>
      {words.map((word, wi) => {
        const sep = wi < words.length - 1 ? " " : "";
        if (mode === "letters") {
          return (
            <span key={wi} className="acx-word" aria-hidden="true">
              {Array.from(word).map((ch, ci) => (
                <span key={ci} className="acx-anim acx-char" style={{ "--i": i++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
              {sep}
            </span>
          );
        }
        if (mode === "mask") {
          return (
            <span key={wi} className="acx-mask" aria-hidden="true">
              <span className="acx-anim" style={{ "--i": i++ } as CSSProperties}>
                {word}
              </span>
              {sep}
            </span>
          );
        }
        return (
          <span key={wi} className="acx-anim acx-word" aria-hidden="true" style={{ "--i": i++ } as CSSProperties}>
            {word}
            {sep}
          </span>
        );
      })}
    </span>
  );
}

function countUnits(text: ReactNode, mode: TextAnimationName) {
  if (typeof text !== "string") return 1;
  const words = text.split(/\s+/).filter(Boolean);
  return mode === "letters" ? words.join("").length : words.length;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Icons                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);
const PlayIcon = ({ playing }: { playing: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
    {playing ? (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1.2" />
        <rect x="14" y="5" width="4" height="14" rx="1.2" />
      </>
    ) : (
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    )}
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Component                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

type Engine = {
  pos: number;
  vel: number;
  target: number;
  mode: "idle" | "spring" | "tween" | "drag";
  tweenFrom: number;
  tweenStart: number;
  progress: number;
  dirty: boolean;
};

type DragState = {
  id: number;
  startX: number;
  startY: number;
  startPos: number;
  axis: "x" | "y" | null;
  samples: { t: number; x: number }[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export const AnimatedCarousel = forwardRef<AnimatedCarouselHandle, AnimatedCarouselProps>(function AnimatedCarousel(props, ref) {
  const {
    items,
    children,
    renderSlide,
    autoplay = false,
    pauseOnHover = true,
    loop: loopProp = true,
    startIndex = 0,
    draggable = true,
    keyboard = true,
    aspectRatio = "16 / 9",
    mobileAspectRatio = "4 / 5",
    height,
    perspective = 1400,
    accentColor = "#ff5a36",
    showPlayButton = true,
    responsive,
    respectReducedMotion = true,
    ariaLabel = "Carousel",
    className,
    style,
    onChange,
  } = props;

  /* ── slides ─────────────────────────────────────────────── */
  const slides = useMemo<CarouselSlide[]>(() => {
    const fromChildren = Children.toArray(children).map((child, i) => ({ id: `child-${i}`, content: child }));
    return [...(items ?? []), ...fromChildren];
  }, [items, children]);
  const count = slides.length;

  /* ── measurement + responsive options ───────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);

  const opts = useMemo(() => {
    const base: ResponsiveOptions = {
      effect: props.effect,
      transition: props.transition,
      textAnimation: props.textAnimation,
      textPosition: props.textPosition,
      slideWidth: props.slideWidth,
      gap: props.gap,
      parallax: props.parallax,
      kenBurns: props.kenBurns,
      arrows: props.arrows,
      pagination: props.pagination,
      radius: props.radius,
    };
    if (responsive) {
      const bps = Object.keys(responsive).map(Number).sort((a, b) => a - b);
      for (const bp of bps) {
        if (stageWidth >= bp) {
          for (const [k, v] of Object.entries(responsive[bp])) if (v !== undefined) (base as Record<string, unknown>)[k] = v;
        }
      }
    }
    return base;
  }, [
    props.effect, props.transition, props.textAnimation, props.textPosition, props.slideWidth, props.gap,
    props.parallax, props.kenBurns, props.arrows, props.pagination, props.radius, responsive, stageWidth,
  ]);

  const reducedPref = usePrefersReducedMotion();
  const reduced = respectReducedMotion && reducedPref;

  const effectDef = useMemo(() => resolveEffect(opts.effect), [opts.effect]);
  const slideWidth = clamp(opts.slideWidth ?? effectDef.slideWidth, 0.15, 1);
  const gap = opts.gap ?? 16;
  const parallax = clamp(opts.parallax ?? 0.35, 0, 1);
  const transition = useMemo(() => normalizeTransition(reduced ? "instant" : opts.transition), [opts.transition, reduced]);
  const textCfg = typeof opts.textAnimation === "object" ? opts.textAnimation : { type: opts.textAnimation };
  const textMode: TextAnimationName = reduced ? "none" : textCfg.type ?? "rise";
  const textDuration = textCfg.duration ?? 800;
  const textStagger = textCfg.stagger ?? (textMode === "letters" ? 22 : 45);
  const textDelay = textCfg.delay ?? 120;
  const textPosition = opts.textPosition ?? "bottom-left";
  const arrows: ArrowsStyle = opts.arrows === false ? "none" : opts.arrows === true || opts.arrows === undefined ? "sides" : opts.arrows;
  const pagination = opts.pagination ?? "dots";
  const loop = loopProp && count > 2;
  const autoplayMs = reduced || !autoplay ? 0 : autoplay === true ? 5000 : Math.max(800, autoplay);
  const kenBurns = !reduced && (opts.kenBurns ?? false);
  const radius = opts.radius ?? 20;

  /* ── engine state (mutated every frame, never triggers renders) ── */
  const initial = clamp(Math.round(startIndex), 0, Math.max(0, count - 1));
  const eng = useRef<Engine>({ pos: initial, vel: 0, target: initial, mode: "idle", tweenFrom: initial, tweenStart: 0, progress: 0, dirty: true });
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const activeRef = useRef(initial);
  const [active, setActive] = useState(initial);
  const [playing, setPlaying] = useState(true);
  const paused = useRef({ hover: false, focus: false, offscreen: false });

  // Latest config for the animation loop.
  const cfg = useRef({
    count, loop, effect: effectDef.render, slideWidth, gap, parallax, transition, autoplayMs, playing, stageWidth,
  });
  useIsoLayoutEffect(() => {
    cfg.current = { count, loop, effect: effectDef.render, slideWidth, gap, parallax, transition, autoplayMs, playing, stageWidth };
    eng.current.dirty = true;
  });

  /* ── paint one frame: effect → inline styles ───────────── */
  const paint = useCallback(() => {
    const c = cfg.current;
    const e = eng.current;
    const n = c.count;
    if (!n) return;
    const slideWidthPx = c.stageWidth * c.slideWidth;
    for (let i = 0; i < n; i++) {
      const el = slideRefs.current[i];
      if (!el) continue;
      let d = i - e.pos;
      if (c.loop) d = wrap(d, n);
      const s = c.effect({ d, index: i, count: n, slideWidthPx, stageWidthPx: c.stageWidth, gap: c.gap, parallax: c.parallax });
      let opacity = s.opacity ?? 1;
      // In loop mode, fade slides that are about to jump to the other side.
      if (c.loop) opacity *= clamp((n / 2 - Math.abs(d)) * 4, 0, 1);
      el.style.transform = s.transform ?? "";
      el.style.transformOrigin = s.transformOrigin ?? "";
      el.style.opacity = String(r(opacity));
      el.style.visibility = opacity <= 0.001 ? "hidden" : "";
      el.style.zIndex = String(s.zIndex ?? Math.round(100 - Math.abs(d) * 10));
      el.style.filter = s.filter ?? "";
      el.style.clipPath = s.clipPath ?? "";
      const m = mediaRefs.current[i];
      if (m) {
        m.style.transform = s.mediaTransform ?? "";
        m.style.filter = s.mediaFilter ?? "";
      }
    }
    const idx = c.loop ? mod(Math.round(e.pos), n) : clamp(Math.round(e.pos), 0, n - 1);
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
  }, []);

  /* ── navigation ────────────────────────────────────────── */
  const animateTo = useCallback((target: number, velocity?: number) => {
    const c = cfg.current;
    const e = eng.current;
    if (!c.count) return;
    if (!c.loop) target = clamp(target, 0, c.count - 1);
    e.target = target;
    e.progress = 0;
    const t = c.transition;
    if (t.type === "tween" && t.duration === 0) {
      e.pos = target;
      e.vel = 0;
      e.mode = "idle";
      e.dirty = true;
      return;
    }
    if (t.type === "spring") {
      if (velocity !== undefined) e.vel = velocity;
      e.mode = "spring";
    } else {
      e.tweenFrom = e.pos;
      e.tweenStart = performance.now();
      e.mode = "tween";
    }
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const c = cfg.current;
      const e = eng.current;
      if (!c.count) return;
      if (!c.loop) return animateTo(index);
      const base = Math.round(e.target);
      animateTo(base + wrap(index - mod(base, c.count), c.count));
    },
    [animateTo],
  );
  const next = useCallback(() => {
    const c = cfg.current;
    const t = Math.round(eng.current.target);
    if (!c.loop && t >= c.count - 1) return;
    animateTo(t + 1);
  }, [animateTo]);
  const prev = useCallback(() => {
    const c = cfg.current;
    const t = Math.round(eng.current.target);
    if (!c.loop && t <= 0) return;
    animateTo(t - 1);
  }, [animateTo]);

  useImperativeHandle(
    ref,
    () => ({
      next,
      prev,
      goTo,
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      getIndex: () => activeRef.current,
    }),
    [next, prev, goTo],
  );

  /* ── the animation loop ────────────────────────────────── */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const c = cfg.current;
      const e = eng.current;

      if (e.mode === "spring" && c.transition.type === "spring") {
        const { stiffness, damping, mass } = c.transition;
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
          const a = (-stiffness * (e.pos - e.target) - damping * e.vel) / mass;
          e.vel += a * h;
          e.pos += e.vel * h;
        }
        if (Math.abs(e.pos - e.target) < 0.0005 && Math.abs(e.vel) < 0.005) {
          e.pos = e.target;
          e.vel = 0;
          e.mode = "idle";
        }
        e.dirty = true;
      } else if (e.mode === "tween" && c.transition.type === "tween") {
        const p = clamp((now - e.tweenStart) / Math.max(1, c.transition.duration), 0, 1);
        e.pos = e.tweenFrom + (e.target - e.tweenFrom) * c.transition.ease(p);
        if (p >= 1) {
          e.pos = e.target;
          e.mode = "idle";
        }
        e.dirty = true;
      } else if (e.mode === "spring" || e.mode === "tween") {
        // transition type changed mid-flight
        e.pos = e.target;
        e.mode = "idle";
        e.dirty = true;
      }

      // Keep the position small in loop mode (no visual change, avoids float drift).
      if (e.mode === "idle" && c.loop && c.count && (e.pos >= c.count || e.pos < 0)) {
        const shift = Math.floor(e.pos / c.count) * c.count;
        e.pos -= shift;
        e.target -= shift;
      }

      // Autoplay
      const p = paused.current;
      if (c.autoplayMs && c.playing && !p.hover && !p.focus && !p.offscreen && e.mode === "idle" && c.count > 1) {
        e.progress += (dt * 1000) / c.autoplayMs;
        if (e.progress >= 1) {
          e.progress = 0;
          const t = Math.round(e.target);
          if (!c.loop && t >= c.count - 1) animateTo(0);
          else animateTo(t + 1);
        }
        rootRef.current?.style.setProperty("--acx-progress", String(r(e.progress, 4)));
      } else if (!c.autoplayMs) {
        rootRef.current?.style.setProperty("--acx-progress", "1");
      }

      if (e.dirty) {
        e.dirty = false;
        paint();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paint, animateTo]);

  // Repaint synchronously whenever layout-affecting config changes (no flash).
  useIsoLayoutEffect(() => {
    if (!loop) {
      const e = eng.current;
      e.pos = clamp(e.pos, 0, Math.max(0, count - 1));
      e.target = clamp(e.target, 0, Math.max(0, count - 1));
    }
    paint();
  }, [paint, count, loop, effectDef, slideWidth, gap, parallax, stageWidth]);

  /* ── measure ───────────────────────────────────────────── */
  useIsoLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pause autoplay when scrolled out of view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      paused.current.offscreen = !entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── side effects of the active slide ──────────────────── */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) onChangeRef.current?.(active);
    mounted.current = true;
    const box = thumbsRef.current;
    const thumb = box?.children[active] as HTMLElement | undefined;
    if (box && thumb) {
      box.scrollTo({ left: thumb.offsetLeft - box.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
    }
  }, [active]);

  /* ── pointer / drag ────────────────────────────────────── */
  const onPointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (!draggable || count < 2 || ev.button !== 0) return;
    if ((ev.target as HTMLElement).closest("button, input, textarea, select, [data-carousel-nodrag]")) return;
    drag.current = { id: ev.pointerId, startX: ev.clientX, startY: ev.clientY, startPos: eng.current.pos, axis: null, samples: [] };

    const move = (e: PointerEvent) => {
      const g = drag.current;
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (g.axis === "y") return end(e);
        // Grab the slider wherever it currently is (also mid-animation).
        g.startPos = eng.current.pos;
        g.startX = e.clientX;
        eng.current.mode = "drag";
        eng.current.vel = 0;
        rootRef.current?.setAttribute("data-dragging", "");
      }
      const c = cfg.current;
      const stepPx = Math.max(40, c.stageWidth * c.slideWidth + c.gap);
      let p = g.startPos - (e.clientX - g.startX) / stepPx;
      if (!c.loop) {
        const max = c.count - 1;
        if (p < 0) p = p * 0.3;
        else if (p > max) p = max + (p - max) * 0.3;
      }
      eng.current.pos = p;
      eng.current.dirty = true;
      g.samples.push({ t: e.timeStamp, x: e.clientX });
      if (g.samples.length > 6) g.samples.shift();
    };

    const end = (e: PointerEvent) => {
      const g = drag.current;
      if (!g || e.pointerId !== g.id) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      drag.current = null;
      rootRef.current?.removeAttribute("data-dragging");
      if (g.axis !== "x") return;
      suppressClick.current = true;
      const c = cfg.current;
      const stepPx = Math.max(40, c.stageWidth * c.slideWidth + c.gap);
      const first = g.samples[0];
      const lastS = g.samples[g.samples.length - 1];
      const dtS = first && lastS ? (lastS.t - first.t) / 1000 : 0;
      const v = dtS > 0.005 && e.timeStamp - lastS.t < 100 ? -((lastS.x - first.x) / dtS) / stepPx : 0;
      const from = Math.round(g.startPos);
      const maxJump = Math.max(1, Math.round(0.9 / c.slideWidth));
      const target = clamp(Math.round(eng.current.pos + v * 0.2), from - maxJump, from + maxJump);
      animateTo(target, v);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onClickCapture = (ev: ReactMouseEvent) => {
    if (suppressClick.current) {
      ev.preventDefault();
      ev.stopPropagation();
      suppressClick.current = false;
    }
  };

  const onKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!keyboard) return;
    const tag = (ev.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (ev.key === "ArrowRight") { ev.preventDefault(); next(); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); prev(); }
    else if (ev.key === "Home") { ev.preventDefault(); goTo(0); }
    else if (ev.key === "End") { ev.preventDefault(); goTo(count - 1); }
  };

  /* ── first-paint styles (SSR / before JS) ──────────────── */
  const initialStyles = useMemo(() => {
    return slides.map((_, i) => {
      let d = i - initial;
      if (loop) d = wrap(d, count);
      const s = effectDef.render({ d, index: i, count, slideWidthPx: 0, stageWidthPx: 0, gap, parallax });
      const opacity = s.opacity ?? 1;
      return {
        slide: {
          transform: s.transform,
          transformOrigin: s.transformOrigin,
          opacity,
          visibility: opacity <= 0.001 ? "hidden" : undefined,
          zIndex: s.zIndex ?? Math.round(100 - Math.abs(d) * 10),
          filter: s.filter,
          clipPath: s.clipPath,
        } as CSSProperties,
        media: { transform: s.mediaTransform, filter: s.mediaFilter } as CSSProperties,
      };
    });
    // Only used for the very first paint; the loop takes over afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (!count) return null;

  const canPrev = loop || active > 0;
  const canNext = loop || active < count - 1;
  const hasAutoplay = autoplayMs > 0;
  const current = slides[active];

  const rootStyle = {
    "--acx-accent": accentColor,
    "--acx-radius": `${radius}px`,
    "--acx-w": `${slideWidth * 100}%`,
    "--acx-ratio": aspectRatio,
    "--acx-ratio-m": mobileAspectRatio,
    "--acx-perspective": `${perspective}px`,
    "--acx-td": `${textDuration}ms`,
    "--acx-stagger": `${textStagger}ms`,
    "--acx-tdelay": `${textDelay}ms`,
    "--acx-kb": `${Math.max(autoplayMs, 6000) + 1500}ms`,
    "--acx-progress": hasAutoplay ? 0 : 1,
    ...style,
  } as CSSProperties;

  const arrowButtons = (place: "sides" | "bottom") => (
    <>
      <button type="button" className={`acx-arrow acx-arrow-${place} acx-prev`} onClick={prev} disabled={!canPrev} aria-label="Previous slide">
        <Chevron dir="left" />
      </button>
      <button type="button" className={`acx-arrow acx-arrow-${place} acx-next`} onClick={next} disabled={!canNext} aria-label="Next slide">
        <Chevron dir="right" />
      </button>
    </>
  );

  const showControls = pagination !== "none" || arrows === "bottom" || (hasAutoplay && showPlayButton);

  return (
    <div
      ref={rootRef}
      className={`acx-root${className ? ` ${className}` : ""}`}
      style={rootStyle}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-text-anim={textMode}
      data-autoplay={hasAutoplay ? "" : undefined}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => { if (pauseOnHover && e.pointerType === "mouse") paused.current.hover = true; }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") paused.current.hover = false; }}
      onFocus={(e) => { if ((e.target as HTMLElement).matches?.(":focus-visible")) paused.current.focus = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) paused.current.focus = false; }}
    >
      <style href="animated-carousel-styles" precedence="medium">{CSS}</style>

      <div
        ref={stageRef}
        className="acx-stage"
        style={height !== undefined ? { height: typeof height === "number" ? `${height}px` : height, aspectRatio: "auto" } : undefined}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        data-draggable={draggable && count > 1 ? "" : undefined}
      >
        {slides.map((item, i) => {
          const isActive = i === active;
          const pos = item.textPosition ?? textPosition;
          const hasText = item.eyebrow != null || item.title != null || item.description != null || item.cta != null;
          const overlay = item.overlay ?? (Boolean(item.image) && hasText);
          const titleUnits = countUnits(item.title, textMode);
          let unit = 0;
          const eyebrowI = item.eyebrow != null ? unit++ : 0;
          const titleI = unit;
          if (item.title != null) unit += titleUnits;
          const descI = item.description != null ? unit++ : 0;
          const ctaI = unit;
          return (
            <div
              key={item.id ?? i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="acx-slide"
              style={initialStyles[i]?.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!isActive}
              data-active={isActive ? "true" : "false"}
            >
              <div className="acx-card" style={item.background ? { background: item.background } : undefined} inert={!isActive}>
                {renderSlide ? (
                  renderSlide(item, { index: i, active: isActive })
                ) : (
                  <>
                    {item.image && (
                      <div
                        className="acx-media"
                        ref={(el) => {
                          mediaRefs.current[i] = el;
                        }}
                        style={initialStyles[i]?.media}
                      >
                        <div className={`acx-kb${kenBurns ? " acx-kb-on" : ""}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt={item.alt ?? ""} draggable={false} loading={i === initial ? "eager" : "lazy"} decoding="async" />
                        </div>
                      </div>
                    )}
                    {overlay && <div className="acx-shade" data-pos={pos} />}
                    {item.content != null && <div className="acx-content">{item.content}</div>}
                    {hasText && (
                      <div className="acx-text" data-pos={pos}>
                        {item.eyebrow != null && (
                          <span className="acx-eyebrow acx-anim" style={{ "--i": eyebrowI } as CSSProperties}>
                            {item.eyebrow}
                          </span>
                        )}
                        {item.title != null && (
                          <h3 className="acx-title">
                            <AnimatedText text={item.title} mode={textMode} startIndex={titleI} />
                          </h3>
                        )}
                        {item.description != null && (
                          <p className="acx-desc acx-anim" style={{ "--i": descI } as CSSProperties}>
                            {item.description}
                          </p>
                        )}
                        {item.cta && (
                          <span className="acx-anim acx-cta-wrap" style={{ "--i": ctaI } as CSSProperties}>
                            {item.cta.href ? (
                              <a className="acx-cta" href={item.cta.href} target={item.cta.target} rel={item.cta.target === "_blank" ? "noopener noreferrer" : undefined} onClick={item.cta.onClick}>
                                {item.cta.label}
                              </a>
                            ) : (
                              <button type="button" className="acx-cta" onClick={item.cta.onClick}>
                                {item.cta.label}
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!isActive && <button type="button" className="acx-hit" tabIndex={-1} aria-hidden="true" onClick={() => goTo(i)} />}
            </div>
          );
        })}

        {arrows === "sides" && count > 1 && arrowButtons("sides")}
      </div>

      {showControls && count > 1 && (
        <div className="acx-controls" data-pagination={pagination}>
          {pagination === "dots" && (
            <div className="acx-dots">
              {slides.map((s, i) => (
                <button
                  key={s.id ?? i}
                  type="button"
                  className="acx-dot"
                  data-active={i === active ? "" : undefined}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          )}
          {pagination === "bar" && (
            <div className="acx-bars">
              {slides.map((s, i) => (
                <button
                  key={s.id ?? i}
                  type="button"
                  className="acx-bar"
                  data-state={i < active ? "past" : i === active ? "active" : "future"}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span />
                </button>
              ))}
            </div>
          )}
          {pagination === "numbers" && (
            <div className="acx-numbers" aria-hidden="true">
              <span className="acx-num-cur">
                <span key={active} className="acx-num-roll">{pad(active + 1)}</span>
              </span>
              <span className="acx-num-line">
                <span />
              </span>
              <span className="acx-num-total">{pad(count)}</span>
            </div>
          )}
          {pagination === "thumbnails" && (
            <div className="acx-thumbs" ref={thumbsRef}>
              {slides.map((s, i) => (
                <button
                  key={s.id ?? i}
                  type="button"
                  className="acx-thumb"
                  data-active={i === active ? "" : undefined}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                  style={!(s.thumbnail ?? s.image) && s.background ? { background: s.background } : undefined}
                >
                  {(s.thumbnail ?? s.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumbnail ?? s.image} alt="" draggable={false} loading="lazy" decoding="async" />
                  )}
                  <span className="acx-thumb-progress" />
                </button>
              ))}
            </div>
          )}
          <div className="acx-actions">
            {hasAutoplay && showPlayButton && (
              <button type="button" className="acx-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause autoplay" : "Start autoplay"}>
                <PlayIcon playing={playing} />
              </button>
            )}
            {arrows === "bottom" && arrowButtons("bottom")}
          </div>
        </div>
      )}

      <div className="acx-sr" aria-live={hasAutoplay && playing ? "off" : "polite"} aria-atomic="true">
        {`Slide ${active + 1} of ${count}${typeof current?.title === "string" ? `: ${current.title}` : ""}`}
      </div>
    </div>
  );
});

export default AnimatedCarousel;

/* ────────────────────────────────────────────────────────────────────────── */
/* Styles (injected once, scoped with the "acx-" prefix)                      */
/* ────────────────────────────────────────────────────────────────────────── */

const CSS = `
.acx-root{--acx-ease:cubic-bezier(.16,1,.3,1);position:relative;width:100%;container-type:inline-size;-webkit-tap-highlight-color:transparent;outline:none}
.acx-root *,.acx-root *::before,.acx-root *::after{box-sizing:border-box}
.acx-stage{position:relative;width:100%;aspect-ratio:var(--acx-ratio);perspective:var(--acx-perspective);overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;isolation:isolate}
@container (max-width:639px){.acx-stage{aspect-ratio:var(--acx-ratio-m)}}
.acx-stage[data-draggable]{cursor:grab}
.acx-root[data-dragging] .acx-stage{cursor:grabbing}
.acx-slide{position:absolute;top:0;left:calc((100% - var(--acx-w)) / 2);width:var(--acx-w);height:100%;transform-style:preserve-3d;backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform,opacity}
.acx-card{position:relative;width:100%;height:100%;overflow:hidden;border-radius:var(--acx-radius);background:#16161d;color:#fff;transform:translateZ(0);box-shadow:0 20px 60px -20px rgba(0,0,0,.55)}
.acx-media,.acx-kb{position:absolute;inset:0;will-change:transform}
.acx-media img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.acx-slide[data-active="true"] .acx-kb-on{animation:acx-kb var(--acx-kb) linear both}
@keyframes acx-kb{from{transform:scale(1) translate3d(0,0,0)}to{transform:scale(1.14) translate3d(-1.5%,-1%,0)}}
.acx-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,.25) 45%,rgba(0,0,0,0) 70%)}
.acx-shade[data-pos^="top"]{background:linear-gradient(to bottom,rgba(0,0,0,.75),rgba(0,0,0,.2) 45%,rgba(0,0,0,0) 70%)}
.acx-shade[data-pos^="center"]{background:radial-gradient(ellipse at center,rgba(0,0,0,.6),rgba(0,0,0,.25) 60%,rgba(0,0,0,.1))}
.acx-content{position:absolute;inset:0}
.acx-text{position:absolute;inset:0;display:flex;flex-direction:column;gap:clamp(.4rem,1.4cqi,.9rem);padding:clamp(1.1rem,5cqi,3.5rem);pointer-events:none;transition:opacity .35s ease}
.acx-text>*{pointer-events:auto;max-width:min(40rem,100%)}
.acx-text[data-pos$="left"]{align-items:flex-start;text-align:left}
.acx-text[data-pos$="right"]{align-items:flex-end;text-align:right}
.acx-text[data-pos$="center"],.acx-text[data-pos="center"]{align-items:center;text-align:center}
.acx-text[data-pos^="top"]{justify-content:flex-start}
.acx-text[data-pos^="center"]{justify-content:center}
.acx-text[data-pos^="bottom"]{justify-content:flex-end}
.acx-slide[data-active="false"] .acx-text{opacity:0}
.acx-eyebrow{display:inline-block;font-size:clamp(.68rem,1.25cqi,.8rem);font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--acx-accent)}
.acx-title{margin:0;font-size:clamp(1.45rem,5.4cqi,3.9rem);line-height:1.04;font-weight:750;letter-spacing:-.025em;text-wrap:balance;text-shadow:0 2px 24px rgba(0,0,0,.25)}
.acx-desc{margin:0;font-size:clamp(.9rem,1.7cqi,1.15rem);line-height:1.55;opacity:.88;max-width:min(36rem,100%)!important}
.acx-cta-wrap{margin-top:clamp(.2rem,1cqi,.6rem)}
.acx-cta{display:inline-flex;align-items:center;gap:.5em;padding:.75em 1.35em;border-radius:999px;border:0;background:var(--acx-accent);color:#fff;font:inherit;font-weight:650;font-size:clamp(.85rem,1.4cqi,1rem);text-decoration:none;cursor:pointer;transition:transform .25s var(--acx-ease),box-shadow .25s}
.acx-cta:hover{transform:translateY(-2px);box-shadow:0 10px 30px -8px var(--acx-accent)}
.acx-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}
.acx-word,.acx-mask,.acx-block{display:inline-block;white-space:pre}
.acx-mask{overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-bottom:-.08em}
.acx-mask>.acx-anim{display:inline-block}
.acx-char{display:inline-block;transform-origin:50% 100%}
.acx-hit{position:absolute;inset:0;z-index:5;border:0;padding:0;margin:0;background:transparent;cursor:pointer}
.acx-root[data-dragging] .acx-hit{pointer-events:none}

/* text animations */
.acx-slide[data-active="true"] .acx-anim{animation-duration:var(--acx-td);animation-timing-function:var(--acx-ease);animation-fill-mode:both;animation-delay:calc(var(--acx-tdelay) + var(--i,0) * var(--acx-stagger))}
.acx-root[data-text-anim="rise"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-rise}
.acx-root[data-text-anim="fade"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-fade}
.acx-root[data-text-anim="blur"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-blur}
.acx-root[data-text-anim="slide"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-slidein}
.acx-root[data-text-anim="mask"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-rise}
.acx-root[data-text-anim="mask"] .acx-slide[data-active="true"] .acx-mask>.acx-anim{animation-name:acx-mask}
.acx-root[data-text-anim="letters"] .acx-slide[data-active="true"] .acx-anim{animation-name:acx-rise}
.acx-root[data-text-anim="letters"] .acx-slide[data-active="true"] .acx-char{animation-name:acx-letter}
@keyframes acx-rise{from{opacity:0;transform:translate3d(0,.7em,0)}to{opacity:1;transform:none}}
@keyframes acx-fade{from{opacity:0}to{opacity:1}}
@keyframes acx-blur{from{opacity:0;filter:blur(14px);transform:translate3d(0,.15em,0) scale(1.04)}to{opacity:1;filter:blur(0);transform:none}}
@keyframes acx-slidein{from{opacity:0;transform:translate3d(-1.4em,0,0)}to{opacity:1;transform:none}}
@keyframes acx-mask{from{transform:translate3d(0,110%,0)}to{transform:none}}
@keyframes acx-letter{from{opacity:0;transform:translate3d(0,.5em,0) rotateX(-90deg)}to{opacity:1;transform:none}}

/* arrows */
.acx-arrow{display:grid;place-items:center;width:46px;height:46px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(20,20,26,.42);color:#fff;cursor:pointer;backdrop-filter:blur(12px) saturate(1.4);-webkit-backdrop-filter:blur(12px) saturate(1.4);transition:transform .3s var(--acx-ease),background .2s,opacity .2s;padding:0}
.acx-arrow:hover:not(:disabled){background:var(--acx-accent);border-color:transparent;transform:scale(1.08)}
.acx-arrow:active:not(:disabled){transform:scale(.94)}
.acx-arrow:disabled{opacity:.3;cursor:default}
.acx-arrow:focus-visible,.acx-dot:focus-visible,.acx-bar:focus-visible,.acx-thumb:focus-visible,.acx-play:focus-visible{outline:2px solid var(--acx-accent);outline-offset:3px}
.acx-arrow-sides{position:absolute;top:50%;z-index:300;transform:translateY(-50%)}
.acx-arrow-sides:hover:not(:disabled){transform:translateY(-50%) scale(1.08)}
.acx-arrow-sides:active:not(:disabled){transform:translateY(-50%) scale(.94)}
.acx-arrow-sides.acx-prev{left:clamp(.5rem,2cqi,1.25rem)}
.acx-arrow-sides.acx-next{right:clamp(.5rem,2cqi,1.25rem)}
.acx-arrow-bottom{position:relative;width:40px;height:40px;background:transparent;color:inherit;border-color:currentColor;border-color:color-mix(in srgb,currentColor 25%,transparent);backdrop-filter:none;-webkit-backdrop-filter:none}
.acx-arrow-bottom:hover:not(:disabled){color:#fff}
@container (max-width:639px){.acx-arrow-sides{width:38px;height:38px}.acx-arrow-sides svg{width:17px;height:17px}}
@media (hover:none){.acx-arrow-sides{opacity:.85}}

/* controls bar */
.acx-controls{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:clamp(.75rem,2cqi,1.25rem);min-height:40px}
.acx-controls[data-pagination="dots"],.acx-controls[data-pagination="none"]{justify-content:center}
.acx-controls[data-pagination="dots"] .acx-actions,.acx-controls[data-pagination="none"] .acx-actions{position:absolute;right:0}
.acx-controls{position:relative}
.acx-actions{display:flex;gap:.5rem;align-items:center;flex-shrink:0}
.acx-play{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 25%,transparent);background:transparent;color:inherit;cursor:pointer;padding:0;transition:background .2s}
.acx-play:hover{background:color-mix(in srgb,currentColor 10%,transparent)}

.acx-dots{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 110px)}
.acx-dot{position:relative;width:8px;height:8px;border-radius:999px;border:0;padding:0;cursor:pointer;overflow:hidden;background:currentColor;opacity:.3;transition:width .5s var(--acx-ease),opacity .3s}
.acx-dot::before{content:"";position:absolute;inset:-10px}
.acx-dot:hover{opacity:.6}
.acx-dot[data-active]{width:34px;opacity:1;background:color-mix(in srgb,currentColor 25%,transparent)}
.acx-dot[data-active]::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--acx-accent);transform-origin:left;transform:scaleX(var(--acx-progress))}

.acx-bars{display:flex;gap:6px;flex:1;min-width:0}
.acx-bar{flex:1;height:22px;border:0;padding:0;background:transparent;cursor:pointer;display:flex;align-items:center}
.acx-bar>span{position:relative;display:block;width:100%;height:3px;border-radius:3px;overflow:hidden;background:currentColor;background:color-mix(in srgb,currentColor 20%,transparent)}
.acx-bar>span::after{content:"";position:absolute;inset:0;background:var(--acx-accent);transform-origin:left;transform:scaleX(0);transition:transform .3s}
.acx-bar[data-state="past"]>span::after{transform:scaleX(1)}
.acx-bar[data-state="active"]>span::after{transform:scaleX(var(--acx-progress));transition:none}

.acx-numbers{display:flex;align-items:center;gap:.9rem;font-variant-numeric:tabular-nums;font-weight:650;letter-spacing:.04em}
.acx-num-cur{display:inline-block;overflow:hidden;height:1.6em;line-height:1.6em;font-size:1.35rem;color:var(--acx-accent)}
.acx-num-roll{display:inline-block;animation:acx-roll .6s var(--acx-ease) both}
@keyframes acx-roll{from{transform:translate3d(0,100%,0);opacity:0}to{transform:none;opacity:1}}
.acx-num-total{opacity:.5}
.acx-num-line{position:relative;width:clamp(48px,14cqi,120px);height:2px;background:currentColor;background:color-mix(in srgb,currentColor 20%,transparent);overflow:hidden;border-radius:2px}
.acx-num-line>span{position:absolute;inset:0;background:var(--acx-accent);transform-origin:left;transform:scaleX(var(--acx-progress))}

.acx-thumbs{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:4px;flex:1;min-width:0;scroll-snap-type:x proximity}
.acx-thumbs::-webkit-scrollbar{display:none}
.acx-thumb{position:relative;flex:0 0 auto;width:clamp(58px,11cqi,96px);aspect-ratio:16/10;border-radius:10px;overflow:hidden;border:0;padding:0;cursor:pointer;background:#222;opacity:.45;transform:scale(.94);transition:opacity .3s,transform .4s var(--acx-ease);scroll-snap-align:center}
.acx-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.acx-thumb:hover{opacity:.8}
.acx-thumb[data-active]{opacity:1;transform:none;box-shadow:0 0 0 2px var(--acx-accent)}
.acx-thumb-progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--acx-accent);transform-origin:left;transform:scaleX(0)}
.acx-thumb[data-active] .acx-thumb-progress{transform:scaleX(var(--acx-progress))}
.acx-root:not([data-autoplay]) .acx-thumb-progress{display:none}

.acx-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

@media (prefers-reduced-motion:reduce){.acx-dot,.acx-thumb,.acx-arrow,.acx-num-roll{transition:none;animation:none}}
`;
