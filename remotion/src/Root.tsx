import React from "react";
import { Composition, Folder } from "remotion";
import { EPISODES, FPS, HEIGHT, WIDTH, sec } from "./data";
import { Scaffold } from "./episodes/Scaffold";

/** Episodes with a finished bespoke composition. Everything else plays the timing scaffold. */
const BESPOKE: Record<string, React.FC> = {
  // E01: E01ExportRelay,  ← add each episode here when its production is done
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Production">
        {EPISODES.filter((e) => BESPOKE[e.id]).map((e) => (
          <Composition key={e.id} id={e.id} component={BESPOKE[e.id]} durationInFrames={sec(e.dur)} fps={FPS} width={WIDTH} height={HEIGHT} />
        ))}
      </Folder>
      <Folder name="Scaffolds">
        {EPISODES.filter((e) => !BESPOKE[e.id]).map((e) => (
          <Composition
            key={e.id}
            id={e.id}
            component={Scaffold}
            defaultProps={{ id: e.id }}
            durationInFrames={sec(e.dur)}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
    </>
  );
};
