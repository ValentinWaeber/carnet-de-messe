import type { Block } from "./document";

/** Original local vector ornaments; no external images or fonts are requested. */
export function ornamentSvg(kind: Block["ornament"], color: string): string {
  const leaf = `<path d="M50 82 Q43 53 52 19" fill="none"/><path d="M49 68 Q23 65 28 46 Q48 45 49 68Z"/><path d="M49 57 Q73 53 71 35 Q51 35 49 57Z"/><path d="M49 44 Q31 39 35 25 Q51 27 49 44Z"/><path d="M51 31 Q65 25 61 13 Q51 17 51 31Z"/>`;
  let shape: string;
  switch (kind) {
    case "wreath": {
      const half = `<path d="M48 90C15 79 10 49 32 18" fill="none"/><ellipse cx="26" cy="74" rx="9" ry="3" transform="rotate(43 26 74)"/><ellipse cx="20" cy="59" rx="9" ry="3" transform="rotate(66 20 59)"/><ellipse cx="20" cy="43" rx="8" ry="3" transform="rotate(87 20 43)"/><ellipse cx="25" cy="28" rx="8" ry="3" transform="rotate(112 25 28)"/><ellipse cx="38" cy="82" rx="8" ry="3" transform="rotate(-13 38 82)"/><ellipse cx="32" cy="66" rx="8" ry="3" transform="rotate(-39 32 66)"/><ellipse cx="29" cy="49" rx="8" ry="3" transform="rotate(-65 29 49)"/><ellipse cx="32" cy="33" rx="7" ry="3" transform="rotate(-80 32 33)"/>`;
      shape = `${half}<g transform="translate(100 0) scale(-1 1)">${half}</g>`;
      break;
    }
    case "flower":
      shape = `<g fill-opacity=".2"><ellipse cx="50" cy="35" rx="10" ry="19"/><ellipse cx="50" cy="35" rx="10" ry="19" transform="rotate(72 50 50)"/><ellipse cx="50" cy="35" rx="10" ry="19" transform="rotate(144 50 50)"/><ellipse cx="50" cy="35" rx="10" ry="19" transform="rotate(216 50 50)"/><ellipse cx="50" cy="35" rx="10" ry="19" transform="rotate(288 50 50)"/></g><circle cx="50" cy="50" r="6"/><path d="M50 70V96M50 85Q23 69 30 65Q48 67 50 85" fill="none"/>`;
      break;
    case "cross":
      shape = `<path d="M50 23V78M32 41H68" fill="none" stroke-width="1.4"/>`;
      break;
    case "frame":
      shape = `<rect x="5" y="5" width="90" height="90" fill="none"/><rect x="9" y="9" width="82" height="82" fill="none" stroke-width=".25"/><path d="M3 3L13 13M97 3L87 13M3 97L13 87M97 97L87 87" fill="none"/>`;
      break;
    case "arch":
      shape = `<path d="M15 98V42a35 35 0 0 1 70 0v56" fill="none" stroke-width=".7"/><path d="M20 98V43a30 30 0 0 1 60 0v55" fill="none" stroke-width=".25"/>`;
      break;
    case "circle":
      shape = `<circle cx="50" cy="50" r="40" fill="none" stroke-width=".4"/><circle cx="50" cy="50" r="35" fill="none" stroke-width=".2"/>`;
      break;
    case "wash":
      shape = `<path d="M8 37Q14 7 42 14T89 28Q99 51 83 73T40 88Q1 85 8 37Z" stroke="none" opacity=".14"/><path d="M16 27Q41 4 72 21T90 65Q69 98 32 77T16 27Z" stroke="none" opacity=".12"/>`;
      break;
    case "sprig":
      shape = `<g transform="rotate(30 50 50)">${leaf}</g><path d="M20 83Q55 82 76 58" fill="none"/><circle cx="68" cy="67" r="2"/><circle cx="76" cy="59" r="2"/>`;
      break;
    case "diamond":
      shape = `<path d="M50 7L92 50L50 93L8 50Z" fill="none" stroke-width=".5"/><path d="M50 13L86 50L50 87L14 50Z" fill="none" stroke-width=".2"/>`;
      break;
    default:
      shape = leaf;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ${kind === "frame" ? 'preserveAspectRatio="none"' : ""} width="100%" height="100%" fill="${color}" stroke="${color}" stroke-width=".7" aria-hidden="true">${shape}</svg>`;
}
