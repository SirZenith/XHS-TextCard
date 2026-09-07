import type { ContentBox, PageNumberOptions, TemplateConfig, TextSegment, TextStyles } from '../types';

interface TextStyle {
    textColor: string
    highlightColor?: string;
    codeBgColor?: string;
}

interface TerminalStyle {
    bg: string;
    text: string;
}

interface Template {
    name: string;

    getContentBox?: (config: TemplateConfig, width: number, height: number) => ContentBox;

    drawBackground?: (ctx: CanvasRenderingContext2D, width: number, height: number, config: TemplateConfig) => void;
    drawTextAreaBackground?: (ctx: CanvasRenderingContext2D, rect: ContentBox, config: TemplateConfig) => void;
    drawForeground?: (ctx: CanvasRenderingContext2D, width: number, height: number, index: number, totalCount: number, config: TemplateConfig) => void;

    getTextStyles?: (segment: TextSegment, config: TemplateConfig) => TextStyle;
    terminalStyles?: TerminalStyle | ((cfg: TemplateConfig) => TerminalStyle);
}
