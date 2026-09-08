/**
 * CanvasTextEngine - 帆布排版引擎
 *
 * 设计原则：
 * 1. 最小单位测量：基于单个字符的测量进行精确换行，确保排版在不同字体下的稳定性。
 * 2. 语义化布局：将 Markdown Token 转换为具有层级关系的 Layout Blocks。
 * 3. 跨页能力：支持对 Layout Blocks 进行高度检测与逻辑切分，为 TextSplitter 提供拆分依据。
 * 4. 富文本渲染：支持内联样式的组合（加粗、斜体、高亮、代码、标题级别）。
 */
import { PREVIEW_WIDTH } from '../utils/constants';
import { CANVAS_UTIL } from '../utils/canvas_utils';
import type { CodeSegment, EngineConfig, ImageMeasureResult, LayoutBlock, MathRenderResult, TableCellLayout, TableRowLayout, TextSegment } from '../types/types';

const NO_BREAK_CHAR_SET = new Set(',.!?，。！？');

export class CanvasTextEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private widthCache: Map<string, number>; // 字符宽度缓存
    private config: EngineConfig = {} as EngineConfig;
    private drawWidth: number = 0;
    private mathJaxReadyPromise: Promise<boolean> | null = null;
    private highlightReadyPromise: Promise<boolean> | null = null;
    private mermaidReadyPromise: Promise<MermaidApi | null> | null = null;

    constructor(config: EngineConfig = {} as EngineConfig) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        this.widthCache = new Map<string, number>();
        this.updateConfig(config);
    }

    /**
     * 更新全局排版参数
     */
    updateConfig(config: EngineConfig) {
        const defaultFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
        const oldConfig = this.config || {};
        this.config = Object.assign({
            fontSize: 16, lineHeight: 1.6, letterSpacing: 0,
            fontFamily: defaultFont, textPadding: 35, cardWidth: PREVIEW_WIDTH || 500
        }, config);

        if (this.config.fontFamily === 'inherit' || !this.config.fontFamily) {
            this.config.fontFamily = defaultFont;
        }

        // 如果字体或基本参数变了，清空缓存
        if (oldConfig.fontFamily !== this.config.fontFamily ||
            oldConfig.fontSize !== this.config.fontSize ||
            oldConfig.letterSpacing !== this.config.letterSpacing) {
            this.widthCache.clear();
        }

        this.drawWidth = config.drawWidth || ((this.config.cardWidth || PREVIEW_WIDTH) - (Number(this.config.textPadding) * 2 || 70));
    }

    setFont(options: { fontSize?: number; fontWeight?: string; fontStyle?: string; fontFamily?: string; } = {}) {
        const { fontSize = this.config.fontSize, fontWeight = 'normal', fontStyle = 'normal', fontFamily = this.config.fontFamily } = options;
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        return this.ctx.font;
    }

    measureTextWidth(text: string, fontSize: number = this.config.fontSize, fontWeight: string = 'normal', fontStyle: string = 'normal', fontFamily: string = this.config.fontFamily): number {
        if (!text) return 0;

        // 生成缓存键
        const cacheKey = `${text}_${fontSize}_${fontWeight}_${fontStyle}_${fontFamily}`;
        const cached = this.widthCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        this.setFont({ fontSize, fontWeight, fontStyle, fontFamily });
        const letterSpacing = Number(this.config.letterSpacing) || 0;
        const width = CANVAS_UTIL.measureTextWidth(this.ctx, text, letterSpacing);

        // 只有短文本才缓存，防止缓存无限增长
        if (text.length < 10) {
            this.widthCache.set(cacheKey, width);
        }

        return width;
    }

    getCodeFontFamily() {
        return "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
    }

    getCodeColor(scope: string | undefined, fallback: string = '#24292f'): string {
        const palette: Record<string, string> = {
            keyword: '#cf222e',
            built_in: '#8250df',
            type: '#8250df',
            literal: '#0550ae',
            number: '#0550ae',
            string: '#0a7f3f',
            regexp: '#116329',
            title: '#953800',
            function: '#953800',
            params: '#24292f',
            comment: '#6e7781',
            meta: '#57606a',
            attr: '#0550ae',
            attribute: '#0550ae',
            variable: '#953800',
            symbol: '#0550ae',
            tag: '#116329',
            name: '#116329'
        };
        if (!scope) return fallback;
        const parts = String(scope).split(/\s+/).map(part => part.replace(/^hljs-/, ''));
        for (const part of parts) {
            if (palette[part]) return palette[part];
        }
        return fallback;
    }

    tokenizePythonCode(code: string): CodeSegment[] {
        const colors: Record<string, string> = {
            keyword: '#cf222e',
            builtIn: '#8250df',
            string: '#0a7f3f',
            number: '#0550ae',
            comment: '#6e7781',
            function: '#953800',
            text: '#24292f'
        };
        const keywordPattern = 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield';
        const builtInPattern = 'abs|all|any|bool|dict|enumerate|float|int|len|list|map|max|min|print|range|set|str|sum|tuple|zip';
        const tokenRule = new RegExp(
            `(#.*)|(\"\"\"[\\\\s\\\\S]*?\"\"\"|'''[\\\\s\\\\S]*?'''|\"(?:\\\\\\\\.|[^\"\\\\\\\\])*\"|'(?:\\\\\\\\.|[^'\\\\\\\\])*')|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${keywordPattern})\\b|\\b(${builtInPattern})\\b|\\b([A-Za-z_]\\w*)(?=\\s*\\()`,
            'g'
        );

        const segments: CodeSegment[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = tokenRule.exec(code)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ text: code.slice(lastIndex, match.index), color: colors.text });
            }
            const color = match[1] ? colors.comment
                : match[2] ? colors.string
                    : match[3] ? colors.number
                        : match[4] ? colors.keyword
                            : match[5] ? colors.builtIn
                                : match[6] ? colors.function
                                    : colors.text;
            segments.push({ text: match[0], color });
            lastIndex = tokenRule.lastIndex;
        }
        if (lastIndex < code.length) {
            segments.push({ text: code.slice(lastIndex), color: colors.text });
        }
        return segments;
    }

    highlightCode(code: string, lang: string | undefined): CodeSegment[] {
        if (typeof hljs === 'undefined') {
            if (String(lang || '').toLowerCase() === 'python' || String(lang || '').toLowerCase() === 'py') {
                return this.tokenizePythonCode(code);
            }
            return [{ text: code, color: '#24292f' }];
        }

        let highlighted: string;
        try {
            if (lang && hljs.getLanguage && hljs.getLanguage(lang)) {
                highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
            } else {
                highlighted = hljs.highlightAuto(code).value;
            }
        } catch (e) {
            return [{ text: code, color: '#24292f' }];
        }

        const host = document.createElement('div');
        host.innerHTML = highlighted;
        const segments: CodeSegment[] = [];
        const walk = (node: Node, scope: string = '') => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.nodeValue) segments.push({ text: node.nodeValue, color: this.getCodeColor(scope) });
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const element = node as HTMLElement;
            const nextScope = `${scope} ${element.className || ''}`.trim();
            element.childNodes.forEach(child => walk(child, nextScope));
        };
        host.childNodes.forEach(node => walk(node));
        return segments.length ? segments : [{ text: code, color: '#24292f' }];
    }

    splitCodeSegments(segments: CodeSegment[], maxWidth: number): TextSegment[][] {
        const fontSize = this.config.fontSize * 0.82;
        const fontFamily = this.getCodeFontFamily();
        const lines: TextSegment[][] = [];
        let currentLine: TextSegment[] = [];
        let currentWidth = 0;

        const pushLine = () => {
            lines.push(currentLine.length ? currentLine : [{ text: '', fontSize, fontFamily, isCode: true, color: '#24292f' }]);
            currentLine = [];
            currentWidth = 0;
        };

        for (const segment of segments) {
            for (const char of Array.from(segment.text || '')) {
                if (char === '\n') {
                    pushLine();
                    continue;
                }

                const charWidth = this.measureTextWidth(char, fontSize, 'normal', 'normal', fontFamily);
                if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
                    pushLine();
                }

                const last = currentLine[currentLine.length - 1];
                if (last && last.color === segment.color) {
                    last.text = (last.text || '') + char;
                } else {
                    currentLine.push({
                        text: char,
                        fontSize,
                        fontFamily,
                        isCode: true,
                        isCodeBlock: true,
                        color: segment.color || '#24292f'
                    });
                }
                currentWidth += charWidth;
            }
        }

        if (currentLine.length > 0 || lines.length === 0) pushLine();
        return lines;
    }

    async waitForMathJax(timeoutMs: number = 5000): Promise<boolean> {
        if (!this.mathJaxReadyPromise) {
            this.mathJaxReadyPromise = (async () => {
                const started = Date.now();
                while (Date.now() - started < timeoutMs) {
                    if (typeof MathJax !== 'undefined' && MathJax.tex2svgPromise) return true;
                    await new Promise<void>(resolve => setTimeout(resolve, 50));
                }
                return false;
            })();
        }
        return this.mathJaxReadyPromise;
    }

    async waitForHighlightJs(timeoutMs: number = 3000): Promise<boolean> {
        if (!this.highlightReadyPromise) {
            this.highlightReadyPromise = (async () => {
                const started = Date.now();
                while (Date.now() - started < timeoutMs) {
                    if (typeof hljs !== 'undefined') return true;
                    await new Promise<void>(resolve => setTimeout(resolve, 50));
                }
                return false;
            })();
        }
        return this.highlightReadyPromise;
    }

    async waitForMermaid(timeoutMs: number = 5000): Promise<MermaidApi | null> {
        if (!this.mermaidReadyPromise) {
            this.mermaidReadyPromise = (async () => {
                if (window.mermaid) return window.mermaid;

                try {
                    if (window.mermaidReady) {
                        return await Promise.race([
                            window.mermaidReady,
                            new Promise<MermaidApi>((_, reject) => setTimeout(() => reject(new Error('Mermaid load timeout')), timeoutMs))
                        ]);
                    }
                } catch (e) {
                    console.warn('[CanvasTextEngine] Mermaid initialization failed:', e);
                }

                const started = Date.now();
                while (Date.now() - started < timeoutMs) {
                    if (window.mermaid) return window.mermaid;
                    await new Promise<void>(resolve => setTimeout(resolve, 100));
                }
                return null;
            })();
        }
        return this.mermaidReadyPromise;
    }

    async renderMath(text: string, display: boolean = false, fontSize: number = this.config.fontSize): Promise<MathRenderResult | null> {
        if (!text) return null;
        const hasMathJax = await this.waitForMathJax();
        if (!hasMathJax || typeof MathJax === 'undefined') {
            return {
                text: display ? `$$${text}$$` : `$${text}$`,
                fontSize,
                isCode: true,
                mathFallback: true
            };
        }

        try {
            const tex2svg = MathJax.tex2svgPromise;
            if (!tex2svg) return null;
            if (MathJax.startup && MathJax.startup.promise) {
                await MathJax.startup.promise;
            }

            const node = await tex2svg(text, { display });
            const svg = node.querySelector('svg');
            if (!svg) return null;

            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.style.color = this.config.textColor || '#111111';

            const host = document.createElement('div');
            host.style.position = 'absolute';
            host.style.left = '-10000px';
            host.style.top = '-10000px';
            host.style.fontSize = `${fontSize}px`;
            host.style.visibility = 'hidden';
            host.appendChild(svg.cloneNode(true));
            document.body.appendChild(host);
            const measuredSvg = host.querySelector('svg');
            const rect = measuredSvg!.getBoundingClientRect();
            document.body.removeChild(host);

            const width = Math.max(1, rect.width || fontSize * text.length * 0.5);
            const height = Math.max(fontSize * 1.2, rect.height || fontSize * 1.4);
            svg.setAttribute('width', String(width));
            svg.setAttribute('height', String(height));

            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
            const image = await new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = dataUrl;
            });
            if (!image) return null;
            return { image, width, height, text, fontSize, isMath: true, display };
        } catch (e) {
            console.warn('[CanvasTextEngine] Math render failed:', e);
            return {
                text: display ? `$$${text}$$` : `$${text}$`,
                fontSize,
                isCode: true,
                mathFallback: true
            };
        }
    }

    isColorLight(colorStr: string): boolean {
        if (!colorStr) return false;
        colorStr = colorStr.trim().toLowerCase();
        if (colorStr.startsWith('#')) {
            const hex = colorStr.substring(1);
            if (hex.length === 3) {
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
            } else if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
            }
        } else if (colorStr.startsWith('rgb')) {
            const match = colorStr.match(/\d+/g);
            if (match && match.length >= 3) {
                const r = parseInt(match[0]);
                const g = parseInt(match[1]);
                const b = parseInt(match[2]);
                return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
            }
        }
        return false;
    }

    getSvgDimensions(svgElement: SVGSVGElement): { width: number; height: number; } {
        if (!svgElement) return { width: 400, height: 300 };
        const viewBox = svgElement.viewBox && svgElement.viewBox.baseVal;
        if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
            return { width: viewBox.width, height: viewBox.height };
        }

        const width = parseFloat(svgElement.getAttribute('width') || '');
        const height = parseFloat(svgElement.getAttribute('height') || '');
        return {
            width: Number.isFinite(width) && width > 0 ? width : 400,
            height: Number.isFinite(height) && height > 0 ? height : 300
        };
    }

    createRenderErrorLayout(message: string): LayoutBlock {
        const marginBottom = this.config.fontSize * 0.8;
        return {
            type: 'render-error',
            message,
            height: this.config.fontSize * 3.2 + marginBottom,
            marginTop: 0,
            marginBottom
        };
    }

    async loadSvgImage(svgText: string): Promise<HTMLImageElement | null> {
        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        try {
            return await new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = objectUrl;
            });
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    async renderMermaid(text: string, maxHeight: number = this.config.maxBlockHeight || Infinity): Promise<LayoutBlock> {
        if (!text) return this.createRenderErrorLayout('Mermaid 图表内容为空');
        const mermaidApi = await this.waitForMermaid();
        if (!mermaidApi) {
            console.warn('[CanvasTextEngine] Mermaid library is not loaded.');
            return this.createRenderErrorLayout('Mermaid 图表加载失败');
        }

        try {
            const id = 'mermaid-' + Math.random().toString(36).substring(2, 9);
            const isLightText = this.isColorLight(this.config.textColor || '#111111');
            const theme = isLightText ? 'dark' : 'neutral';

            let diagramText = text;
            if (!text.trim().startsWith('%%{init')) {
                diagramText = `%%{init: {'theme': '${theme}', 'flowchart': {'htmlLabels': false}}}%%\n` + text;
            }

            const { svg: svgHtml } = await mermaidApi.render(id, diagramText);
            if (!svgHtml) return this.createRenderErrorLayout('Mermaid 图表生成失败');

            const documentNode = new DOMParser().parseFromString(svgHtml, 'image/svg+xml');
            const rootElement = documentNode.documentElement;
            if (!rootElement || rootElement.nodeName.toLowerCase() !== 'svg') {
                return this.createRenderErrorLayout('Mermaid 图表生成失败');
            }
            const svgElement = rootElement as unknown as SVGSVGElement;
            const { width, height } = this.getSvgDimensions(svgElement);
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('width', String(width));
            svgElement.setAttribute('height', String(height));
            svgElement.style.removeProperty('max-width');
            const serializedSvg = new XMLSerializer().serializeToString(svgElement);
            const image = await this.loadSvgImage(serializedSvg);

            if (!image) return this.createRenderErrorLayout('Mermaid 图表载入失败');

            const maxWidth = this.drawWidth;
            const safeMaxHeight = Number.isFinite(maxHeight) ? Math.max(1, maxHeight - 20) : Infinity;
            const scale = Math.min(1, maxWidth / width, safeMaxHeight / height);
            const finalWidth = width * scale;
            const contentHeight = height * scale;
            const paddingY = 10;
            const marginBottom = this.config.fontSize * 0.8;

            return {
                type: 'mermaid-block',
                image,
                width: finalWidth,
                contentHeight,
                height: contentHeight + (paddingY * 2) + marginBottom,
                paddingY,
                marginTop: 0,
                marginBottom
            };
        } catch (e) {
            console.error('[CanvasTextEngine] Mermaid rendering failed:', e);
            return this.createRenderErrorLayout('Mermaid 图表解析失败');
        }
    }

    async layoutTable(token: MarkedToken): Promise<LayoutBlock | null> {
        if (!token) return null;
        const header = token.header || [];
        const rowsData = token.rows || [];
        const C = header.length;
        const colLengths = new Array(C).fill(0);
        for (let c = 0; c < C; c++) {
            colLengths[c] = Math.max(colLengths[c], header[c].text.length);
        }
        for (let r = 0; r < rowsData.length; r++) {
            const row = rowsData[r];
            for (let c = 0; c < C; c++) {
                if (row[c]) {
                    colLengths[c] = Math.max(colLengths[c], row[c].text.length);
                }
            }
        }

        const totalLen = colLengths.reduce((a, b) => a + b, 0) || 1;
        const colWidths: number[] = [];
        let allocatedWidth = 0;
        for (let c = 0; c < C; c++) {
            let w = Math.round((colLengths[c] / totalLen) * this.drawWidth);
            w = Math.max(60, w);
            colWidths.push(w);
            allocatedWidth += w;
        }

        const scale = this.drawWidth / allocatedWidth;
        for (let c = 0; c < C; c++) {
            colWidths[c] = Math.floor(colWidths[c] * scale);
        }
        const currentSum = colWidths.reduce((a, b) => a + b, 0);
        colWidths[C - 1] += (this.drawWidth - currentSum);

        const cellPaddingX = 8;
        const cellPaddingY = 8;
        const baseLineHeight = this.config.fontSize * (Number(this.config.lineHeight) || 1.6);

        const rowsLayout: TableRowLayout[] = [];
        let totalTableHeight = 0;

        const headerRowCells: TableCellLayout[] = [];
        let headerRowHeight = 0;
        for (let c = 0; c < C; c++) {
            const cell = header[c];
            const cellWidth = colWidths[c];
            const lines = await this.layoutInlineText(
                cell.tokens || [{ type: 'text', text: cell.text }],
                cellWidth - (cellPaddingX * 2),
                { fontWeight: '700' }
            );
            const cellHeight = (lines.length * baseLineHeight) + (cellPaddingY * 2);
            headerRowHeight = Math.max(headerRowHeight, cellHeight);
            headerRowCells.push({
                lines,
                width: cellWidth,
                align: (token.align || [])[c] || 'left',
                isHeader: true
            });
        }
        rowsLayout.push({ cells: headerRowCells, height: headerRowHeight, isHeaderRow: true });
        totalTableHeight += headerRowHeight;

        for (let r = 0; r < rowsData.length; r++) {
            const row = rowsData[r];
            const dataRowCells: TableCellLayout[] = [];
            let dataRowHeight = 0;
            for (let c = 0; c < C; c++) {
                const cell = row[c] || { text: '' };
                const cellWidth = colWidths[c];
                const lines = await this.layoutInlineText(cell.tokens || [{ type: 'text', text: cell.text }], cellWidth - (cellPaddingX * 2));
                const cellHeight = (lines.length * baseLineHeight) + (cellPaddingY * 2);
                dataRowHeight = Math.max(dataRowHeight, cellHeight);
                dataRowCells.push({
                    lines,
                    width: cellWidth,
                    align: (token.align || [])[c] || 'left',
                    isHeader: false
                });
            }
            rowsLayout.push({ cells: dataRowCells, height: dataRowHeight, isHeaderRow: false });
            totalTableHeight += dataRowHeight;
        }

        const marginBottom = this.config.fontSize * 0.8;
        return {
            type: 'table-grid',
            rows: rowsLayout,
            colWidths,
            height: totalTableHeight + marginBottom,
            cellPaddingX,
            cellPaddingY,
            marginTop: 0,
            marginBottom
        };
    }

    createTablePart(layout: LayoutBlock, rows: TableRowLayout[], includeMarginBottom: boolean): LayoutBlock {
        const marginBottom = includeMarginBottom ? (layout.marginBottom || 0) : 0;
        return {
            ...layout,
            rows,
            height: rows.reduce((sum, row) => sum + row.height, 0) + marginBottom,
            marginBottom
        };
    }

    splitTableLayout(layout: LayoutBlock, availableHeight: number): { part1: LayoutBlock | null; part2: LayoutBlock; } | null {
        if (!layout || layout.type !== 'table-grid' || !layout.rows || layout.rows.length < 3) return null;
        const header = layout.rows[0];
        let usedHeight = header.height;
        let splitIndex = 1;

        while (splitIndex < layout.rows.length && usedHeight + layout.rows[splitIndex].height <= availableHeight) {
            usedHeight += layout.rows[splitIndex].height;
            splitIndex += 1;
        }

        if (splitIndex <= 1) {
            return { part1: null, part2: layout };
        }
        if (splitIndex >= layout.rows.length) return null;

        return {
            part1: this.createTablePart(layout, layout.rows.slice(0, splitIndex), false),
            part2: this.createTablePart(layout, [header, ...layout.rows.slice(splitIndex)], true)
        };
    }

    /**
     * 测量图片尺寸并计算缩放后的高度
     */
    async measureImage(src: string, maxWidth: number = this.drawWidth): Promise<ImageMeasureResult> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            const timeout = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                resolve({ width: maxWidth, height: 100, error: true, timeout: true });
            }, 5000);

            img.onload = () => {
                clearTimeout(timeout);
                const ratio = img.height / img.width;
                const height = maxWidth * ratio;
                resolve({ width: maxWidth, height, ratio, originalWidth: img.width, originalHeight: img.height });
            };
            img.onerror = () => {
                clearTimeout(timeout);
                resolve({ width: maxWidth, height: 100, error: true });
            };
            img.src = src;
        });
    }

    /**
     * 将原始文本拆分为行（用于简单文本或代码块）
     */
    splitIntoLines(text: string, style: { fontSize?: number; fontWeight?: string; } = {}, maxWidth: number = this.drawWidth): string[] {
        const { fontSize = this.config.fontSize, fontWeight = 'normal' } = style;
        const lines: string[] = [];
        let currentLine = '', currentWidth = 0;

        if (!text) return [];

        for (const char of text) {
            if (char === '\n') {
                lines.push(currentLine);
                currentLine = ''; currentWidth = 0;
                continue;
            }

            const isNoBreak = NO_BREAK_CHAR_SET.has(char);
            const charWidth = this.measureTextWidth(char, fontSize, fontWeight);
            if (!isNoBreak && currentWidth + charWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = char; currentWidth = charWidth;
            } else {
                currentLine += char; currentWidth += charWidth;
            }
        }
        if (currentLine !== '') lines.push(currentLine);
        return lines;
    }

    /**
     * 将解析后的 Token 转换为布局对象
     */
    async layoutToken(token: MarkedToken): Promise<LayoutBlock[]> {
        const layouts: LayoutBlock[] = [];
        const baseLineHeight = this.config.fontSize * this.config.lineHeight;

        if (!token) return layouts;

        switch (token.type) {
            case 'centerBlock': {
                // 内部 tokens 是块级 token（paragraph, heading 等），逐个布局并标记居中
                const childTokens = token.tokens || [];
                for (const child of childTokens) {
                    const childLayouts = await this.layoutToken(child);
                    for (const layout of childLayouts) {
                        layout.align = 'center';
                        layouts.push(layout);
                    }
                }
                break;
            }
            case 'image': {
                const imgData = await this.measureImage(token.href || '');
                const marginTop = 10, marginBottom = 20;
                layouts.push({
                    type: 'image',
                    src: token.href || '',
                    alt: token.text || '',
                    width: imgData.width,
                    height: (imgData.height || 100) + marginTop + marginBottom,
                    contentHeight: imgData.height || 100,
                    marginTop,
                    marginBottom
                });
                break;
            }
            case 'mathBlock': {
                const fontSize = this.config.fontSize * 0.9;
                const math = await this.renderMath(token.text || '', true, fontSize);
                if (math && math.image) {
                    const maxWidth = this.drawWidth;
                    const mathWidth = math.width || 0;
                    const scale = mathWidth > maxWidth ? maxWidth / mathWidth : 1;
                    const width = mathWidth * scale;
                    const contentHeight = (math.height || 0) * scale;
                    const marginTop = 0;
                    const marginBottom = this.config.fontSize * 0.8;
                    layouts.push({
                        type: 'math-block',
                        image: math.image,
                        width,
                        contentHeight,
                        height: contentHeight + marginTop + marginBottom,
                        marginTop,
                        marginBottom,
                        align: 'center'
                    });
                } else {
                    const lines = this.splitIntoLines(math ? math.text : (token.text || ''));
                    const marginBottom = this.config.fontSize * 0.8;
                    layouts.push({
                        type: 'code-block',
                        lines: lines.map(text => ({ text, fontSize: this.config.fontSize * 0.9, isCode: true })),
                        height: (lines.length * baseLineHeight) + marginBottom,
                        marginTop: 0,
                        marginBottom
                    });
                }
                break;
            }
            case 'heading': {
                const scales: Record<number, number> = { 1: this.config.h1Scale || 1.6, 2: this.config.h2Scale || 1.4, 3: this.config.h3Scale || 1.2 };
                const fontSize = this.config.fontSize * (scales[token.depth || 0] || 1.1);
                const lines = await this.layoutInlineText(token.tokens || [{ type: 'text', text: token.text }], this.drawWidth, {
                    fontSize, fontWeight: '800', headingLevel: token.depth
                });

                const marginTop = fontSize * 0.6, marginBottom = fontSize * 0.4;
                layouts.push({
                    type: 'heading', depth: token.depth, lines,
                    height: marginTop + (lines.length * fontSize * this.config.lineHeight) + marginBottom,
                    marginTop, marginBottom
                });
                break;
            }
            case 'hr': {
                layouts.push({ type: 'divider', height: 20 });
                break;
            }
            case 'text':
            case 'paragraph': {
                const tokens = token.tokens;

                // 如果段落只包含一个图片，则直接作为图片处理
                if (tokens && tokens.length === 1 && tokens[0].type === 'image') {
                    return await this.layoutToken(tokens[0]);
                }

                // 如果段落包含多个图片和其他文本，提取出来作为独立块
                const hasImage = !!(tokens && tokens.some(t => t.type === 'image'));
                if (hasImage && tokens) {
                    const subLayouts: LayoutBlock[] = [];
                    let currentTextTokens: MarkedToken[] = [];

                    for (const subToken of tokens) {
                        if (subToken.type === 'image') {
                            if (currentTextTokens.length > 0) {
                                subLayouts.push(...await this.layoutToken({ type: 'paragraph', tokens: currentTextTokens, text: '' }));
                                currentTextTokens = [];
                            }
                            subLayouts.push(...await this.layoutToken(subToken));
                        } else {
                            currentTextTokens.push(subToken);
                        }
                    }

                    if (currentTextTokens.length > 0) {
                        subLayouts.push(...await this.layoutToken({ type: 'paragraph', tokens: currentTextTokens, text: '' }));
                    }
                    return subLayouts;
                }

                const lines = await this.layoutInlineText(tokens || [{ type: 'text', text: token.text || '' }]);
                const marginBottom = this.config.fontSize * 0.8;
                layouts.push({
                    type: 'paragraph', lines, height: (lines.length * baseLineHeight) + marginBottom,
                    marginTop: 0, marginBottom
                });
                break;
            }
            case 'blockquote': {
                const indent = 20;
                const lines = await this.layoutInlineText(token.tokens || [{ type: 'text', text: token.text }], this.drawWidth - indent);
                const marginBottom = this.config.fontSize * 0.8;
                layouts.push({
                    type: 'blockquote', lines, indent, height: (lines.length * baseLineHeight) + marginBottom,
                    marginTop: 0, marginBottom
                });
                break;
            }
            case 'list': {
                const items = token.items || [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const prefix = token.ordered ? `${i + 1}. ` : '• ';
                    const prefixWidth = this.measureTextWidth(prefix);
                    let inlineTokens = item.tokens || [];
                    if (inlineTokens.length === 1 && inlineTokens[0].type === 'paragraph') {
                        inlineTokens = inlineTokens[0].tokens || [];
                    }

                    const lines = await this.layoutInlineText(inlineTokens, this.drawWidth - prefixWidth);
                    const marginBottom = this.config.fontSize * 0.8;
                    layouts.push({
                        type: 'list-item', prefix, prefixWidth, lines,
                        height: (lines.length * baseLineHeight) + marginBottom,
                        marginTop: 0, marginBottom
                    });
                }
                break;
            }
            case 'space': {
                layouts.push({ type: 'space', height: this.config.fontSize });
                break;
            }
            case 'table': {
                const tableLayout = await this.layoutTable(token);
                if (tableLayout) {
                    layouts.push(tableLayout);
                }
                break;
            }
            case 'code': {
                const language = String(token.lang || '').trim().toLowerCase();
                if (language === 'mermaid') {
                    const mermaidBlock = await this.renderMermaid(token.text || '');
                    if (mermaidBlock) {
                        layouts.push(mermaidBlock);
                        break;
                    }
                }
                await this.waitForHighlightJs();
                const paddingX = 14;
                const lines = this.splitCodeSegments(this.highlightCode(token.text || '', token.lang), this.drawWidth - (paddingX * 2));
                const paddingY = 12;
                const marginBottom = this.config.fontSize * 0.8;
                const lineHeight = (this.config.fontSize * 0.82) * (Number(this.config.lineHeight) || 1.6);
                layouts.push({
                    type: 'code-block',
                    lines,
                    paddingX,
                    paddingY,
                    height: (lines.length * lineHeight) + (paddingY * 2) + marginBottom,
                    marginTop: 0, marginBottom
                });
                break;
            }
        }
        return layouts;
    }

    /**
     * 核心方法：处理具有内联样式的文本换行
     */
    async layoutInlineText(inlineTokens: MarkedToken[], maxWidth: number = this.drawWidth, inheritedStyle: Partial<TextSegment> = {}): Promise<TextSegment[][]> {
        const lines: TextSegment[][] = [];
        let currentLine: TextSegment[] = [];
        let currentLineWidth = 0;

        if (!inlineTokens) return [];

        const processTokens = async (tokens: MarkedToken[], currentStyle: Partial<TextSegment>) => {
            for (const token of tokens) {
                const style: TextSegment = {
                    fontSize: currentStyle.fontSize || this.config.fontSize,
                    fontWeight: currentStyle.fontWeight || 'normal',
                    fontStyle: currentStyle.fontStyle || 'normal',
                    isHighlight: currentStyle.isHighlight || false,
                    isCode: currentStyle.isCode || false,
                    textDecoration: currentStyle.textDecoration || 'none',
                    headingLevel: currentStyle.headingLevel
                };

                if (token.type === 'strong' || token.type === 'bold') style.fontWeight = '700';
                if (token.type === 'em' || token.type === 'italic') style.fontStyle = 'italic';
                if (token.type === 'codespan' || token.type === 'code') style.isCode = true;
                if (token.type === 'del' || token.type === 'strikethrough') style.textDecoration = 'line-through';
                if (token.type === 'highlight' || (token.raw && token.raw.startsWith('==') && token.raw.endsWith('=='))) {
                    style.isHighlight = true;
                }

                if (token.type === 'br') {
                    if (currentLine.length > 0) lines.push(currentLine);
                    currentLine = [];
                    currentLineWidth = 0;
                    continue;
                }

                if (token.type === 'inlineMath') {
                    const math = await this.renderMath(token.text || '', false, (style.fontSize || this.config.fontSize) * 0.74);
                    if (math && math.image) {
                        const segment: TextSegment = {
                            ...style,
                            isMath: true,
                            image: math.image,
                            width: math.width,
                            height: math.height,
                            text: token.text || ''
                        };
                        const segmentWidth = segment.width || 0;
                        if (currentLineWidth + segmentWidth > maxWidth && currentLine.length > 0) {
                            lines.push(currentLine);
                            currentLine = [];
                            currentLineWidth = 0;
                        }
                        currentLine.push(segment);
                        currentLineWidth += segmentWidth;
                    } else {
                        const text = math ? math.text : `$${token.text}$`;

                        for (const char of Array.from(text)) {
                            const isNoBreak = NO_BREAK_CHAR_SET.has(char);
                            const charWidth = this.measureTextWidth(char, style.fontSize || this.config.fontSize, style.fontWeight, style.fontStyle);

                            if (!isNoBreak && currentLineWidth + charWidth > maxWidth && currentLine.length > 0) {
                                lines.push(currentLine);
                                currentLine = [{ ...style, text: char, isCode: true }];
                                currentLineWidth = charWidth;
                            } else {
                                currentLine.push({ ...style, text: char, isCode: true });
                                currentLineWidth += charWidth;
                            }
                        }
                    }
                    continue;
                }

                if (token.tokens && token.tokens.length > 0) {
                    await processTokens(token.tokens, style);
                } else {
                    const text = token.text || token.raw || '';
                    if (!text) continue;

                    for (const char of Array.from(text)) {
                        const isNoBreak = NO_BREAK_CHAR_SET.has(char);
                        const charWidth = this.measureTextWidth(char, style.fontSize || this.config.fontSize, style.fontWeight, style.fontStyle);

                        if (!isNoBreak && currentLineWidth + charWidth > maxWidth && currentLine.length > 0) {
                            lines.push(currentLine);
                            currentLine = [{ ...style, text: char }];
                            currentLineWidth = charWidth;
                        } else {
                            const last = currentLine[currentLine.length - 1];
                            if (last && !last.isMath && last.fontWeight === style.fontWeight && last.fontStyle === style.fontStyle &&
                                last.isHighlight === style.isHighlight && last.isCode === style.isCode &&
                                last.fontSize === style.fontSize && last.textDecoration === style.textDecoration &&
                                last.headingLevel === style.headingLevel) {
                                last.text = (last.text || '') + char;
                            } else {
                                currentLine.push({ ...style, text: char });
                            }
                            currentLineWidth += charWidth;
                        }
                    }
                }
            }
        };

        await processTokens(inlineTokens, inheritedStyle);
        if (currentLine.length > 0) lines.push(currentLine);
        return lines;
    }

    getLineHeight(line: TextSegment[] | TextSegment, config: EngineConfig): number {
        const configFontSize = Number(config.fontSize) || 16;
        const maxFontSize = Array.isArray(line)
            ? Math.max(...line.map(s => Number(s.height) || Number(s.fontSize) || configFontSize))
            : (Number(line.fontSize) || configFontSize);
        return maxFontSize * (Number(config.lineHeight) || 1.6);
    }

    /**
     * 将布局块拆分为两部分，实现跨页排版
     */
    splitLayout(layout: LayoutBlock, availableHeight: number): { part1: LayoutBlock; part2: LayoutBlock; } | null {
        if (!layout.lines || !Array.isArray(layout.lines) || layout.lines.length === 0) return null;

        const lines = layout.lines;
        const paddingY = layout.type === 'code-block' ? (layout.paddingY || 0) : 0;
        let currentHeight = (layout.marginTop || 0) + paddingY;
        let splitIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const lineHeight = this.getLineHeight(lines[i], this.config);
            const requiredHeight = currentHeight + lineHeight + paddingY;
            if (requiredHeight > availableHeight) {
                splitIndex = i; break;
            }
            currentHeight += lineHeight;
        }

        if (splitIndex <= 0 || splitIndex >= lines.length) return null;

        const part1: LayoutBlock = { ...layout, lines: lines.slice(0, splitIndex), height: currentHeight + paddingY, marginBottom: 0 };
        const part2Lines = lines.slice(splitIndex);

        let part2ContentHeight = paddingY * 2;
        part2Lines.forEach(line => part2ContentHeight += this.getLineHeight(line, this.config));

        const part2: LayoutBlock = { ...layout, lines: part2Lines, marginTop: 0, height: part2ContentHeight + (layout.marginBottom || 0) };

        if (layout.type === 'list-item') {
            part2.type = 'paragraph'; part2.prefix = '';
        }

        return { part1, part2 };
    }
}
