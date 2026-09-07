import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../constants";
import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "./type";

/**
 * 大厂文档 - 专业权威呈现
 */
export class ProDoc implements Template {
    name: string = 'pro-doc';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const winX = 15, winW = width - 30, winY = 40;
        const winBottomMargin = config.hasSignature ? 60 : 35;
        const winH = height - winY - winBottomMargin;
        const headerHeight = 30, gapBelowHeader = 20;
        const padding = Number(config.textPadding) || 35;
        return { x: winX + padding, y: winY + headerHeight + gapBelowHeader + (padding / 2), width: winW - (padding * 2), height: (winH - headerHeight - gapBelowHeader) - padding };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.save(); ctx.strokeStyle = 'rgba(0,102,255,0.02)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < width; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
        for (let j = 0; j < height; j += 20) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke(); }
        ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        const winX = 15, winW = PREVIEW_WIDTH - 30, winY = 40;
        const winBottomMargin = config.hasSignature ? 60 : 35;
        const winH = PREVIEW_HEIGHT - winY - winBottomMargin;
        const headerHeight = 30, textColor = config.textColor || '#111827';
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
        CANVAS_UTIL.drawRoundedRect(ctx, winX, winY, winW, winH, 12, '#ffffff', true, 'rgba(0,0,0,0.05)');
        ctx.restore();
        ctx.save();
        CANVAS_UTIL.drawRoundedRect(ctx, winX, winY, winW, headerHeight, { tl: 12, tr: 12, bl: 0, br: 0 }, CANVAS_UTIL.hexToRgba(textColor, 0.05));
        const btnY = winY + headerHeight / 2;
        ctx.fillStyle = '#FF5F56'; ctx.beginPath(); ctx.arc(winX + 20, btnY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFBD2E'; ctx.beginPath(); ctx.arc(winX + 38, btnY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#27C93F'; ctx.beginPath(); ctx.arc(winX + 56, btnY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = CANVAS_UTIL.hexToRgba(textColor, 0.4); ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DOCUMENT VIEWER', winX + winW / 2, btnY + 4);
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        ctx.save(); ctx.fillStyle = '#6B7280'; ctx.font = '700 9px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('CONFIDENTIAL / INTERNAL USE ONLY', width - 25, 25);
        ctx.restore();
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config);
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#0066FF', textColor = config.textColor || '#111827';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.08) };
        return { textColor };
    }
}
