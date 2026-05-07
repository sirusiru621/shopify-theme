// ファイル名: assets/cross-sell-popup.js
// 機能説明: クロスセル ポップアップのメイン機能
// ES6準拠、jQuery非依存、アクセシビリティ対応

class CrossSellPopup {
  constructor() {
    this.config = this.getConfig();
    this.popup = document.getElementById('cross-sell-popup');
    this.isOpen = false;
    this.focusableElements = null;
    this.lastFocusedElement = null;
    
    // 設定が無効な場合は初期化しない
    if (!this.config.enabled || !this.popup) {
      return;
    }
    
    this.init();
  }

  /**
   * 設定データを取得
   */
  getConfig() {
    const configElement = document.getElementById('cross-sell-config');
    if (!configElement) {
      console.warn('Cross-sell popup: 設定データが見つかりません');
      return { enabled: false };
    }
    
    try {
      return JSON.parse(configElement.textContent);
    } catch (error) {
      console.error('Cross-sell popup: 設定データの解析に失敗しました', error);
      return { enabled: false };
    }
  }

  /**
   * 初期化
   */
  init() {
    this.bindEvents();
    this.interceptCartForms();
    this.updateCartDisplay();
    
    // デバッグモード用のテスト機能
    if (this.config.debug || new URLSearchParams(window.location.search).has('cross-sell-test')) {
      this.addTestControls();
    }
    
    console.log('Cross-sell popup: 初期化完了');
  }

  /**
   * テスト用コントロールを追加（デバッグ用）
   */
  addTestControls() {
    const testButton = document.createElement('button');
    testButton.textContent = 'テスト: ポップアップ表示';
    testButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: #ff4444;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    `;
    
    testButton.addEventListener('click', () => {
      console.log('テストポップアップを表示');
      // ダミー商品情報でポップアップをテスト
      this.setAddedProductInfo({
        title: 'テスト商品',
        price: 2500,
        image: null
      }, 1);
      this.showPopup();
    });
    
    document.body.appendChild(testButton);
    
    console.log('Cross-sell popup: テストボタンを追加しました');
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    // オーバーレイクリックでポップアップを閉じる
    const overlay = this.popup.querySelector('.cross-sell-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closePopup());
    }

    // ESCキーでポップアップを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closePopup();
      }
    });

    // クロスセル商品のカート追加
    const addToCartButtons = this.popup.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
      if (!button.disabled) {
        button.addEventListener('click', (e) => this.handleCrossSellAdd(e));
      }
    });

    // バリエーション選択の変更
    const variantSelectors = this.popup.querySelectorAll('.variant-selector');
    variantSelectors.forEach(selector => {
      selector.addEventListener('change', (e) => this.handleVariantChange(e));
    });
  }

  /**
   * 既存のカートフォームをインターセプト
   */
  interceptCartForms() {
    // より幅広いカートボタンセレクターを使用
    const cartButtonSelectors = [
      '[name="add"]',
      '.btn[type="submit"]',
      'button[type="submit"]',
      '.product-form__cart-submit',
      '.add-to-cart',
      '.add-to-cart-button',
      'input[type="submit"][name="add"]',
      '.shopify-payment-button__button--unbranded'
    ];

    // 商品フォームを監視
    const productForms = document.querySelectorAll([
      'form[action*="/cart/add"]',
      '.product-form',
      'form.product-form',
      '#product-form',
      '[data-product-form]'
    ].join(','));
    
    console.log('Cross-sell popup: 検出されたフォーム数:', productForms.length);
    
    productForms.forEach((form, index) => {
      console.log(`フォーム ${index + 1}:`, form.action || form.getAttribute('action'));
      
      form.addEventListener('submit', (e) => {
        console.log('フォーム送信をキャッチしました:', form);
        e.preventDefault();
        this.handleProductAdd(form);
      });
    });

    // より包括的なイベント委譲でカートボタンをキャッチ
    document.addEventListener('click', (e) => {
      // カートボタンを特定
      const button = this.findCartButton(e.target);
      
      if (button && !button.dataset.crossSellHandled) {
        console.log('カートボタンクリックを検出:', button);
        
        // 重複実行防止フラグ
        button.dataset.crossSellHandled = 'true';
        
        // 元のイベントを停止
        e.preventDefault();
        e.stopPropagation();
        
        const form = button.closest('form');
        if (form) {
          console.log('関連フォームを発見:', form);
          this.handleProductAdd(form);
        } else {
          // フォームが見つからない場合の直接処理
          this.handleDirectCartAdd(button);
        }
        
        // フラグをリセット
        setTimeout(() => {
          delete button.dataset.crossSellHandled;
        }, 500);
      }
    });

    // MutationObserverで動的に追加されるボタンも監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const newCartButtons = node.querySelectorAll ? 
              node.querySelectorAll(cartButtonSelectors.join(',')) : [];
            
            if (newCartButtons.length > 0) {
              console.log('新しいカートボタンが追加されました:', newCartButtons.length);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * カートボタンを特定する関数
   */
  findCartButton(element) {
    // 自分自身がカートボタンかチェック
    if (this.isCartButton(element)) {
      return element;
    }
    
    // 親要素を遡ってカートボタンを探す
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (this.isCartButton(parent)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    // 子要素でカートボタンを探す
    if (element.querySelector) {
      const childButton = element.querySelector([
        '[name="add"]',
        '.btn[type="submit"]',
        'button[type="submit"]',
        '.add-to-cart',
        '.product-form__cart-submit'
      ].join(','));
      
      if (childButton && this.isCartButton(childButton)) {
        return childButton;
      }
    }
    
    return null;
  }

  /**
   * 要素がカートボタンかどうかを判定
   */
  isCartButton(element) {
    if (!element || !element.tagName) return false;
    
    const tagName = element.tagName.toLowerCase();
    const name = element.getAttribute('name');
    const type = element.getAttribute('type');
    const className = element.className || '';
    const id = element.id || '';
    const textContent = element.textContent || '';
    
    // name="add" 属性を持つ要素
    if (name === 'add') return true;
    
    // type="submit" のボタンで商品フォーム内にある
    if (type === 'submit' && element.closest('form[action*="/cart/add"], .product-form')) return true;
    
    // クラス名でカートボタンを判定
    const cartButtonClasses = [
      'add-to-cart',
      'add-to-cart-button',
      'product-form__cart-submit',
      'btn--add-to-cart',
      'cart-submit'
    ];
    
    if (cartButtonClasses.some(cls => className.includes(cls))) return true;
    
    // IDでカートボタンを判定
    if (id.includes('add-to-cart') || id.includes('AddToCart')) return true;
    
    // テキスト内容でカートボタンを判定
    const cartButtonTexts = [
      'add to cart',
      'カートに追加',
      'add to bag',
      'buy now',
      '今すぐ購入'
    ];
    
    const lowerText = textContent.toLowerCase().trim();
    if (cartButtonTexts.some(text => lowerText.includes(text))) return true;
    
    return false;
  }

  /**
   * フォームを使わない直接的なカート追加処理
   */
  async handleDirectCartAdd(button) {
    try {
      // ボタンから商品情報を取得
      const variantId = this.getVariantIdFromButton(button);
      const quantity = this.getQuantityFromButton(button);
      
      if (!variantId) {
        console.error('バリアントIDが見つかりません');
        return;
      }
      
      console.log('直接カート追加:', { variantId, quantity });
      
      // 商品情報を取得
      const productInfo = await this.getProductInfo(variantId);
      
      // カートに追加
      const response = await fetch(this.config.cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: parseInt(quantity)
        })
      });

      if (response.ok) {
        // カート情報を更新
        await this.updateCartDisplay();
        
        // ポップアップに商品情報を設定
        this.setAddedProductInfo(productInfo, quantity);
        
        // ポップアップを表示
        setTimeout(() => {
          this.showPopup();
        }, this.config.delay || 500);
        
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
      
    } catch (error) {
      console.error('Cross-sell popup: 直接カート追加エラー', error);
      this.showError(this.config.messages.error);
    }
  }

  /**
   * ボタンからバリアントIDを取得
   */
  getVariantIdFromButton(button) {
    // data属性から取得
    if (button.dataset.variantId) return button.dataset.variantId;
    if (button.dataset.productVariantId) return button.dataset.productVariantId;
    
    // 親フォームから取得
    const form = button.closest('form');
    if (form) {
      const hiddenInput = form.querySelector('input[name="id"]');
      if (hiddenInput) return hiddenInput.value;
      
      const selectInput = form.querySelector('select[name="id"]');
      if (selectInput) return selectInput.value;
    }
    
    // 商品ページの場合、グローバル変数から取得を試行
    if (window.product && window.product.selected_or_first_available_variant) {
      return window.product.selected_or_first_available_variant.id;
    }
    
    // meta タグから取得を試行
    const metaVariantId = document.querySelector('meta[name="product-variant-id"]');
    if (metaVariantId) return metaVariantId.getAttribute('content');
    
    return null;
  }

  /**
   * ボタンから数量を取得
   */
  getQuantityFromButton(button) {
    // data属性から取得
    if (button.dataset.quantity) return button.dataset.quantity;
    
    // 親フォームから取得
    const form = button.closest('form');
    if (form) {
      const quantityInput = form.querySelector('input[name="quantity"], .quantity-input');
      if (quantityInput) return quantityInput.value;
    }
    
    // 同じコンテナ内の数量入力を探す
    const container = button.closest('.product, .product-form, .product-info');
    if (container) {
      const quantityInput = container.querySelector('input[name="quantity"], .quantity-input');
      if (quantityInput) return quantityInput.value;
    }
    
    return 1; // デフォルト
  }

  /**
   * 商品をカートに追加する処理
   */
  async handleProductAdd(form) {
    const formData = new FormData(form);
    const variantId = formData.get('id');
    const quantity = formData.get('quantity') || 1;

    try {
      // 商品情報を取得
      const productInfo = await this.getProductInfo(variantId);
      
      // カートに追加
      const response = await fetch(this.config.cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: parseInt(quantity)
        })
      });

      if (response.ok) {
        // カート情報を更新
        await this.updateCartDisplay();
        
        // ポップアップに商品情報を設定
        this.setAddedProductInfo(productInfo, quantity);
        
        // ポップアップを表示
        setTimeout(() => {
          this.showPopup();
        }, this.config.delay || 500);
        
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
      
    } catch (error) {
      console.error('Cross-sell popup: カート追加エラー', error);
      this.showError(this.config.messages.error);
    }
  }

  /**
   * 商品情報を取得
   */
  async getProductInfo(variantId) {
    try {
      const response = await fetch(`/products.json`);
      const data = await response.json();
      
      // バリアント情報を検索
      for (const product of data.products) {
        const variant = product.variants.find(v => v.id == variantId);
        if (variant) {
          return {
            title: product.title,
            price: variant.price,
            image: product.images[0] || null,
            variant: variant
          };
        }
      }
      
      throw new Error('商品情報が見つかりません');
    } catch (error) {
      console.error('商品情報の取得に失敗:', error);
      return {
        title: '商品',
        price: 0,
        image: null,
        variant: null
      };
    }
  }

  /**
   * カート表示を更新
   */
  async updateCartDisplay() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // カート合計を更新
      const totalElement = this.popup.querySelector('#cart-total-display');
      if (totalElement) {
        totalElement.textContent = this.formatMoney(cart.total_price);
      }
      
      // アイテム数を更新
      const countElement = this.popup.querySelector('#cart-items-count');
      if (countElement) {
        countElement.textContent = cart.item_count;
      }
      
    } catch (error) {
      console.error('カート情報の更新に失敗:', error);
    }
  }

  /**
   * 追加された商品情報をポップアップに設定
   */
  setAddedProductInfo(productInfo, quantity) {
    // 商品画像
    const imageContainer = this.popup.querySelector('.added-product-image');
    if (imageContainer && productInfo.image) {
      const existingImage = imageContainer.querySelector('img');
      if (existingImage) {
        existingImage.remove();
      }
      
      // プレースホルダーを削除
      const placeholder = imageContainer.querySelector('.product-image-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      const img = document.createElement('img');
      img.src = productInfo.image;
      img.alt = productInfo.title;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      imageContainer.appendChild(img);
    }

    // 商品タイトル
    const titleElement = this.popup.querySelector('.added-product-title');
    if (titleElement) {
      titleElement.textContent = productInfo.title;
    }

    // 商品価格
    const priceElement = this.popup.querySelector('.added-product-price');
    if (priceElement) {
      if (quantity > 1) {
        const unitPrice = this.formatMoney(productInfo.price);
        const totalPrice = this.formatMoney(productInfo.price * quantity);
        priceElement.textContent = `${unitPrice} × ${quantity} = ${totalPrice}`;
      } else {
        priceElement.textContent = this.formatMoney(productInfo.price);
      }
    }
  }

  /**
   * クロスセル商品のカート追加処理
   */
  async handleCrossSellAdd(event) {
    const button = event.target.closest('.add-to-cart-btn');
    const variantId = button.dataset.variantId;
    
    // ボタンの状態を更新
    this.setButtonState(button, 'loading');
    
    try {
      const response = await fetch(this.config.cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 1
        })
      });

      if (response.ok) {
        // カート表示を更新
        await this.updateCartDisplay();
        
        // 成功状態を表示
        this.setButtonState(button, 'success');
        
        // 短時間後に元に戻す
        setTimeout(() => {
          this.setButtonState(button, 'default');
        }, 2000);
        
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
      
    } catch (error) {
      console.error('クロスセル商品の追加エラー:', error);
      this.setButtonState(button, 'default');
      this.showError(this.config.messages.error);
    }
  }

  /**
   * バリエーション変更処理
   */
  handleVariantChange(event) {
    const selector = event.target;
    const selectedOption = selector.options[selector.selectedIndex];
    const productCard = selector.closest('.cross-sell-product-card');
    const addButton = productCard.querySelector('.add-to-cart-btn');
    
    if (addButton) {
      if (selector.value === "") {
        // "Select options" が選択された場合
        addButton.textContent = "Select options";
        addButton.style.background = "#fff";
        addButton.style.color = "#4A4A4A";
        addButton.style.border = "1px solid #4A4A4A";
        addButton.disabled = true;
        addButton.removeAttribute('data-variant-id');
      } else {
        // 具体的なバリエーションが選択された場合
        addButton.innerHTML = '<span class="btn-text">Add to cart</span>';
        addButton.style.background = "#4A4A4A";
        addButton.style.color = "#ffffff";
        addButton.style.border = "none";
        addButton.disabled = false;
        addButton.dataset.variantId = selector.value;
        
        // 価格表示を更新
        const priceElement = productCard.querySelector('.price-current');
        if (priceElement && selectedOption.dataset.price) {
          priceElement.textContent = selectedOption.dataset.price;
        }
      }
    }
  }

  /**
   * ボタンの状態を設定
   */
  setButtonState(button, state) {
    button.classList.remove('loading', 'success');
    
    const textSpan = button.querySelector('.btn-text');
    const loadingSpan = button.querySelector('.btn-loading');
    const successSpan = button.querySelector('.btn-success');
    
    switch (state) {
      case 'loading':
        button.classList.add('loading');
        button.disabled = true;
        break;
        
      case 'success':
        button.classList.add('success');
        button.disabled = false;
        break;
        
      default:
        button.disabled = false;
        break;
    }
  }

  /**
   * ポップアップを表示
   */
  showPopup() {
    // モバイルでの表示設定チェック
    if (!this.config.showOnMobile && window.innerWidth < 768) {
      return;
    }
    
    this.lastFocusedElement = document.activeElement;
    this.popup.style.display = 'flex';
    this.popup.setAttribute('aria-hidden', 'false');
    
    // アニメーション開始
    requestAnimationFrame(() => {
      this.popup.classList.add('is-visible');
    });
    
    this.isOpen = true;
    
    // フォーカス管理
    this.setupFocusManagement();
    
    // 自動閉じる設定（秒を ミリ秒に変換）
    if (this.config.autoClose > 0) {
      setTimeout(() => {
        this.closePopup();
      }, this.config.autoClose * 1000);
    }
    
    // body スクロール防止
    document.body.style.overflow = 'hidden';
  }

  /**
   * ポップアップを閉じる
   */
  closePopup() {
    if (!this.isOpen) return;
    
    this.popup.classList.remove('is-visible');
    this.popup.setAttribute('aria-hidden', 'true');
    
    // アニメーション終了後に非表示
    setTimeout(() => {
      this.popup.style.display = 'none';
      
      // フォーカスを元に戻す
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
      
      // body スクロール復旧
      document.body.style.overflow = '';
      
    }, 300);
    
    this.isOpen = false;
  }

  /**
   * フォーカス管理を設定
   */
  setupFocusManagement() {
    this.focusableElements = this.popup.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
    
    // Tab キーでのフォーカス循環
    this.popup.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabKey(e);
      }
    });
  }

  /**
   * Tab キー処理
   */
  handleTabKey(event) {
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * エラーメッセージを表示
   */
  showError(message) {
    // 簡易的なエラー表示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  /**
   * 金額をフォーマット
   */
  formatMoney(cents) {
    const money = (cents / 100).toFixed(2);
    return this.config.moneyFormat.replace('{{amount}}', money);
  }
}

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new CrossSellPopup();
});

// Shopify テーマエディタ対応
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', () => {
    new CrossSellPopup();
  });
}