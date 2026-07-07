(() => {
  'use strict';

  const PROXY_BASE = '/apps/mochi';
  let currentStockMethod = null;

  function getVariantMetafields(variantEl) {
    if (!variantEl) return {};
    try {
      return JSON.parse(variantEl.textContent || '{}');
    } catch {
      return {};
    }
  }

  function getSelectedMethod() {
    const selectedButton = document.querySelector('.method-btn.selected[data-method], .method-btn[aria-pressed="true"][data-method]');
    if (selectedButton?.dataset.method === 'pickup' || selectedButton?.dataset.method === 'delivery') {
      currentStockMethod = selectedButton.dataset.method;
      return currentStockMethod;
    }

    const methodInput = document.getElementById('selectedMethod');
    const v = methodInput?.value || '';
    if (v.includes('店') || v.toLowerCase().includes('pickup')) {
      currentStockMethod = 'pickup';
      return currentStockMethod;
    }
    if (v.includes('配送') || v.toLowerCase().includes('delivery')) {
      currentStockMethod = 'delivery';
      return currentStockMethod;
    }
    return currentStockMethod;
  }

  function syncStockMethodProperty(method) {
    if (!method) return;
    const form = document.querySelector('[data-type="add-to-cart-form"]');
    if (!form) return;
    let input = form.querySelector('input[name="properties[_grain_stock_method]"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'properties[_grain_stock_method]';
      form.appendChild(input);
    }
    input.value = method;
  }

  document.addEventListener('deliveryMethodChange', (e) => {
    const method = e.detail?.method === 'pickup' ? 'pickup' : 'delivery';
    currentStockMethod = method;
    syncStockMethodProperty(method);
    window.GrainInventory?.refresh?.();
  });

  window.GrainInventory = {
    config: null,

    init(config) {
      this.config = config;
      this.attachProperties();
      this.refresh();
      this.bindMethodSync();
    },

    bindMethodSync() {
      const methodInput = document.getElementById('selectedMethod');
      if (!methodInput) return;
      const observer = new MutationObserver(() => {
        syncStockMethodProperty(getSelectedMethod());
        this.refresh();
      });
      observer.observe(methodInput, { attributes: true, attributeFilter: ['value'] });
      methodInput.addEventListener('change', () => {
        syncStockMethodProperty(getSelectedMethod());
        this.refresh();
      });
    },

    getVariantConfig(variantId) {
      if (!this.config?.variants) return null;
      return this.config.variants[String(variantId)] || null;
    },

    attachProperties() {
      const form = document.querySelector('[data-type="add-to-cart-form"]');
      if (!form || !this.config?.enabled) return;

      const variantId = form.querySelector('[name="id"]')?.value;
      const vc = this.getVariantConfig(variantId);
      if (!vc?.group) return;

      const method = getSelectedMethod();
      if (!method) return;
      const fields = {
        '_grain_inventory_enabled': 'true',
        '_grain_inventory_group': vc.group,
        '_grain_stock_method': method,
        '_grain_units_per_item': String(vc.unitsPerItem || 0),
      };

      for (const [name, value] of Object.entries(fields)) {
        let input = form.querySelector(`input[name="properties[${name}]"]`);
        if (!input) {
          input = document.createElement('input');
          input.type = 'hidden';
          input.name = `properties[${name}]`;
          form.appendChild(input);
        }
        input.value = value;
      }
    },

    getRequiredUnits(variantId, quantity) {
      const vc = this.getVariantConfig(variantId);
      if (!vc?.group || !vc.unitsPerItem) return 0;
      return vc.unitsPerItem * (quantity || 1);
    },

    getStockQuantity(method) {
      const vc = this.getVariantConfig(this.getCurrentVariantId());
      if (!vc) return null;
      const stock = method === 'pickup' ? vc.pickupStock : vc.deliveryStock;
      return stock?.quantity ?? null;
    },

    getCurrentVariantId() {
      const form = document.querySelector('[data-type="add-to-cart-form"]');
      return form?.querySelector('[name="id"]')?.value;
    },

    isAvailable(quantity = 1) {
      if (!this.config?.enabled) return { available: true };
      const variantId = this.getCurrentVariantId();
      const vc = this.getVariantConfig(variantId);
      if (!vc?.group) return { available: true };

      const method = getSelectedMethod();
      const required = this.getRequiredUnits(variantId, quantity);
      if (!method) {
        return {
          available: true,
          required,
          stock: null,
          method: null,
          group: vc.group,
          unselected: true,
        };
      }
      const stock = method === 'pickup' ? vc.pickupStock?.quantity : vc.deliveryStock?.quantity;

      if (stock == null) return { available: true };
      return {
        available: stock >= required,
        required,
        stock,
        method,
        group: vc.group,
      };
    },

    validateProductForm(form) {
      const qtyInput = form.querySelector('[name="quantity"]');
      const quantity = parseInt(qtyInput?.value, 10) || 1;
      const result = this.isAvailable(quantity);
      if (!result.available) {
        const methodLabel = result.method === 'pickup' ? '店頭受け取り' : '発送';
        return {
          valid: false,
          message: `${result.group}の${methodLabel}用在庫が不足しています（必要: ${result.required}粒 / 残: ${result.stock}粒）`,
        };
      }
      this.attachProperties();
      return { valid: true };
    },

    updateUI() {
      const statusEl = document.getElementById('grainInventoryStatus');
      if (!statusEl || !this.config?.enabled) return;

      const result = this.isAvailable(1);
      if (!result.group) {
        statusEl.hidden = true;
        return;
      }
      if (result.unselected) {
        statusEl.hidden = true;
        return;
      }

      statusEl.hidden = false;
      const methodLabel = result.method === 'pickup' ? '店頭受け取り' : '発送';
      if (result.available) {
        statusEl.className = 'grain-inventory-status grain-inventory-status--available';
        statusEl.textContent = `${result.group}（${methodLabel}）残り ${result.stock}粒`;
      } else {
        statusEl.className = 'grain-inventory-status grain-inventory-status--soldout';
        statusEl.textContent = `${result.group}（${methodLabel}）は在庫切れです`;
      }

      const submitBtn = document.getElementById(`ProductSubmitButton-${this.config.sectionId}`);
      if (submitBtn && !result.available) {
        submitBtn.setAttribute('disabled', 'disabled');
        const span = submitBtn.querySelector('span');
        if (span) span.textContent = '在庫切れ';
      }
    },

    refresh() {
      this.attachProperties();
      this.updateUI();
    },
  };

  document.addEventListener('variant:change', () => {
    window.GrainInventory?.refresh?.();
  });
})();
