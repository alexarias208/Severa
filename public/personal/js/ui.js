/* ============================================
   UI - Modal, Toast, Form Helpers, Bind Button
   ============================================ */

const UI = {
    _modalCloseTimeout: null,

    // ==================== Toast ====================
    toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon"></span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ==================== Modal ====================
    showModal(contentHtml, options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        const content = document.getElementById('modal-content');
        if (!overlay || !body) return;

        // Cancel any pending close timeout so opening a new modal right after close doesn't get cleared
        if (this._modalCloseTimeout) {
            clearTimeout(this._modalCloseTimeout);
            this._modalCloseTimeout = null;
        }

        body.innerHTML = contentHtml;
        content.className = 'modal-content';
        if (options.size === 'lg') content.classList.add('modal-lg');
        if (options.size === 'sm') content.classList.add('modal-sm');

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const closeBtn = document.getElementById('modal-close-btn');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.closeModal();
            });
        }

        const self = this;
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                e.preventDefault();
                e.stopPropagation();
                self.closeModal();
            }
        };
        
        // Prevent clicks inside modal content from bubbling to overlay
        // BUT allow interactive elements (buttons, inputs, etc.) to work normally
        if (content) {
            content.addEventListener('click', (e) => {
                // Only stop propagation if NOT clicking on interactive elements
                const isInteractive = e.target.closest('button, a, input, select, textarea, [role="button"]');
                if (!isInteractive) {
                    e.stopPropagation();
                }
            }, { capture: false, once: false });
            content.addEventListener('mousedown', (e) => {
                // Only stop propagation if NOT clicking on interactive elements
                const isInteractive = e.target.closest('button, a, input, select, textarea, [role="button"]');
                if (!isInteractive) {
                    e.stopPropagation();
                }
            }, { capture: false, once: false });
        }
        
        // Prevent clicks in body from bubbling to overlay
        // BUT allow interactive elements to work normally
        if (body) {
            body.addEventListener('click', (e) => {
                // Only stop propagation if NOT clicking on interactive elements
                const isInteractive = e.target.closest('button, a, input, select, textarea, [role="button"]');
                if (!isInteractive) {
                    e.stopPropagation();
                }
            }, { capture: false, once: false });
            body.addEventListener('mousedown', (e) => {
                // Only stop propagation if NOT clicking on interactive elements
                const isInteractive = e.target.closest('button, a, input, select, textarea, [role="button"]');
                if (!isInteractive) {
                    e.stopPropagation();
                }
            }, { capture: false, once: false });
        }

        // Focus first input if exists
        setTimeout(() => {
            const firstInput = body.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);

        // Execute callback after rendering
        if (options.onReady) {
            setTimeout(options.onReady, 50);
        }
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay) return;
        if (this._modalCloseTimeout) clearTimeout(this._modalCloseTimeout);
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
        this._modalCloseTimeout = setTimeout(() => {
            this._modalCloseTimeout = null;
            overlay.classList.add('hidden');
            overlay.onclick = null;
            const body = document.getElementById('modal-body');
            if (body) body.innerHTML = '';
        }, 300);
    },

    // ==================== Confirm Dialog ====================
    confirm(message, onConfirm, onCancel) {
        this.showModal(`
            <div class="text-center">
                <p style="font-size: var(--font-lg); margin-bottom: var(--spacing-lg);">${message}</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button id="confirm-cancel-btn" class="btn btn-secondary">Cancelar</button>
                    <button id="confirm-ok-btn" class="btn btn-danger">Confirmar</button>
                </div>
            </div>
        `, {
            size: 'sm',
            onReady: () => {
                this.bindButton('confirm-ok-btn', () => {
                    this.closeModal();
                    if (onConfirm) onConfirm();
                });
                this.bindButton('confirm-cancel-btn', () => {
                    this.closeModal();
                    if (onCancel) onCancel();
                });
            }
        });
    },

    // ==================== Bind Button ====================
    bindButton(id, handler) {
        const tryBind = () => {
            const el = document.getElementById(id);
            if (!el) {
                return null;
            }
            // Remove any existing listeners to avoid duplicates by cloning
            const newEl = el.cloneNode(true);
            el.parentNode?.replaceChild(newEl, el);
            newEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                handler(e);
            });
            return newEl;
        };

        // Try immediately
        let result = tryBind();
        if (result) {
            return result;
        }

        // If not found, try again after a short delay (for elements rendered in onReady)
        setTimeout(() => {
            result = tryBind();
            if (!result) {
                console.warn(`UI.bindButton: Element #${id} not found after retry`);
            }
        }, 100);

        return null;
    },

    // ==================== Bind Form ====================
    bindForm(id, handler) {
        const form = document.getElementById(id);
        if (!form) {
            console.warn(`UI.bindForm: Form #${id} not found`);
            return null;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => { data[key] = value; });
            handler(data, e);
        });
        return form;
    },

    // ==================== Render Helpers ====================
    formGroup(label, inputHtml, hint = '') {
        return `
            <div class="form-group">
                <label class="form-label">${label}</label>
                ${inputHtml}
                ${hint ? `<span class="form-hint">${hint}</span>` : ''}
            </div>
        `;
    },

    input(name, opts = {}) {
        const type = opts.type || 'text';
        const placeholder = opts.placeholder || '';
        const value = opts.value !== undefined ? opts.value : '';
        const required = opts.required ? 'required' : '';
        const cls = opts.cls || '';
        const extra = opts.extra || '';
        const step = opts.step ? `step="${opts.step}"` : '';
        const min = opts.min !== undefined ? `min="${opts.min}"` : '';
        const max = opts.max !== undefined ? `max="${opts.max}"` : '';
        return `<input type="${type}" name="${name}" id="input-${name}" class="form-input ${cls}" placeholder="${placeholder}" value="${this.esc(String(value))}" ${required} ${step} ${min} ${max} ${extra}>`;
    },

    select(name, options, selected = '', opts = {}) {
        const required = opts.required ? 'required' : '';
        const optionsHtml = options.map(o => {
            const val = typeof o === 'string' ? o : o.value;
            const label = typeof o === 'string' ? o : o.label;
            const sel = val === selected ? 'selected' : '';
            return `<option value="${this.esc(val)}" ${sel}>${this.esc(label)}</option>`;
        });
        return `<select name="${name}" id="input-${name}" class="form-select" ${required}>
            ${opts.placeholder ? `<option value="">${opts.placeholder}</option>` : ''}
            ${optionsHtml.join('')}
        </select>`;
    },

    textarea(name, value = '', opts = {}) {
        const placeholder = opts.placeholder || '';
        const required = opts.required ? 'required' : '';
        return `<textarea name="${name}" id="input-${name}" class="form-textarea" placeholder="${placeholder}" ${required}>${this.esc(value)}</textarea>`;
    },

    checkbox(name, label, checked = false, opts = {}) {
        const ch = checked ? 'checked' : '';
        const value = opts.value || '1';
        return `
            <label class="form-check">
                <input type="checkbox" name="${name}" value="${value}" ${ch}>
                <span class="form-check-label">${label}</span>
            </label>
        `;
    },

    // ==================== Page Title ====================
    pageTitle(title, actionHtml = '', helpKey = '') {
        const isHome = (window.location.hash || '#dashboard') === '#dashboard';
        const backBtn = isHome ? '' : `<button class="page-back" onclick="window.location.hash='#dashboard'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>Inicio</button>`;
        const helpBtn = helpKey && typeof Help !== 'undefined' ? Help.button(helpKey) : '';
        return `${backBtn}<div class="page-title"><span>${title}</span>${helpBtn}${actionHtml}</div>`;
    },

    // ==================== Empty State ====================
    emptyState(message, icon = '') {
        return `
            <div class="empty-state">
                ${icon ? `<div style="font-size:3rem; margin-bottom: 8px;">${icon}</div>` : ''}
                <p>${message}</p>
            </div>
        `;
    },

    // ==================== Escape HTML ====================
    esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    // ==================== Format Currency ====================
    money(amount) {
        const num = parseFloat(amount) || 0;
        return '$' + num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    // ==================== SHA-256 (simple hash for passwords) ====================
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
