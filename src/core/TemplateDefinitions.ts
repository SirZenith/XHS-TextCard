/**
 * TemplateDefinitions
 * 定义每个模板特有的 Canvas 绘制逻辑和布局参数
 *
 * 每个模板的绘制逻辑已拆分为 `src/templates/` 下的独立类（实现 Template 接口），
 * 这里仅负责注册实例并通过 id 提供统一访问入口。
 */
import type { ContentBox, TemplateConfig } from '../types';
import type { Template } from '../templates/type';
import { AuraGradient } from '../templates/AuraGradient';
import { Blank } from '../templates/Blank';
import { CinematicFilm } from '../templates/CinematicFilm';
import { DeepNight } from '../templates/DeepNight';
import { ElegantBook } from '../templates/ElegantBook';
import { IosMemo } from '../templates/IosMemo';
import { MinimalistMagazine } from '../templates/MinimalistMagazine';
import { NotionStyle } from '../templates/NotionStyle';
import { Polaroid } from '../templates/Polaroid';
import { ProDoc } from '../templates/ProDoc';
import { StarryNight } from '../templates/StarryNight';
import { SwissStudio } from '../templates/SwissStudio';

export namespace TEMPLATE_DEFINITIONS {
    const templateClasses: Array<new () => Template> = [
        AuraGradient,
        Blank,
        CinematicFilm,
        DeepNight,
        ElegantBook,
        IosMemo,
        MinimalistMagazine,
        NotionStyle,
        Polaroid,
        ProDoc,
        StarryNight,
        SwissStudio,
    ]

    const styleMap = new Map<string, Template>();
    for (const Cls of templateClasses) {
        const template = new Cls();
        const name = template.name;

        if (styleMap.has(name)) {
            console.warn('repeated template name', name);
        } else {
            styleMap.set(template.name, template);
        }
    }

    export const getContentBox = (templateId: string, config: TemplateConfig, width: number, height: number): ContentBox => {
        const def = styleMap.get(templateId);
        if (typeof def?.getContentBox === 'function') {
            return def.getContentBox(config, width, height);
        }

        const padding = Number(config.textPadding) || 35;
        let topOffset = padding;
        let bottomOffset = padding;
        if (config.hasSignature) {
            bottomOffset = Math.max(padding, 60);
        }

        return {
            x: padding,
            y: topOffset,
            width: width - (padding * 2),
            height: height - topOffset - bottomOffset
        };
    }

    export const getTemplate = (name: string): Template | undefined => {
        return styleMap.get(name);
    };
}
