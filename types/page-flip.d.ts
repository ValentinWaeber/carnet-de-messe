/** Typed boundary for the public API of StPageFlip 2.0.7 (package ships without declarations). */
declare module "page-flip" {
  export interface FlipSettings {
    width: number;
    height: number;
    size: "fixed" | "stretch";
    showCover?: boolean;
    usePortrait?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    mobileScrollSupport?: boolean;
    showPageCorners?: boolean;
    useMouseEvents?: boolean;
    clickEventForward?: boolean;
    startPage?: number;
  }
  export class PageFlip {
    constructor(element: HTMLElement, settings: FlipSettings);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on(
      event: "flip",
      callback: (event: { data: number; object: PageFlip }) => void,
    ): void;
    flipPrev(): void;
    flipNext(): void;
    turnToPage(page: number): void;
    destroy(): void;
  }
}
