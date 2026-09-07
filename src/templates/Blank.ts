import type { TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas-utils";
import { TEMPLATE_UTIL } from "../utils/template-utils";
import type { Template, TextStyle } from "./type";

/**
 * 空白模板 - 极致简约
 */
export class Blank implements Template {
    name: string = 'blank';

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig): void {
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config);
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#1A1A1A';
        const textColor = config.textColor || '#1A1A1A';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.2) };
        }
        return { textColor };
    }
}
