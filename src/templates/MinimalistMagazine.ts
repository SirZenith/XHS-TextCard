import { PREVIEW_HEIGHT } from "../utils/constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

/**
 * 极简杂志 - 现代社论美学
 */
export class MinimalistMagazine implements Template {
    name: string = 'minimalist-magazine';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 45;
        const topMargin = 100, bottomMargin = config.hasSignature ? 80 : 60;
        return { x: padding, y: topMargin, width: width - (padding * 2), height: height - topMargin - bottomMargin };
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const textColor = config.textColor || '#1A1A1A';
        ctx.save();
        ctx.strokeStyle = CANVAS_UTIL.hexToRgba(textColor, 0.1);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rect.x, 85); ctx.lineTo(rect.x + rect.width, 85); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rect.x, PREVIEW_HEIGHT - 55); ctx.lineTo(rect.x + rect.width, PREVIEW_HEIGHT - 55); ctx.stroke();
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const decorativeColor = '#1A1A1A';
        ctx.save();
        ctx.fillStyle = decorativeColor; ctx.font = 'bold 12px serif';
        ctx.textAlign = 'left'; ctx.fillText('EDITORIAL', 45, 75);
        ctx.fillStyle = CANVAS_UTIL.hexToRgba(decorativeColor, 0.6); ctx.font = 'italic 10px serif';
        ctx.textAlign = 'right'; ctx.fillText('COLLECTION // VOL. 2026', width - 45, 75);
        ctx.restore();
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, { x: width - 45, y: height - 35 });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#1A1A1A';
        const textColor = config.textColor || '#1A1A1A';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.15) };
        }
        return { textColor };
    }
}
