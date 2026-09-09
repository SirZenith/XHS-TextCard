import type { GetHeaderContext, LayoutBlock, LineArray, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

interface TextCustomArgs {
    isHeader: boolean;
}

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

        const lines: LineArray<TextCustomArgs> = [
            [
                { text: `全文 ${charCnt} 字 | 估计阅读时间：${eta} 分钟`, fontSize, templateArgs: { isHeader: true } }
            ]
        ]

        return [
            { type: 'space', height: Math.round(context.contentBox.height * 0.1) },
            {
                type: 'paragraph',
                align: 'right',
                lines: lines,
                height: lineHeight + marginBottom,
                marginTop: 0,
                marginBottom
            }
        ];
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#1A1A1A';
        const textColor = config.textColor || '#1A1A1A';

        const templateArgs = segment.templateArgs as TextCustomArgs | undefined;
        if (templateArgs?.isHeader) {
            return { textColor: CANVAS_UTIL.hexToRgba(textColor, 0.75) };
        }

        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.2) };
        }
        return { textColor };
    }
}
