"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, Preload } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

import { useIsClient, useMediaQuery } from "@/lib/hooks";
import { DeveloperRoom } from "./DeveloperRoom";
import type { HotspotId } from "./objects";

/**
 * True for software renderers and integrated GPUs, which have far too little
 * fill rate for a full-screen bloom pass. Reads the real driver string rather
 * than guessing from CPU core count.
 */
function isLowPowerGpu(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return true;

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";

    // Software rasterisers — always low.
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return true;

    // Intel integrated (UHD/HD/Iris). Arc is discrete, so exclude it.
    if (/intel/i.test(renderer) && !/\barc\b/i.test(renderer)) return true;

    return false;
  } catch {
    return true;
  }
}

/**
 * Canvas host for the workspace.
 *
 * Quality is tiered: low-core / small-viewport devices drop the bloom pass and
 * cap the pixel ratio rather than losing the 3D scene entirely — the brief
 * asks for optimised mobile, not stripped mobile.
 */
export function WorkspaceScene({
  view,
  active,
  onSelect,
  paused = false,
}: {
  view: string;
  active: HotspotId | null;
  onSelect: (id: HotspotId) => void;
  /** True when the scene is scrolled offscreen — stops the render loop. */
  paused?: boolean;
}) {
  const isClient = useIsClient();
  const smallViewport = useMediaQuery("(max-width: 768px)");
  const lowCores = isClient && (navigator.hardwareConcurrency ?? 8) <= 4;

  // CPU cores say nothing about fill rate. Bloom is a full-screen post pass,
  // and on integrated graphics it was the difference between ~24fps and a
  // smooth scene — so ask the GPU what it actually is.
  const weakGpu = useMemo(() => (isClient ? isLowPowerGpu() : false), [isClient]);

  const tier: "high" | "low" =
    smallViewport || lowCores || weakGpu ? "low" : "high";

  return (
    <Canvas
      data-decorative
      // Stop rendering entirely once the hero scrolls away. Without this the
      // scene keeps drawing (bloom included) behind the rest of the page,
      // which was costing ~50% of the main thread during normal scrolling.
      frameloop={paused ? "never" : "always"}
      // dpr 2 means 4x the pixels to shade. 1.5 is visually near-identical
      // here and much cheaper on a bloom-heavy scene.
      dpr={tier === "high" ? [1, 1.5] : [1, 1]}
      gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
      className="absolute inset-0"
      // The room is decorative; every interactive target is mirrored in DOM.
      aria-hidden
    >
      <PerspectiveCamera makeDefault fov={42} position={[0, 2.2, 7.2]} />
      {/* Background is owned by <SpaceBackdrop>, which installs a painted
          equirectangular skybox on the scene. */}
      {/* Fog near was 9. The camera parks around z=7.2, so the PC tower
          (~9.1 away) and whiteboard (~9.4) started fogging toward the almost
          black fog colour the moment they came into view. Pushed back so it
          only affects genuine distance, and lifted off pure black. */}
      <fog attach="fog" args={["#0a1024", 16, 40]} />

      <Suspense fallback={null}>
        <DeveloperRoom view={view} active={active} onSelect={onSelect} />
        <Preload all />
      </Suspense>

      {/* Bloom only on capable GPUs.
          Measured on Intel UHD: full-res bloom 23.7fps, quarter-res 28-37fps,
          none 57-109fps. Even at a quarter resolution the full-screen pass is
          too expensive on integrated graphics, so it's dropped entirely there
          rather than shipping a scene that stutters. The emissive materials
          still carry the neon colour, just without the glow halo. */}
      {tier === "high" && (
        <EffectComposer>
          {/* Threshold was 0.55 with 0.3 smoothing, putting the glow ramp at
              0.55-0.85. The screens and neon trim all sit below that, so
              nothing actually bloomed — the pass ran for almost no effect. */}
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.42}
            luminanceSmoothing={0.25}
            mipmapBlur
            resolutionScale={0.5}
          />
          {/* Was darkness 0.85, which crushed everything outside the centre
              third to black — the PC tower and whiteboard live out there. */}
          <Vignette eskil={false} offset={0.25} darkness={0.5} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
