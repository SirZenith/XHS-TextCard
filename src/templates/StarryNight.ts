import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { TEMPLATE_UTIL } from "../utils/template-utils";
import type { Template, TextStyle } from "./type";

/**
 * 星光质感 - 暗黑背景 + 星光粒子效果
 */
export class StarryNight implements Template {
    name: string = 'starry-night';

    private _starCache: HTMLCanvasElement | null = null;

    private getStars(width: number, height: number): HTMLCanvasElement {
        if (this._starCache) return this._starCache;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // 绘制星星
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.8 + 0.2;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();

            // 某些星星有光晕
            if (Math.random() > 0.7) {
                const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
                glow.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
            }
        }

        this._starCache = canvas;
        return canvas;
    }

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 45;
        const topMargin = 110, bottomMargin = config.hasSignature ? 80 : 60;
        return { x: padding, y: topMargin, width: width - (padding * 2), height: height - topMargin - bottomMargin };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        const accentColor = config.accentColor || '#fbbf24';
        ctx.save();

        // 深邃夜空渐变
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0c1445');
        bgGrad.addColorStop(0.5, '#1a1a3e');
        bgGrad.addColorStop(1, '#0f0f2d');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 绘制星星 - 使用模板内部方法
        const stars = this.getStars(width, height);
        ctx.drawImage(stars, 0, 0);

        // 月亮光晕
        const moonGrad = ctx.createRadialGradient(width - 150, 100, 0, width - 150, 100, 200);
        moonGrad.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
        moonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const accentColor = config.accentColor || '#fbbf24';
        ctx.save();

        // 顶部装饰线
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(45, 85);
        ctx.lineTo(width - 45, 85);
        ctx.stroke();

        // 星星图标
        ctx.globalAlpha = 1;
        ctx.fillStyle = accentColor;
        ctx.font = '600 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('✦ STARRY NIGHT', 45, 70);

        ctx.restore();

        TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config, {
            color: 'rgba(251, 191, 36, 0.6)',
            font: '600 11px sans-serif'
        });
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#fbbf24';
        const textColor = config.textColor || '#e2e8f0';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.isHighlight || segment.headingLevel) {
            return {
                textColor: accentColor,
                highlightColor: 'rgba(251, 191, 36, 0.2)'
            };
        }
        return { textColor };
    }
}
