import React from "react";
import { C, ZONE, body, display } from "../design/tokens";
import { PROJECT } from "../content/copy";
import { Icon, WhatsAppMark } from "./Icon";

/** DHL speed lines (as in the logo), used to frame the service-point name. */
const Speed: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <svg width={92} height={22} viewBox="0 0 92 22" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${i * 8 + 6},${i * 8} L92,${i * 8} L86,${i * 8 + 5} L${i * 8},${i * 8 + 5} Z`} fill={C.yellow} />
    ))}
  </svg>
);

/**
 * Service point name, WhatsApp number and address — permanently on screen, close to the bottom edge.
 * One centred axis: name (framed by speed lines) → number (largest) → address.
 */
export const PersistentFooter: React.FC = () => {
  const top = ZONE.footerTop;
  return (
    <div style={{ position: "absolute", left: 0, top, width: 1080, height: 1920 - top, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -18, height: 18, background: "linear-gradient(0deg, rgba(110,40,0,0.22), rgba(110,40,0,0))" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${C.red} 0%, #BC0410 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, background: C.yellow }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 22, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Speed />
          <div style={{ ...display(29, { wdth: 100, wght: 800 }), color: C.yellow, letterSpacing: "0.05em" }}>
            {PROJECT.spLabel} <span style={{ color: C.white }}>{PROJECT.spName}</span>
          </div>
          <Speed flip />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <WhatsAppMark size={54} color={C.white} />
          <div style={{ ...display(72, { wdth: 70 }), color: C.white, letterSpacing: "0.01em", lineHeight: 1 }}>{PROJECT.whatsappDisplay}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <Icon name="mapPin" size={40} color={C.yellow} />
          <div style={{ ...body(25, 600), color: C.white, lineHeight: 1.25 }}>
            {PROJECT.address1}
            <br />
            {PROJECT.address2}
          </div>
        </div>
      </div>
    </div>
  );
};
