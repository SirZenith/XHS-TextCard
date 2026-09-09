/**
 * LayoutResizer - 三列布局拖拽分栏控制器
 *
 * 设计原则：
 * 1. 三列宽度以 fr 占比存储（--preview-col / --editor-col / --input-col），
 *    拖拽分隔条时实时换算像素增量并重写 CSS 变量。
 * 2. 占比持久化到 localStorage，刷新后恢复用户自定义比例。
 * 3. 约束最小列宽，避免任一列被拖没。
 */

interface ColumnSizes {
    preview: number;
    editor: number;
    input: number;
}

export class LayoutResizer {
    private readonly container: HTMLElement;
    private readonly dividers: NodeListOf<HTMLElement>;
    private readonly MIN_FR = 0.3;
    private readonly STORAGE_KEY = 'xhs_layout_columns';

    private previewFr: number;
    private editorFr: number;
    private inputFr: number;

    private drag: { divider: number; startX: number; startPreview: number; startEditor: number; startInput: number } | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.dividers = container.querySelectorAll<HTMLElement>('.column-divider');

        const saved = this.load();
        this.previewFr = saved.preview;
        this.editorFr = saved.editor;
        this.inputFr = saved.input;

        this.apply();
    }

    init() {
        this.dividers.forEach((divider) => {
            const index = parseInt(divider.dataset.divider || '1', 10);
            divider.addEventListener('pointerdown', (e: PointerEvent) => this.onPointerDown(e, index));
        });

        document.addEventListener('pointermove', (e: PointerEvent) => this.onPointerMove(e));
        document.addEventListener('pointerup', () => this.onPointerUp());
        document.addEventListener('pointercancel', () => this.onPointerUp());
    }

    private load(): ColumnSizes {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<ColumnSizes>;
                if (typeof parsed.preview === 'number' && typeof parsed.editor === 'number' && typeof parsed.input === 'number') {
                    if (parsed.preview >= this.MIN_FR && parsed.editor >= this.MIN_FR && parsed.input >= this.MIN_FR) {
                        return { preview: parsed.preview, editor: parsed.editor, input: parsed.input };
                    }
                }
            }
        } catch (e) {
            console.warn('[LayoutResizer] LocalStorage access denied');
        }
        return { preview: 1.15, editor: 1, input: 0.85 };
    }

    private persist() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ preview: this.previewFr, editor: this.editorFr, input: this.inputFr }));
        } catch (e) {
            console.warn('[LayoutResizer] LocalStorage access denied');
        }
    }

    private apply() {
        const style = this.container.style;
        style.setProperty('--preview-col', `${this.previewFr}fr`);
        style.setProperty('--editor-col', `${this.editorFr}fr`);
        style.setProperty('--input-col', `${this.inputFr}fr`);
    }

    /** 返回三个 fr 列实际占用的像素宽度（不含分隔条） */
    private getFrTrackWidth(): number {
        const cs = getComputedStyle(this.container);
        const padL = parseFloat(cs.paddingLeft) || 0;
        const padR = parseFloat(cs.paddingRight) || 0;
        const contentWidth = this.container.clientWidth - padL - padR;
        const dividerWidth = this.dividers.length ? this.dividers[0].offsetWidth : 14;
        return Math.max(contentWidth - dividerWidth * this.dividers.length, 1);
    }

    private onPointerDown(e: PointerEvent, divider: number) {
        if (this.dividers.length === 0) return;
        e.preventDefault();
        this.drag = {
            divider,
            startX: e.clientX,
            startPreview: this.previewFr,
            startEditor: this.editorFr,
            startInput: this.inputFr
        };
        this.dividers.forEach((d) => d.classList.remove('dragging'));
        this.dividers[divider - 1]?.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    private onPointerMove(e: PointerEvent) {
        if (!this.drag) return;

        const deltaX = e.clientX - this.drag.startX;
        const totalFr = this.drag.startPreview + this.drag.startEditor + this.drag.startInput;
        const frPerPx = totalFr / this.getFrTrackWidth();
        const deltaFr = deltaX * frPerPx;

        if (this.drag.divider === 1) {
            const pairTotal = this.drag.startPreview + this.drag.startEditor;
            let preview = this.drag.startPreview + deltaFr;
            preview = Math.min(Math.max(preview, this.MIN_FR), pairTotal - this.MIN_FR);
            this.previewFr = preview;
            this.editorFr = pairTotal - preview;
        } else {
            const pairTotal = this.drag.startEditor + this.drag.startInput;
            let editor = this.drag.startEditor + deltaFr;
            editor = Math.min(Math.max(editor, this.MIN_FR), pairTotal - this.MIN_FR);
            this.editorFr = editor;
            this.inputFr = pairTotal - editor;
        }

        this.apply();
    }

    private onPointerUp() {
        if (!this.drag) return;
        this.drag = null;
        this.dividers.forEach((d) => d.classList.remove('dragging'));
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.persist();
    }
}
