import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas-utils";
import { TEMPLATE_UTIL } from "../utils/template-utils";
import type { Template, TextStyle } from "./type";

/**
 * 效率笔记 (Notion风)
 */
export class NotionStyle implements Template {
    name: string = 'notion-style';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 40;
        const topMargin = 120, bottomMargin = config.hasSignature ? 80 : 50;
        return { x: padding, y: topMargin, width: width - (padding * 2), height: height - topMargin - bottomMargin };
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const padding = Number(config.textPadding) || 40;
        ctx.save();
        ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

        // 使用固定的 Notion 灰 (#9B9A97)，不受用户修改的正文颜色影响
        const fixedMutedColor = '#9B9A97';
        const fixedLineColor = 'rgba(55, 53, 47, 0.08)';

        ctx.fillStyle = '#37352F'; // 图标保持深灰
        ctx.fillText('📖', padding, 60);

        ctx.fillStyle = fixedMutedColor;
        ctx.fillText(' /  Workspace  /  Notes', padding + 25, 60);

        ctx.strokeStyle = fixedLineColor;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padding, 90); ctx.lineTo(width - padding, 90); ctx.stroke();
        ctx.restore();

        // 页码也使用固定颜色
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            color: 'rgba(155, 154, 151, 0.7)'
        });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#0F7B6C';
        const textColor = config.textColor || '#37352F';
        if (segment.isHighlight) return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.15) };
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.headingLevel) return { textColor: accentColor };
        return { textColor };
    }
}
