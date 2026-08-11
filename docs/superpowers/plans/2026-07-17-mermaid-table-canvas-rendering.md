# Mermaid and Table Canvas Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Mermaid fenced blocks and GFM Markdown tables as readable, paginated content in XHS card previews and exported PNG files.

**Architecture:** Keep the existing marked.js → `CanvasTextEngine` layout → `TextSplitter` pagination → `CanvasRenderer` drawing pipeline. Isolate reusable SVG sizing/loading and table measurement in `CanvasTextEngine`, represent the results as `mermaid-block` and `table-grid` layouts, and make pagination split oversized tables only at row boundaries while repeating the header.

**Tech Stack:** Browser JavaScript, marked.js 15, Mermaid 10.9.1, HTML Canvas 2D, static HTML, Playwright browser verification.

## Global Constraints

- Export only the Mermaid diagram body and formatted table; do not add toolbars, copy buttons, run buttons, or fullscreen controls.
- Preserve the user's existing uncommitted changes in `editor.html`, `js/CanvasRenderer.js`, and `js/utils/canvas-text-engine.js`.
- Mermaid and table rendering must work in preview, single-image download, and batch download.
- Mermaid diagrams must remain proportional and must not be split across cards.
- Oversized tables must split at row boundaries and repeat the header on continuation cards.
- Light and dark templates must both remain readable.
- Existing headings, paragraphs, code, math, and image rendering must not regress.

---

### Task 1: Stabilize Mermaid SVG generation and failure layouts

**Files:**
- Modify: `editor.html:45-60`
- Modify: `js/utils/canvas-text-engine.js:253-460`
- Test: browser console assertions executed against `editor.html`

**Interfaces:**
- Consumes: `CanvasTextEngine.config`, `CanvasTextEngine.drawWidth`, Mermaid `render(id, text)`.
- Produces: `renderMermaid(text, maxHeight = Infinity): Promise<MermaidBlockLayout|ErrorBlockLayout>` and `getSvgDimensions(svgElement): { width: number, height: number }`.

- [ ] **Step 1: Record failing browser assertions for SVG sizing and invalid syntax**

Run in the `editor.html` page console after constructing the app's active text engine:

```js
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 800 400');
console.assert(engine.getSvgDimensions(svg).width === 800);
console.assert(engine.getSvgDimensions(svg).height === 400);
const bad = await engine.renderMermaid('flowchart TD\nA -->');
console.assert(bad.type === 'render-error');
```

Expected before implementation: `getSvgDimensions is not a function` and invalid Mermaid returns `null`.

- [ ] **Step 2: Centralize Mermaid initialization**

Keep one module load in `editor.html`, assign `window.mermaid`, and assign a promise immediately so the layout engine can await the exact initialization lifecycle:

```js
window.mermaidReady = import('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs')
    .then(({ default: mermaid }) => {
        window.mermaid = mermaid;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
        return mermaid;
    });
```

Update `waitForMermaid()` to await `window.mermaidReady`, reuse `window.mermaid`, and return `null` with a logged cause after timeout or rejection.

- [ ] **Step 3: Implement deterministic SVG dimensions and image loading**

Add `getSvgDimensions(svgElement)` with this precedence:

```js
const viewBox = svgElement.viewBox?.baseVal;
if (viewBox?.width > 0 && viewBox?.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
}
const width = parseFloat(svgElement.getAttribute('width'));
const height = parseFloat(svgElement.getAttribute('height'));
return {
    width: Number.isFinite(width) && width > 0 ? width : 400,
    height: Number.isFinite(height) && height > 0 ? height : 300
};
```

Parse Mermaid's SVG with `DOMParser`, read dimensions before serialization, set explicit `width` and `height`, remove `max-width`, then load it through a `Blob` object URL. Revoke the URL after `Image.onload` or `Image.onerror`.

- [ ] **Step 4: Return visible error layouts and bounded diagram sizes**

Implement `createRenderErrorLayout(message)` and return it for library, syntax, SVG, or image failures:

```js
return {
    type: 'render-error',
    message,
    height: this.config.fontSize * 3.2,
    marginBottom: this.config.fontSize * 0.8
};
```

Scale valid diagrams by `Math.min(1, drawWidth / width, maxHeight / height)` and store matching `width`, `contentHeight`, and total `height` values.

- [ ] **Step 5: Re-run Mermaid assertions**

Expected: both SVG dimension assertions pass, a valid flowchart returns `mermaid-block`, and invalid syntax returns `render-error` without aborting page generation.

- [ ] **Step 6: Commit Mermaid stabilization**

```bash
git add editor.html js/utils/canvas-text-engine.js
git commit -m "fix: stabilize mermaid canvas rendering"
```

### Task 2: Build accurate GFM table layout and row-boundary splitting

**Files:**
- Modify: `js/utils/canvas-text-engine.js:460-850`
- Modify: `js/TextSplitter.js:51-135`
- Test: browser console assertions executed against `editor.html`

**Interfaces:**
- Consumes: marked `table` tokens and `CanvasTextEngine.layoutInlineTokens(tokens, width, style)`.
- Produces: `layoutTable(token): Promise<TableGridLayout>` and `splitTableLayout(layout, availableHeight): { part1, part2 } | null`.

- [ ] **Step 1: Record failing table layout assertions**

```js
const token = marked.lexer('| A | B |\n| :- | -: |\n| short | a long value that wraps |')[0];
const table = await engine.layoutTable(token);
console.assert(table.type === 'table-grid');
console.assert(table.rows[0].cells[0].align === 'left');
console.assert(table.rows[0].cells[1].align === 'right');
console.assert(table.rows[1].height >= table.rows[0].height);
const split = engine.splitTableLayout(table, table.rows[0].height + table.rows[1].height + 1);
console.assert(split?.part2.rows[0].isHeaderRow === true);
```

Expected before implementation: alignment or continuation-header assertions fail.

- [ ] **Step 2: Measure columns from rendered inline content**

Normalize marked cell data through a helper that accepts both `{ text, tokens }` and strings. Measure header and body tokens with the same fonts used for drawing. Allocate column widths proportionally between a minimum of `Math.min(96, drawWidth / columnCount)` and the remaining content width, with the final column absorbing rounding error.

- [ ] **Step 3: Lay out cells and rows with consistent metrics**

For every cell, call the existing inline wrapping logic with `cellWidth - 2 * cellPaddingX`. Store `lines`, `align`, `isHeader`, and measured `contentHeight`. Set each row height to the maximum cell content height plus vertical padding. Mark the first row with `isHeaderRow: true`.

- [ ] **Step 4: Implement row-boundary table splitting**

Add `splitTableLayout(layout, availableHeight)`. It must keep the header plus at least one body row in `part1`; otherwise return `{ part1: null, part2: layout }` so the whole table moves to the next card. Build `part2` with a cloned header row followed by remaining body rows and recalculate each part's total height.

- [ ] **Step 5: Route table splitting through `TextSplitter`**

Before generic `splitLayout`, branch on `layout.type === 'table-grid'` and call `splitTableLayout`. Ensure the pagination loop cannot repeatedly enqueue an unchanged table on an empty page; if one body row itself exceeds available height, keep that row intact and allow the page-level clipping safeguard to report it.

- [ ] **Step 6: Re-run table assertions**

Expected: `table-grid` is returned, alignment matches GFM markers, long cells increase row height, and a continuation table starts with a repeated header.

- [ ] **Step 7: Commit table layout and splitting**

```bash
git add js/utils/canvas-text-engine.js js/TextSplitter.js
git commit -m "feat: paginate markdown tables by row"
```

### Task 3: Draw document-style tables and visible render errors

**Files:**
- Modify: `js/CanvasRenderer.js:400-580`
- Test: visual browser verification against light and dark templates

**Interfaces:**
- Consumes: `MermaidBlockLayout`, `TableGridLayout`, and `ErrorBlockLayout` from `CanvasTextEngine`.
- Produces: Canvas pixels through `drawMermaidBlock`, `drawTableGrid`, and `drawRenderError`.

- [ ] **Step 1: Capture the current broken preview**

Enter the accepted Markdown fixture in the editor and save screenshots of one light and one dark template. Expected before implementation: missing, clipped, over-bordered, or incorrectly spaced Mermaid/table content.

- [ ] **Step 2: Draw Mermaid and error layouts**

Center Mermaid images within `textAreaRect.width` using their stored dimensions. Add a `render-error` branch in the main layout dispatch. Draw a subtle rounded rectangle, warning icon/text color derived from the template, and the layout's short Chinese message.

- [ ] **Step 3: Replace full table grid with document-style separators**

Draw a light header fill, a stronger rule below the header, and thin horizontal body separators. Do not draw vertical borders or an outer toolbar/container. Set the exact header/body font before calling `drawStyledLines`, vertically center each cell, and honor `left`, `center`, and `right` cell alignment.

- [ ] **Step 4: Verify drawing on contrasting templates**

Expected in both templates: the diagram is centered and proportional; table headers are distinct; separators remain visible; no text overlaps, escapes a cell, or becomes low contrast.

- [ ] **Step 5: Commit Canvas drawing**

```bash
git add js/CanvasRenderer.js
git commit -m "feat: draw mermaid and document tables on cards"
```

### Task 4: End-to-end preview, pagination, and PNG export verification

**Files:**
- Modify if required by discovered regression: `js/App.js`, `js/DownloadManager.js`, `js/PreviewGenerator.js`
- Verify: `editor.html`

**Interfaces:**
- Consumes: the complete Markdown-to-Canvas pipeline.
- Produces: preview canvases and downloadable PNG files containing identical Mermaid/table output.

- [ ] **Step 1: Start the static site**

```bash
python3 -m http.server 4173
```

Expected: `http://127.0.0.1:4173/editor.html` responds successfully.

- [ ] **Step 2: Load the accepted fixture through the editor**

Use the user's section 14 table and section 16 Mermaid example. Wait until the preview count stabilizes and all canvases finish rendering. Expected: no unhandled exception and no Mermaid code text in the preview.

- [ ] **Step 3: Verify pagination boundaries**

Add enough preceding paragraphs to place both elements near a page boundary. Expected: Mermaid moves intact or scales to fit; a table splits only between rows; every continuation begins with the same header; subsequent content does not overlap.

- [ ] **Step 4: Verify PNG export pixels**

Download the Mermaid card and a table card. Open both PNGs and compare them to preview screenshots. Expected: dimensions match the selected template and the exported pixels contain the same diagram/table content without browser UI controls.

- [ ] **Step 5: Verify regressions**

Load `data/default-text.md` and confirm headings, paragraphs, lists, highlighted text, code blocks, math, and images still render. Enter invalid Mermaid syntax and confirm a visible error block appears while later Markdown still renders.

- [ ] **Step 6: Run source checks**

```bash
git diff --check
rg -n "console\.log|debugger|FIXME" editor.html js
```

Expected: `git diff --check` is clean and no newly introduced debug statements or placeholders are present.

- [ ] **Step 7: Commit any end-to-end corrections**

If verification required source corrections:

```bash
git add js/App.js js/DownloadManager.js js/PreviewGenerator.js
git commit -m "fix: preserve rich blocks in preview exports"
```

If no corrections were required, do not create an empty commit.
