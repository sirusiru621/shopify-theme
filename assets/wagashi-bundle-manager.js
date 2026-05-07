/**
 * 和菓子バンドル商品管理システム
 * 既存のInventoryManagerとCartControllerとの統合
 * sisiri-stock-appとの連携によるリアルタイム在庫管理
 */

class WagashiBundleManager {
  constructor() {
    this.productData = this.getProductData();
    this.selectedBundle = null;
    this.selectedVariantId = null;
    this.selectedMethod = null;
    this.quantity = 1;
    this.currentPrice = 0;
    this.stockData = new Map();
    this.isInitialized = false;
    
    // 既存システムとの統合用
    this.inventoryManager = window.InventoryManager || null;
    this.cartController = window.CartController || null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadInitialStockData();
      this.bindEvents();
      this.updateUI();
      this.startStockPolling();
      this.isInitialized = true;
      
      console.log('WagashiBundleManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WagashiBundleManager:', error);
    }
  }

  getProductData() {
    try {
      const dataElement = document.getElementById('wagashi-product-data');
      return dataElement ? JSON.parse(dataElement.textContent) : {};
    } catch (error) {
      console.error('Failed to parse product data:', error);
      return {};
    }
  }

  async loadInitialStockData() {
    const bundleOptions = document.querySelectorAll('.bundle-option');
    
    for (const option of bundleOptions) {
      const bundleSize = parseInt(option.dataset.bundle);
      const variantId = option.dataset.variantId;
      
      if (bundleSize && variantId) {
        try {
          const stockInfo = await this.checkStockWithAPI(variantId, 1);
          this.stockData.set(bundleSize, {
            variantId: variantId,
            remaining: stockInfo.remaining,
            price: parseInt(option.dataset.price),
            available: option.dataset.available === 'true',
            lastUpdated: Date.now()
          });
          
          this.updateBundleOptionDisplay(option, stockInfo);
        } catch (error) {
          console.error(`Failed to load stock for bundle ${bundleSize}:`, error);
          // フォールバック：Shopifyの在庫情報を使用
          this.stockData.set(bundleSize, {
            variantId: variantId,
            remaining: option.dataset.available === 'true' ? 10 : 0, // デフォルト値
            price: parseInt(option.dataset.price),
            available: option.dataset.available === 'true',
            lastUpdated: Date.now()
          });
        }
      }
    }
  }

  bindEvents() {
    // バンドル選択
    document.querySelectorAll('.bundle-option').forEach(option => {
      option.addEventListener('click', (e) => {
        if (!option.classList.contains('out-of-stock')) {
          this.selectBundle(option);
        }
      });
    });

    // 数量変更
    const quantityInput = document.getElementById('Quantity-' + this.getSectionId());
    const minusBtn = document.querySelector('.quantity__button[name="minus"]');
    const plusBtn = document.querySelector('.quantity__button[name="plus"]');

    if (quantityInput) {
      quantityInput.addEventListener('change', (e) => {
        this.setQuantity(parseInt(e.target.value) || 1);
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        this.changeQuantity(-1);
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        this.changeQuantity(1);
      });
    }

    // 配送方法選択（既存InventoryManagerとの統合）
    document.querySelectorAll('input[name="delivery_method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectDeliveryMethod(e.target.value);
      });
    });

    // フォーム送信
    const productForm = document.querySelector(`#ProductForm-${this.getSectionId()}`);
    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        this.handleFormSubmit(e);
      });
    }

    // ギフトオプション（既存システムとの統合）
    this.integreateWithGiftSystem();

    // 既存InventoryManagerとの統合
    this.integrateWithInventoryManager();
  }

  async selectBundle(option) {
    try {
      // 既存選択を解除
      document.querySelectorAll('.bundle-option').forEach(opt => {
        opt.classList.remove('selected');
      });

      // 新しい選択を適用
      option.classList.add('selected');
      
      this.selectedBundle = parseInt(option.dataset.bundle);
      this.selectedVariantId = option.dataset.variantId;
      this.currentPrice = parseInt(option.dataset.price);

      // 隠しフィールド更新
      const productVariantId = document.getElementById('productVariantId');
      const selectedBundleField = document.getElementById('selectedBundle');
      
      if (productVariantId) productVariantId.value = this.selectedVariantId;
      if (selectedBundleField) selectedBundleField.value = `${this.selectedBundle}個入り`;

      // UI更新
      this.updatePrice();
      this.updateStockDisplay();
      this.showQuantitySection();
      this.showCustomOptions();
      this.updateButtonStates();

      // 最新在庫情報を取得
      await this.refreshStockData(this.selectedBundle);

      console.log('Bundle selected:', this.selectedBundle, 'Variant ID:', this.selectedVariantId);
    } catch (error) {
      console.error('Error selecting bundle:', error);
    }
  }

  async refreshStockData(bundleSize) {
    if (!this.stockData.has(bundleSize)) return;

    try {
      const stockInfo = this.stockData.get(bundleSize);
      const freshStockInfo = await this.checkStockWithAPI(stockInfo.variantId, this.quantity);
      
      this.stockData.set(bundleSize, {
        ...stockInfo,
        remaining: freshStockInfo.remaining,
        lastUpdated: Date.now()
      });

      this.updateStockDisplay();
    } catch (error) {
      console.error('Failed to refresh stock data:', error);
    }
  }

  selectDeliveryMethod(method) {
    this.selectedMethod = method;
    
    // 隠しフィールド更新
    const selectedMethodField = document.getElementById('selectedMethod');
    if (selectedMethodField) {
      selectedMethodField.value = method === 'pickup' ? '店舗受け取り' : 'オンライン配送';
    }

    // 既存InventoryManagerとの連携
    if (this.inventoryManager && this.inventoryManager.updateDeliveryMethod) {
      this.inventoryManager.updateDeliveryMethod(method);
    }

    // 日時選択の表示/非表示
    this.toggleDateTimeSelection(method === 'pickup');
    
    // ギフトセクション表示
    this.showGiftSection();
    
    this.updateButtonStates();
    console.log('Delivery method selected:', method);
  }

  changeQuantity(delta) {
    const newQuantity = this.quantity + delta;
    this.setQuantity(newQuantity);
  }

  setQuantity(newQuantity) {
    if (!this.selectedBundle || !this.stockData.has(this.selectedBundle)) return;

    const stockInfo = this.stockData.get(this.selectedBundle);
    const maxQuantity = stockInfo.remaining;
    
    this.quantity = Math.max(1, Math.min(newQuantity, maxQuantity));

    // 入力フィールド更新
    const quantityInput = document.getElementById('Quantity-' + this.getSectionId());
    if (quantityInput) {
      quantityInput.value = this.quantity;
    }

    this.updatePrice();
    this.updateStockDisplay();
    this.updateButtonStates();
  }

  updatePrice() {
    if (this.currentPrice > 0) {
      const totalPrice = this.currentPrice * this.quantity;
      const priceElement = document.getElementById('price-' + this.getSectionId());
      if (priceElement) {
        const priceDisplay = priceElement.querySelector('.price-item--regular .price__regular .price');
        if (priceDisplay) {
          priceDisplay.textContent = `¥${totalPrice.toLocaleString()}`;
        }
      }
    }
  }

  updateStockDisplay() {
    const stockIndicator = document.getElementById('stockIndicator');
    const stockText = document.getElementById('stockText');
    const quantityStockInfo = document.getElementById('quantityStockInfo');

    if (!this.selectedBundle || !this.stockData.has(this.selectedBundle)) {
      if (stockText) stockText.textContent = 'バンドルを選択してください';
      return;
    }

    const stockInfo = this.stockData.get(this.selectedBundle);
    const remaining = stockInfo.remaining;

    if (stockText) {
      if (remaining <= 0) {
        stockText.textContent = '売り切れ';
        stockText.className = 'stock-warning';
      } else if (remaining <= 3) {
        stockText.textContent = `残り${remaining}セット（お早めに）`;
        stockText.className = 'stock-warning';
      } else {
        stockText.textContent = `残り${remaining}セット`;
        stockText.className = 'stock-good';
      }
    }

    if (quantityStockInfo) {
      quantityStockInfo.textContent = `あと${remaining}セットまで選択可能`;
      quantityStockInfo.className = remaining <= 3 ? 'stock-warning' : '';
    }
  }

  updateBundleOptionDisplay(option, stockInfo) {
    const stockElement = option.querySelector('.bundle-stock');
    
    if (stockInfo.remaining <= 0) {
      option.classList.add('out-of-stock');
      option.style.pointerEvents = 'none';
    } else if (stockInfo.remaining <= 3) {
      option.classList.add('low-stock');
      if (stockElement) {
        stockElement.style.display = 'block';
        stockElement.textContent = `残${stockInfo.remaining}`;
      }
    } else {
      option.classList.remove('low-stock', 'out-of-stock');
      if (stockElement) {
        stockElement.style.display = 'none';
      }
    }
  }

  showQuantitySection() {
    const quantitySection = document.getElementById('quantitySection');
    if (quantitySection) {
      quantitySection.style.display = 'block';
    }
  }

  showCustomOptions() {
    const customOptionsSection = document.getElementById('customOptionsSection');
    if (customOptionsSection) {
      customOptionsSection.style.display = 'block';
    }
  }

  showGiftSection() {
    const giftSection = document.getElementById('giftSection');
    if (giftSection) {
      giftSection.style.display = 'block';
    }
  }

  toggleDateTimeSelection(isPickup) {
    const datetimeSelection = document.getElementById('datetimeSelection');
    if (datetimeSelection) {
      datetimeSelection.style.display = isPickup ? 'block' : 'none';
    }

    // 既存InventoryManagerとの連携で日時オプションを生成
    if (isPickup && this.inventoryManager && this.inventoryManager.generateDateTimeOptions) {
      this.inventoryManager.generateDateTimeOptions();
    }
  }

  updateButtonStates() {
    const submitButton = document.getElementById('productSubmitButton');
    const buttonText = document.getElementById('buttonText');
    
    const canAddToCart = this.selectedBundle && 
                        this.selectedVariantId && 
                        this.selectedMethod && 
                        this.quantity > 0 &&
                        this.stockData.has(this.selectedBundle) &&
                        this.stockData.get(this.selectedBundle).remaining >= this.quantity;

    if (submitButton) {
      submitButton.disabled = !canAddToCart;
    }

    if (buttonText) {
      if (!this.selectedBundle) {
        buttonText.textContent = 'セット内容を選択してください';
      } else if (!this.selectedMethod) {
        buttonText.textContent = '受け取り方法を選択してください';
      } else if (!canAddToCart && this.stockData.has(this.selectedBundle)) {
        const remaining = this.stockData.get(this.selectedBundle).remaining;
        if (remaining <= 0) {
          buttonText.textContent = '売り切れ';
        } else {
          buttonText.textContent = '在庫不足';
        }
      } else {
        buttonText.textContent = 'カートに追加する';
      }
    }

    // 数量ボタンの状態
    const minusBtn = document.querySelector('.quantity__button[name="minus"]');
    const plusBtn = document.querySelector('.quantity__button[name="plus"]');

    if (minusBtn) minusBtn.disabled = this.quantity <= 1;
    
    if (plusBtn && this.selectedBundle && this.stockData.has(this.selectedBundle)) {
      const maxQuantity = this.stockData.get(this.selectedBundle).remaining;
      plusBtn.disabled = this.quantity >= maxQuantity;
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateSelection()) {
      return false;
    }

    try {
      // 最終在庫チェック
      const stockCheck = await this.checkStockWithAPI(this.selectedVariantId, this.quantity);
      if (!stockCheck.ok) {
        alert(`在庫が不足しています。残り${stockCheck.remaining}セットです。`);
        await this.refreshStockData(this.selectedBundle);
        return false;
      }

      // 既存のカートコントローラーとの連携
      if (this.cartController && this.cartController.addToCart) {
        const cartData = this.buildCartData();
        const result = await this.cartController.addToCart(cartData);
        
        if (result.success) {
          this.showSuccessMessage();
          // 在庫データを更新
          await this.refreshStockData(this.selectedBundle);
        } else {
          throw new Error(result.error || 'カート追加に失敗しました');
        }
      } else {
        // フォールバック：標準のShopify Add to Cart
        e.target.submit();
      }

    } catch (error) {
      console.error('Form submission error:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    }
  }

  validateSelection() {
    if (!this.selectedBundle) {
      alert('セット内容を選択してください。');
      return false;
    }

    if (!this.selectedMethod) {
      alert('お受け取り方法を選択してください。');
      return false;
    }

    if (!this.stockData.has(this.selectedBundle)) {
      alert('在庫情報を確認できません。ページを更新してください。');
      return false;
    }

    const stockInfo = this.stockData.get(this.selectedBundle);
    if (stockInfo.remaining < this.quantity) {
      alert(`在庫が不足しています。残り${stockInfo.remaining}セットです。`);
      return false;
    }

    return true;
  }

  buildCartData() {
    return {
      id: this.selectedVariantId,
      quantity: this.quantity,
      properties: {
        '配送方法': this.selectedMethod === 'pickup' ? '店舗受け取り' : 'オンライン配送',
        'バンドル種別': `${this.selectedBundle}個入り`,
        ...(this.getGiftProperties())
      }
    };
  }

  getGiftProperties() {
    const giftProperties = {};
    
    // 既存ギフトシステムからの値を取得
    const giftToggle = document.getElementById('giftToggle');
    if (giftToggle && giftToggle.checked) {
      const giftPurpose = document.getElementById('giftPurpose');
      const giftName = document.getElementById('giftName');
      
      if (giftPurpose && giftPurpose.value) {
        giftProperties['ギフト用途'] = giftPurpose.value;
      }
      
      if (giftName && giftName.value) {
        giftProperties['ギフト宛名'] = giftName.value;
      }
    }
    
    return giftProperties;
  }

  async checkStockWithAPI(variantId, quantity) {
    try {
      const checkEndpoint = this.productData.sisiri_app?.check_endpoint || '/apps/mochi/check';
      const url = `${checkEndpoint}?variant=${variantId}&qty=${quantity}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        ok: data.ok,
        remaining: data.remaining || 0,
        next: data.next || ''
      };

    } catch (error) {
      console.error('Stock API check failed:', error);
      // フォールバック：楽観的な在庫チェック
      return {
        ok: true,
        remaining: 5, // デフォルト値
        next: ''
      };
    }
  }

  startStockPolling() {
    const pollingInterval = this.productData.sisiri_app?.polling_interval || 30000;
    
    setInterval(async () => {
      if (this.selectedBundle && this.stockData.has(this.selectedBundle)) {
        await this.refreshStockData(this.selectedBundle);
      }
    }, pollingInterval);
  }

  // 既存システムとの統合メソッド
  integrateWithInventoryManager() {
    // 既存のInventoryManagerが存在する場合の統合処理
    if (this.inventoryManager) {
      // カスタムイベントを発火して既存システムに通知
      this.inventoryManager.on = this.inventoryManager.on || function() {};
      this.inventoryManager.emit = this.inventoryManager.emit || function() {};
      
      // バンドル選択時のイベント
      document.addEventListener('bundle:selected', (e) => {
        if (this.inventoryManager.updateProductVariant) {
          this.inventoryManager.updateProductVariant(e.detail.variantId);
        }
      });
    }
  }

  integreateWithGiftSystem() {
    // 既存のギフトシステムとの統合
    const giftToggle = document.getElementById('giftToggle');
    if (giftToggle) {
      giftToggle.addEventListener('change', (e) => {
        const giftDetails = document.getElementById('giftDetails');
        if (giftDetails) {
          giftDetails.style.display = e.target.checked ? 'block' : 'none';
        }
      });
    }
  }

  showSuccessMessage() {
    // 成功メッセージの表示
    const message = document.createElement('div');
    message.className = 'cart-success-message';
    message.textContent = 'カートに追加しました！';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  getSectionId() {
    // セクションIDを取得（Dawn テーマの標準パターン）
    const productForm = document.querySelector('[id^="ProductForm-"]');
    return productForm ? productForm.id.replace('ProductForm-', '') : 'main';
  }

  updateUI() {
    // 初期UI状態の設定
    this.updateButtonStates();
    
    // バンドル未選択時は数量セクションを非表示
    const quantitySection = document.getElementById('quantitySection');
    const customOptionsSection = document.getElementById('customOptionsSection');
    const giftSection = document.getElementById('giftSection');
    
    if (quantitySection) quantitySection.style.display = 'none';
    if (customOptionsSection) customOptionsSection.style.display = 'none';
    if (giftSection) giftSection.style.display = 'none';
  }
}

// CSS アニメーション
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .cart-success-message {
    animation: slideIn 0.3s ease;
  }
`;
document.head.appendChild(style);

// DOM読み込み後に初期化
document.addEventListener('DOMContentLoaded', () => {
  // 和菓子バンドル商品ページでのみ実行
  if (document.querySelector('.wagashi-bundle-selection')) {
    window.wagashiBundleManager = new WagashiBundleManager();
  }
});

// グローバルエクスポート（他のスクリプトからアクセス可能に）
window.WagashiBundleManager = WagashiBundleManager;