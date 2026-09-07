import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "./type";

/**
 * 弥散极光 - 柔和渐变光影
 */
export class AuraGradient implements Template {
    name: string = 'aura-gradient';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const cardX = 25, cardY = 30, cardBottomMargin = config.hasSignature ? 60 : 35;
        const padding = Number(config.textPadding) || 35;
        return { x: cardX + padding, y: cardY + padding, width: width - 50 - (padding * 2), height: height - cardY - cardBottomMargin - (padding * 2) };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.save();
        const auras = [
            { x: 0, y: 0, r: 1, c1: 'rgba(255, 195, 160, 0.3)', c2: 'rgba(255, 195, 160, 0)' },
            { x: 1, y: 0.2, r: 0.8, c1: 'rgba(255, 175, 189, 0.25)', c2: 'rgba(255, 175, 189, 0)' },
            { x: 0.5, y: 1, r: 1.2, c1: 'rgba(33, 147, 176, 0.15)', c2: 'rgba(33, 147, 176, 0)' }
        ];
        auras.forEach(aura => {
            const grad = ctx.createRadialGradient(width * aura.x, height * aura.y, 0, width * aura.x, height * aura.y, width * aura.r);
            grad.addColorStop(0, aura.c1); grad.addColorStop(1, aura.c2);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
        });

        // 绘制缓存的噪点纹理
        const noise = TEMPLATE_UTIL.getNoiseTexture(width, height);
        ctx.drawImage(noise, 0, 0);
        ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const cardX = 25, cardY = 30, cardBottomMargin = config.hasSignature ? 60 : 35;
        const cardW = PREVIEW_WIDTH - 50, cardH = PREVIEW_HEIGHT - cardY - cardBottomMargin;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.03)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
        CANVAS_UTIL.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28, 'rgba(255, 255, 255, 0.5)', true, 'rgba(255, 255, 255, 0.4)');
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1.5;
        CANVAS_UTIL.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28, null, true);
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config);
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#2D3436', textColor = config.textColor || '#2D3436';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.2) };
        return { textColor };
    }
}
