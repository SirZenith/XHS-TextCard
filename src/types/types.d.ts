/**
 * 全局共享类型（ES 模块导出，供各模块 import type 使用）
 */

/** 模板配置：与 templates/*.json 的 config 字段对应 */
export interface TemplateConfig {
    bgColor: string;
    textColor: string;
    bgMode?: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    textPadding: number;
    fontFamily: string;
    hasCover?: boolean;
    coverImage?: string;
    coverTitle?: string;
    coverFontSize?: number;
    coverLineHeight?: number;
    hasWatermark?: boolean;
    watermarkText?: string;
    watermarkColor?: string;
    hasSignature?: boolean;
    signatureText?: string;
    signatureColor?: string;
    signaturePosition?: string;
    signatureStyle?: string;
    h1Scale?: number;
    h2Scale?: number;
    h3Scale?: number;
    accentColor?: string;
    showPageNumber?: boolean;
    showGrid?: boolean;
    hasSocialIcons?: boolean;
    selectedSocialIcons?: string[];
    socialIconPosition?: string;
    [key: string]: any;
}

/** CanvasTextEngine 内部排版配置 */
export interface EngineConfig {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontFamily: string;
    textPadding: number;
    cardWidth?: number;
    drawWidth?: number;
    maxBlockHeight?: number;
    textColor?: string;
    h1Scale?: number;
    h2Scale?: number;
    h3Scale?: number;
    [key: string]: any;
}

/** 行内文本片段（layoutInlineText 的输出单元） */
export interface TextSegment {
    text?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fontFamily?: string;
    color?: string;
    isCode?: boolean;
    isCodeBlock?: boolean;
    isHighlight?: boolean;
    isMath?: boolean;
    mathFallback?: boolean;
    textDecoration?: string;
    headingLevel?: number;
    image?: HTMLImageElement;
    width?: number;
    height?: number;
    display?: boolean;
}

/** 代码高亮片段 */
export interface CodeSegment {
    text: string;
    color: string;
}

/** 数学公式渲染结果 */
export interface MathRenderResult {
    text: string;
    fontSize: number;
    isCode?: boolean;
    mathFallback?: boolean;
    image?: HTMLImageElement;
    width?: number;
    height?: number;
    isMath?: boolean;
    display?: boolean;
}

/** 表格单元格布局 */
export interface TableCellLayout {
    lines: TextSegment[][];
    width: number;
    align: string;
    isHeader: boolean;
}

/** 表格行布局 */
export interface TableRowLayout {
    cells: TableCellLayout[];
    height: number;
    isHeaderRow: boolean;
}

/** 布局块：TextSplitter 的输出单元，CanvasRenderer 的绘制单元 */
export interface LayoutBlock {
    type: string;
    height: number;
    marginTop?: number;
    marginBottom?: number;
    align?: string;
    depth?: number;
    lines?: Array<TextSegment[] | TextSegment>;
    indent?: number;
    prefix?: string;
    prefixWidth?: number;
    src?: string;
    alt?: string;
    width?: number;
    contentHeight?: number;
    image?: string | HTMLImageElement;
    message?: string;
    paddingX?: number;
    paddingY?: number;
    rows?: TableRowLayout[];
    colWidths?: number[];
    cellPaddingX?: number;
    cellPaddingY?: number;
    title?: string;
}

/** 内容框（模板几何定义，splitter 与 renderer 共享的唯一真理） */
export interface ContentBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** 页码绘制选项 */
export interface PageNumberOptions {
    color?: string;
    font?: string;
    textAlign?: CanvasTextAlign;
    x?: number;
    y?: number;
    prefix?: string;
    suffix?: string;
    padZero?: boolean;
}

/** 模板对象（TemplateManager 加载结果） */
export interface TemplateInfo {
    id: string;
    name: string;
    description: string;
    author?: string;
    version?: string;
    config: TemplateConfig;
    className: string;
}

/** templates/index.json 结构 */
export interface TemplateIndexEntry {
    id: string;
    name?: string;
}

export interface TemplateIndex {
    templates: TemplateIndexEntry[];
}

/** CanvasRenderer.render 参数 */
export interface RenderOptions {
    layouts: LayoutBlock[];
    index: number;
    totalCount: number;
    config: TemplateConfig;
    templateId: string;
    width?: number;
    height?: number;
    scale?: number;
}

/** 图片测量结果 */
export interface ImageMeasureResult {
    width: number;
    height: number;
    ratio?: number;
    originalWidth?: number;
    originalHeight?: number;
    error?: boolean;
    timeout?: boolean;
}

/** App 绑定的编辑器 DOM 元素集合 */
export interface AppElements {
    [key: string]: any;
    textInput: HTMLTextAreaElement;
    templateList: HTMLElement;
    downloadAllBtn: HTMLButtonElement;
    previewList: HTMLElement;
    previewCount: HTMLElement;
    previewIndicators: HTMLElement;
    previewPrev: HTMLButtonElement;
    previewNext: HTMLButtonElement;
    loading: HTMLElement;
    templateEditor: HTMLElement;
    visualEditor: HTMLElement;
    coverEditor: HTMLElement;
    exportEditor: HTMLElement;
    editorTabs: NodeListOf<HTMLElement>;
    fontSizeInput: HTMLInputElement;
    fontSizeValue: HTMLElement;
    lineHeightInput: HTMLInputElement;
    lineHeightValue: HTMLElement;
    letterSpacingInput: HTMLInputElement;
    letterSpacingValue: HTMLElement;
    textPaddingInput: HTMLInputElement;
    textPaddingValue: HTMLElement;
    fontFamilySelect: HTMLSelectElement;
    h1ScaleValue: HTMLElement;
    h2ScaleValue: HTMLElement;
    h3ScaleValue: HTMLElement;
    resetTemplateBtn: HTMLButtonElement;
    hasWatermarkCheck: HTMLInputElement;
    watermarkTextInput: HTMLInputElement;
    hasSignatureCheck: HTMLInputElement;
    signatureTextInput: HTMLInputElement;
    hasCoverCheck: HTMLInputElement;
    coverTitleInput: HTMLTextAreaElement;
    coverFontSizeInput: HTMLInputElement;
    editModeToggle: HTMLButtonElement;
}
