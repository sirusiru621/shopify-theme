(() => {
  const METHOD_LABELS = {
    pickup: '店舗受け取り',
    delivery: '配送'
  };

  const METHOD_ALIASES = {
    pickup: 'pickup',
    delivery: 'delivery',
    '店舗受け取り': 'pickup',
    '店頭受取': 'pickup',
    '店頭受け取り': 'pickup',
    'オンライン配送': 'delivery',
    '配送': 'delivery',
    '発送': 'delivery'
  };

  const state = {
    productConfig: null,
    productStatus: null,
    cartConfigs: [],
    cartGateInstalled: false,
    cartSubscriptionInstalled: false
  };

  function parseJsonElement(element) {
    if (!element) return null;
    try {
      return JSON.parse(element.textContent);
    } catch (error) {
      console.warn('[grain-inventory] JSON parse failed', error);
      return null;
    }
  }

  function normalizeMethod(value) {
    if (!value) return '';
    return METHOD_ALIASES[String(value).trim()] || String(value).trim();
  }

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function inferUnits(title) {
    const match = String(title || '').match(/(\d+)\s*(個|粒)/);
    return match ? Number(match[1]) : 0;
  }

  function selectedVariantId(form) {
    const input = form?.querySelector('[name="id"]');
    return input ? String(input.value) : '';
  }

  function selectedQuantity(form) {
    const input = document.querySelector('[name="quantity"]') || form?.querySelector('[name="quantity"]');
    return Math.max(1, toNumber(input?.value, 1));
  }

  function selectedMethod() {
    const propertyInput = document.getElementById('selectedMethod');
    const selectedButton = document.querySelector('.method-btn.selected, .method-btn[aria-pressed="true"]');
    return normalizeMethod(propertyInput?.value || selectedButton?.dataset.method);
  }

  function variantConfig(variantId) {
    const config = state.productConfig;
    if (!config) return null;
    return config.variants.find((variant) => String(variant.id) === String(variantId)) || config.variants[0] || null;
  }

  function unitsForVariant(variant) {
    return toNumber(variant?.unitsPerItem, 0) || inferUnits(`${state.productConfig?.productTitle || ''} ${variant?.title || ''}`);
  }

  function groupKey(group, method) {
    return `${method || 'unknown'}::${group || 'unknown'}`;
  }

  function propertyInput(name) {
    return document.querySelector(`[data-grain-property="${name}"]`);
  }

  function setProductError(message) {
    if (!state.productStatus) return;
    state.productStatus.hidden = !message;
    state.productStatus.textContent = message || '';
    state.productStatus.classList.toggle('grain-inventory-status--error', Boolean(message));
  }

  function setSubmitGrainDisabled(submit, disabled) {
    if (!submit) return;
    submit.toggleAttribute('data-grain-disabled', disabled);
    submit.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    submit.classList.toggle('grain-inventory-disabled', disabled);
  }

  function updateProductProperties() {
    const form = document.querySelector('product-form form[action*="/cart/add"], form[action*="/cart/add"]');
    const variant = variantConfig(selectedVariantId(form));
    if (!variant) return null;

    const method = selectedMethod();
    const units = unitsForVariant(variant);
    const group = variant.group || state.productConfig.defaultGroup || '';

    if (propertyInput('group')) propertyInput('group').value = group;
    if (propertyInput('method')) propertyInput('method').value = method;
    if (propertyInput('units')) propertyInput('units').value = units || '';

    return { form, variant, method, units, group };
  }

  async function fetchCart() {
    try {
      const response = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn('[grain-inventory] cart fetch failed', error);
      return null;
    }
  }

  function cartRequirementFromAjaxCart(cart, group, method) {
    if (!cart?.items?.length || !group || !method) return 0;

    return cart.items.reduce((total, item) => {
      const properties = item.properties || {};
      const itemGroup = properties._grain_inventory_group;
      const itemMethod = normalizeMethod(properties._grain_stock_method || properties['配送方法']);
      if (itemGroup !== group || itemMethod !== method) return total;

      const units = toNumber(properties._grain_units_per_item, 0);
      return total + units * toNumber(item.quantity, 0);
    }, 0);
  }

  async function validateProductForm(form) {
    if (!state.productConfig) return { ok: true };

    const context = updateProductProperties();
    if (!context?.variant) return { ok: true };

    const { variant, method, units, group } = context;
    if (!group || !units) return { ok: true };

    if (!method) {
      return { ok: false, message: 'お受け取り方法を選択してください。' };
    }

    const stockInfo = variant.stocks?.[method] || {};
    const stock = toNumber(stockInfo.available, NaN);
    if (!Number.isFinite(stock)) return { ok: true };

    const quantity = selectedQuantity(form);
    const additionalRequired = units * quantity;
    const cart = await fetchCart();
    const currentRequired = cartRequirementFromAjaxCart(cart, group, method);
    const totalRequired = currentRequired + additionalRequired;

    if (totalRequired > stock) {
      return {
        ok: false,
        message: `${METHOD_LABELS[method] || '対象'}の${group}在庫が不足しています。必要数 ${totalRequired}粒、残在庫 ${stock}粒です。`
      };
    }

    return { ok: true };
  }

  function refreshProductState() {
    const context = updateProductProperties();
    if (!context?.variant) return;

    const { variant, method, units, group } = context;
    const stockInfo = method ? variant.stocks?.[method] : null;
    const stock = toNumber(stockInfo?.available, NaN);
    const submit = document.querySelector('[name="add"]');
    const quantity = selectedQuantity(context.form);
    const required = units * quantity;

    if (!group || !units || !method || !Number.isFinite(stock)) {
      setProductError('');
      setSubmitGrainDisabled(submit, false);
      return;
    }

    if (required > stock) {
      setProductError(`${METHOD_LABELS[method] || '対象'}の${group}在庫が不足しています。必要数 ${required}粒、残在庫 ${stock}粒です。`);
      setSubmitGrainDisabled(submit, true);
    } else {
      setProductError(`${METHOD_LABELS[method] || '対象'}の${group}在庫: ${stock}粒 / この商品は1点あたり${units}粒使用します。`);
      setSubmitGrainDisabled(submit, false);
    }
  }

  function aggregateCartItems(items) {
    const groups = new Map();

    items.forEach((item) => {
      const group = item.group;
      const method = normalizeMethod(item.method);
      const units = toNumber(item.unitsPerItem, 0) || inferUnits(item.title);
      const quantity = toNumber(item.quantity, 0);
      const stock = toNumber(item.stockAvailable, NaN);

      if (!group || !method || !units) return;

      const key = groupKey(group, method);
      const existing = groups.get(key) || {
        group,
        method,
        required: 0,
        stock: Number.isFinite(stock) ? stock : null,
        titles: []
      };

      existing.required += units * quantity;
      if (Number.isFinite(stock)) existing.stock = existing.stock === null ? stock : Math.min(existing.stock, stock);
      existing.titles.push(item.title);
      groups.set(key, existing);
    });

    return Array.from(groups.values());
  }

  function updateCheckoutDisabled(disabled) {
    document.querySelectorAll('[name="checkout"], .cart__checkout-button, .additional-checkout-buttons button, .additional-checkout-buttons [role="button"]').forEach((element) => {
      if ('disabled' in element) element.disabled = disabled;
      element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      element.classList.toggle('grain-inventory-disabled', disabled);
    });
  }

  function renderCartValidation() {
    refreshCartConfigs(false);

    const statusElements = document.querySelectorAll('[data-grain-cart-status]');
    if (!statusElements.length) return true;

    const items = state.cartConfigs.flatMap((config) => config.items || []);
    const groups = aggregateCartItems(items);
    const errors = groups.filter((group) => group.stock !== null && group.required > group.stock);

    statusElements.forEach((element) => {
      if (!groups.length) {
        element.hidden = true;
        element.textContent = '';
        return;
      }

      element.hidden = false;
      if (errors.length) {
        element.classList.add('grain-inventory-cart-status--error');
        element.innerHTML = errors
          .map((group) => `${METHOD_LABELS[group.method] || group.method} / ${group.group}: 必要数 ${group.required}粒、残在庫 ${group.stock}粒のため購入できません。`)
          .join('<br>');
      } else {
        element.classList.remove('grain-inventory-cart-status--error');
        element.textContent = groups
          .map((group) => `${METHOD_LABELS[group.method] || group.method} / ${group.group}: ${group.required}粒使用`)
          .join(' / ');
      }
    });

    updateCheckoutDisabled(Boolean(errors.length));
    return errors.length === 0;
  }

  function installCartSubmitGate() {
    if (state.cartGateInstalled) return;
    state.cartGateInstalled = true;

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const isCheckout = event.submitter?.name === 'checkout' || form.querySelector('[name="checkout"]');
      if (!isCheckout) return;
      if (!renderCartValidation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    document.addEventListener('click', (event) => {
      const checkout = event.target.closest('[name="checkout"], .cart__checkout-button, .additional-checkout-buttons button, .additional-checkout-buttons [role="button"]');
      if (!checkout) return;
      if (!renderCartValidation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function refreshCartConfigs(render = true) {
    state.cartConfigs = Array.from(document.querySelectorAll('[data-grain-inventory-cart]'))
      .map(parseJsonElement)
      .filter(Boolean);
    if (render && state.cartConfigs.length) renderCartValidation();
  }

  function installProductListeners() {
    document.addEventListener('change', (event) => {
      if (
        event.target.matches('[name="id"], [name="quantity"], #selectedMethod') ||
        event.target.closest('variant-selects, variant-radios, quantity-input')
      ) {
        setTimeout(refreshProductState, 0);
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.method-btn, .quantity__button')) {
        setTimeout(refreshProductState, 0);
      }
    });

    document.addEventListener('deliveryMethodChange', () => {
      setTimeout(refreshProductState, 0);
    });

    setTimeout(refreshProductState, 0);
  }

  function init() {
    state.productConfig = parseJsonElement(document.querySelector('[data-grain-inventory-product]'));
    state.productStatus = document.querySelector('[data-grain-product-status]');
    refreshCartConfigs();

    if (state.productConfig) installProductListeners();
    if (state.cartConfigs.length) {
      installCartSubmitGate();
    }

    if (!state.cartSubscriptionInstalled && typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      state.cartSubscriptionInstalled = true;
      subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
        setTimeout(refreshCartConfigs, 0);
      });
    }
  }

  window.GrainInventory = {
    validateProductForm,
    refreshProductState,
    renderCartValidation
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
