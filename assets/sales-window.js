(() => {
  'use strict';

  const PROXY_BASE = '/apps/mochi';

  window.SalesWindow = {
    status: null,

    async check(productHandle) {
      try {
        const url = `${PROXY_BASE}/sales-window${productHandle ? `?handle=${encodeURIComponent(productHandle)}` : ''}`;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) {
          this.status = { open: true, reason: 'proxy_unavailable' };
          return this.status;
        }
        this.status = await res.json();
        return this.status;
      } catch {
        this.status = { open: true, reason: 'fetch_error' };
        return this.status;
      }
    },

    applyUI(status) {
      const banner = document.getElementById('salesWindowBanner');
      const submitButtons = document.querySelectorAll('[name="add"][type="submit"], #checkout, .cart__checkout-button');

      if (!status || status.open) {
        if (banner) banner.hidden = true;
        submitButtons.forEach((btn) => {
          if (btn.dataset.salesWindowDisabled === 'true') {
            btn.removeAttribute('disabled');
            delete btn.dataset.salesWindowDisabled;
          }
        });
        return;
      }

      if (banner) {
        banner.hidden = false;
        banner.textContent = this.getClosedMessage(status);
        banner.className = 'sales-window-banner sales-window-banner--closed';
      }

      submitButtons.forEach((btn) => {
        btn.setAttribute('disabled', 'disabled');
        btn.dataset.salesWindowDisabled = 'true';
      });
    },

    getClosedMessage(status) {
      switch (status.reason) {
        case 'manual_close':
          return '現在、販売を停止しています。';
        case 'day_closed':
          return '本日は販売時間外です。';
        case 'time_closed':
          return `販売時間は ${status.startTime}〜${status.endTime} です。`;
        default:
          return '現在ご購入いただけません。';
      }
    },

    async init(productHandle) {
      const status = await this.check(productHandle);
      this.applyUI(status);
      setInterval(async () => {
        const s = await this.check(productHandle);
        this.applyUI(s);
      }, 60000);
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('[data-product-handle]');
    const handle = section?.dataset?.productHandle || document.body.dataset?.productHandle || null;
    if (handle || document.querySelector('[data-type="add-to-cart-form"]') || document.querySelector('.cart__checkout-button, #checkout')) {
      window.SalesWindow.init(handle || null);
    }
  });
})();
