import React from "react";
import { Composition } from "remotion";
import { JDCCommercial } from "./JDCCommercial";
import { DURATION_S, FPS } from "./motion/util";
import { H, W } from "./design/tokens";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="JDCCommercial" component={JDCCommercial} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={W} height={H} defaultProps={{ audio: true }} />
    <Composition id="JDCPoster" component={JDCCommercial} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={W} height={H} defaultProps={{ audio: false }} />
  </>
);
