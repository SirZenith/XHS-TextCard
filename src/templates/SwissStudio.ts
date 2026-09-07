import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../utils/constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types/types";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

/**
 * 苏黎世工作室 - 瑞士网格秩序
 */
export class SwissStudio implements Template {
    name: string = 'swiss-studio';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 35;
        const bottomOffset = config.hasSignature ? Math.max(padding, 60) : padding;
        return { x: padding, y: padding, width: width - (padding * 2), height: height - padding - bottomOffset };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        ctx.save(); ctx.fillStyle = config.accentColor || '#FF4500'; ctx.fillRect(0, 0, 6, height); ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.03)'; ctx.lineWidth = 0.5;
        for (let x = 0; x < PREVIEW_WIDTH; x += 40) {
            if (x < 10) continue;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, PREVIEW_HEIGHT); ctx.stroke();
        }
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const accentColor = config.accentColor || '#FF4500', decorativeColor = '#1A1A1A';
        const isBottomCenter = config.hasSocialIcons && config.selectedSocialIcons && config.selectedSocialIcons.length > 0 && config.socialIconPosition === 'bottom-center' && index === 0;

        ctx.save();
        ctx.fillStyle = decorativeColor; ctx.font = '700 10px Helvetica'; ctx.textAlign = 'right';
        ctx.fillText('REF. CH-8004', width - 25, 25);

        // 如果底部居中有社交图标，则隐藏这个装饰框，防止重叠
        if (!isBottomCenter) {
            ctx.beginPath(); ctx.rect(width - 40, height - 40, 15, 15); ctx.strokeStyle = accentColor; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();

        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            color: '#1A1A1A', font: '700 10px Helvetica', padZero: true, textAlign: 'left', x: 25, y: height - 25
        });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#FF4500', textColor = config.textColor || '#1A1A1A';
        if (segment.headingLevel || segment.fontWeight === '700' || segment.fontWeight === '800') return { textColor: accentColor };
        if (segment.isHighlight) return { highlightColor: accentColor, textColor: '#FFFFFF' };
        return { textColor };
    }
}
