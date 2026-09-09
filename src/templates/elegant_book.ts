import type { ContentBox, TemplateConfig, TextSegment } from "../types/types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import { TEMPLATE_UTIL } from "../utils/template_utils";
import type { Template, TextStyle } from "../types/template";

/**
 * 书籍内页 - 模拟真实的单页书籍装帧感
 * 设计要点：左侧装订阴影（Gutter），单侧受光，极简边角排版
 */
export class ElegantBook implements Template {
    name: string = 'elegant-book';

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 55;
        const topMargin = 130;
        const bottomMargin = config.hasSignature ? 110 : 90;
        // 增加左侧边距以避开装订阴影区
        return { x: padding + 10, y: topMargin, width: width - (padding * 2) - 10, height: height - topMargin - bottomMargin };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        ctx.save();

        // 1. 基础纸张色 - 严格水平单侧受光模拟
        const baseGrad = ctx.createLinearGradient(width, 0, 0, 0);
        const bgColor = config.bgColor || '#FDFBF7';
        baseGrad.addColorStop(0, bgColor); // 右侧最亮（原始纸张色）
        baseGrad.addColorStop(1, CANVAS_UTIL.hexToRgba(bgColor, 0.96)); // 左侧微暗
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. 绘制离屏缓存的高级纸张纹理
        const texture = TEMPLATE_UTIL.getPaperTexture(width, height);
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(texture, 0, 0);

        // 3. 【美学重构】极致单侧装订阴影 (Left Gutter Only)
        ctx.globalCompositeOperation = 'source-over';
        const gutterGrad = ctx.createLinearGradient(0, 0, width * 0.12, 0);
        gutterGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
        gutterGrad.addColorStop(0.3, 'rgba(0,0,0,0.06)');
        gutterGrad.addColorStop(0.7, 'rgba(0,0,0,0.01)');
        gutterGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gutterGrad;
        ctx.fillRect(0, 0, width * 0.12, height);

        // 4. 纸张右边缘的高光切面 (Edge Highlight)
        const edgeReflect = ctx.createLinearGradient(width - 3, 0, width, 0);
        edgeReflect.addColorStop(0, 'rgba(255,255,255,0)');
        edgeReflect.addColorStop(1, 'rgba(255,255,255,0.4)');
        ctx.fillStyle = edgeReflect;
        ctx.fillRect(width - 3, 0, 3, height);

        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const padding = Number(config.textPadding) || 55;
        ctx.save();

        // 使用固定的古典墨色
        const fixedMutedInk = 'rgba(93, 64, 55, 0.4)';
        const fixedLineColor = 'rgba(93, 64, 55, 0.12)';

        // 顶部装饰
        ctx.strokeStyle = fixedLineColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(padding + 10, 80);
        ctx.lineTo(width - padding, 80);
        ctx.stroke();

        ctx.fillStyle = fixedMutedInk;
        ctx.font = 'italic 500 11px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('C L A S S I C   L I T E R A T U R E', width / 2 + 5, 65);

        ctx.fillStyle = '#5D4037';
        ctx.font = '16px serif';
        ctx.fillText('§', padding + 10, 68);

        // 页码：使用统一的物理边角定位
        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            color: fixedMutedInk,
            font: '500 12px "Noto Serif SC", serif',
            prefix: 'P. ',
            padZero: true
        });
        ctx.restore();
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#8C3A3A';
        const textColor = config.textColor || '#2B2B2B';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.headingLevel) return { textColor: accentColor };
        if (segment.isHighlight) return { textColor: accentColor, highlightColor: CANVAS_UTIL.hexToRgba(accentColor, 0.1) };
        return { textColor };
    }
}
