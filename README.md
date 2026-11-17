# Animated Carousel

A reusable, **single-file, zero-dependency** animated carousel for React 19.

The whole component is [`components/AnimatedCarousel.tsx`](components/AnimatedCarousel.tsx). Copy that one file into any React project (Next.js, Vite, Remix…). It imports only React and ships its own CSS, so there is nothing to install or configure. The Next.js app in this repo is only a playground for trying it out.

```bash
pnpm install
pnpm dev        # open http://localhost:3000 for the live playground
```

## Use it

```tsx
import AnimatedCarousel, { type CarouselSlide } from "@/components/AnimatedCarousel";

const slides: CarouselSlide[] = [
  {
    image: "/photos/valley.jpg",
    alt: "A green valley",
    eyebrow: "Chapter 01",
    title: "Where the river learns to bend",
    description: "Slow mornings and cold water.",
    cta: { label: "Explore →", href: "/explore" },
  },
  { image: "/photos/peaks.jpg", title: "Above the clouds", textPosition: "center" },
];

<AnimatedCarousel items={slides} effect="coverflow" transition="bouncy" textAnimation="mask" autoplay={5000} />;
```

Or pass any JSX as children. Each child becomes one slide:

```tsx
<AnimatedCarousel effect="stack" pagination="bar">
  <div className="card">One</div>
  <div className="card">Two</div>
  <MyProductCard product={p} />
</AnimatedCarousel>
```

## Slide fields (`CarouselSlide`)

| Field | Description |
| --- | --- |
| `image`, `alt` | Cover image for the slide |
| `thumbnail` | Smaller image for `pagination="thumbnails"` |
| `eyebrow`, `title`, `description` | Animated text. A plain-string `title` is split into words or letters |
| `cta` | `{ label, href?, target?, onClick? }` adds a button or link |
| `content` | Any JSX, drawn over the image |
| `textPosition` | Per-slide override, e.g. `"center"` or `"bottom-right"` |
| `overlay` | Dark gradient behind the text (on by default when there's an image and text) |
| `background` | CSS background for slides without an image |

## Props

| Prop | Default | Options |
| --- | --- | --- |
| `effect` | `"slide"` | `slide` `fade` `coverflow` `cube` `flip` `stack` `zoom` `reveal` `dissolve` `orbit`, or your own function |
| `transition` | `"spring"` | `spring` `snappy` `bouncy` `gentle` `smooth` `slow` `instant`, or `{ type: "spring", stiffness, damping, mass }` / `{ type: "tween", duration, easing }` |
| `textAnimation` | `"rise"` | `rise` `mask` `letters` `blur` `fade` `slide` `none`, or `{ type, duration, stagger, delay }` (ms) |
| `textPosition` | `"bottom-left"` | Any of the 9 positions: `top-left` … `bottom-right` |
| `autoplay` | `false` | `true` (5 s) or a number of milliseconds |
| `pauseOnHover` | `true` | |
| `loop` | `true` | |
| `kenBurns` | `false` | Slow zoom on the active image |
| `parallax` | `0.35` | 0–1, image parallax for the `slide` effect |
| `slideWidth` | per effect | 0.15–1 of the carousel width (values below 1 show the neighbouring slides) |
| `gap` | `16` | px between slides |
| `pagination` | `"dots"` | `dots` `bar` `numbers` `thumbnails` `none` |
| `arrows` | `"sides"` | `sides` `bottom` `none` (or `true`/`false`) |
| `aspectRatio` | `"16 / 9"` | Any CSS aspect ratio |
| `mobileAspectRatio` | `"4 / 5"` | Used when the carousel is narrower than 640px |
| `height` | — | Fixed height, e.g. `480` or `"70vh"` (overrides aspect ratio) |
| `radius` | `20` | Corner radius in px |
| `accentColor` | `#ff5a36` | Dots, progress, eyebrow, CTA |
| `perspective` | `1400` | px, for the 3D effects |
| `startIndex` | `0` | |
| `draggable`, `keyboard` | `true` | Swipe/drag with momentum; ← → Home End keys |
| `responsive` | — | Per-width overrides: `{ 0: { effect: "fade" }, 900: { effect: "coverflow" } }` |
| `renderSlide` | — | `(item, { index, active }) => JSX` to fully replace a slide's body |
| `onChange` | — | `(index) => void` |
| `respectReducedMotion` | `true` | Turns off motion and autoplay for users who ask for reduced motion |

### Control it from code

```tsx
const ref = useRef<AnimatedCarouselHandle>(null);
<AnimatedCarousel ref={ref} items={slides} />;
ref.current?.next(); // also: prev(), goTo(i), play(), pause(), getIndex()
```

### Write your own effect

An effect is a function that receives `d`, the slide's distance from the centre (`0` = active, `1` = next, `-0.5` = halfway to previous), and returns CSS:

```tsx
<AnimatedCarousel
  items={slides}
  effect={({ d }) => ({
    transform: `translateX(${d * 100}%) rotate(${d * 8}deg)`,
    opacity: 1 - Math.min(Math.abs(d), 1) * 0.6,
  })}
/>
```

Dragging, springs, looping and autoplay all work with custom effects automatically.

## Notes

- Requires React 19 (it uses the deduplicated `<style href precedence>` and `inert`).
- In Next.js the file already has `"use client"`, so you can render it from server components.
- Images use a plain `<img>`, so any URL works without Next.js image configuration.
