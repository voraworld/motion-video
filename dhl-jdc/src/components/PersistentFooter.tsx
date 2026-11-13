import React from "react";
import { BODY, C, ZONE, WA, display } from "../design/tokens";
import { PROJECT } from "../content/copy";
import { WhatsAppMark } from "./Icon";

/**
 * Footer, kept simple and always on screen, on a yellow strip close to the bottom edge:
 *   [ SERVICE POINT JDC CENGKARENG ]  [ (WA) +62 877 7589 7478 ]
 *   [ Soewarna Business Park, Lot 7A-7B, Soekarno-Hatta International Airport Area ]
 */
const PILL_H = 70;
export const PersistentFooter: React.FC = () => {
  const top = ZONE.footerTop;
  const pill: React.CSSProperties = {
    height: PILL_H,
    borderRadius: PILL_H / 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 18px rgba(110,70,0,0.22)",
  };
  return (
    <div style={{ position: "absolute", left: 0, top, width: 1080, height: 1920 - top, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -16, height: 16, background: "linear-gradient(180deg, rgba(110,60,0,0), rgba(110,60,0,0.14))" }} />
      <div style={{ position: "absolute", inset: 0, background: C.yellow }} />
      <div style={{ position: "absolute", left: 48, right: 48, top: 14, display: "flex", gap: 14 }}>
        <div style={{ ...pill, flex: 1, background: C.red, padding: "0 26px" }}>
          <div style={{ ...display(30, { wdth: 84, wght: 800 }), color: C.white, letterSpacing: "0.03em" }}>SERVICE POINT JDC CENGKARENG</div>
        </div>
        <div style={{ ...pill, width: 404, flex: "0 0 404px", background: C.ink, gap: 12 }}>
          <WhatsAppMark size={38} disc={WA.green} />
          <div style={{ ...display(38, { wdth: 70 }), color: C.white, letterSpacing: "0.01em" }}>{PROJECT.whatsappDisplay}</div>
        </div>
      </div>
      <div style={{ ...pill, position: "absolute", left: 48, right: 48, top: 14 + PILL_H + 12, height: 62, background: C.white }}>
        <div style={{ fontFamily: BODY, fontSize: 23, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>
          {PROJECT.address1}, {PROJECT.address2}
        </div>
      </div>
    </div>
  );
};
