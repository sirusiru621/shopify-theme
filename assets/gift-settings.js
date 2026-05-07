// ファイル名: assets/gift-settings.js
// 修正点: 1) 宛名書きのリアルタイム文字数カウントを確実化 2) 保存ボタンが常時グレーアウトになる問題を解消
// 互換性: 既存のモーダル/フォーム構造が異なる場合にも動作するようスコープとセレクタを冗長化

class GiftSettings {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.config = this.loadConfig();
    this.isOpen = false;
    this.currentSettings = {};
    this.isAnimating = false;
    this.touchStartY = 0;
    this.scrollTop = 0;

    this.initializeElements();
    this.bindEvents();
    this.bindLiveValidation();
    this.bindAddresseeCounter();
    this.loadSavedSettings();
    this.setupResponsiveHandling();

    this.updateAddresseeCount();
    this.updateLiveValidation();
  }

  loadConfig() {
    const el = document.getElementById(`gift-settings-config-${this.sectionId}`);
    if (!el) return {};
    try { return JSON.parse(el.textContent || '{}'); } catch(e){ console.error('config parse error', e); return {}; }
  }

  initializeElements() {
    const scopeSel = (sel) => {
      return (
        document.querySelector(`#gift-modal-${this.sectionId} ${sel}`) ||
        document.querySelector(`#gift-form-${this.sectionId} ${sel}`) ||
        document.querySelector(sel)
      );
    };

    this.elements = {
      trigger: document.querySelector(`[data-gift-modal-trigger][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-modal-trigger]`),
      modal: document.getElementById(`gift-modal-${this.sectionId}`) || scopeSel(`#gift-modal-${this.sectionId}`),
      modalContent: scopeSel(`#gift-modal-${this.sectionId} .gift-modal-content`),
      backdrop: scopeSel(`#gift-modal-${this.sectionId} .gift-modal-backdrop`),
      form: document.getElementById(`gift-form-${this.sectionId}`) || scopeSel(`#gift-form-${this.sectionId}`) || scopeSel('[data-gift-form]'),
      summary: document.getElementById(`gift-summary-${this.sectionId}`) || scopeSel(`#gift-summary-${this.sectionId}`),

      // 入力
      quantity: document.getElementById(`gift-quantity-${this.sectionId}`) || scopeSel(`#gift-quantity-${this.sectionId}`) || scopeSel('[data-gift-quantity]'),
      noshi: document.getElementById(`gift-noshi-${this.sectionId}`) || scopeSel(`#gift-noshi-${this.sectionId}`),
      purpose: document.getElementById(`gift-purpose-${this.sectionId}`) || scopeSel(`#gift-purpose-${this.sectionId}`) || scopeSel('[data-gift-purpose]'),
      inscriptionRadios: (document.getElementById(`gift-form-${this.sectionId}`) || document).querySelectorAll(`#gift-form-${this.sectionId} input[name="gift_inscription"], input[name="gift_inscription"]`),
      insideOutside: document.getElementById(`gift-inside-outside-${this.sectionId}`) || scopeSel(`#gift-inside-outside-${this.sectionId}`),

      // 宛名（任意）
      addressee: document.getElementById(`gift-addressee-${this.sectionId}`) || scopeSel(`#gift-addressee-${this.sectionId}`) || scopeSel('[data-gift-addressee]'),
      addresseeCount: document.getElementById(`gift-addressee-count-${this.sectionId}`) || scopeSel('.gift-char-counter [data-char-count]') || scopeSel('[data-char-count]'),

      // 隠しフィールド（存在しない場合もある）
      hiddenQuantity: document.getElementById(`gift-quantity-hidden-${this.sectionId}`),
      hiddenNoshi: document.getElementById(`gift-noshi-hidden-${this.sectionId}`),
      hiddenPurpose: document.getElementById(`gift-purpose-hidden-${this.sectionId}`),
      hiddenInscription: document.getElementById(`gift-inscription-hidden-${this.sectionId}`),
      hiddenInsideOutside: document.getElementById(`gift-inside-outside-hidden-${this.sectionId}`),
      hiddenAddressee: document.getElementById(`gift-addressee-hidden-${this.sectionId}`),

      // 送信ボタン（type="button"やdata属性にも対応）
      submitButton:
        (document.getElementById(`gift-form-${this.sectionId}`) || document).querySelector(
          '[data-gift-submit], [data-gift-confirm], .gift-submit-button, button[type="submit"]'
        ),

      // サマリー
      status: document.querySelector(`[data-gift-status][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-status]`),
      summaryElements: {
        quantity: document.querySelector(`[data-gift-quantity][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-quantity]`),
        noshi: document.querySelector(`[data-gift-noshi][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-noshi]`),
        purpose: document.querySelector(`[data-gift-purpose][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-purpose]`),
        inscription: document.querySelector(`[data-gift-inscription][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-inscription]`),
        insideOutside: document.querySelector(`[data-gift-inside-outside][data-section-id="${this.sectionId}"]`) || document.querySelector(`[data-gift-inside-outside]`)
      }
    };
  }

  setupResponsiveHandling() {
    this.resizeHandler = this.debounce(() => { if (this.isOpen) this.adjustModalForViewport(); }, 250);
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('orientationchange', this.resizeHandler);
  }

  adjustModalForViewport() {
    if (!this.elements.modalContent) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 768) { this.elements.modalContent.style.maxHeight = '100vh'; this.elements.modalContent.style.borderRadius = '0'; }
    else { this.elements.modalContent.style.maxHeight = '90vh'; this.elements.modalContent.style.borderRadius = '1rem'; }
    if (vh < 600) this.elements.modalContent.style.maxHeight = '100vh';
  }

  debounce(fn, wait) {
    let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); };
  }

  bindEvents() {
    this.elements.trigger?.addEventListener('click', (e)=>{ e.preventDefault(); this.openModal(); });
    this.elements.backdrop?.addEventListener('click', ()=> this.closeModal());
    this.elements.modal?.addEventListener('click', (e)=>{
      if (e.target.matches('[data-gift-modal-close]') || e.target.closest?.('[data-gift-modal-close]')) { e.preventDefault(); this.closeModal(); }
    });
    document.querySelector(`[data-gift-edit][data-section-id="${this.sectionId}"]`)?.addEventListener('click', (e)=>{ e.preventDefault(); this.openModal(); });

    // 保存ボタンクリック（type="button"でも動作）
    this.elements.submitButton?.addEventListener('click', (e)=>{
      // button[type="submit"] ならフォームが自然発火するが、明示的にも処理
      if (this.elements.submitButton?.disabled) return;
      if (this.elements.form?.matches('form')) {
        const ev = new Event('submit', {cancelable:true});
        if (!this.elements.form.dispatchEvent(ev)) return;
      }
      this.handleSubmit(e);
    });

    // フォームのsubmit（任意）
    this.elements.form?.addEventListener('submit', (e)=> this.handleSubmit(e));

    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && this.isOpen && !this.isAnimating) this.closeModal(); });
    this.elements.modal?.addEventListener('keydown', (e)=> this.handleKeyDown(e));
    this.setupTouchEvents();
    this.elements.modal?.addEventListener('scroll', ()=>{ this.scrollTop = this.elements.modal.scrollTop; });
  }

  bindLiveValidation() {
    const onAnyChange = ()=> this.updateLiveValidation();
    this.elements.quantity?.addEventListener('change', onAnyChange);
    this.elements.noshi?.addEventListener('change', onAnyChange);
    this.elements.purpose?.addEventListener('change', onAnyChange);
    this.elements.insideOutside?.addEventListener('change', onAnyChange);
    Array.from(this.elements.inscriptionRadios || []).forEach(r=> r.addEventListener('change', onAnyChange));
    this.elements.addressee?.addEventListener('input', ()=>{ this.updateAddresseeCount(); this.updateLiveValidation(); });
  }

  bindAddresseeCounter() { this.updateAddresseeCount(); }

  getAddresseeMaxLen() {
    const c = Number(this.config.addresseeMaxLength);
    if (c > 0) return c;
    const a = Number(this.elements.addressee?.getAttribute('maxlength'));
    return a > 0 ? a : 20;
  }

  codePointLength(s){ return Array.from(s || '').length; }

  updateAddresseeCount() {
    if (!this.elements.addressee || !this.elements.addresseeCount) return;
    const max = this.getAddresseeMaxLen();
    let val = this.elements.addressee.value || '';
    let len = this.codePointLength(val);
    if (len > max) {
      this.elements.addressee.value = Array.from(val).slice(0, max).join('');
      len = max;
    }
    this.elements.addresseeCount.textContent = String(len);
  }

  updateLiveValidation() {
    // 要素が存在する場合のみ必須扱い。存在しなければクリア扱いでOK
    const okIfPresent = (el)=> el ? !!el.value : true;
    const radiosOk = ()=>{
      const list = Array.from(this.elements.inscriptionRadios || []);
      return list.length ? !!list.find(r=> r.checked) : true;
    };
    const addOk = ()=>{
      if (!this.elements.addressee) return true;
      return this.codePointLength(this.elements.addressee.value || '') <= this.getAddresseeMaxLen();
    };

    const quantityOk = okIfPresent(this.elements.quantity);
    const noshiOk = okIfPresent(this.elements.noshi);
    const purposeOk = okIfPresent(this.elements.purpose);
    const insideOutsideOk = okIfPresent(this.elements.insideOutside);
    const inscriptionOk = radiosOk();
    const addresseeOk = addOk();

    const allOk = quantityOk && noshiOk && purposeOk && insideOutsideOk && inscriptionOk && addresseeOk;

    if (this.elements.submitButton) {
      this.elements.submitButton.disabled = !allOk;
      this.elements.submitButton.classList.toggle('is-enabled', allOk);
      this.elements.submitButton.classList.toggle('is-disabled', !allOk);
    }
    return allOk;
  }

  setupTouchEvents() {
    if (!this.elements.modalContent || !this.elements.modal) return;
    this.elements.modalContent.addEventListener('touchstart', (e)=>{ this.touchStartY = e.touches[0].clientY; }, {passive:true});
    this.elements.modalContent.addEventListener('touchmove', (e)=>{
      const d = e.touches[0].clientY - this.touchStartY;
      if (d < 0) return;
      if (d > 50 && this.elements.modal.scrollTop === 0) {
        this.elements.modalContent.style.transform = `translateY(${Math.min(d/3, 50)}px)`;
        this.elements.modalContent.style.opacity = Math.max(1 - d/300, 0.7);
      }
    }, {passive:true});
    this.elements.modalContent.addEventListener('touchend', (e)=>{
      const d = e.changedTouches[0].clientY - this.touchStartY;
      if (d > 100 && this.elements.modal.scrollTop === 0) this.closeModal();
      else { this.elements.modalContent.style.transform = ''; this.elements.modalContent.style.opacity = ''; }
    }, {passive:true});
  }

  async openModal() {
    if (this.isAnimating || this.isOpen) return;
    this.isAnimating = true; this.isOpen = true;
    this.previousScrollTop = window.pageYOffset;

    if (this.elements.modal) {
      this.elements.modal.style.display = 'flex';
      this.elements.modal.setAttribute('aria-hidden', 'false');
    }
    this.adjustModalForViewport();

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.previousScrollTop}px`;
    document.body.style.width = '100%';

    await this.waitForAnimation();

    const firstFocusable = this.elements.modal?.querySelector('select, input, button');
    firstFocusable?.focus();
    this.elements.trigger?.setAttribute('aria-expanded', 'true');

    this.isAnimating = false;

    this.updateAddresseeCount();
    this.updateLiveValidation();
  }

  async closeModal() {
    if (this.isAnimating || !this.isOpen) return;
    this.isAnimating = true; this.isOpen = false;

    this.elements.modalContent?.classList.add('closing');
    await this.waitForAnimation(200);

    if (this.elements.modal) {
      this.elements.modal.style.display = 'none';
      this.elements.modal.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    window.scrollTo(0, this.previousScrollTop);
    this.elements.trigger?.focus();
    this.elements.trigger?.setAttribute('aria-expanded', 'false');

    this.elements.modalContent?.classList.remove('closing');
    if (this.elements.modalContent){ this.elements.modalContent.style.transform=''; this.elements.modalContent.style.opacity=''; }

    this.isAnimating = false;
  }

  waitForAnimation(ms=300){ return new Promise(r=> setTimeout(r, ms)); }

  handleKeyDown(e){ if (e.key === 'Tab') this.trapFocus(e); }

  trapFocus(e) {
    if (!this.elements.modal) return;
    const focusable = this.elements.modal.querySelectorAll('select, input, button, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  async handleSubmit(e) {
    e?.preventDefault?.();
    if (!this.updateLiveValidation()) {
      // validateForm（メッセージ付）を必要なら呼ぶ
      // this.validateForm();
      return;
    }

    const btn = this.elements.submitButton;
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

    try {
      await new Promise(r=> setTimeout(r, 200));
      this.saveSettings();
      this.updateHiddenFields();
      this.syncLineItemProperties(); // カート連携を確実化
      this.updateSummary();
      this.updateStatus();
      this.showSuccessMessage();
      await this.closeModal();
    } catch(err){
      console.error(err);
      this.showErrorMessage('設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
  }

  saveSettings() {
    const insRadio = Array.from(this.elements.inscriptionRadios || []).find(r=> r.checked);
    this.currentSettings = {
      quantity: this.elements.quantity?.value || '',
      noshi: this.elements.noshi?.value || '',
      purpose: this.elements.purpose?.value || '',
      inscription: insRadio?.value || '',
      insideOutside: this.elements.insideOutside?.value || '',
      addressee: this.elements.addressee?.value || ''
    };
    try { localStorage.setItem(`gift-settings-${this.sectionId}`, JSON.stringify(this.currentSettings)); } catch(e){}
  }

  loadSavedSettings() {
    try {
      const saved = localStorage.getItem(`gift-settings-${this.sectionId}`);
      if (!saved) return;
      this.currentSettings = JSON.parse(saved);
      if (this.elements.quantity) this.elements.quantity.value = this.currentSettings.quantity || '';
      if (this.elements.noshi) this.elements.noshi.value = this.currentSettings.noshi || '';
      if (this.elements.purpose) this.elements.purpose.value = this.currentSettings.purpose || '';
      if (this.elements.insideOutside) this.elements.insideOutside.value = this.currentSettings.insideOutside || '';
      if (this.elements.addressee) this.elements.addressee.value = this.currentSettings.addressee || '';
      Array.from(this.elements.inscriptionRadios || []).forEach(r=> r.checked = r.value === this.currentSettings.inscription);
      this.updateHiddenFields();
      this.updateSummary();
      this.updateStatus();
    } catch(e){}
  }

  updateHiddenFields() {
    if (this.elements.hiddenQuantity) this.elements.hiddenQuantity.value = this.currentSettings.quantity || '';
    if (this.elements.hiddenNoshi) this.elements.hiddenNoshi.value = this.currentSettings.noshi || '';
    if (this.elements.hiddenPurpose) this.elements.hiddenPurpose.value = this.currentSettings.purpose || '';
    if (this.elements.hiddenInscription) this.elements.hiddenInscription.value = this.currentSettings.inscription || '';
    if (this.elements.hiddenInsideOutside) this.elements.hiddenInsideOutside.value = this.currentSettings.insideOutside || '';
    if (this.elements.hiddenAddressee) this.elements.hiddenAddressee.value = this.currentSettings.addressee || '';
  }

  // 商品フォームに line item properties を同期（セクション外のフォームにも対応）
  syncLineItemProperties() {
    const productForm =
      (this.config.productFormId && document.getElementById(this.config.productFormId)) ||
      this.elements.form?.closest('form[action*="/cart/add"]') ||
      document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const names = (this.config.propertyNames) || {
      quantity: 'ギフト設定_数量',
      noshi: 'ギフト設定_のし・シール',
      purpose: 'ギフト設定_用途',
      inscription: 'ギフト設定_表書き',
      insideOutside: 'ギフト設定_内外',
      addressee: 'ギフト設定_宛名書き'
    };

    const setProp = (n, v)=>{
      if (!n) return;
      const sel = `input[name="properties[${this.cssEscapeAttr(n)}]"]`;
      let input = productForm.querySelector(sel);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = `properties[${n}]`;
        productForm.appendChild(input);
      }
      input.value = v || '';
    };

    setProp(names.quantity, this.currentSettings.quantity);
    setProp(names.noshi, this.currentSettings.noshi);
    setProp(names.purpose, this.currentSettings.purpose);
    setProp(names.inscription, this.currentSettings.inscription);
    setProp(names.insideOutside, this.currentSettings.insideOutside);
    setProp(names.addressee, this.currentSettings.addressee);
  }

  updateSummary() {
    const has = Object.values(this.currentSettings).some(v=> v);
    if (has && this.elements.summary) {
      this.elements.summary.style.display = 'block';
      const m = this.elements.summaryElements;
      if (m.quantity) m.quantity.textContent = this.currentSettings.quantity || '未設定';
      if (m.noshi) m.noshi.textContent = this.currentSettings.noshi || '未設定';
      if (m.purpose) m.purpose.textContent = this.currentSettings.purpose || '未設定';
      if (m.inscription) m.inscription.textContent = this.currentSettings.inscription || '未設定';
      if (m.insideOutside) m.insideOutside.textContent = this.currentSettings.insideOutside || '未設定';
    } else if (this.elements.summary) {
      this.elements.summary.style.display = 'none';
    }
  }

  updateStatus() {
    if (!this.elements.status) return;
    const has = Object.values(this.currentSettings).some(v=> v);
    if (has) { this.elements.status.textContent = '(設定済み)'; this.elements.status.style.display = 'inline'; }
    else { this.elements.status.textContent = ''; this.elements.status.style.display = 'none'; }
  }

  showSuccessMessage() {
    document.querySelector('.gift-success-message')?.remove();
    const el = document.createElement('div');
    el.className = 'gift-success-message';
    el.textContent = 'ギフト設定を保存しました';
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.animation='slideInRight 0.3s ease-out reverse'; setTimeout(()=> el.remove(), 300); }, 3000);
  }

  showErrorMessage(msg) {
    const err = document.createElement('div');
    err.className = 'gift-error-message';
    err.textContent = msg;
    this.elements.form?.insertBefore(err, this.elements.form.firstChild);
    setTimeout(()=> err.remove(), 5000);
  }

  cssEscapeAttr(s){ return String(s).replace(/["\]]/g, '\\$&'); }

  clearSettings() {
    this.currentSettings = {};
    this.updateHiddenFields();
    this.updateSummary();
    this.updateStatus();
    this.elements.form?.reset();
    try { localStorage.removeItem(`gift-settings-${this.sectionId}`); } catch(e){}
    this.updateAddresseeCount();
    this.updateLiveValidation();
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    if (this.isOpen) this.closeModal();
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  const blocks = document.querySelectorAll('[id^="gift-settings-config-"]');
  const instances = [];
  blocks.forEach(b=>{
    const sectionId = b.id.replace('gift-settings-config-', '');
    instances.push(new GiftSettings(sectionId));
  });
  window.addEventListener('beforeunload', ()=> instances.forEach(i=> i.destroy()));
});

// カート更新ログ（任意）
document.addEventListener('cart:updated', (e)=> console.log('Cart updated with gift settings:', e.detail));
