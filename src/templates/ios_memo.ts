import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../utils/constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

/**
 * iOS 备忘录 - 模拟 iOS 备忘录拟物界面
 */
export class IosMemo implements Template {
    name: string = 'ios-memo';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const paperX = 15, paperY = 55, paperW = width - 30, paperH = height - 110;
        const internalPadding = Math.max(10, Number(config.textPadding) || 20);
        return { x: paperX + internalPadding, y: paperY + internalPadding, width: paperW - (internalPadding * 2), height: paperH - (internalPadding * 2) };
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const paperX = 15, paperY = 55, paperW = PREVIEW_WIDTH - 30, paperH = PREVIEW_HEIGHT - 110;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.05)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5;
        CANVAS_UTIL.drawRoundedRect(ctx, paperX, paperY, paperW, paperH, 12, '#ffffff');
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#F2F2F7'; ctx.lineWidth = 1;
        const lineSpacing = (Number(config.fontSize) || 18) * (Number(config.lineHeight) || 1.6);
        for (let y = rect.y + lineSpacing; y < rect.y + rect.height; y += lineSpacing) {
            if (y > paperY + paperH) break;
            ctx.beginPath(); ctx.moveTo(paperX, y); ctx.lineTo(paperX + paperW, y); ctx.stroke();
        }
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const iosOrange = '#FF9500';
        ctx.save();
        ctx.fillStyle = iosOrange; ctx.font = '500 17px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('完成', width - 25, 35); ctx.textAlign = 'left';
        ctx.beginPath(); ctx.strokeStyle = iosOrange; ctx.lineWidth = 2.5; ctx.moveTo(25, 33); ctx.lineTo(18, 26); ctx.lineTo(25, 19); ctx.stroke();
        ctx.fillText('备忘录', 32, 35);
        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        ctx.fillStyle = '#8E8E93'; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(dateStr, width / 2, 35);
        ctx.restore();

        // 如果社交图标底部居中，页码稍微右移避开
        const isBottomCenter = config.hasSocialIcons && config.selectedSocialIcons && config.selectedSocialIcons.length > 0 && config.socialIconPosition === 'bottom-center' && index === 0;
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            x: width - 25,
            y: isBottomCenter ? height - 15 : height - 25
        });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#FF9500', textColor = config.textColor || '#1C1C1E';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.15) };
        }
        return { textColor };
    }
}
