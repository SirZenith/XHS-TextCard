import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../utils/constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

/**
 * 暗夜深思 - 赛博朋克氛围
 */
export class DeepNight implements Template {
    name: string = 'deep-night';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const cardX = 20, cardY = 30, cardBottomMargin = config.hasSignature ? 60 : 35;
        const padding = Number(config.textPadding) || 35;
        return { x: cardX + padding, y: cardY + padding, width: width - 40 - (padding * 2), height: height - cardY - cardBottomMargin - (padding * 2) };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        const accentColor = config.accentColor || '#00F5FF';
        ctx.save();
        if (config.bgMode !== 'gradient' && (config.bgColor === '#0D0D0D' || config.bgColor === '#000000')) {
            const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
            grad.addColorStop(0, '#1a1a1a'); grad.addColorStop(1, '#050505');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
        }
        const lineGrad = ctx.createLinearGradient(0, 0, 0, height);
        lineGrad.addColorStop(0, 'transparent'); lineGrad.addColorStop(0.2, accentColor);
        lineGrad.addColorStop(0.8, accentColor); lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad; ctx.globalAlpha = 0.3; ctx.fillRect(0, 0, 3, height);
        ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const cardX = 20, cardY = 30, cardBottomMargin = config.hasSignature ? 60 : 35;
        const cardW = PREVIEW_WIDTH - 40, cardH = PREVIEW_HEIGHT - cardY - cardBottomMargin;
        ctx.save();
        CANVAS_UTIL.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16, 'rgba(255,255,255,0.02)', true, 'rgba(255,255,255,0.05)');
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        ctx.save(); ctx.fillStyle = 'rgba(229, 229, 229, 0.3)'; ctx.font = '800 10px Inter, sans-serif';
        ctx.textAlign = 'right'; ctx.fillText('// THOUGHT MODE ON', width - 25, 25);
        ctx.strokeStyle = 'rgba(229, 229, 229, 0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(25, height - 60); ctx.lineTo(width - 25, height - 60); ctx.stroke();
        ctx.restore();
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, { color: 'rgba(255, 255, 255, 0.3)', textAlign: 'left', x: 25, y: 25 });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#00F5FF', textColor = config.textColor || '#E5E5E5';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.isCode || segment.headingLevel) {
            return {
                textColor: accentColor,
                highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.1),
                codeBgColor: CANVAS_UTIL.hexToRgba(accentColor, 0.15)
            };
        }
        return { textColor };
    }
}
