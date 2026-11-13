import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { MANIFEST } from "../data";

/**
 * Places a HyperFrames clip (transparent WebM in public/hf/<clip>.webm) on the Remotion timeline.
 * When the clip has not been rendered yet, the Remotion `fallback` plays instead, so the episode always renders.
 */
export const HfOverlay: React.FC<{
  clip: string;
  from: number;
  durationInFrames: number;
  fallback: React.ReactNode;
}> = ({ clip, from, durationInFrames, fallback }) => {
  const src = MANIFEST.hf[clip];
  return (
    <Sequence from={from} durationInFrames={durationInFrames} name={src ? `HF ${clip}` : `HF ${clip} (fallback)`}>
      {src ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(src)} transparent muted style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
      ) : (
        fallback
      )}
    </Sequence>
  );
};
