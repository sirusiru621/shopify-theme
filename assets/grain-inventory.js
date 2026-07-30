(() => {
  'use strict';

  const PROXY_BASE = '/apps/mochi';
  let currentStockMethod = null;
  let selectedShippingSlot = null;
  let selectedPickupSlot = null;
  const pickupComponentStocks = new Map();
  const pickupComponentLoads = new Set();

  function normalizeComponents(value) {
    let parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); } catch (_) { return {}; }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result = {};
    Object.entries(parsed).forEach(([id, rawUnits]) => {
      const units = Number(rawUnits);
      if (id && Number.isInteger(units) && units > 0) result[id] = units;
    });
    return result;
  }

  function componentUnitTotal(value) {
    return Object.values(normalizeComponents(value)).reduce((sum, units) => sum + units, 0);
  }

  function checkComponentAvailability(recipeValue, stockRows, quantity) {
    const recipe = normalizeComponents(recipeValue);
    if (!Object.keys(recipe).length) return null;
    if (!Array.isArray(stockRows)) return { available: true, loading: true, components: [] };
    const components = Object.entries(recipe).map(([id, perItem]) => {
      const stock = stockRows.find((row) => row.id === id) || {};
      const required = perItem * (quantity || 1);
      const remaining = Number(stock.remaining_units || 0);
      return {
        id,
        name: stock.name || id,
        required,
        remaining,
        available: remaining >= required,
      };
    });
    return { available: components.every((item) => item.available), components };
  }

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
    if (method === 'delivery') selectedPickupSlot = null;
    if (method === 'pickup') selectedShippingSlot = null;
    syncStockMethodProperty(method);
    if (method === 'pickup') window.GrainInventory?.loadPickupComponentStock?.();
    window.GrainInventory?.refresh?.();
  });

  document.addEventListener('shippingSlotChange', (e) => {
    selectedShippingSlot = e.detail || null;
    window.GrainInventory?.refresh?.();
  });

  document.addEventListener('pickupSlotChange', (e) => {
    selectedPickupSlot = e.detail || null;
    window.GrainInventory?.refresh?.();
  });

  window.GrainInventory = {
    config: null,

    init(config) {
      this.config = config;
      this.attachProperties();
      this.loadPickupComponentStock();
      this.refresh();
      this.bindMethodSync();
    },

    loadPickupComponentStock() {
      const vc = this.getVariantConfig(this.getCurrentVariantId());
      if (!vc?.group || !Object.keys(normalizeComponents(vc.components)).length) return;
      if (pickupComponentStocks.has(vc.group) || pickupComponentLoads.has(vc.group)) return;
      pickupComponentLoads.add(vc.group);
      fetch(`${PROXY_BASE}/component-stock?group=${encodeURIComponent(vc.group)}`, {
        credentials: 'same-origin',
      })
        .then((response) => {
          if (!response.ok) throw new Error('component stock request failed');
          return response.json();
        })
        .then((payload) => {
          pickupComponentStocks.set(vc.group, payload.components || []);
          this.refresh();
        })
        .catch(() => {})
        .finally(() => pickupComponentLoads.delete(vc.group));
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

    getComponentRecipe(variantId) {
      return normalizeComponents(this.getVariantConfig(variantId)?.components);
    },

    attachProperties() {
      const form = document.querySelector('[data-type="add-to-cart-form"]');
      if (!form || !this.config?.enabled) return;

      const variantId = form.querySelector('[name="id"]')?.value;
      const vc = this.getVariantConfig(variantId);
      if (!vc?.group) return;

      const method = getSelectedMethod();
      if (!method) return;
      const components = normalizeComponents(vc.components);
      const unitsPerItem = Number(vc.unitsPerItem) || componentUnitTotal(components);
      const fields = {
        '_grain_inventory_enabled': 'true',
        '_grain_inventory_group': vc.group,
        '_grain_stock_method': method,
        '_grain_units_per_item': String(unitsPerItem),
      };
      if (Object.keys(components).length) {
        fields._grain_component_units = JSON.stringify(components);
      }
      if (method === 'delivery' && selectedShippingSlot?.slotId) {
        fields._grain_shipping_slot_id = selectedShippingSlot.slotId;
        fields._grain_shipping_date = selectedShippingSlot.shippingDate;
        fields._grain_delivery_date = selectedShippingSlot.deliveryDate;
      }
      if (method === 'pickup' && vc.pickupDateInventory && selectedPickupSlot?.slotId) {
        fields._grain_pickup_slot_id = selectedPickupSlot.slotId;
        fields._grain_pickup_date = selectedPickupSlot.pickupDate;
      }

      const methodSpecificFields = [
        '_grain_shipping_slot_id', '_grain_shipping_date', '_grain_delivery_date',
        '_grain_pickup_slot_id', '_grain_pickup_date',
      ];
      methodSpecificFields.forEach((name) => {
        if (Object.prototype.hasOwnProperty.call(fields, name)) return;
        const stale = form.elements.namedItem(`properties[${name}]`);
        if (stale && typeof stale.remove === 'function') stale.remove();
      });

      for (const [name, value] of Object.entries(fields)) {
        let input = form.elements.namedItem(`properties[${name}]`);
        if (input && typeof input.value === 'undefined') input = null;
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
      if (!vc?.group) return 0;
      const perItem = Number(vc.unitsPerItem) || componentUnitTotal(vc.components);
      return perItem * (quantity || 1);
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

      if (method === 'delivery' && !selectedShippingSlot?.slotId) {
        return {
          available: true,
          required,
          stock: null,
          method,
          group: vc.group,
          unselectedShippingSlot: true,
        };
      }
      if (method === 'pickup' && vc.pickupDateInventory && !selectedPickupSlot?.slotId) {
        return {
          available: true,
          required,
          stock: null,
          method,
          group: vc.group,
          unselectedPickupSlot: true,
        };
      }
      if (method === 'pickup' && vc.pickupDateInventory) {
        const recipe = normalizeComponents(vc.components);
        if (Object.keys(recipe).length) {
          const componentResult = checkComponentAvailability(
            recipe,
            selectedPickupSlot.components || [],
            quantity
          );
          return {
            ...componentResult,
            required,
            stock: componentResult?.components?.length
              ? Math.min(...componentResult.components.map((item) => item.remaining))
              : null,
            method,
            group: vc.group,
            componentManaged: true,
            pickupDateInventory: true,
          };
        }
        const effectiveStock = selectedPickupSlot.remainingUnits;
        return {
          available: effectiveStock >= required,
          required,
          stock: effectiveStock,
          method,
          group: vc.group,
          pickupDateInventory: true,
        };
      }
      const recipe = normalizeComponents(vc.components);
      if (Object.keys(recipe).length) {
        const componentStock = method === 'delivery'
          ? selectedShippingSlot?.components
          : pickupComponentStocks.get(vc.group);
        const componentResult = checkComponentAvailability(recipe, componentStock, quantity);
        if (method === 'pickup' && !componentStock) this.loadPickupComponentStock();
        return {
          ...componentResult,
          required,
          stock: componentResult?.components?.length
            ? Math.min(...componentResult.components.map((item) => item.remaining))
            : null,
          method,
          group: vc.group,
          componentManaged: true,
        };
      }
      const effectiveStock = method === 'delivery'
        ? selectedShippingSlot.remainingUnits
        : stock;

      if (effectiveStock == null) return { available: true };
      return {
        available: effectiveStock >= required,
        required,
        stock: effectiveStock,
        method,
        group: vc.group,
      };
    },

    validateProductForm(form) {
      const qtyInput = form.querySelector('[name="quantity"]');
      const quantity = parseInt(qtyInput?.value, 10) || 1;
      const result = this.isAvailable(quantity);
      if (result.unselectedShippingSlot) {
        return {
          valid: false,
          message: 'オンライン配送のお届け希望日を選択してください。',
        };
      }
      if (result.unselectedPickupSlot) {
        return {
          valid: false,
          message: '店舗受け取り日を選択してください。',
        };
      }
      if (!result.available) {
        const methodLabel = result.method === 'pickup' ? '店頭受け取り' : '発送';
        if (result.componentManaged) {
          const shortage = (result.components || [])
            .filter((component) => !component.available)
            .map((component) => component.name)
            .join('、');
          return {
            valid: false,
            message: `${result.group}の${methodLabel}用在庫が不足しています${shortage ? `（${shortage}）` : ''}`,
          };
        }
        return {
          valid: false,
          message: `${result.group}の${methodLabel}用在庫が不足しています`,
        };
      }
      this.attachProperties();
      return { valid: true };
    },

    updateUI() {
      if (!this.config?.enabled) return;

      const result = this.isAvailable(1);
      const submitBtn = document.getElementById(`ProductSubmitButton-${this.config.sectionId}`);
      if (submitBtn) {
        const span = submitBtn.querySelector('span');
        if (!submitBtn.dataset.grainOriginalLabel && span) submitBtn.dataset.grainOriginalLabel = span.textContent.trim();
        const canEvaluate = result.group
          && !result.unselected
          && !result.loading
          && !result.unselectedShippingSlot
          && !result.unselectedPickupSlot;
        if (canEvaluate && !result.available) {
          submitBtn.setAttribute('disabled', 'disabled');
          if (span) span.textContent = '在庫切れ';
        } else {
          submitBtn.removeAttribute('disabled');
          if (span && submitBtn.dataset.grainOriginalLabel) span.textContent = submitBtn.dataset.grainOriginalLabel;
        }
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
