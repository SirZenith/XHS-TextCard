import type { GetHeaderContext, LayoutBlock, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

export class Luli implements Template {
    name: string = 'luli';

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig): void {
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config);
    }

    public getHeaderBlock(config: TemplateConfig, context: GetHeaderContext): LayoutBlock[] {
        const charCnt = context.text.length;
        const readingSpeed = 400;
        const eta = Math.floor(charCnt / readingSpeed * 10) / 10;

        const base = Number(config.fontSize) || 17;
        const fontSize = base * 0.78;
        const lineHeight = fontSize * (Number(config.lineHeight) || 1.7);
        const marginBottom = fontSize * 0.8;

        return [
            { type: 'space', height: Math.round(context.contentBox.height * 0.1) },
            {
                type: 'paragraph',
                align: 'right',
                lines: [[{ text: `全文 ${charCnt} 字 | 估计阅读时间：${eta} 分钟`, fontSize, isHeader: true }]],
                height: lineHeight + marginBottom,
                marginTop: 0,
                marginBottom
            }
        ];
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#1A1A1A';
        const textColor = config.textColor || '#1A1A1A';
        if (segment.isHeader) {
            return { textColor: CANVAS_UTIL.hexToRgba(textColor, 0.45) };
        }
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.2) };
        }
        return { textColor };
    }
}
