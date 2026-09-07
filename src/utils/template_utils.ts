import type { PageNumberOptions, TemplateConfig } from '../types/types';

export namespace TEMPLATE_UTIL {
    /**
     * 内部页码绘制辅助工具
     */
    export const drawPageNumber = (ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig, options: PageNumberOptions = {}) => {
        if (!config.showPageNumber) return;

        const pageNum = config.hasCover ? index : index + 1;
        const totalPage = config.hasCover ? totalCount - 1 : totalCount;
        if (totalPage <= 0) return;

        const {
            color = 'rgba(128, 128, 128, 0.5)',
            font = '500 12px sans-serif',
            textAlign = 'right',
            x = width - 25,
            y = height - 25,
            prefix = '',
            suffix = '',
            padZero = false
        } = options;

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = textAlign;

        const format = (n: number) => padZero ? String(n).padStart(2, '0') : n;
        const text = `${prefix}${format(pageNum)} / ${format(totalPage)}${suffix}`;

        ctx.fillText(text, x, y);
        ctx.restore();
    };

    /**
     * 噪点纹理缓存
     */
    export const noiseTextureCache = new Map<string, HTMLCanvasElement>();

    /**
     * 生成噪点纹理
     */
    export const getNoiseTexture = (width: number, height: number) => {
        const key = `${width}x${height}`;
        const cachedNoise = noiseTextureCache.get(key);
        if (cachedNoise) {
            return cachedNoise;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const tCtx = canvas.getContext('2d')!;
        tCtx.globalAlpha = 0.04;
        for (let i = 0; i < 5000; i++) {
            tCtx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
            tCtx.fillRect(Math.random() * width, Math.random() * height, 1.2, 1.2);
        }

        noiseTextureCache.set(key, canvas);

        return canvas;
    };

    /**
     * 纸张纹理缓存
     */
    export const paperTextureCache = new Map<string, HTMLCanvasElement>();

    /**
     * 生成纸张纹理 (深度优化版：包含噪点、长纤维、以及随机纸浆感)
     */
    export const getPaperTexture = (width: number, height: number) => {
        const key = `${width}x${height}`;
        const cachedPaper = paperTextureCache.get(key);
        if (cachedPaper) {
            return cachedPaper;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const tCtx = canvas.getContext('2d')!;

        // 1. 基础极细噪点 (Simulating paper grain)
        tCtx.globalAlpha = 0.06;
        for (let i = 0; i < 8000; i++) {
            const size = Math.random() * 1.5;
            tCtx.fillStyle = Math.random() > 0.5 ? '#8b4513' : '#000';
            tCtx.fillRect(Math.random() * width, Math.random() * height, size, size);
        }

        // 2. 模拟随机纸浆团 (Paper pulp / blotches)
        tCtx.globalAlpha = 0.02;
        for (let i = 0; i < 40; i++) {
            const bx = Math.random() * width;
            const by = Math.random() * height;
            const br = 10 + Math.random() * 50;
            const grad = tCtx.createRadialGradient(bx, by, 0, bx, by, br);
            grad.addColorStop(0, '#8b4513');
            grad.addColorStop(1, 'transparent');
            tCtx.fillStyle = grad;
            tCtx.beginPath();
            tCtx.arc(bx, by, br, 0, Math.PI * 2);
            tCtx.fill();
        }

        // 3. 模拟长纤维 (Fine fibers)
        tCtx.globalAlpha = 0.04;
        tCtx.strokeStyle = '#5d4037';
        tCtx.lineWidth = 0.4;
        for (let i = 0; i < 200; i++) {
            const lx = Math.random() * width;
            const ly = Math.random() * height;
            const len = 4 + Math.random() * 12;
            const angle = Math.random() * Math.PI * 2;
            // 绘制稍微弯曲的纤维
            tCtx.beginPath();
            tCtx.moveTo(lx, ly);
            const cp1x = lx + Math.cos(angle) * (len / 3);
            const cp1y = ly + Math.sin(angle) * (len / 3) + (Math.random() * 2 - 1);
            tCtx.quadraticCurveTo(cp1x, cp1y, lx + Math.cos(angle) * len, ly + Math.sin(angle) * len);
            tCtx.stroke();
        }

        paperTextureCache.set(key, canvas);
        return canvas;
    };
}
