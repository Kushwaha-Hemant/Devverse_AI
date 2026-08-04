"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Reveal, Section, SectionHeading } from "@/components/ui/Reveal";
import { skillGroups, type Skill } from "@/content/skills";
import { getSkillIcon } from "@/content/skillIcons";
import { usePreferences } from "@/providers/preferences";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  cyan: "#22d3ee",
  electric: "#4c7dff",
  purple: "#a855f7",
  magenta: "#e879f9",
};

/**
 * Skills as orbiting planets — one ring per category, each planet sized by
 * confidence. Hovering expands a card showing where the skill is actually used.
 *
 * Below `lg`, and whenever motion is suppressed, this degrades to a grouped
 * list that carries exactly the same information.
 */
export function Skills() {
  const { motionOff } = usePreferences();
  const [focused, setFocused] = useState<
    (Skill & { accent: string; group: string }) | null
  >(null);
  /** Hovering a legend chip or a planet dims every other orbit. */
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Everything below scales off the orbit's ACTUAL rendered width rather than
  // a breakpoint. The container is capped by viewport height (see the class
  // below) so it fits a laptop without scrolling, which means its width no
  // longer tracks the breakpoint at all — a 900px-tall laptop renders a ~560px
  // orbit at the same breakpoint where a tall monitor renders 1000px.
  const orbitRef = useRef<HTMLDivElement>(null);
  const [orbitW, setOrbitW] = useState(0);

  useEffect(() => {
    const el = orbitRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setOrbitW(entry.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Per-planet labels are gone: with icons this size a planet+label needs
  // more room than the 6.8% ring gap at every width, so they collided
  // everywhere. The focus card names whatever is hovered or tapped.
  // Hover still drives selection on pointer devices; touch uses click.
  /** True only where there is no hover — i.e. touch. Distinct from a small
   *  orbit: a 1366 laptop renders a 512px orbit but still has a mouse. */
  const isTouch = !useMediaQuery("(hover: hover)", true);
  const planetBase = Math.min(36, Math.max(17, orbitW * 0.034));

  /**
   * Cursor tooltip.
   *
   * Rendered at the component root, NOT inside the orbit: the orbit clips with
   * `overflow-hidden`, and its rings carry `transform`, which makes them a
   * containing block — so even `position: fixed` would be trapped and clipped
   * for outer-ring planets.
   *
   * Position is written straight to the DOM on mousemove rather than held in
   * state; a `setState` per mouse event would re-render 32 planets on every
   * pointer move.
   */
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipOpen, setTipOpen] = useState(false);

  const moveTip = (e: { clientX: number; clientY: number }) => {
    const el = tipRef.current;
    if (!el) return;
    const pad = 14;
    const w = el.offsetWidth || 240;
    const h = el.offsetHeight || 120;
    // Flip to the other side of the cursor near the viewport edges so the
    // tooltip is never cut off.
    const x = Math.min(e.clientX + pad, window.innerWidth - w - 8);
    const y =
      e.clientY + pad + h > window.innerHeight
        ? e.clientY - h - pad
        : e.clientY + pad;
    el.style.transform = `translate3d(${Math.max(8, x)}px, ${Math.max(8, y)}px, 0)`;
  };
  /** Must clear the inner ring (13% radius) minus a planet. */
  const coreSize = Math.round(Math.min(160, Math.max(52, orbitW * 0.155)));

  const totalSkills = skillGroups.reduce((n, g) => n + g.skills.length, 0);


  return (
    <Section id="skills">
      <SectionHeading
        kicker="Skills"
        title="Orbit of tools"
        subtitle="Sized by confidence, grouped by layer. Every skill lists the projects on this site that actually use it."
      />

      {/* Orbit view. `overflow-hidden` below is load-bearing: each ring is an
          `inset-0` square with a rotate animation, and a rotated square's
          bounding box is √2 times its width (350px → 495px). Without clipping,
          that phantom box pushed 53px of horizontal scroll onto every phone.
          Planets sit at ≤46% radius, so nothing real is clipped. */}
      {/* The container is capped by viewport HEIGHT, not just width: the orbit
          is a square, so a 1080px cap made it taller than a laptop screen and
          forced scrolling to see one graphic. clamp() keeps it usable on a
          short laptop, a tall monitor and a phone alike. */}
      {!motionOff && (
        <div className="flex flex-col gap-6 sm:grid sm:grid-cols-[minmax(150px,200px)_1fr] sm:items-center sm:gap-10">
          <div
            ref={orbitRef}
            className="order-2 relative mx-auto aspect-square w-full max-w-[clamp(300px,78vh,820px)] overflow-hidden sm:order-none sm:col-start-2 sm:row-span-2 sm:row-start-1"
          >
          {/* Core */}
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="relative grid place-items-center"
              // Scales with the orbit, so it never looks lost inside a large
              // circle or crowds the inner ring inside a small one.
              style={{ width: coreSize, height: coreSize }}
            >
              {/* Slowly counter-rotating dashed collar. */}
              <div
                aria-hidden
                data-decorative
                className="border-cyan/30 absolute inset-0 rounded-full border-2 border-dashed"
                style={{
                  animationName: "orbit",
                  animationDuration: "34s",
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                  animationDirection: "reverse",
                }}
              />
              <div
                className="glass-strong neon-cyan relative grid place-items-center rounded-full text-center"
                style={{ width: coreSize * 0.8, height: coreSize * 0.8 }}
              >
                <div>
                  <p
                    className="text-aurora leading-none font-bold tabular-nums"
                    style={{ fontSize: Math.round(coreSize * 0.26) }}
                  >
                    {totalSkills}
                  </p>
                  {/* The two caption lines need a core of ~110px to breathe. */}
                  {coreSize >= 110 && (
                    <>
                      <p className="text-ink-dim mt-1.5 font-mono text-[9px] tracking-[0.25em]">
                        SKILLS
                      </p>
                      <p className="text-ink-dim mt-0.5 font-mono text-[9px] tracking-[0.2em]">
                        {skillGroups.length} LAYERS
                      </p>
                    </>
                  )}
                </div>
              </div>
              {/* Gradient rather than `blur-2xl` — pulse-glow animates this
                  element, and animating anything with a filter forces a
                  repaint every frame. */}
              <div
                aria-hidden
                data-decorative
                className="animate-pulse-glow absolute -inset-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle closest-side, color-mix(in oklab, var(--color-cyan) 32%, transparent), transparent)",
                  willChange: "opacity",
                }}
              />
            </div>
          </div>

          {skillGroups.map((group, gi) => {
            // Spread the rings across 15%–43% of the container regardless of
            // how many groups there are, leaving the outer margin for labels.
            // (A fixed step broke as soon as a sixth group was added — the last
            // ring landed outside the box.)
            // Ring spacing has to exceed planet height + label height, or
            // planets from adjacent rings collide whenever they align. At
            // 1080px this gives ~63px between rings against ~59px of content.
            // Compact pushes the innermost ring out and the outermost in, so
            // six rings still clear each other inside a ~350px circle.
            // One spread for every size — 6.6% of the width between rings —
            // now that planet size scales with the container instead of
            // jumping at a breakpoint.
            const spread = Math.max(1, skillGroups.length - 1);
            const radiusPct = 13 + (gi / spread) * 34;
            const duration = 46 + gi * 11;
            const reverse = gi % 2 === 1;
            const dimmed = hoveredGroup !== null && hoveredGroup !== group.id;

            return (
              <div
                key={group.id}
                // pointer-events-none is essential: every ring is a full-size
                // `inset-0` div, so they stack and the outermost one swallowed
                // hover for all five rings beneath it — only the last ring's
                // planets were interactive. Planets re-enable events below.
                className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                // Longhand rather than the `animation` shorthand: the browser
                // expands shorthands when parsing server HTML, which React then
                // reads back as a hydration mismatch.
                style={{
                  opacity: dimmed ? 0.2 : 1,
                  animationName: "orbit",
                  animationDuration: `${duration}s`,
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                  animationDirection: reverse ? "reverse" : "normal",
                }}
              >
                {/* Orbit path */}
                <div
                  className="absolute rounded-full border transition-colors duration-300"
                  style={{
                    inset: `${(50 - radiusPct).toFixed(3)}%`,
                    borderColor: `${ACCENT[group.accent]}${hoveredGroup === group.id ? "88" : "2e"}`,
                  }}
                />
                {/* Leading marker — rides the ring, so it costs no animation
                    of its own and gives each orbit a sense of direction. */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: "50%",
                    top: `${(50 - radiusPct).toFixed(3)}%`,
                    background: ACCENT[group.accent],
                    boxShadow: `0 0 10px ${ACCENT[group.accent]}`,
                  }}
                />
                {group.skills.map((skill, si) => {
                  // Phase-offset each ring. Without this every ring starts its
                  // first planet at angle 0, so all six line up in a row to the
                  // right of the core on load — it reads as a list, not orbits.
                  const angle =
                    (si / group.skills.length) * Math.PI * 2 +
                    (gi * Math.PI * 2) / (skillGroups.length * 2.5);
                  // Rounded so the serialised style attribute is byte-identical
                  // on server and client — raw trig gives 17 decimal places,
                  // which the browser truncates and React then flags.
                  const x = (50 + Math.cos(angle) * radiusPct).toFixed(3);
                  const y = (50 + Math.sin(angle) * radiusPct).toFixed(3);
                  // Large enough for the brand mark to stay readable, and to
                  // make the confidence-by-size mapping actually legible.
                  // Proportional to the orbit, so confidence-by-size stays
                  // readable whether the circle is 350px or 1000px.
                  const size = Math.round(
                    planetBase + (skill.level / 100) * planetBase * 0.32,
                  );
                  const { Icon, color } = getSkillIcon(skill.name);
                  const isFocused = focused?.name === skill.name;

                  return (
                    // Wrapper owns the positioning. The button owns the
                    // counter-rotation — an animated `transform: rotate()`
                    // replaces the whole transform, so a translate on the same
                    // element would be thrown away.
                    <div
                      key={skill.name}
                      className="pointer-events-auto absolute"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <button
                        // Hover drives selection on pointer devices only. Touch
                        // browsers synthesise mouseenter immediately before
                        // click, so honouring it here made a tap select then
                        // instantly deselect.
                        onMouseEnter={(e) => {
                          if (isTouch) return;
                          setFocused({ ...skill, accent: group.accent, group: group.label });
                          setHoveredGroup(group.id);
                          moveTip(e);
                          setTipOpen(true);
                        }}
                        onMouseMove={(e) => {
                          if (isTouch) return;
                          moveTip(e);
                        }}
                        onFocus={() => {
                          if (isTouch) return;
                          setFocused({ ...skill, accent: group.accent, group: group.label });
                          setHoveredGroup(group.id);
                        }}
                        // Tap always selects — never toggles — so the card can't
                        // flicker empty on a phone.
                        onClick={() => {
                          setFocused({ ...skill, accent: group.accent, group: group.label });
                          setHoveredGroup(group.id);
                        }}
                        onMouseLeave={() => {
                          if (isTouch) return; // keep the tapped selection
                          setFocused(null);
                          setHoveredGroup(null);
                          setTipOpen(false);
                        }}
                        onBlur={() => {
                          if (isTouch) return;
                          setFocused(null);
                          setHoveredGroup(null);
                        }}
                        className="group/planet flex cursor-pointer flex-col items-center gap-1.5 transition-transform hover:scale-125"
                        style={{
                          animationName: "orbit",
                          animationDuration: `${duration}s`,
                          animationTimingFunction: "linear",
                          animationIterationCount: "infinite",
                          animationDirection: reverse ? "normal" : "reverse",
                        }}
                      >
                        <span
                          className="glass-strong grid place-items-center rounded-full transition-shadow duration-300"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            borderColor: `${ACCENT[group.accent]}${isFocused ? "cc" : "66"}`,
                            boxShadow: isFocused
                              ? `0 0 ${size}px ${ACCENT[group.accent]}88, 0 0 0 2px ${ACCENT[group.accent]}66`
                              : `0 0 ${Math.round(size / 2)}px ${ACCENT[group.accent]}44`,
                          }}
                        >
                          <Icon
                            size={Math.round(size * 0.5)}
                            // Brand colour where one exists; otherwise tint the
                            // neutral glyph with the ring's accent.
                            color={color ?? ACCENT[group.accent]}
                          />
                        </span>
                        {/* No per-planet label. At this icon size a planet
                            plus its label exceeds the ring gap at every width,
                            so labels collided everywhere. The focus card in the
                            left column names whatever is hovered or tapped. */}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          </div>

          {/* Focus card sits under the legend in the left column, so the
              orbit keeps the full width of its own column. */}
          <div className="order-3 sm:order-none sm:col-start-1 sm:row-start-2 sm:self-start">
            <div className="w-full">
            <motion.div
              animate={{ opacity: focused ? 1 : 0.65 }}
              transition={{ duration: 0.2 }}
              className="glass-strong flex min-h-[132px] flex-col justify-center rounded-2xl p-5"
            >
              {focused ? (
                <>
                  <p
                    className="font-mono text-[10px] tracking-[0.25em] uppercase"
                    style={{ color: ACCENT[focused.accent] }}
                  >
                    {focused.group}
                  </p>
                  <p className="mt-1.5 text-lg leading-tight font-bold">
                    {focused.name}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="bg-elevated h-1.5 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${focused.level}%`,
                          background: `linear-gradient(90deg, ${ACCENT[focused.accent]}, var(--color-purple))`,
                        }}
                      />
                    </div>
                    <span className="text-ink-muted font-mono text-[11px] tabular-nums">
                      {focused.level}
                    </span>
                  </div>
                  <p className="text-ink-dim mt-3 text-[11px] leading-relaxed">
                    {focused.usedIn.length > 0
                      ? `Used in ${focused.usedIn.join(", ")}`
                      : "Core computer-science fundamentals"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-cyan font-mono text-[10px] tracking-[0.25em] uppercase">
                    Explore
                  </p>
                  <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                    {isTouch ? "Tap" : "Hover"}{" "}
                    any planet for confidence and
                    where it&apos;s used. Size maps to confidence; each ring is
                    one layer of the stack.
                  </p>
                </>
              )}
            </motion.div>
            </div>
          </div>

          {/* Legend — doubles as a filter: hovering a layer dims the other
              rings. Left column on tablet and up; above the orbit on a phone,
              where a side-by-side column would starve the orbit of width. */}
          <div className="order-1 grid grid-cols-2 gap-2 sm:order-none sm:col-start-1 sm:row-start-1 sm:flex sm:flex-col sm:self-end">
          {skillGroups.map((group) => {
            const active = hoveredGroup === group.id;
            return (
              <button
                key={group.id}
                onMouseEnter={() => setHoveredGroup(group.id)}
                onMouseLeave={() => setHoveredGroup(null)}
                onFocus={() => setHoveredGroup(group.id)}
                onBlur={() => setHoveredGroup(null)}
                className="glass flex cursor-pointer items-center gap-2.5 rounded-full py-2 pr-4 pl-3 transition-all"
                style={{
                  borderColor: active ? `${ACCENT[group.accent]}aa` : undefined,
                  boxShadow: active
                    ? `0 0 18px ${ACCENT[group.accent]}44`
                    : undefined,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: ACCENT[group.accent],
                    boxShadow: `0 0 8px ${ACCENT[group.accent]}`,
                  }}
                />
                <span className="text-xs font-medium">{group.label}</span>
                <span className="text-ink-dim font-mono text-[10px] tabular-nums">
                  {group.skills.length}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* --- List view (small screens / motion off) --- */}
      <div className={cn("grid gap-6 sm:grid-cols-2", !motionOff && "lg:hidden")}>
        {skillGroups.map((group, gi) => (
          <Reveal key={group.id} delay={gi * 0.06}>
            <div className="glass h-full rounded-2xl p-5">
              <h3
                className="font-mono text-[10px] tracking-[0.25em] uppercase"
                style={{ color: ACCENT[group.accent] }}
              >
                {group.label}
              </h3>
              <ul className="mt-4 space-y-3.5">
                {group.skills.map((s) => {
                  // Same brand marks as the orbit, so the two views read as one
                  // system rather than two unrelated components.
                  const { Icon, color } = getSkillIcon(s.name);
                  return (
                    <li key={s.name} className="flex items-center gap-3">
                      <span
                        className="glass grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                        style={{ borderColor: `${ACCENT[group.accent]}55` }}
                      >
                        <Icon size={15} color={color ?? ACCENT[group.accent]} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm">{s.name}</span>
                          <span className="text-ink-dim shrink-0 font-mono text-[10px] tabular-nums">
                            {s.level}
                          </span>
                        </span>
                        <span className="bg-elevated block h-1 overflow-hidden rounded-full">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${s.level}%`,
                              background: `linear-gradient(90deg, ${ACCENT[group.accent]}, var(--color-purple))`,
                            }}
                          />
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Cursor tooltip. Lives here — outside the orbit — because the orbit
          clips (`overflow-hidden`) and its rings create a transform containing
          block, which would trap even a fixed-position child. Kept mounted so
          `moveTip` can position it before it becomes visible; opacity alone is
          toggled, which is compositor-only. */}
      <div
        ref={tipRef}
        role="tooltip"
        aria-hidden={!tipOpen}
        className="glass-strong pointer-events-none fixed top-0 left-0 z-[130] w-60 rounded-2xl p-4 transition-opacity duration-150"
        style={{ opacity: tipOpen && focused ? 1 : 0 }}
      >
        {focused && (
          <>
            <p
              className="font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ color: ACCENT[focused.accent] }}
            >
              {focused.group}
            </p>
            <p className="mt-1 text-sm leading-tight font-bold">
              {focused.name}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="bg-elevated h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${focused.level}%`,
                    background: `linear-gradient(90deg, ${ACCENT[focused.accent]}, var(--color-purple))`,
                  }}
                />
              </div>
              <span className="text-ink-muted font-mono text-[10px] tabular-nums">
                {focused.level}
              </span>
            </div>
            <p className="text-ink-dim mt-2.5 text-[11px] leading-relaxed">
              {focused.usedIn.length > 0
                ? `Used in ${focused.usedIn.join(", ")}`
                : "Core computer-science fundamentals"}
            </p>
          </>
        )}
      </div>
    </Section>
  );
}
