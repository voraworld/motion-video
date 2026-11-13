import React from "react";
import { WHATSAPP_PATH } from "../icons";

/** WhatsApp mark (Simple Icons, CC0): the glyph exactly as published, optionally on its green disc. */
export const WhatsAppMark: React.FC<{ size: number; color?: string; disc?: string; style?: React.CSSProperties }> = ({ size, color = "#fff", disc, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    {disc ? <circle cx={12} cy={12} r={12} fill={disc} /> : null}
    <g transform={disc ? "translate(4.2 4.2) scale(0.65)" : undefined}>
      <path d={WHATSAPP_PATH} fill={color} />
    </g>
  </svg>
);
