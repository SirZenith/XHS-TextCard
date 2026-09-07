/**
 * MARKDOWN_UTIL - Markdown 解析工具
 */
export namespace MARKDOWN_UTIL {
    let isInitialized: boolean = false;

    export const init = (): void => {
        if (typeof marked === 'undefined' || isInitialized) return;

        // 添加 ==高亮== 自定义语法
        const highlightExtension: MarkedExtension = {
            name: 'highlight',
            level: 'inline',
            start(src: string): number {
                return src.indexOf('==');
            },
            tokenizer(this: MarkedLexer, src: string): MarkedToken | undefined {
                const rule = /^==([^=]+)==/;
                const match = rule.exec(src);
                if (match) {
                    return {
                        type: 'highlight',
                        raw: match[0],
                        text: match[1],
                        tokens: this.lexer.inlineTokens(match[1])
                    };
                }
                return undefined;
            },
            renderer(token: MarkedToken): string {
                return `<mark class="highlight">${token.text}</mark>`;
            }
        };

        // 添加 ::: center ... ::: 块级居中语法
        const centerBlockExtension: MarkedExtension = {
            name: 'centerBlock',
            level: 'block',
            start(src: string): number | undefined {
                const match = src.match(/^[ \t]*:::[ \t]*center/m);
                return match ? match.index : undefined;
            },
            tokenizer(this: MarkedLexer, src: string): MarkedToken | undefined {
                // 支持多行块级语法：::: center\n内容\n:::
                const rule = /^[ \t]*:::[ \t]*center[ \t]*\n([\s\S]+?)\n[ \t]*:::[ \t]*(?:\n|$)/;
                const match = rule.exec(src);
                if (!match) return undefined;

                const text = match[1].trim();
                if (!text) return undefined;

                // 使用 blockTokens 解析内部内容，支持段落、加粗、高亮等所有 Markdown 语法
                const childTokens: MarkedToken[] = [];
                this.lexer.blockTokens(text, childTokens);

                return {
                    type: 'centerBlock',
                    raw: match[0],
                    text: text,
                    tokens: childTokens
                };
            },
            renderer(this: MarkedRendererContext, token: MarkedToken): string {
                return `<div style="text-align:center;">${this.parser.parse(token.tokens || [])}</div>`;
            }
        };

        const mathBlockExtension: MarkedExtension = {
            name: 'mathBlock',
            level: 'block',
            start(src: string): number | undefined {
                const dollarMatch = src.match(/^[ \t]*\$\$/m);
                const bracketMatch = src.match(/^[ \t]*\\\[/m);
                if (!dollarMatch) return bracketMatch ? bracketMatch.index : undefined;
                if (!bracketMatch) return dollarMatch.index;
                return Math.min(dollarMatch.index ?? 0, bracketMatch.index ?? 0);
            },
            tokenizer(src: string): MarkedToken | undefined {
                const dollarRule = /^[ \t]*\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n|$)/;
                const bracketRule = /^[ \t]*\\\[[ \t]*\n?([\s\S]+?)\n?[ \t]*\\\][ \t]*(?:\n|$)/;
                const match = dollarRule.exec(src) || bracketRule.exec(src);
                if (!match) return undefined;
                return {
                    type: 'mathBlock',
                    raw: match[0],
                    text: match[1].trim(),
                    display: true
                };
            },
            renderer(token: MarkedToken): string {
                return `<div class="math-block">${token.text}</div>`;
            }
        };

        const inlineMathExtension: MarkedExtension = {
            name: 'inlineMath',
            level: 'inline',
            start(src: string): number | undefined {
                const dollarIndex = src.indexOf('$');
                const parenIndex = src.indexOf('\\(');
                if (dollarIndex === -1) return parenIndex === -1 ? undefined : parenIndex;
                if (parenIndex === -1) return dollarIndex;
                return Math.min(dollarIndex, parenIndex);
            },
            tokenizer(src: string): MarkedToken | undefined {
                const dollarRule = /^\$((?:\\.|[^$\n])+?)\$(?!\$)/;
                const parenRule = /^\\\(((?:\\.|[\s\S])+?)\\\)/;
                const match = dollarRule.exec(src) || parenRule.exec(src);
                if (!match) return undefined;
                return {
                    type: 'inlineMath',
                    raw: match[0],
                    text: match[1].trim(),
                    display: false
                };
            },
            renderer(token: MarkedToken): string {
                return `<span class="math-inline">${token.text}</span>`;
            }
        };

        marked.use({ extensions: [mathBlockExtension, inlineMathExtension, highlightExtension, centerBlockExtension] });
        marked.setOptions({ breaks: true, gfm: true });
        isInitialized = true;
    }

    export const parse = (text: string): string => {
        if (typeof marked === 'undefined') return text.replace(/\n/g, '<br>');
        if (!isInitialized) init();
        return marked.parse(text);
    }
}
