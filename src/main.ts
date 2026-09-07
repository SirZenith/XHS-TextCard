import './styles/main.css';
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
