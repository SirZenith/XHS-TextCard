/**
 * 第三方全局库（vendored / CDN）的环境类型声明
 * 对应 editor.html 中加载的 third-party/* 与 CDN 脚本，均通过全局变量暴露。
 */

/** marked：Markdown 解析器（vendored, third-party/marked.umd.min.js） */
interface MarkedTableCell {
    text: string;
    tokens?: MarkedToken[];
}

interface MarkedToken {
    type: string;
    raw?: string;
    text?: string;
    display?: boolean;
    tokens?: MarkedToken[];
    href?: string;
    lang?: string;
    depth?: number;
    ordered?: boolean;
    items?: MarkedToken[];
    align?: string[];
    header?: MarkedTableCell[];
    rows?: MarkedTableCell[][];
}

interface MarkedLexer {
    lexer: MarkedLexer;
    inlineTokens(src: string): MarkedToken[];
    blockTokens(src: string, out?: MarkedToken[]): MarkedToken[];
}

interface MarkedExtension {
    name: string;
    level: 'inline' | 'block';
    start?(src: string): number | undefined;
    tokenizer?(this: MarkedLexer, src: string): MarkedToken | undefined;
    renderer?(this: MarkedRendererContext, token: MarkedToken): string;
}

interface MarkedRendererContext {
    parser: { parse(tokens: MarkedToken[]): string };
}

interface MarkedApi {
    use(options: { extensions: MarkedExtension[] }): void;
    setOptions(options: Record<string, unknown>): void;
    parse(text: string): string;
    lexer(text: string): MarkedToken[];
}

declare const marked: MarkedApi | undefined;

/** highlight.js（CDN 加载） */
interface HLJSApi {
    getLanguage?(name: string): unknown;
    highlight(code: string, options: { language: string; ignoreIllegals?: boolean }): { value: string };
    highlightAuto(code: string): { value: string };
}

declare const hljs: HLJSApi | undefined;

/** MathJax（CDN 加载，editor.html 内联脚本写入 window.MathJax 配置） */
interface MathJaxApi {
    tex2svgPromise?: (text: string, options?: { display?: boolean }) => Promise<Element>;
    startup?: { promise?: Promise<unknown> };
}

declare const MathJax: MathJaxApi | undefined;

/** Mermaid（vendored 10.9.1，window.mermaidReady 由 editor.html 内联脚本定义） */
interface MermaidApi {
    initialize(options: Record<string, unknown>): void;
    render(id: string, text: string): Promise<{ svg: string }>;
}

/** Pickr 颜色选择器（vendored） */
interface PickrColor {
    toRGBA(): { toString(places?: number): string };
    toHEXA(): { toString(): string };
}

interface PickrInstance {
    setColor(color: string, silent?: boolean): void;
    getColor(): PickrColor;
    hide(): void;
    on(event: string, cb: (color: PickrColor, instance: PickrInstance) => void): PickrInstance;
}

interface PickrOptions {
    el: string;
    theme?: string;
    default?: string | null;
    swatches?: string[];
    components?: Record<string, unknown>;
    strings?: Record<string, string>;
}

declare const Pickr: {
    create(options: PickrOptions): PickrInstance;
};

/** JSZip（vendored） */
declare class JSZip {
    file(name: string, data: string, options?: { base64?: boolean }): void;
    generateAsync(options: { type: string }): Promise<Blob>;
}

/** window 全局扩展 */
interface Window {
    mermaid?: MermaidApi;
    mermaidReady?: Promise<MermaidApi>;
    MathJax?: MathJaxApi;
}
