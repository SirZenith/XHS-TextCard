import './styles/third-party/monolith.min.css';
import './styles/main.css';
import './styles/third-party/loader.min.css';

import { App } from './App';

// 全局错误捕获
window.onerror = function (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) {
    console.error('[Global Error]', message, error);
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
    return false;
};

window.onunhandledrejection = function (event: PromiseRejectionEvent) {
    console.error('[Unhandled Rejection]', event.reason);
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
};

const app = new App();
app.init();

// 生产环境注册 Service Worker（离线缓存 + 移动端可安装为 Web App）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[SW] 注册失败：', err);
        });
    });
}
