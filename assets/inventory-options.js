// inventory-options.js (2025-10 完全統合版)
(() => {
  const config = window.inventoryLinkedConfig;
  if (!config) return;

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  /* ---------- 在庫判定マネージャ ---------- */
  class InventoryManager {
    constructor(product) {
      this.title = product.title || '';
      this.stock = product.inventory || 0;
    }
    getType() {
      if (this.title.includes('雪もち')) return 'yukimochi';
      if (this.title.includes('どら焼')) return 'dorayaki';
      if (this.title.includes('おはぎ')) return 'ohagi';
      return null;
    }
    isSoldOut() {
      const t = this.getType();
      const title = this.title;
      const s = this.stock;
      switch (t) {
        case 'yukimochi':
          if (title.includes('16個') && s < 16) return true;
          if (title.includes('9個') && s < 9) return true;
          if (title.includes('4個') && s < 4) return true;
          break;
        case 'dorayaki':
          if (title.includes('9個') && s < 9) return true;
          if (title.includes('6個') && s < 6) return true;
          if (title.includes('3個') && s < 3) return true;
          break;
        case 'ohagi':
          if (title.includes('12個') && s < 12) return true;
          if (title.includes('6個') && s < 6) return true;
          if (title.includes('2個') && s < 2) return true;
          break;
      }
      return s <= 0;
    }
    applyButtonState() {
      const btn = document.querySelector('[name="add"]');
      if (!btn) return;
      if (this.isSoldOut()) {
        btn.disabled = true;
        btn.classList.add('button--soldout');
        btn.textContent = '売り切れ';
      }
    }
    renderBadges() {
      const c = document.createElement('div');
      c.className = 'product__badges product__badges--detail';
      let html = '';
      const s = this.stock;
      const t = this.getType();
      if (!t) return;
      const add = (text) =>
        (html += `<span class="badge badge--soldout">${text}</span>`);
      if (t === 'yukimochi') {
        if (s < 16) add('16個入り 売り切れ');
        if (s < 9) add('9個入り 売り切れ');
        if (s < 4) add('4個入り 売り切れ');
      } else if (t === 'dorayaki') {
        if (s < 9) add('9個入り 売り切れ');
        if (s < 6) add('6個入り 売り切れ');
        if (s < 3) add('3個入り 売り切れ');
      } else if (t === 'ohagi') {
        if (s < 12) add('12個入り 売り切れ');
        if (s < 6) add('6個入り 売り切れ');
        if (s < 2) add('2個入り 売り切れ');
      }
      if (s <= 0) add('全商品完売');
      c.innerHTML = html;
      document
        .querySelector('.product__badges')
        ?.insertAdjacentElement('afterend', c);
    }
  }

  /* ---------- 日付生成マネージャ ---------- */
  class DateManager {
    constructor(settings) { this.settings = settings; }
    generate(method) {
      const { weeksAhead, days, time, texts } = this.settings[method];
      const validDays = this.safeJSON(days, []);
      const today = new Date();
      const list = [];
      for (let i = 0; i < weeksAhead * 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (validDays.includes(d.getDay())) {
          list.push({
            id: `${method}_${d.toISOString().split('T')[0]}`,
            date: d,
            time,
            title: this.tpl(texts.titleFormat, {
              month: d.getMonth() + 1,
              day: d.getDate(),
              weekday: WEEKDAYS[d.getDay()]
            }),
            timeText: this.tpl(texts.timeFormat, { time }),
            selectableText: texts.selectable
          });
        }
        if (list.length >= config.maxOptions) break;
      }
      return list;
    }
    safeJSON(str, fb) { try { return JSON.parse(str); } catch { return fb; } }
    tpl(tpl, data) { return tpl.replace(/\[\[\s*(\w+)\s*\]\]/g, (_, k) => data[k] || ''); }
  }

  /* ---------- UIマネージャ ---------- */
  class UIManager {
    constructor(config, invMgr) {
      this.config = config;
      this.invMgr = invMgr;
      this.root = document.getElementById('inventory-options-root');
      this.dateMgr = new DateManager(config.storeSettings);
      this.state = { method: null, selected: null };
      this.renderUI();
    }

    renderUI() {
      if (this.config.autoHideUnavailable && this.invMgr.isSoldOut()) {
        this.root.innerHTML =
          `<div class="soldout-message" style="padding:20px;background:#f8d7da;color:#721c24;border-left:4px solid #b91c1c;font-weight:600;">この商品は現在完売しています。</div>`;
        return;
      }
      this.renderMethodButtons();
    }

    renderMethodButtons() {
      const { pickup, delivery } = this.config.storeSettings;
      const wrap = document.createElement('div');
      wrap.className = 'method-buttons';
      if (pickup.enabled) wrap.appendChild(this.createBtn('pickup', pickup));
      if (delivery.enabled) wrap.appendChild(this.createBtn('delivery', delivery));
      if (!wrap.children.length) {
        this.root.innerHTML = `<div class="soldout-message" style="padding:20px;background:#f8d7da;color:#721c24;border-left:4px solid #b91c1c;font-weight:600;">現在選択可能な受け取り方法はありません。</div>`;
        return;
      }
      this.root.appendChild(wrap);
    }

    createBtn(method, set) {
      const b = document.createElement('button');
      b.className = 'method-btn';
      b.dataset.method = method;
      b.innerHTML = `<strong>${set.label}</strong><br><small>${set.description}</small>`;
      b.onclick = () => this.selectMethod(method);
      return b;
    }

    selectMethod(method) {
      this.state.method = method;
      this.renderDateOptions(method);
    }

    renderDateOptions(method) {
      let area = document.querySelector('.date-selection-area');
      if (!area) {
        area = document.createElement('div');
        area.className = 'date-selection-area';
        this.root.appendChild(area);
      }
      area.innerHTML = `<h4>ご希望の日時をお選びください</h4><div class="date-options"></div>`;
      const cont = area.querySelector('.date-options');
      const list = this.dateMgr.generate(method);
      cont.innerHTML = '';
      list.forEach((opt) => {
        const el = document.createElement('button');
        el.className = 'date-option';
        el.innerHTML = `<div><div>${opt.title}</div><div>${opt.timeText}</div></div><div>${opt.selectableText}</div>`;
        el.onclick = () => this.selectOption(opt, el);
        cont.appendChild(el);
      });
    }

    selectOption(opt, el) {
      document.querySelectorAll('.date-option').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      this.state.selected = opt;
    }
  }

  /* ---------- 初期化 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const inv = new InventoryManager(config.product);
    inv.renderBadges();
    inv.applyButtonState();
    new UIManager(config, inv);
  });
})();
