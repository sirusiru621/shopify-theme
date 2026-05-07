/**
 * Enhanced Cart Items with Custom Options
 * Shopify Online Store 2.0対応
 * ES6準拠、アクセシビリティ対応
 */

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class EnhancedCartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || 
      document.getElementById('CartDrawer-LineItemStatus');

    // デバウンス処理でパフォーマンス最適化
    const debouncedOnChange = this.debounce((event) => {
      this.onChange(event);
    }, 300);

    const debouncedCustomOptionChange = this.debounce((event) => {
      this.onCustomOptionChange(event);
    }, 500);

    this.addEventListener('change', (event) => {
      if (event.target.matches('.custom-option-select')) {
        debouncedCustomOptionChange(event);
      } else {
        debouncedOnChange(event);
      }
    });

    // カートの同期状態を管理
    this.isUpdating = false;
    this.pendingUpdates = new Map();
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });

    // カスタムオプションの初期化
    this.initializeCustomOptions();
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  /**
   * カスタムオプションの初期化
   */
  initializeCustomOptions() {
    // 既存のカート属性からカスタムオプションの状態を復元
    this.loadCustomOptionsFromCart();
    
    // ギフト設定の状態を表示に反映
    this.updateGiftSettingButtonStates();
  }

  /**
   * カートからカスタムオプションの状態を読み込み
   */
  async loadCustomOptionsFromCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // カート属性からカスタムオプションを復元
      Object.entries(cart.attributes || {}).forEach(([key, value]) => {
        if (key.startsWith('gift_bag_') || key.startsWith('message_card_')) {
          const select = document.querySelector(`[data-cart-attribute="${key}"]`);
          if (select) {
            select.value = value;
          }
        }
        
        if (key.startsWith('gift_settings_')) {
          const itemKey = key.replace('gift_settings_', '');
          this.updateGiftButtonDisplay(itemKey, value);
        }
      });
    } catch (error) {
      console.error('カスタムオプションの読み込みエラー:', error);
    }
  }

  /**
   * ギフト設定ボタンの表示状態を更新
   */
  updateGiftSettingButtonStates() {
    const giftButtons = this.querySelectorAll('.gift-setting-button');
    giftButtons.forEach(button => {
      const itemKey = this.extractItemKeyFromButton(button);
      if (itemKey) {
        this.checkGiftSettingsStatus(itemKey, button);
      }
    });
  }

  /**
   * ボタンからアイテムキーを抽出
   */
  extractItemKeyFromButton(button) {
    const onclickAttr = button.getAttribute('onclick');
    if (onclickAttr) {
      const match = onclickAttr.match(/openGiftPopup\('([^']+)'/);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * ギフト設定の状態をチェックして表示を更新
   */
  async checkGiftSettingsStatus(itemKey, button) {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      const giftSettings = cart.attributes[`gift_settings_${itemKey}`];
      
      if (giftSettings) {
        button.classList.add('configured');
        button.setAttribute('aria-label', 'ご進物設定済み - クリックして編集');
      }
    } catch (error) {
      console.error('ギフト設定状態の確認エラー:', error);
    }
  }

  /**
   * 通常の数量変更処理
   */
  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index, 
      event.target.value, 
      document.activeElement.getAttribute('name')
    );
  }

  /**
   * カスタムオプション変更処理
   */
  async onCustomOptionChange(event) {
    const select = event.target;
    const attributeName = select.dataset.cartAttribute;
    const attributeValue = select.value;
    
    if (!attributeName) return;

    try {
      // ローディング状態表示
      this.showCustomOptionLoading(select, true);
      
      await this.updateCartAttribute(attributeName, attributeValue);
      
      // 成功のフィードバック
      this.showCustomOptionSuccess(select);
      
    } catch (error) {
      console.error('カスタムオプション更新エラー:', error);
      this.showCustomOptionError(select);
      
      // エラー時は前の値に戻す
      select.value = select.dataset.previousValue || '';
    } finally {
      this.showCustomOptionLoading(select, false);
    }
    
    // 現在の値を保存
    select.dataset.previousValue = select.value;
  }

  /**
   * カート更新処理
   */
  onCartUpdate() {
    if (this.isUpdating) return;
    
    fetch(`${routes.cart_url}?section_id=main-cart-items`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceQty = html.querySelector('cart-items');
        
        if (sourceQty) {
          this.innerHTML = sourceQty.innerHTML;
          this.initializeCustomOptions();
        }
      })
      .catch((e) => {
        console.error('カート更新エラー:', e);
        this.showError('カートの更新に失敗しました');
      });
  }

  /**
   * レンダリング対象セクションの取得
   */
  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  /**
   * 数量更新処理（既存機能の強化）
   */
  updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    this.isUpdating = true;

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body 
    })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) || 
          document.getElementById(`Drawer-quantity-${line}`);
        
        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.handleSuccessfulUpdate(parsedState, line, name);
      })
      .catch(() => {
        this.handleUpdateError();
      })
      .finally(() => {
        this.disableLoading(line);
        this.isUpdating = false;
      });
  }

  /**
   * 更新成功時の処理
   */
  handleSuccessfulUpdate(parsedState, line, name) {
    this.classList.toggle('is-empty', parsedState.item_count === 0);
    
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const cartFooter = document.getElementById('main-cart-footer');

    if (cartFooter) {
      cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
    }
    if (cartDrawerWrapper) {
      cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);
    }

    // セクション更新
    this.getSectionsToRender().forEach((section) => {
      const elementToReplace =
        document.getElementById(section.id).querySelector(section.selector) || 
        document.getElementById(section.id);
      
      elementToReplace.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.section],
        section.selector
      );
    });

    // フォーカス管理
    this.manageFocusAfterUpdate(parsedState, line, name);
    
    // イベント発行
    this.publishCartUpdate();
    
    // カスタムオプションの再初期化
    this.initializeCustomOptions();
  }

  /**
   * 更新エラー時の処理
   */
  handleUpdateError() {
    this.querySelectorAll('.loading-overlay').forEach((overlay) => {
      overlay.classList.add('hidden');
    });
    
    const errors = document.getElementById('cart-errors') || 
                  document.getElementById('CartDrawer-CartErrors');
    
    if (errors) {
      errors.textContent = 'エラーが発生しました。もう一度お試しください。';
    }
  }

  /**
   * フォーカス管理
   */
  manageFocusAfterUpdate(parsedState, line, name) {
    const lineItem =
      document.getElementById(`CartItem-${line}`) || 
      document.getElementById(`CartDrawer-Item-${line}`);
    
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    
    if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
      const targetElement = lineItem.querySelector(`[name="${name}"]`);
      if (cartDrawerWrapper) {
        this.trapFocus(cartDrawerWrapper, targetElement);
      } else {
        targetElement.focus();
      }
    } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
      const emptyCartLink = cartDrawerWrapper.querySelector('.drawer__inner-empty a');
      if (emptyCartLink) {
        this.trapFocus(cartDrawerWrapper, emptyCartLink);
      }
    } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
      const firstItemName = document.querySelector('.cart-item__name');
      if (firstItemName) {
        this.trapFocus(cartDrawerWrapper, firstItemName);
      }
    }
  }

  /**
   * カート属性更新
   */
  async updateCartAttribute(name, value) {
    const body = JSON.stringify({
      attributes: {
        [name]: value
      }
    });
    
    const response = await fetch(`${routes.cart_update_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
    });
    
    if (!response.ok) {
      throw new Error(`カート属性更新に失敗しました: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * カスタムオプションのローディング表示
   */
  showCustomOptionLoading(element, show) {
    const container = element.closest('.custom-option-row');
    if (!container) return;
    
    let spinner = container.querySelector('.custom-option-spinner');
    
    if (show && !spinner) {
      spinner = document.createElement('div');
      spinner.className = 'custom-option-spinner';
      spinner.innerHTML = `
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `;
      container.appendChild(spinner);
      element.disabled = true;
    } else if (!show && spinner) {
      spinner.remove();
      element.disabled = false;
    }
  }

  /**
   * カスタムオプション成功フィードバック
   */
  showCustomOptionSuccess(element) {
    const container = element.closest('.custom-option-row');
    if (!container) return;
    
    container.classList.add('success');
    setTimeout(() => {
      container.classList.remove('success');
    }, 2000);
  }

  /**
   * カスタムオプションエラーフィードバック
   */
  showCustomOptionError(element) {
    const container = element.closest('.custom-option-row');
    if (!container) return;
    
    container.classList.add('error');
    setTimeout(() => {
      container.classList.remove('error');
    }, 3000);
  }

  /**
   * ライブリージョン更新
   */
  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || 
      document.getElementById(`CartDrawer-LineItemError-${line}`);
    
    if (lineItemError) {
      const errorText = lineItemError.querySelector('.cart-item__error-text');
      if (errorText) {
        errorText.innerHTML = message;
      }
    }

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || 
      document.getElementById('CartDrawer-LiveRegionText');
    
    if (cartStatus) {
      cartStatus.setAttribute('aria-hidden', false);
      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', true);
      }, 1000);
    }
  }

  /**
   * セクションのHTMLを取得
   */
  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  /**
   * ローディング状態の有効化
   */
  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || 
                         document.getElementById('CartDrawer-CartItems');
    
    if (mainCartItems) {
      mainCartItems.classList.add('cart__items--disabled');
    }

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => {
      overlay.classList.remove('hidden');
    });

    if (document.activeElement) {
      document.activeElement.blur();
    }
    
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  /**
   * ローディング状態の無効化
   */
  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || 
                         document.getElementById('CartDrawer-CartItems');
    
    if (mainCartItems) {
      mainCartItems.classList.remove('cart__items--disabled');
    }

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => {
      overlay.classList.add('hidden');
    });
  }

  /**
   * エラー表示
   */
  showError(message) {
    const errorContainer = document.getElementById('cart-errors') || 
                          document.getElementById('CartDrawer-CartErrors');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
      
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * カート更新イベントの発行
   */
  publishCartUpdate() {
    if (typeof publish === 'function' && window.PUB_SUB_EVENTS) {
      publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items' });
    }
  }

  /**
   * フォーカストラップ
   */
  trapFocus(container, element) {
    if (typeof trapFocus === 'function') {
      trapFocus(container, element);
    } else if (element && element.focus) {
      element.focus();
    }
  }

  /**
   * デバウンス関数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// カスタムエレメントとして登録
customElements.define('cart-items', EnhancedCartItems);

/**
 * カートノート機能の強化
 */
if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        const debouncedUpdate = this.debounce((event) => {
          this.updateNote(event.target.value);
        }, 500);

        this.addEventListener('change', debouncedUpdate);
        this.addEventListener('input', debouncedUpdate);
      }

      async updateNote(note) {
        try {
          const body = JSON.stringify({ note: note });
          const response = await fetch(`${routes.cart_update_url}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: body
          });

          if (!response.ok) {
            throw new Error('メモの更新に失敗しました');
          }

          // 成功フィードバック
          this.showSuccess();
        } catch (error) {
          console.error('カートメモ更新エラー:', error);
          this.showError();
        }
      }

      showSuccess() {
        this.classList.add('success');
        setTimeout(() => {
          this.classList.remove('success');
        }, 2000);
      }

      showError() {
        this.classList.add('error');
        setTimeout(() => {
          this.classList.remove('error');
        }, 3000);
      }

      debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }
    }
  );
}

/**
 * ギフト設定ポップアップ機能
 */
class GiftSettingsManager {
  constructor() {
    this.currentItemKey = '';
    this.currentItemIndex = 0;
    this.isOpen = false;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // グローバル関数として露出（liquid側から呼び出し可能）
    window.openGiftPopup = this.openPopup.bind(this);
    window.closeGiftPopup = this.closePopup.bind(this);
    window.saveGiftSettings = this.saveSettings.bind(this);
  }

  async openPopup(itemKey, itemIndex) {
    this.currentItemKey = itemKey;
    this.currentItemIndex = itemIndex;
    
    const overlay = document.getElementById('giftPopupOverlay');
    if (!overlay) return;

    // 既存の設定を読み込み
    await this.loadExistingSettings(itemKey);
    
    // ポップアップを表示
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    this.isOpen = true;
    
    // フォーカス管理
    this.manageFocusOnOpen();
    
    // イベントリスナーを追加
    this.addEventListeners();
  }

  closePopup() {
    const overlay = document.getElementById('giftPopupOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    
    // イベントリスナーを削除
    this.removeEventListeners();
    
    // フォーカスを戻す
    this.returnFocus();
  }

  async loadExistingSettings(itemKey) {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      const existingSettings = cart.attributes[`gift_settings_${itemKey}`];
      
      if (existingSettings) {
        const settings = JSON.parse(existingSettings);
        this.populateForm(settings);
      }
    } catch (error) {
      console.error('既存設定の読み込みエラー:', error);
    }
  }

  populateForm(settings) {
    // 各フォーム要素に値を設定
    const elements = {
      quantity: document.getElementById('giftQuantitySelect'),
      noshi: document.getElementById('giftNoshiSelect'),
      purpose: document.getElementById('giftPurposeSelect'),
      noshiPosition: document.getElementById('giftNoshiPositionSelect')
    };

    Object.entries(elements).forEach(([key, element]) => {
      if (element && settings[key]) {
        element.value = settings[key];
      }
    });

    // ラジオボタンの設定
    if (settings.inscription) {
      const radio = document.querySelector(`input[name="giftInscription"][value="${settings.inscription}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.gift-option-item').classList.add('selected');
      }
    }
  }

  async saveSettings() {
    try {
      const settings = this.collectFormData();
      
      // バリデーション
      if (!this.validateSettings(settings)) {
        return;
      }

      // ローディング状態を表示
      this.showSaveLoading(true);
      
      // カートに保存
      await this.updateCartWithSettings(this.currentItemKey, settings);
      
      // 成功フィードバック
      this.showSuccessMessage();
      
      // ポップアップを閉じる
      setTimeout(() => {
        this.closePopup();
      }, 1000);
      
    } catch (error) {
      console.error('設定保存エラー:', error);
      this.showErrorMessage();
    } finally {
      this.showSaveLoading(false);
    }
  }

  collectFormData() {
    return {
      quantity: document.getElementById('giftQuantitySelect')?.value || '',
      noshi: document.getElementById('giftNoshiSelect')?.value || '',
      purpose: document.getElementById('giftPurposeSelect')?.value || '',
      inscription: document.querySelector('input[name="giftInscription"]:checked')?.value || '',
      noshiPosition: document.getElementById('giftNoshiPositionSelect')?.value || ''
    };
  }

  validateSettings(settings) {
    // 必須項目のチェック
    const requiredFields = ['quantity'];
    const missingFields = requiredFields.filter(field => !settings[field]);
    
    if (missingFields.length > 0) {
      this.showValidationError(`次の項目は必須です: ${missingFields.join(', ')}`);
      return false;
    }
    
    return true;
  }

  async updateCartWithSettings(itemKey, settings) {
    const body = JSON.stringify({
      attributes: {
        [`gift_settings_${itemKey}`]: JSON.stringify(settings)
      }
    });
    
    const response = await fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
    });
    
    if (!response.ok) {
      throw new Error('カート更新に失敗しました');
    }
    
    return response.json();
  }

  manageFocusOnOpen() {
    const overlay = document.getElementById('giftPopupOverlay');
    const firstInput = overlay.querySelector('select, input, button');
    
    if (firstInput) {
      firstInput.focus();
    }
    
    // フォーカストラップを設定
    this.setupFocusTrap(overlay);
  }

  setupFocusTrap(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    this.focusTrapHandler = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            event.preventDefault();
          }
        }
      }
    };
    
    container.addEventListener('keydown', this.focusTrapHandler);
  }

  returnFocus() {
    const triggerButton = document.querySelector(`[onclick*="${this.currentItemKey}"]`);
    if (triggerButton) {
      triggerButton.focus();
    }
  }

  addEventListeners() {
    this.escapeHandler = (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.closePopup();
      }
    };
    
    this.overlayClickHandler = (event) => {
      if (event.target === event.currentTarget) {
        this.closePopup();
      }
    };
    
    document.addEventListener('keydown', this.escapeHandler);
    
    const overlay = document.getElementById('giftPopupOverlay');
    if (overlay) {
      overlay.addEventListener('click', this.overlayClickHandler);
    }
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.escapeHandler);
    
    const overlay = document.getElementById('giftPopupOverlay');
    if (overlay) {
      overlay.removeEventListener('click', this.overlayClickHandler);
      overlay.removeEventListener('keydown', this.focusTrapHandler);
    }
  }

  showSaveLoading(show) {
    const saveButton = document.querySelector('.gift-popup-button.primary');
    if (!saveButton) return;
    
    if (show) {
      saveButton.disabled = true;
      saveButton.textContent = '保存中...';
    } else {
      saveButton.disabled = false;
      saveButton.textContent = saveButton.dataset.originalText || '設定を保存';
    }
  }

  showSuccessMessage() {
    this.showNotification('ギフト設定が保存されました', 'success');
  }

  showErrorMessage() {
    this.showNotification('保存に失敗しました。もう一度お試しください。', 'error');
  }

  showValidationError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // 通知要素を作成または取得
    let notification = document.getElementById('gift-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'gift-notification';
      notification.className = 'gift-notification';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `gift-notification ${type} show`;
    
    // 自動的に非表示
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
}

/**
 * ラジオボタンの選択状態管理
 */
document.addEventListener('change', function(event) {
  if (event.target.matches('input[name="giftInscription"]')) {
    // 全ての選択状態をリセット
    document.querySelectorAll('.gift-option-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // 選択されたアイテムをハイライト
    const selectedItem = event.target.closest('.gift-option-item');
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }
});

/**
 * パフォーマンス監視
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cartUpdates: 0,
      errors: 0,
      averageResponseTime: 0
    };
  }

  trackCartUpdate(startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.metrics.cartUpdates++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2;
    
    // 遅いレスポンスを警告
    if (responseTime > 2000) {
      console.warn(`遅いカート更新: ${responseTime.toFixed(2)}ms`);
    }
  }

  trackError(error) {
    this.metrics.errors++;
    console.error('エラー追跡:', error);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// グローバルインスタンスを作成
const giftSettingsManager = new GiftSettingsManager();
const performanceMonitor = new PerformanceMonitor();

// デバッグ用にグローバルに露出
if (typeof window !== 'undefined') {
  window.giftSettingsManager = giftSettingsManager;
  window.performanceMonitor = performanceMonitor;
}

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Enhanced Cart Items with Custom Options initialized');
  
  // 初期状態の設定
  const cartItems = document.querySelector('cart-items');
  if (cartItems && cartItems.initializeCustomOptions) {
    cartItems.initializeCustomOptions();
  }
  
  // パフォーマンス最適化のための初期化
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // アイドル時間に重い処理を実行
      console.log('カートの初期化完了');
    });
  }
});

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EnhancedCartItems,
    GiftSettingsManager,
    PerformanceMonitor
  };
}