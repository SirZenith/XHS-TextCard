import type { ContentBox, TemplateConfig, TextSegment } from "../types";
import { CANVAS_UTIL } from "../utils/canvas_utils";
import type { Template, TextStyle } from "./type";

/**
 * 电影胶片 - 致敬 Adele《Someone Like You》MV
 * 设计要点：黑白巴黎胶片质感、宽银幕信箱遮幅、35mm胶片颗粒、
 * 胶片齿孔装饰、电影片头式排版
 */
export class CinematicFilm implements Template {
    name: string = 'cinematic-film';

    private _filmGrainCache: HTMLCanvasElement | null = null;

    private _getFilmGrain(width: number, height: number): HTMLCanvasElement {
        if (this._filmGrainCache) return this._filmGrainCache;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const tCtx = canvas.getContext('2d')!;

        // 35mm 胶片颗粒 — 比普通噪点更粗、更有机
        for (let i = 0; i < 12000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.8 + 0.3;
            const brightness = Math.random();
            // 胶片颗粒有冷暖偏差
            if (brightness > 0.6) {
                tCtx.fillStyle = `rgba(255, 252, 245, ${Math.random() * 0.06})`;
            } else {
                tCtx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.08})`;
            }
            tCtx.fillRect(x, y, size, size);
        }

        // 模拟胶片上的微刮痕
        tCtx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        tCtx.lineWidth = 0.3;
        for (let i = 0; i < 8; i++) {
            const sx = Math.random() * width;
            tCtx.beginPath();
            tCtx.moveTo(sx, 0);
            tCtx.lineTo(sx + (Math.random() * 3 - 1.5), height);
            tCtx.stroke();
        }

        this._filmGrainCache = canvas;
        return canvas;
    }

    public getContentBox(config: TemplateConfig, width: number, height: number): ContentBox {
        const padding = Number(config.textPadding) || 50;
        // 信箱遮幅（letterbox）高度
        const letterboxH = Math.round(height * 0.065);
        const topMargin = letterboxH + 70;
        const bottomMargin = letterboxH + (config.hasSignature ? 80 : 50);
        return {
            x: padding,
            y: topMargin,
            width: width - (padding * 2),
            height: height - topMargin - bottomMargin
        };
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) {
        const bgColor = config.bgColor || '#1A1A18';
        const isGradientBg = config.bgMode === 'gradient' && typeof bgColor === 'string' && bgColor.includes('linear-gradient');
        const normalizedSolidBg = (typeof bgColor === 'string') ? bgColor.trim().toLowerCase() : '';
        const isDefaultSolid = !isGradientBg && (normalizedSolidBg === '' || normalizedSolidBg === '#1a1a18');
        ctx.save();

        // 1. 背景基底
        if (isDefaultSolid) {
            const baseGrad = ctx.createRadialGradient(
                width * 0.5, height * 0.45, 0,
                width * 0.5, height * 0.45, width * 0.9
            );
            baseGrad.addColorStop(0, '#252320');
            baseGrad.addColorStop(0.6, '#1A1A18');
            baseGrad.addColorStop(1, '#111110');
            ctx.fillStyle = baseGrad;
            ctx.fillRect(0, 0, width, height);
        } else if (!isGradientBg) {
            const solidBgColor = (typeof bgColor === 'string' && !bgColor.includes('linear-gradient')) ? bgColor : '#1A1A18';
            ctx.fillStyle = solidBgColor;
            ctx.fillRect(0, 0, width, height);
        }

        // 2. 电影叠层（默认纯色与渐变模式保留；自定义纯色不叠加渐变层）
        if (isDefaultSolid || isGradientBg) {
            // 暗角 (Vignette) — 电影镜头感的核心
            const vignetteGrad = ctx.createRadialGradient(
                width * 0.5, height * 0.5, width * 0.25,
                width * 0.5, height * 0.5, width * 0.85
            );
            vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vignetteGrad.addColorStop(0.7, 'rgba(0,0,0,0.15)');
            vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
            ctx.fillStyle = vignetteGrad;
            ctx.fillRect(0, 0, width, height);

            // 右上角微弱漏光 (Light Leak) — 胶片漏光的浪漫瑕疵
            const leakGrad = ctx.createRadialGradient(
                width * 0.85, height * 0.08, 0,
                width * 0.85, height * 0.08, width * 0.4
            );
            leakGrad.addColorStop(0, 'rgba(200, 184, 154, 0.06)');
            leakGrad.addColorStop(0.5, 'rgba(200, 184, 154, 0.02)');
            leakGrad.addColorStop(1, 'rgba(200, 184, 154, 0)');
            ctx.fillStyle = leakGrad;
            ctx.fillRect(0, 0, width, height);
        }

        // 4. 绘制 35mm 胶片颗粒纹理
        const grain = this._getFilmGrain(width, height);
        ctx.drawImage(grain, 0, 0);

        ctx.restore();
    }

    public drawTextAreaBackground(ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) {
        // 文字区域无卡片，仅绘制极淡的水平引导线增加排版感
        ctx.save();
        ctx.strokeStyle = 'rgba(200, 184, 154, 0.04)';
        ctx.lineWidth = 0.5;
        // 上边界线
        ctx.beginPath();
        ctx.moveTo(rect.x, rect.y);
        ctx.lineTo(rect.x + rect.width, rect.y);
        ctx.stroke();
        // 下边界线
        ctx.beginPath();
        ctx.moveTo(rect.x, rect.y + rect.height);
        ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
        ctx.stroke();
        ctx.restore();
    }

    public drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) {
        const accentColor = config.accentColor || '#C8B89A';
        const letterboxH = Math.round(height * 0.065);

        ctx.save();

        // ── 1. 宽银幕信箱遮幅 (Letterbox Bars) ──
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, letterboxH);
        ctx.fillRect(0, height - letterboxH, width, letterboxH);

        // 遮幅内侧添加极细的胶片边框线
        ctx.strokeStyle = 'rgba(200, 184, 154, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, letterboxH);
        ctx.lineTo(width, letterboxH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height - letterboxH);
        ctx.lineTo(width, height - letterboxH);
        ctx.stroke();

        // ── 2. 胶片齿孔 (Sprocket Holes) ──
        const sprocketW = 8;
        const sprocketH = Math.round(letterboxH * 0.45);
        const sprocketY_top = Math.round((letterboxH - sprocketH) / 2);
        const sprocketY_bottom = height - letterboxH + sprocketY_top;
        const sprocketSpacing = 32;
        const sprocketRadius = 2;

        ctx.fillStyle = 'rgba(200, 184, 154, 0.12)';
        for (let x = 20; x < width - 10; x += sprocketSpacing) {
            // 顶部齿孔
            CANVAS_UTIL.drawRoundedRect(ctx, x, sprocketY_top, sprocketW, sprocketH, sprocketRadius, 'rgba(200, 184, 154, 0.12)');
            // 底部齿孔
            CANVAS_UTIL.drawRoundedRect(ctx, x, sprocketY_bottom, sprocketW, sprocketH, sprocketRadius, 'rgba(200, 184, 154, 0.12)');
        }

        // ── 3. 胶片帧编号 (Frame Counter) ──
        ctx.font = '600 9px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(200, 184, 154, 0.35)';
        const frameNum = config.hasCover ? index : index + 1;
        ctx.fillText(`▶ ${String(frameNum).padStart(2, '0')}A`, 14, letterboxH - 6);

        // 胶片码 — 右上角
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(200, 184, 154, 0.25)';
        ctx.font = '500 8px "Courier New", monospace';
        ctx.fillText('KODAK  5222  DOUBLE-X', width - 14, letterboxH - 6);

        // ── 4. 顶部电影标题式装饰 ──
        const headerY = letterboxH + 40;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.5;
        ctx.font = 'italic 500 11px Georgia, "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('— A   C I N E M A T I C   N O T E —', width / 2, headerY);

        // 标题下方的细线
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(width * 0.2, headerY + 12);
        ctx.lineTo(width * 0.8, headerY + 12);
        ctx.stroke();

        ctx.globalAlpha = 1;

        // ── 5. 底部电影字幕式页码 ──
        if (config.showPageNumber) {
            const totalPage = config.hasCover ? totalCount - 1 : totalCount;
            if (totalPage > 0) {
                const pageNum = config.hasCover ? index : index + 1;
                ctx.fillStyle = 'rgba(200, 184, 154, 0.4)';
                ctx.font = '500 10px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `SCENE ${String(pageNum).padStart(2, '0')} / ${String(totalPage).padStart(2, '0')}`,
                    width / 2,
                    height - letterboxH + letterboxH * 0.65
                );
            }
        }

        // ── 6. 底部遮幅区域导演标记 ──
        ctx.fillStyle = 'rgba(200, 184, 154, 0.2)';
        ctx.font = '500 7px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DIR. ___________', 14, height - 8);
        ctx.textAlign = 'right';
        ctx.fillText('PRINT: FINAL', width - 14, height - 8);

        ctx.restore();
    }

    public getTextStyles(segment: TextSegment, config: TemplateConfig): TextStyle {
        const accentColor = config.accentColor || '#C8B89A';
        const textColor = config.textColor || '#D8D4CE';
        if (segment.fontWeight === '700' || segment.fontWeight === '800' || segment.headingLevel) {
            return { textColor: accentColor };
        }
        if (segment.isHighlight) {
            return {
                textColor: '#FFFDF5',
                highlightColor: 'rgba(200, 184, 154, 0.15)'
            };
        }
        if (segment.isCode) {
            return {
                textColor: accentColor,
                codeBgColor: 'rgba(200, 184, 154, 0.08)'
            };
        }
        return { textColor };
    }
}
