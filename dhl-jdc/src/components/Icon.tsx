import React from "react";
import { ICONS, WHATSAPP_PATH } from "../icons";

export const Icon: React.FC<{ name: keyof typeof ICONS; size: number; color: string; style?: React.CSSProperties }> = ({ name, size, color, style }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" style={style}>
    <path d={ICONS[name]} fill={color} />
  </svg>
);

/** WhatsApp mark (Simple Icons, CC0): the glyph exactly as published, optionally on its green disc. */
export const WhatsAppMark: React.FC<{ size: number; color?: string; disc?: string; style?: React.CSSProperties }> = ({ size, color = "#fff", disc, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    {disc ? <circle cx={12} cy={12} r={12} fill={disc} /> : null}
    <g transform={disc ? "translate(4.2 4.2) scale(0.65)" : undefined}>
      <path d={WHATSAPP_PATH} fill={color} />
    </g>
  </svg>
);
