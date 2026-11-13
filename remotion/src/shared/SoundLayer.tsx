import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { MANIFEST, sec } from "../data";

export type SfxCue = { at: number; name: string; volume?: number };

/**
 * Voice-over, music bed and sound effects for one episode.
 * VO (one file, or per-beat files from scripts/vo.mjs) and music play only once they exist; SFX come from scripts/sfx.sh.
 * Music sits about 10 dB under the VO (volume 0.32); without VO it plays at 0.6.
 */
export const SoundLayer: React.FC<{ ep: string; sfx: SfxCue[]; musicVolume?: number }> = ({ ep, sfx, musicVolume }) => {
  const vo = MANIFEST.vo[ep];
  const voBeats = MANIFEST.voBeats?.[ep] ?? [];
  const music = MANIFEST.music[ep];
  const hasVo = Boolean(vo) || voBeats.length > 0;
  return (
    <>
      {vo ? <Audio src={staticFile(vo)} volume={1} /> : null}
      {!vo
        ? voBeats.map((b, i) => (
            <Sequence key={`vo${i}`} from={sec(b.start)} layout="none" name={`VO beat ${i}`}>
              <Audio src={staticFile(b.file)} volume={1} />
            </Sequence>
          ))
        : null}
      {music ? <Audio src={staticFile(music)} volume={musicVolume ?? (hasVo ? 0.32 : 0.6)} /> : null}
      {sfx.map((c, i) => {
        const file = MANIFEST.sfx[c.name];
        if (!file) return null;
        return (
          <Sequence key={i} from={c.at} layout="none" name={`sfx ${c.name}`}>
            <Audio src={staticFile(file)} volume={c.volume ?? 0.8} />
          </Sequence>
        );
      })}
    </>
  );
};
