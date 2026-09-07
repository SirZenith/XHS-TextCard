/**
 * EditorController - 侧边栏编辑面板控制器
 *
 * 设计原则：
 * 1. 数据驱动 UI：UI 控件的状态始终通过 currentConfig 同步，不直接操作 DOM 存储数据。
 * 2. 交互一致性：通过 configMap 映射控件类型与事件，减少重复逻辑。
 * 3. 颜色管理：集成 Pickr 取色器，并支持 Solid 与 Gradient 模式的无缝切换。
 */
import type { AppElements, TemplateConfig } from '../types/types';

/** 配置映射表条目：键名, 控件类型, 类型转换 */
interface ConfigMapEntry {
    key: string;
    type: 'range' | 'select' | 'checkbox' | 'input';
    isInt?: boolean;
    isFloat?: boolean;
    toggle?: string;
}

export class EditorController {
    private elements!: AppElements;
    private currentConfig: TemplateConfig | null = null;
    private onConfigChange: ((config: TemplateConfig) => void) | null = null;
    private onExportFormatChange: ((format: string) => void) | null = null;
    private pickrs: Record<string, PickrInstance> = {};
    private lastSolidColor: string = '#ffffff';
    private lastGradientColor: string = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';

    private swatches: string[] = [
        '#ffffff', '#E8D5C4', '#B5C0D0', '#CCD3CA', '#F5E8DD', '#9290C3', '#7C9D96',
        '#1a1a1b', '#333333', '#000000', '#495057', '#1c7ed6', '#d6336c', '#37b24d', '#f08c00'
    ];

    private configMap: ConfigMapEntry[] = [
        { key: 'fontSize', type: 'range', isInt: true },
        { key: 'lineHeight', type: 'range', isFloat: true },
        { key: 'letterSpacing', type: 'range', isFloat: true },
        { key: 'textPadding', type: 'range', isInt: true },
        { key: 'fontFamily', type: 'select' },
        { key: 'hasWatermark', type: 'checkbox', toggle: '.watermark-options' },
        { key: 'watermarkText', type: 'input' },
        { key: 'hasSignature', type: 'checkbox', toggle: '#signature-options' },
        { key: 'signatureText', type: 'input' },
        { key: 'showGrid', type: 'checkbox' },
        { key: 'showPageNumber', type: 'checkbox' },
        { key: 'h1Scale', type: 'range', isFloat: true },
        { key: 'h2Scale', type: 'range', isFloat: true },
        { key: 'h3Scale', type: 'range', isFloat: true },
        { key: 'hasCover', type: 'checkbox', toggle: '#cover-options-container' },
        { key: 'coverTitle', type: 'input' },
        { key: 'coverFontSize', type: 'range', isInt: true },
        { key: 'hasSocialIcons', type: 'checkbox', toggle: '#social-icons-options' }
    ];

    init(elements: AppElements) {
        this.elements = elements;
        if (typeof Pickr === 'undefined') {
            this.initBgModeSelector();
            this.bindEvents();
            return;
        }

        try {
            this.initPickrs();
            this.initBgModeSelector();
            this.initGradientEditor();
            this.bindEvents();
        } catch (error) {
            console.error('EditorController init failed:', error);
        }
    }

    /**
     * 初始化所有颜色取色器
     */
    initPickrs() {
        const pickrConfigs = [
            { id: '#bg-color-picker', key: 'bgColor', default: '#ffffff', type: 'bg' },
            { id: '#text-color-picker', key: 'textColor', default: '#333333', type: 'text' },
            { id: '#accent-color-picker', key: 'accentColor', default: null, type: 'accent' },
            { id: '#gradient-start-picker', key: 'gradStart', default: '#f5f7fa', type: 'grad' },
            { id: '#gradient-end-picker', key: 'gradEnd', default: '#c3cfe2', type: 'grad' },
            { id: '#watermark-color-picker', key: 'watermarkColor', default: 'rgba(0,0,0,0.1)', type: 'rgba' },
            { id: '#signature-color-picker', key: 'signatureColor', default: '#555555', type: 'rgba' }
        ];

        pickrConfigs.forEach(cfg => {
            this.pickrs[cfg.key] = this.createPickr(cfg.id, cfg.default, (color: PickrColor) => {
                if (!this.currentConfig) return;
                if (cfg.type === 'rgba') {
                    this.currentConfig[cfg.key] = color.toRGBA().toString(3);
                } else if (cfg.type === 'grad') {
                    this.updateGradientFromPickrs();
                } else if (['bg', 'text', 'accent'].includes(cfg.type)) {
                    const hex = color.toHEXA().toString();
                    this.handleColorSelection(cfg.type, hex);
                }
                this.notifyConfigChange();
            });
        });
    }

    /**
     * 统一处理颜色选择逻辑 (包括预设和自定义)
     */
    handleColorSelection(type: string, color: string) {
        if (!this.currentConfig) return;

        const keyMap: Record<string, string> = { bg: 'bgColor', text: 'textColor', accent: 'accentColor' };
        const configKey = keyMap[type];

        if (type === 'bg') {
            const isGrad = color.startsWith('linear-gradient');
            this.currentConfig.bgMode = isGrad ? 'gradient' : 'solid';
            this.setBgMode(this.currentConfig.bgMode);
            if (isGrad) {
                this.lastGradientColor = color;
            } else {
                this.pickrs.bgColor?.setColor(color, true);
                this.lastSolidColor = color;
            }
        } else {
            this.pickrs[configKey]?.setColor(color, true);
        }

        this.currentConfig[configKey] = color;
        this.updateActivePreset(type + '-color', color);
    }

    createPickr(el: string, defaultColor: string | null, onChange: (color: PickrColor) => void): PickrInstance {
        return Pickr.create({
            el: el, theme: 'monolith', default: defaultColor, swatches: this.swatches,
            components: {
                preview: true, opacity: true, hue: true,
                interaction: { hex: true, rgba: true, input: true, save: true }
            },
            strings: { save: '确定' }
        }).on('save', (color: PickrColor, instance: PickrInstance) => {
            onChange(color);
            instance.hide();
        });
    }

    /**
     * 渐变编辑器弹窗逻辑
     */
    initGradientEditor() {
        const plusBtn = document.querySelector('#bg-color-picker-container .fa-plus');
        const popup = document.getElementById('gradient-editor-panel');
        if (!plusBtn || !popup) return;

        const plusParent = plusBtn.parentNode;
        if (!plusParent) return;

        plusParent.addEventListener('click', (e: Event) => {
            if (this.currentConfig?.bgMode === 'gradient') {
                e.stopPropagation();
                popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                if (popup.style.display === 'block') this.parseCurrentGradient();
            }
        });

        popup.querySelector('.close-popup')?.addEventListener('click', () => popup.style.display = 'none');

        document.getElementById('gradient-angle')?.addEventListener('input', (e: Event) => {
            const deg = (e.target as HTMLInputElement).value;
            const label = document.getElementById('gradient-angle-value');
            if (label) label.textContent = deg + 'deg';
            this.updateGradientFromPickrs();
        });

        document.addEventListener('click', (e: Event) => {
            if (!popup.contains(e.target as Node) && !plusParent.contains(e.target as Node) && !(e.target as Element).closest('.pcr-app')) {
                popup.style.display = 'none';
            }
        });
    }

    /**
     * 解析现有 CSS 渐变字符串并同步到控件
     */
    parseCurrentGradient() {
        if (!this.currentConfig) return;
        const bg = this.currentConfig.bgColor;
        if (!bg || typeof bg !== 'string' || !bg.startsWith('linear-gradient')) return;

        const colors = bg.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgba?\(.*?\)/g);
        if (colors && colors.length >= 2) {
            this.pickrs.gradStart.setColor(colors[0], true);
            this.pickrs.gradEnd.setColor(colors[colors.length - 1], true);
        }
        const angleMatch = bg.match(/(\d+)deg/);
        if (angleMatch) {
            const angleInput = document.getElementById('gradient-angle');
            if (angleInput) (angleInput as HTMLInputElement).value = angleMatch[1];
            const label = document.getElementById('gradient-angle-value');
            if (label) label.textContent = angleMatch[0];
        }
    }

    updateGradientFromPickrs() {
        if (!this.currentConfig) return;
        const start = this.pickrs.gradStart.getColor().toHEXA().toString();
        const end = this.pickrs.gradEnd.getColor().toHEXA().toString();
        const deg = (document.getElementById('gradient-angle') as HTMLInputElement | null)?.value || 135;
        const gradString = `linear-gradient(${deg}deg, ${start} 0%, ${end} 100%)`;
        this.currentConfig.bgColor = gradString;
        this.lastGradientColor = gradString;
        this.currentConfig.bgMode = 'gradient';
        this.notifyConfigChange();
    }

    initBgModeSelector() {
        document.querySelectorAll<HTMLElement>('.bg-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setBgMode(btn.dataset.mode || 'solid');
                this.notifyConfigChange();
            });
        });
    }

    setBgMode(mode: string) {
        document.querySelectorAll<HTMLElement>('.bg-mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

        const solidPresets = document.querySelector('.solid-presets');
        const gradientPresets = document.querySelector('.gradient-presets');
        const bgPickrRoot = document.querySelector('#bg-color-picker-container .pickr');

        if (solidPresets) (solidPresets as HTMLElement).style.display = mode === 'solid' ? 'flex' : 'none';
        if (gradientPresets) (gradientPresets as HTMLElement).style.display = mode === 'gradient' ? 'flex' : 'none';
        if (bgPickrRoot) (bgPickrRoot as HTMLElement).style.display = mode === 'solid' ? 'block' : 'none';

        const gradientPanel = document.getElementById('gradient-editor-panel');
        if (gradientPanel) gradientPanel.style.display = 'none';

        if (this.currentConfig) {
            this.currentConfig.bgMode = mode;
            const isCurrentGrad = typeof this.currentConfig.bgColor === 'string' && this.currentConfig.bgColor.includes('linear-gradient');
            if (mode === 'solid' && isCurrentGrad) {
                this.currentConfig.bgColor = this.lastSolidColor || '#ffffff';
            } else if (mode === 'gradient' && !isCurrentGrad) {
                this.currentConfig.bgColor = this.lastGradientColor || 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
            }
        }
    }

    bindEvents() {
        this.elements.editorTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.elements.editorTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const currentTab = tab.dataset.tab;
                this.elements.visualEditor?.classList.toggle('active', currentTab === 'visual');
                this.elements.coverEditor?.classList.toggle('active', currentTab === 'cover');
            });
        });

        // 导出格式选择器
        document.querySelectorAll<HTMLElement>('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll<HTMLElement>('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const format = btn.dataset.format;
                const hint = document.getElementById('format-hint');
                if (hint) {
                    if (format === 'png') {
                        hint.textContent = 'PNG：无损压缩，最高画质';
                    } else {
                        hint.textContent = 'JPEG：文件小，缩略图更清晰';
                    }
                }

                // 通知App更新导出格式
                if (this.onExportFormatChange) this.onExportFormatChange(format || 'png');
            });
        });

        const presetGroups = [
            { container: '#bg-color-presets', type: 'bg' },
            { container: '#text-color-presets', type: 'text' },
            { container: '#accent-color-presets', type: 'accent' }
        ];
        presetGroups.forEach(group => {
            document.querySelectorAll<HTMLElement>(`${group.container} .color-preset`).forEach(preset => {
                preset.addEventListener('click', () => {
                    const color = preset.dataset.color;
                    this.handleColorSelection(group.type, color || '');
                    this.notifyConfigChange();
                });
            });
        });

        this.configMap.forEach(cfg => {
            const el = this.getControlElement(cfg);
            if (!el) return;
            const eventType = (cfg.type === 'range' || cfg.type === 'input') ? 'input' : 'change';
            el.addEventListener(eventType, (e: Event) => {
                const target = e.target as HTMLInputElement;
                const val = cfg.type === 'checkbox' ? target.checked : target.value;
                this.updateConfigAndNotify(cfg, val);
            });
        });

        // 封面图片上传逻辑
        const uploadBtn = document.getElementById('upload-cover-btn');
        const fileInput = document.getElementById('cover-image-input') as HTMLInputElement | null;
        const fileNameHint = document.getElementById('cover-file-name');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e: Event) => {
                if (!this.currentConfig) return;
                const input = e.target as HTMLInputElement;
                const file = input.files ? input.files[0] : null;
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                    alert('图片大小不能超过 10MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target ? String(event.target.result || '') : '';
                    this.currentConfig!.coverImage = dataUrl;
                    if (fileNameHint) fileNameHint.textContent = file.name;
                    this.notifyConfigChange();
                    fileInput.value = '';
                };
                reader.readAsDataURL(file);
            });
        }

        // 社交图标选择逻辑
        document.querySelectorAll<HTMLElement>('.social-icon-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!this.currentConfig) return;
                const iconId = item.dataset.icon || '';
                let selectedIcons = [...(this.currentConfig.selectedSocialIcons || [])];

                const index = selectedIcons.indexOf(iconId);
                if (index > -1) {
                    // 如果已选中，则移除
                    selectedIcons.splice(index, 1);
                    item.classList.remove('selected');
                } else {
                    // 如果未选中，则追加到末尾
                    selectedIcons.push(iconId);
                    item.classList.add('selected');
                }

                this.currentConfig.selectedSocialIcons = selectedIcons;
                this.notifyConfigChange();
            });
        });

        // 社交图标位置选择器
        document.querySelectorAll<HTMLElement>('#social-icons-options .format-btn[data-position]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.currentConfig) return;
                document.querySelectorAll<HTMLElement>('#social-icons-options .format-btn[data-position]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const position = btn.dataset.position || 'top-right';
                this.currentConfig.socialIconPosition = position;
                this.notifyConfigChange();
            });
        });

        // 重置所有设置
        const resetBtn = document.getElementById('reset-storage-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('确定要重置所有设置吗？这将删除所有本地保存的模板配置并刷新页面。')) {
                    // 遍历 localStorage，删除所有以 xhs_tpl_config_ 开头的项
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('xhs_tpl_config_') || key === 'xhs_last_template_id') {
                            localStorage.removeItem(key);
                        }
                    });
                    window.location.reload();
                }
            });
        }
    }

    updateConfigAndNotify(cfg: ConfigMapEntry, rawValue: string | boolean) {
        if (!this.currentConfig) return;
        let val: string | number | boolean = rawValue;
        if (cfg.isInt) val = parseInt(String(val)) || 0;
        if (cfg.isFloat) val = parseFloat(String(val)) || 0;

        this.currentConfig[cfg.key] = val;
        this.updateUIControl(cfg, val);
        this.notifyConfigChange();
    }

    getControlElement(cfg: ConfigMapEntry): any {
        if (this.elements[cfg.key + 'Input']) return this.elements[cfg.key + 'Input'];
        if (this.elements[cfg.key + 'Check']) return this.elements[cfg.key + 'Check'];
        if (this.elements[cfg.key + 'Select']) return this.elements[cfg.key + 'Select'];
        const fallbackId = cfg.key.replace(/([A-Z])/g, "-$1").toLowerCase();
        return document.getElementById(fallbackId);
    }

    updateUIControl(cfg: ConfigMapEntry, val: string | number | boolean) {
        // 尝试从 elements 获取 label，如果不存在则通过 ID 查找
        let label = this.elements[cfg.key + 'Value'];
        if (!label) {
            const labelId = cfg.key.replace(/([A-Z])/g, "-$1").toLowerCase() + '-value';
            label = document.getElementById(labelId);
        }

        let displayVal: string | number | boolean = val;
        if (['fontSize', 'textPadding', 'letterSpacing', 'coverFontSize'].includes(cfg.key)) displayVal = val + 'px';
        else if (cfg.key.endsWith('Scale')) displayVal = val + 'x';

        if (label) label.textContent = String(displayVal);
        if (cfg.type === 'checkbox' && cfg.toggle) {
            document.querySelectorAll(cfg.toggle).forEach(node => { (node as HTMLElement).style.display = val ? 'flex' : 'none'; });
        }
    }

    /**
     * 设置全量配置并同步到 UI
     */
    setConfig(config: TemplateConfig) {
        this.currentConfig = JSON.parse(JSON.stringify(config));
        if (config.bgColor) {
            if (config.bgColor.startsWith('linear-gradient')) this.lastGradientColor = config.bgColor;
            else this.lastSolidColor = config.bgColor;
        }

        this.updateEditorFromConfig();

        if (config.bgColor) {
            this.updateActivePreset('bg-color', config.bgColor);
            if (!config.bgColor.startsWith('linear-gradient')) this.pickrs.bgColor?.setColor(config.bgColor, true);
        }
        if (config.textColor) {
            this.updateActivePreset('text-color', config.textColor);
            this.pickrs.textColor?.setColor(config.textColor, true);
        }
        if (config.accentColor) {
            this.updateActivePreset('accent-color', config.accentColor);
            this.pickrs.accentColor?.setColor(config.accentColor, true);
        }
        if (config.watermarkColor) this.pickrs.watermarkColor?.setColor(config.watermarkColor, true);
        if (config.signatureColor) this.pickrs.signatureColor?.setColor(config.signatureColor, true);

        // 更新封面图片提示
        const fileNameHint = document.getElementById('cover-file-name');
        if (fileNameHint) {
            const isCustom = config.coverImage && config.coverImage.startsWith('data:');
            fileNameHint.textContent = isCustom ? '已上传自定义图片' : '默认背景';
        }
    }

    updateActivePreset(type: string, color: string) {
        if (!color) return;
        let containerId: string | undefined;

        if (type === 'bg-color') containerId = 'bg-color-presets';
        else if (type === 'text-color') containerId = 'text-color-presets';
        else if (type === 'accent-color') containerId = 'accent-color-presets';

        if (!containerId) return;

        let foundPreset = false;
        const colorLower = color.toLowerCase();
        document.querySelectorAll<HTMLElement>(`#${containerId} .color-preset`).forEach(p => {
            const isActive = (p.dataset.color || '').toLowerCase() === colorLower;
            p.classList.toggle('active', isActive);
            if (isActive) foundPreset = true;
        });

        // 处理自定义颜色预览
        const pickerWrapper = document.querySelector(`#${containerId} .color-picker-wrapper`);
        if (pickerWrapper) {
            const isGradient = color.startsWith('linear-gradient');
            if (!foundPreset && !isGradient) {
                pickerWrapper.classList.add('active');
                (pickerWrapper as HTMLElement).style.backgroundColor = color;
                // 对于非常浅的颜色，增加边框以便识别
                (pickerWrapper as HTMLElement).style.borderColor = 'var(--color-primary)';
            } else {
                pickerWrapper.classList.remove('active');
                (pickerWrapper as HTMLElement).style.backgroundColor = ''; // 清除内联样式，回归 CSS 默认
                (pickerWrapper as HTMLElement).style.borderColor = '';
            }
        }
    }

    updateEditorFromConfig() {
        if (!this.currentConfig) return;
        this.setBgMode(this.currentConfig.bgMode || 'solid');
        this.configMap.forEach(cfg => {
            const el = this.getControlElement(cfg);
            const val = this.currentConfig![cfg.key];
            if (el) {
                if (cfg.type === 'checkbox') el.checked = !!val;
                else el.value = val || '';
            }
            this.updateUIControl(cfg, val);
        });

        // 恢复社交图标选择状态
        const selectedIcons = this.currentConfig.selectedSocialIcons || [];
        document.querySelectorAll<HTMLElement>('.social-icon-item').forEach(item => {
            const isSelected = selectedIcons.includes(item.dataset.icon || '');
            item.classList.toggle('selected', isSelected);
        });

        // 恢复社交图标位置选择状态
        const socialIconPosition = this.currentConfig.socialIconPosition || 'top-right';
        document.querySelectorAll<HTMLElement>('#social-icons-options .format-btn[data-position]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === socialIconPosition);
        });
    }

    setOnConfigChange(callback: (config: TemplateConfig) => void) { this.onConfigChange = callback; }
    setOnExportFormatChange(callback: (format: string) => void) { this.onExportFormatChange = callback; }
    notifyConfigChange() { if (this.onConfigChange && this.currentConfig) this.onConfigChange(this.currentConfig); }
}
