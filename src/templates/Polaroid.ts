import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "./type";

/**
 * 复古拍立得 - 相纸留白与复古手写感
 */
export class Polaroid implements Template {
    name: string = 'polaroid';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 60;
        const marginX = 50, marginY = 60;
        const bottomBlankHeight = 450;
        const photoHeight = height - (marginY * 2) - bottomBlankHeight;

        return {
            x: marginX + padding,
            y: marginY + photoHeight + 40,
            width: width - (marginX * 2) - (padding * 2),
            height: bottomBlankHeight - 40 - (config.hasSignature ? 80 : 40)
        };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        ctx.save();
        // 只有在非渐变模式下才填充底色，渐变色由渲染器预先绘制
        if (config.bgMode !== 'gradient') {
            ctx.fillStyle = config.bgColor || '#D6D6D6';
            ctx.fillRect(0, 0, width, height);
        }

        // 绘制缓存的复古噪点纹理
        const noise = TEMPLATE_UTIL.getNoiseTexture(width, height);
        ctx.drawImage(noise, 0, 0);
        ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const marginX = 50, marginY = 60;
        const paperWidth = PREVIEW_WIDTH - (marginX * 2);
        const paperHeight = PREVIEW_HEIGHT - (marginY * 2);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 30; ctx.shadowOffsetY = 15;
        CANVAS_UTIL.drawRoundedRect(ctx, marginX, marginY, paperWidth, paperHeight, 4, '#FAFAFA');
        ctx.shadowColor = 'transparent';

        const photoMargin = 30;
        const photoWidth = paperWidth - (photoMargin * 2);
        const photoHeight = paperHeight - 450;

        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(marginX + photoMargin, marginY + photoMargin, photoWidth, photoHeight);

        const grad = ctx.createLinearGradient(marginX + photoMargin, marginY + photoMargin, marginX + photoMargin + photoWidth, marginY + photoMargin + photoHeight);
        grad.addColorStop(0, 'rgba(255,255,255,0.1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(marginX + photoMargin, marginY + photoMargin, photoWidth, photoHeight);
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        // 胶带
        ctx.save();
        ctx.translate(width / 2, 45); ctx.rotate(-0.05);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
        ctx.fillRect(-80, -20, 160, 40);
        ctx.restore();

        // 页码：放在右下角留白处
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            x: width - 75, y: height - 85, color: 'rgba(0,0,0,0.3)', font: 'italic 14px serif', padZero: true
        });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#D9534F';
        const textColor = config.textColor || '#2B2B2B';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.headingLevel) return { textColor: accentColor };
        if (segment.isHighlight) return { textColor: textColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.2) };
        return { textColor };
    }
}
