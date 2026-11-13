import React from "react";
import { C, display } from "../design/tokens";
import { E, clamp01, k, kk, lerp, p01, rnd, spr } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { Icon } from "../components/Icon";
import { Ghost } from "../components/Kinetic";
import { LivingRibbon, Pt } from "../components/LivingRibbon";

/**
 * S01 · THE PAIN POINT (0 – 9.6 s)
 * Frame 0: a red seam cuts the yellow frame, the two halves jolt apart and the headline slams through the
 * seam from opposite sides. A DHL parcel crashes in. Abstract booking layers unfold out of the parcel
 * (form, login, account, verification), stamped by ANOTHER LOGIN? / ANOTHER FORM?, until NOT IN THE MOOD?
 * lands on the big accent. Then everything compresses, the upper half folds down over the lower half along
 * the crease the ribbon draws, leaving a clean yellow surface for the reveal.
 */
export const S1 = { slam: 0, parcel: 0.45, panels: 2.45, login: 2.88, form: 3.84, mood: 6.24, compress: 7.68, fold: 8.05, ribbon: 7.95 } as const;
export const S1_PARCEL = { x: 540, y: 1290, w: 600 };
export const CREASE_Y = 830;
export const CREASE_PTS: Pt[] = [
  [-160, 842],
  [60, 822],
  [260, 838],
  [440, 816],
  [620, 836],
  [800, 818],
  [980, 834],
  [1240, 820],
];

const SEAM = { y: 470, ang: -7 };
export const s1Twist = (s: number, t: number) => 1.15 * Math.sin(s * 9 + t * 5);

/** Camera shake on impacts (deterministic). */
const shake = (t: number) => {
  let x = 0;
  let y = 0;
  for (const [t0, amp] of [
    [0, 26],
    [0.95, 14],
    [S1.mood, 22],
  ] as const) {
    const d = t - t0;
    if (d >= 0 && d < 0.35) {
      const a = amp * Math.exp(-d * 12);
      x += a * Math.sin(d * 95 + t0);
      y += a * Math.cos(d * 80 + t0 * 3);
    }
  }
  return { x, y };
};

const Field: React.FC<{ w: number; icon?: "envelopeSimple" | "lockKey" | "userCircle" | "identificationCard"; dots?: boolean; label?: number }> = ({
  w,
  icon,
  dots,
  label = 0.4,
}) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ width: w * label, height: 10, borderRadius: 5, background: "#C9C9C9", marginBottom: 8 }} />
    <div style={{ width: w, height: 46, borderRadius: 12, border: "3px solid #D6D6D6", display: "flex", alignItems: "center", gap: 10, paddingLeft: 12 }}>
      {icon ? <Icon name={icon} size={24} color="#A9A9A9" /> : null}
      {dots ? <div style={{ letterSpacing: 6, color: "#9A9A9A", fontSize: 26, lineHeight: 1 }}>••••••</div> : null}
      {!icon && !dots ? <div style={{ width: w * 0.35, height: 8, borderRadius: 4, background: "#E3E3E3" }} /> : null}
    </div>
  </div>
);

/** Abstract booking-interface layers: deliberately generic, no real portal is depicted. */
const Panel: React.FC<{ kind: number; w: number; h: number }> = ({ kind, w, h }) => {
  const inner = w - 56;
  return (
    <div
      style={{
        width: w,
        height: h,
        background: C.white,
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 30px 50px rgba(110,70,0,0.28), 0 6px 12px rgba(80,50,0,0.18)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {kind === 0 ? (
        <>
          <div style={{ width: inner * 0.62, height: 18, borderRadius: 9, background: C.ink, marginBottom: 24 }} />
          <Field w={inner} icon="userCircle" />
          <Field w={inner} icon="envelopeSimple" />
          <Field w={inner} icon="identificationCard" />
          <Field w={inner} dots />
          <div style={{ width: inner, height: 50, borderRadius: 14, background: "#BDBDBD", marginTop: 6 }} />
        </>
      ) : null}
      {kind === 1 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Icon name="lockKey" size={86} color={C.ink} style={{ marginBottom: 18 }} />
          <Field w={inner} icon="envelopeSimple" label={0.3} />
          <Field w={inner} dots label={0.36} />
          <div style={{ width: inner, height: 50, borderRadius: 14, background: C.ink, marginTop: 4 }} />
        </div>
      ) : null}
      {kind === 2 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
          <Icon name="userCircle" size={150} color={C.ink} />
          <div style={{ width: inner * 0.7, height: 16, borderRadius: 8, background: "#BDBDBD", marginTop: 20 }} />
          <div style={{ width: inner * 0.5, height: 12, borderRadius: 6, background: "#DADADA", marginTop: 12 }} />
        </div>
      ) : null}
      {kind === 3 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <Icon name="password" size={44} color={C.ink} />
            <div style={{ width: inner * 0.5, height: 16, borderRadius: 8, background: C.ink }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ width: (inner - 50) / 6, height: 58, borderRadius: 12, border: "3px solid #D6D6D6" }} />
            ))}
          </div>
          {[0, 1].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, border: "3px solid #BDBDBD" }} />
              <div style={{ width: inner * (0.7 - i * 0.2), height: 10, borderRadius: 5, background: "#D2D2D2" }} />
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
};

const PANELS = [
  { kind: 0, w: 380, h: 520, x: 290, y: 590, r: -8, t: S1.panels },
  { kind: 1, w: 340, h: 430, x: 800, y: 500, r: 7, t: S1.panels + 0.2 },
  { kind: 2, w: 320, h: 330, x: 780, y: 930, r: -5, t: S1.panels + 0.4 },
  { kind: 3, w: 380, h: 340, x: 320, y: 1000, r: 6, t: S1.panels + 0.6 },
];
// multiplied, smaller copies that crowd in behind (the "it never ends" beat)
const CROWD = Array.from({ length: 6 }).map((_, i) => ({
  kind: i % 4,
  w: 230,
  h: 280,
  x: 140 + rnd(i + 3) * 800,
  y: 380 + rnd(i + 11) * 700,
  r: (rnd(i + 7) - 0.5) * 30,
  t: 4.25 + i * 0.12,
}));

const ORIGIN = { x: S1_PARCEL.x, y: S1_PARCEL.y - 170 };

const Content: React.FC<{ t: number }> = ({ t }) => {
  const comp = k(t, [S1.compress, S1.fold + 0.1], [0, 1], E.in);
  const cx = 540;
  const cy = CREASE_Y;
  const pull = (x: number, y: number) => ({ x: lerp(x, cx + (x - cx) * 0.5, comp), y: lerp(y, cy + (y - cy) * 0.5, comp) });

  // headline lines: slam in from alternate sides through the seam, leave at 2.2 s
  const lines = [
    { txt: "GOT A", col: C.red, y: 205, from: -1, t0: 0.0 },
    { txt: "SHIPMENT", col: C.ink, y: 392, from: 1, t0: 0.07 },
    { txt: "TO SEND?", col: C.ink, y: 579, from: -1, t0: 0.15 },
  ];
  return (
    <>
      {/* crowd copies (behind) */}
      {CROWD.map((c, i) => {
        const p = spr(t, c.t, { freq: 2.6, damp: 0.62 });
        if (p <= 0) return null;
        const pos = pull(c.x, c.y);
        return (
          <div
            key={`c${i}`}
            style={{
              position: "absolute",
              left: pos.x - c.w / 2,
              top: pos.y - c.h / 2,
              scale: `${(p * 0.8 * (1 - comp * 0.7)).toFixed(3)}`,
              rotate: `${c.r + (1 - p) * 40}deg`,
              opacity: 0.85,
              filter: "blur(1.5px)",
            }}
          >
            <Panel kind={c.kind} w={c.w} h={c.h} />
          </div>
        );
      })}
      {/* main booking layers unfolding from the parcel */}
      {PANELS.map((pn, i) => {
        const p = spr(t, pn.t, { freq: 1.9, damp: 0.66 });
        if (p <= 0) return null;
        const jitter = t > S1.mood ? Math.sin(t * 40 + i) * 2 * Math.exp(-(t - S1.mood) * 6) : 0;
        const x = lerp(ORIGIN.x, pn.x, p);
        const y = lerp(ORIGIN.y, pn.y, p);
        const pos = pull(x, y);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x - pn.w / 2,
              top: pos.y - pn.h / 2,
              transform: `perspective(1400px) rotateX(${((1 - p) * 82).toFixed(2)}deg) rotateZ(${(pn.r * p + jitter).toFixed(2)}deg) scale(${(
                (0.12 + 0.88 * p) *
                (1 - comp * 0.45)
              ).toFixed(3)})`,
              transformOrigin: "50% 100%",
            }}
          >
            <Panel kind={pn.kind} w={pn.w} h={pn.h} />
          </div>
        );
      })}
      {/* headline */}
      {lines.map((l, i) => {
        const pin = k(t, [l.t0, l.t0 + 0.26], [0, 1], E.out);
        const pout = k(t, [2.05 + i * 0.05, 2.4 + i * 0.05], [0, 1], E.in);
        if (pout >= 1) return null;
        const x = (1 - pin) * 1300 * l.from + pout * -1300 * l.from;
        const v = (k(t + 1 / 30, [l.t0, l.t0 + 0.26], [0, 1], E.out) - pin) * 1300 * l.from + (k(t + 1 / 30, [2.05 + i * 0.05, 2.4 + i * 0.05], [0, 1], E.in) - pout) * -1300 * l.from;
        return (
          <div key={l.txt} style={{ position: "absolute", left: 0, width: 1080, top: l.y, display: "flex", justifyContent: "center", translate: `${x.toFixed(1)}px 0` }}>
            <Ghost vx={v * 1.6}>
              <div style={{ ...display(206, { wdth: 70 }), color: l.col }}>{l.txt}</div>
            </Ghost>
          </div>
        );
      })}
      {/* stamps */}
      {[
        { txt: "ANOTHER LOGIN?", t0: S1.login, x: 540, y: 760, r: -6, bg: C.ink, fg: C.yellow, mode: "wipe" },
        { txt: "ANOTHER FORM?", t0: S1.form, x: 560, y: 1090, r: 5, bg: C.red, fg: C.white, mode: "drop" },
      ].map((s, i) => {
        const p = s.mode === "wipe" ? k(t, [s.t0, s.t0 + 0.22], [0, 1], E.out) : spr(t, s.t0, { freq: 3, damp: 0.5 });
        if (p <= 0) return null;
        const dim = t > S1.mood ? 0.25 : 1;
        const pos = pull(s.x, s.y);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              translate: "-50% -50%",
              rotate: `${s.r}deg`,
              scale: s.mode === "drop" ? `${(lerp(1.7, 1, p) * (1 - comp * 0.8)).toFixed(3)}` : `${(1 - comp * 0.8).toFixed(3)}`,
              opacity: (s.mode === "drop" ? clamp01(p * 3) : 1) * (dim === 1 ? 1 : lerp(1, dim, p01(t, S1.mood, S1.mood + 0.15))),
              clipPath: s.mode === "wipe" ? `inset(-10% ${(100 - p * 100).toFixed(1)}% -10% -2%)` : undefined,
            }}
          >
            <div style={{ ...display(104, { wdth: 74 }), color: s.fg, background: s.bg, padding: "18px 30px 10px", boxShadow: "0 18px 30px rgba(80,40,0,0.3)" }}>{s.txt}</div>
          </div>
        );
      })}
    </>
  );
};

/** The flat yellow back of the folding half (seen after it passes 90°). */
const FoldBack: React.FC<{ ang: number }> = ({ ang }) => (
  <div
    style={{
      position: "absolute",
      left: -40,
      width: 1160,
      top: CREASE_Y,
      height: 1920 - CREASE_Y,
      transformOrigin: "50% 0%",
      transform: `perspective(2200px) rotateX(${ang.toFixed(2)}deg)`,
      background: C.yellow,
      boxShadow: ang > 2 ? `0 ${(-ang * 0.6).toFixed(0)}px 60px rgba(120,70,0,${(0.3 * (ang / 90)).toFixed(2)})` : undefined,
    }}
  >
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(150,95,0,0.35), rgba(150,95,0,0))", opacity: ang / 90 }} />
  </div>
);

export const S01PainPoint: React.FC<{ t: number }> = ({ t }) => {
  const sh = shake(t);
  // seam + split
  const seamIn = k(t, [0, 0.1], [0, 1], E.out);
  const seamGone = k(t, [1.6, 2.1], [0, 1], E.in);
  const split = t < 0.6 ? 34 * Math.exp(-t * 9) * Math.min(1, t * 30) : 0;
  // fold: upper half rotates down about the crease (0 → 180°)
  const fold = k(t, [S1.fold, S1.fold + 0.62], [0, 180], E.inOut);
  const ribbonP = k(t, [S1.ribbon, S1.ribbon + 0.75], [0, 1], E.inOut);
  const tan = Math.tan((SEAM.ang * Math.PI) / 180);
  const seamAt = (x: number) => SEAM.y + (x - 540) * tan;
  const clipTop = `polygon(0 0, 1080px 0, 1080px ${seamAt(1080)}px, 0 ${seamAt(0)}px)`;
  const clipBot = `polygon(0 ${seamAt(0)}px, 1080px ${seamAt(1080)}px, 1080px 1920px, 0 1920px)`;
  const moodP = spr(t, S1.mood, { freq: 3.2, damp: 0.55 });
  const moodOut = k(t, [S1.compress, S1.fold], [0, 1], E.in);
  const parcelP = spr(t, S1.parcel, { freq: 1.5, damp: 0.62 });
  const ph = hFor("dhl_box-closed-label-left", S1_PARCEL.w);

  const contentLayer = (clip: string | undefined, dy: number) => (
    <div style={{ position: "absolute", inset: 0, clipPath: clip, translate: `0 ${dy}px` }}>
      <Content t={t} />
      {/* wash: pushes the clutter back when the big line lands */}
      <div style={{ position: "absolute", inset: 0, background: C.yellow, opacity: 0.62 * p01(t, S1.mood, S1.mood + 0.2) * (1 - p01(t, S1.compress, S1.fold)) }} />
      {/* NOT IN THE MOOD? */}
      {moodP > 0 && moodOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 1080,
            top: 560,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            scale: `${(lerp(1.45, 1, moodP) * (1 - moodOut * 0.8)).toFixed(3)}`,
            opacity: clamp01(moodP * 4) * (1 - moodOut),
            transformOrigin: `540px ${CREASE_Y - 560}px`,
          }}
        >
          <div style={{ ...display(214, { wdth: 70 }), color: C.ink, textShadow: "0 10px 0 rgba(255,204,0,1), 0 -6px 0 rgba(255,204,0,1)" }}>NOT IN</div>
          <div style={{ ...display(214, { wdth: 70 }), color: C.red, marginTop: -8, textShadow: "0 10px 0 rgba(255,204,0,1)" }}>THE MOOD?</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, translate: `${sh.x.toFixed(1)}px ${sh.y.toFixed(1)}px` }}>
      {/* yellow wash that pushes the clutter back when the big line lands */}
      {fold < 90 ? (
        <>
          {/* upper half: folds down about the crease */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `540px ${CREASE_Y}px`,
              transform: `perspective(2200px) rotateX(${(-fold).toFixed(2)}deg)`,
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: CREASE_Y, background: fold > 0.5 ? C.yellow : undefined }} />
            {contentLayer(`polygon(0 0, 1080px 0, 1080px ${CREASE_Y}px, 0 ${CREASE_Y}px)`, 0)}
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: CREASE_Y, background: "linear-gradient(0deg, rgba(150,95,0,0.45), rgba(150,95,0,0.05))", opacity: fold / 90 }} />
          </div>
          <div style={{ position: "absolute", inset: 0 }}>{contentLayer(`polygon(0 ${CREASE_Y}px, 1080px ${CREASE_Y}px, 1080px 1920px, 0 1920px)`, 0)}</div>
        </>
      ) : (
        <>
          {fold < 179.5 ? <div style={{ position: "absolute", inset: 0 }}>{contentLayer(`polygon(0 ${CREASE_Y}px, 1080px ${CREASE_Y}px, 1080px 1920px, 0 1920px)`, 0)}</div> : null}
          {fold < 179.5 ? <FoldBack ang={180 - fold} /> : null}
        </>
      )}
      {/* split seam: during the first beat the halves jolt apart (rendered over the content as two offset copies) */}
      {t < 0.6 && split > 0.5 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: C.yellow, clipPath: clipTop, translate: `-${split}px -${split}px` }}>{contentLayer(undefined, 0)}</div>
          <div style={{ position: "absolute", inset: 0, background: C.yellow, clipPath: clipBot, translate: `${split}px ${split}px` }}>{contentLayer(undefined, 0)}</div>
        </>
      ) : null}
      {seamGone < 1 ? (
        <div
          style={{
            position: "absolute",
            left: -200,
            width: 1480,
            top: SEAM.y - 7,
            height: lerp(14, 3, k(t, [0.1, 0.5], [0, 1])),
            background: C.red,
            rotate: `${SEAM.ang}deg`,
            scale: `${seamIn} 1`,
            transformOrigin: "0% 50%",
            opacity: 1 - seamGone,
          }}
        />
      ) : null}
      {/* parcel: crashes in, stays as the hero into scene 02 */}
      {parcelP > 0 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: S1_PARCEL.x - S1_PARCEL.w * 0.42,
              width: S1_PARCEL.w * 0.84,
              top: S1_PARCEL.y + ph / 2 - 36,
              height: 70,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(120,70,0,0.42), rgba(120,70,0,0))",
              opacity: clamp01(parcelP),
            }}
          />
          <Asset
            name="dhl_box-closed-label-left"
            x={lerp(1350, S1_PARCEL.x, parcelP)}
            y={lerp(2050, S1_PARCEL.y, parcelP)}
            w={S1_PARCEL.w}
            rotate={lerp(32, 0, parcelP)}
            shadow
          />
        </>
      ) : null}
      {/* the ribbon draws the crease the composition folds on */}
      <LivingRibbon
        id="s1rb"
        pts={CREASE_PTS}
        width={kk(t, [S1.ribbon, S1.ribbon + 0.5, 9.6], [60, 120, 110])}
        from={0}
        to={ribbonP}
        twist={(s) => s1Twist(s, t)}
      />
    </div>
  );
};
