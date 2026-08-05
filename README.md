# motion-lab

Three React Native interaction primitives, built to be felt rather than read.

Expo · TypeScript · Reanimated · Gesture Handler. Three runtime dependencies, MIT.

> **This is a lab, not a product.** One screen, no navigation, no auth. The
> financial framing exists because that's where these primitives have to be
> right — bounce on a screen holding someone's savings reads as toy.

<p align="center">
  <img src="docs/chain.gif" width="420" alt="One continuous take: a row tapped, the sheet raised and its detail scrolled, the scroll handed off to the sheet, the sheet caught in mid-flight and thrown to the top, then held down to sell until the balance falls">
</p>

*One take, no cuts. A row is tapped; the sheet comes up and is dragged to its
tallest stop; the detail scrolls; the scroll runs out and hands the same drag to
the sheet; the sheet is flicked and then **caught in mid-air**; thrown back to
the top; and held down until it sells — and the balance rolls down to meet it.*

*Every primitive in the repo, in one gesture, on a Release build on a phone. The
haptics aren't in the recording — iOS screen capture doesn't get them — so the
beat you'd feel at each detent, and again 40ms before the sale lands, is missing
from what you're looking at.*

---

## The interruptible sheet

<p align="center">
  <img src="docs/sheet.gif" width="420" alt="A bottom sheet flicked hard, caught in mid-flight, and held still under the thumb">
</p>

*The sheet is travelling under its own spring when the thumb lands on it, and it
stops where it was caught — no jump to meet the finger, no stall before it
follows. The clip finishes by pulling above the tallest detent, where resistance
grows rather than a wall appearing. Screen recording can't capture the haptic
that fires on each detent commit, only on arrival and never on crossing.*

**Velocity projection, not thresholds.** Where a flick comes to rest is
*projected*, then snapped to the nearest detent:

```ts
projected = position + (velocity / 1000) * (rate / (1 - rate))   // rate = 0.998
```

A hard throw and a gentle nudge land in different places, because they should.
The naive version — `if (velocity > 500) moveOneDetent` — treats them
identically, which is exactly what feels wrong about it.

The `/1000` is load-bearing: gesture velocity arrives in points per *second*
and the deceleration identity is expressed in points per *millisecond*. Without
it an ordinary 800 px/s flick projects to roughly 400,000px and projection
quietly degenerates into a very expensive threshold.

**Interruptible.** Grab it mid-flight and it picks up from exactly where it is.
The running animation is cancelled and the gesture re-seeded from the *live*
position, so the sheet is under your thumb from the first frame rather than
snapping back to wherever the flick began. On release, the gesture's velocity is
handed to the spring, so the settle continues your hand's motion instead of
starting again from rest.

The failure most implementations ship is re-seeding the position but dropping
that velocity — the sheet stops dead under your finger, then lurches.

Checked on hardware on a Release build, not inferred from the code: caught
mid-flight it stays glued to the thumb with no jump, and held still it stops
where it was caught.

**No overshoot, anywhere.** Every spring is at or above critical damping
(`2√(stiffness × mass)`), and [a test](__tests__/damping.test.ts) iterates every
spring in [`motion.ts`](src/tokens/motion.ts) and fails the build if one isn't.
An underdamped constant is a feel bug, and feel bugs don't announce themselves.

**Derived backdrop.** Scrim opacity is computed from sheet position with
`useDerivedValue`, never animated alongside it. Parallel animations drift the
moment the sheet is interrupted — two animations disagreeing about where they
are. Derivation can't drift, because there's only one source of truth.

**Three detents, not two.** With one boundary, threshold-snapping and velocity
projection agree almost everywhere, and the comparison below would have nothing
to show.

---

## Naive vs. tuned

<p align="center">
  <img src="docs/naive-vs-tuned.gif" width="420" alt="The same two flick velocities fired under both algorithms: tuned separates them, naive collapses them">
</p>

|           | soft flick | hard flick |
| --------- | ---------- | ---------- |
| **tuned** | middle     | **top**    |
| **naive** | middle     | middle     |

One recording, no cut. The `MODE` chip flips from `TUNED` to `NAIVE` halfway
through, which is what makes this one build rather than two takes edited
together — [toggled at runtime](src/dev/DevBar.tsx).

**The flicks are synthetic, and that's the point.** Both are fired at fixed
velocities from the dev panel — 700 and 2600 px/s — rather than by thumb. A hand
varies two things at once: a harder flick also *drags the sheet further before
release*, and the naive algorithm snaps one detent from wherever the finger let
go. So a human hard throw climbs two stops — one from the drag, one from the
threshold — and both algorithms land in the same place, for reasons that have
nothing to do with either algorithm. Holding position fixed and varying only
velocity is the only way this measures the thing it claims to.

The synthetic path calls the same `settleFrom(velocity)` the real gesture does.
It supplies a number where a thumb would have; there is no second code path, and
[a test](__tests__/projection.test.ts) asserts all four cells of that table
before anyone points a camera at it.

---

## Scroll-to-pan handoff

<p align="center">
  <img src="docs/handoff.gif" width="420" alt="Content scrolling inside a bottom sheet, then the sheet itself taking over the same drag once the list reaches its top">
</p>

*The list moves while the sheet's top edge stays welded in place. Then the list
runs out, the finger keeps pulling, and the sheet picks up the same gesture
without a break in it — one drag changing owner, not a handover between two
modes. Filmed slowly on purpose, because the subject is a frame that isn't
there.*

At the tallest detent the content owns vertical motion; the sheet takes over
only when the content has nothing left to give. Four things keep the seam
invisible:

- The gesture origin is **re-based against live translation** while the content
  still owns the drag, so at the moment of handoff the sheet moves from where it
  already is rather than jumping by however far the finger travelled.
- Ownership is **sticky** for the rest of the gesture. Re-arbitrating per frame
  is what produces the stutter that makes most implementations feel seamed.
- `bounces={false}` is required, not stylistic — iOS bounce drives
  `contentOffset.y` negative, so the handoff fires early and often twice.
- The content is **inert unless the sheet is parked at the top**, and it's
  pinned on every frame the sheet moves rather than only on gesture frames. An
  earlier version pinned it inside the pan handler alone, so the rule held while
  a finger was down and lapsed the instant one lifted — a list with momentum
  kept coasting behind a sheet that was itself in flight. Two things moving at
  once, and no way for the eye to tell which one it should be following.

Verified on device: no stutter frame at the changeover.

---

## Hold-to-confirm

<p align="center">
  <img src="docs/hold-to-confirm.gif" width="560" alt="A hold-to-confirm button abandoned partway, then held to completion: fill, morph to Sold, and a shimmer crossing once">
</p>

*Abandoned first, then committed. Framed tight because the shimmer is illegible
at full-screen scale — it's fourteen vertical slices on a half-sine, and at
sweep speed the steps disappear. What you can't see is the haptic, which fires
40ms before the visual settles; and on the early release it doesn't fire at all,
because a button that says cancelled while the hand says committed is worse than
no feedback.*

**Friction at the right moment builds trust.**

**Asymmetric:** builds over 700ms, cancels in ~150ms. Release early and it snaps
away as though it never happened — erasure, not rewind. The cancel also kills
the pending haptic; releasing at 90% must not still buzz 40ms later, or the
button says cancelled while the hand says committed.

**The haptic leads the visual by 40ms.** Firing together reads as slightly late.
Same event, different perceived latency.

**The fill accelerates rather than running linear.** This is a deliberate choice
against the obvious one. A linear fill is honest about time remaining; an
accelerating fill makes commitment feel like it *gathers* — hard to start, then
pulling toward completion. It under-reports progress, and that's the accepted
cost: this control isn't reporting a download, it's asking whether you mean it.

**The fill inverts, it doesn't tint.** On light ground a pale accent filling a
pale button is invisible, so the button's ground fills and a clipped copy of the
label — tinted for the accent side — is revealed exactly as the fill passes
beneath it.

**Commit morphs, and shimmers.** A bounds change rather than a crossfade:
crossfade says two things happened, morph says this thing changed. A band of
light then crosses the button once, left to right, built from sliced opacity on
a half-sine so it has soft edges without a gradient dependency.

---

## The rolling number

<!-- GIF: number.gif — a tick and a commit, side by side. -->

One component, two configurations. `tick` is fast, ambient, forgettable by
design. `commit` is slow, singular, meant to land. Same mechanism, opposite
emotional job — and the difference is a prop, not a second component.

**Roll direction follows value direction.** Digits roll up when the number rises
and down when it falls. Costs nothing, and it means a balance dropping is felt
as a descent rather than as a different number.

**Each slot renders both glyphs.** The outgoing and incoming digit travel past
each other, so the column is never empty. An earlier version faded one glyph out
and back in, and the number read as blank rather than solid — an odometer wheel
never shows a gap.

**Tabular numerals throughout**, so nothing shifts sideways as digits change.

**The flash decays, and holds first.** A flash with no hold is over before the
eye has finished moving to it. It also peaks short of full saturation: a tick is
ambient information, and information doesn't need to shout.

---

## Motion is a system, skin is a variable

Two token files, and the split is the argument.

[`motion.ts`](src/tokens/motion.ts) never varies with theme — springs, damping,
projection constants, haptic offsets, stagger. Named for what they do, because
`spring1` is legible to nobody.

[`theme.ts`](src/tokens/theme.ts) holds light and dark. **Light leads.**

The clean example of the seam: *which* red a price tick flashes is a theme
concern — emitted light on dark ground, ink on light, genuinely different values.
The decay curve is a motion concern and is byte-identical in both. If a spring
constant ever wants to differ by theme, something has gone wrong upstream.

**Colour is scarce.** No coloured buttons, no tinted headers, no gradients. The
price flash and the confirm fill are the only moments the screen produces colour
at all, which is what makes them mean something.

**`reduceMotion` is a second set of values, not a kill switch.** The sheet still
moves, settling sooner. Digits stop rolling — a column of tumbling numerals is
exactly what the setting exists to suppress — but the flash stays, because it
carries the same information. The confirm fill still sweeps: progress feedback is
information, not decoration.

---

## Performance

<!-- REQUIRED BEFORE APPLYING.
     - Frame timeline screenshot
     - Device name and model (low-end Android)
     - One thing found and fixed, with the before/after number

     Likely subject, already anticipated in the code: animating shadow on
     light ground. See the comment in src/components/Sheet.tsx — shadowRadius
     and shadowOpacity force a re-rasterisation every frame on Android.
     Expo Go is NOT valid for these numbers; use a release build. -->

---

## Try it

<!-- REQUIRED BEFORE APPLYING: Expo QR code + link.
     No custom native modules, so it runs in Expo Go unmodified. -->

```bash
npm install
npx expo start
```

```bash
npm test    # projection math, digit formatting, theme parity, damping guard
```

---

## What's tested, and what isn't

The pure logic is unit-tested: velocity projection, detent snapping, rubber
banding, digit formatting, theme parity, and the critical-damping guard.

Gesture feel, spring character, and haptic timing are **not** tested, because
they can't be. Snapshot-testing them would be theatre. They're decided by hand
on a device, which is the only way that judgment gets made.

That doesn't mean they're decided by vibe. Constants are chosen by comparison
rather than by assertion: candidates get cycled at runtime on a Release build
and judged back to back, unlabelled, against a control. Nobody can answer *"does
460 feel right?"* — everybody can answer *"is 1 or 3 better?"*

One result from doing that is worth stating, because it changed the method. For
a critically damped spring, travel time runs with `1/√stiffness`, so equal steps
in stiffness are **not** equal steps in perception:

```
460 → ~186ms     800 → ~140ms     950 → ~130ms     1100 → ~120ms
```

950 and 1100 look far apart as numbers and are about one frame apart at 60Hz —
genuinely indistinguishable when tested blind. Candidates have to be spaced by
target *duration*, not by round numbers, or a tuning round returns nothing and
reads as "they all feel the same."

The stopping rule that falls out of it: raise the value until further increases
can't be told apart, then take the **lowest** value that can't be told apart from
the fastest. Past that point the extra stiffness buys nothing visible and only
risks reading as abrupt on slower hardware. That's how the sheet's entrance
landed on 800, and the derivation sits next to the constant in
[`motion.ts`](src/tokens/motion.ts).

## Licence

MIT
