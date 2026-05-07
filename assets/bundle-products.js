// ファイル名: assets/bundle-products.js
// バンドル商品機能 - 既存カスタムオプション・ギフト機能との完全連携

(function() {
  'use strict';

  // ===========================================
  // 初期化とイベント処理
  // ===========================================
  
  // DOM読み込み完了後に初期化
  function initializeBundleProducts() {
    // バンドル商品セクションが存在するかチェック
    const bundleSection = document.querySelector('.bundle-products-section');
    if (!bundleSection) {
      return; // バンドル商品セクションがない場合は何もしない
    }

    // メインクラスのインスタンス化
    window.bundleProductManager = new BundleProductManager();
    
    // デバッグ情報（開発時のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('.myshopify.com')) {
      console.log('🔧 バンドル商品システム - デバッグモード');
      console.log('📦 設定:', bundleConfig);
      console.log('🔗 カスタムオプション連携:', existingCustomOptionsSystem);
      console.log('🎁 ギフト連携:', existingGiftSystem);
    }
  }

  // ===========================================
  // CSS アニメーション定義（動的追加）
  // ===========================================
  
  function injectAnimationStyles() {
    const animationCSS = `
      <style id="bundle-products-animations">
        @keyframes bundle-slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes bundle-slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes bundle-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        @keyframes bundle-bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      </style>
    `;
    
    if (!document.getElementById('bundle-products-animations')) {
      document.head.insertAdjacentHTML('beforeend', animationCSS);
    }
  }

  // ===========================================
  // パフォーマンス最適化
  // ===========================================
  
  // 遅延実行用のユーティリティ
  function debounce(func, wait) {
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

  // スロットリング用のユーティリティ
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ===========================================
  // エラーハンドリング
  // ===========================================
  
  // グローバルエラーハンドラー
  window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('bundle-products.js')) {
      console.error('❌ バンドル商品システムエラー:', event.error);
      
      // ユーザーに優しいエラーメッセージ
      if (window.bundleProductManager) {
        window.bundleProductManager.showMessage(
          'システムエラーが発生しました。ページを更新してお試しください。',
          'error'
        );
      }
    }
  });

  // ===========================================
  // 外部システム連携用API
  // ===========================================
  
  // 外部からアクセス可能なAPI
  window.BundleProductsAPI = {
    // 選択中のバンドルデータを取得
    getSelectedBundleData() {
      return selectedBundleData;
    },
    
    // 特定のバンドルの数量を設定
    setBundleQuantity(bundleId, quantity) {
      const card = document.querySelector(`[data-bundle-id="${bundleId}"]`);
      if (card) {
        const input = card.querySelector('.bundle-quantity-input');
        if (input && window.bundleProductManager) {
          const change = quantity - parseInt(input.value);
          window.bundleProductManager.updateQuantity(input, change);
        }
      }
    },
    
    // 全バンドルの数量をリセット
    resetAllQuantities() {
      const inputs = document.querySelectorAll('.bundle-quantity-input');
      inputs.forEach(input => {
        input.value = 1;
        if (window.bundleProductManager) {
          window.bundleProductManager.updatePrice(input);
        }
      });
    },
    
    // バンドル選択状態をチェック
    checkBundleSelection() {
      return {
        hasSelection: !!selectedBundleData,
        bundleData: selectedBundleData
      };
    },
    
    // カスタムイベント発火
    triggerBundleEvent(eventName, data = {}) {
      const event = new CustomEvent(`bundle:${eventName}`, {
        detail: data
      });
      document.dispatchEvent(event);
    }
  };

  // ===========================================
  // 互換性チェック
  // ===========================================
  
  function checkBrowserCompatibility() {
    const requiredFeatures = [
      'fetch',
      'Promise',
      'CustomEvent',
      'addEventListener'
    ];
    
    const missingFeatures = requiredFeatures.filter(feature => 
      typeof window[feature] === 'undefined'
    );
    
    if (missingFeatures.length > 0) {
      console.warn('⚠️ ブラウザの互換性問題:', missingFeatures);
      return false;
    }
    
    return true;
  }

  // ===========================================
  // レスポンシブ対応
  // ===========================================
  
  // ビューポート変更時の処理
  const handleViewportChange = throttle(() => {
    const bundleSection = document.querySelector('.bundle-products-section');
    if (!bundleSection) return;
    
    const isMobile = window.innerWidth <= 767;
    const isTablet = window.innerWidth <= 1023 && window.innerWidth > 767;
    
    // モバイル/タブレット特有の調整
    if (isMobile) {
      bundleSection.classList.add('is-mobile');
      bundleSection.classList.remove('is-tablet', 'is-desktop');
    } else if (isTablet) {
      bundleSection.classList.add('is-tablet');
      bundleSection.classList.remove('is-mobile', 'is-desktop');
    } else {
      bundleSection.classList.add('is-desktop');
      bundleSection.classList.remove('is-mobile', 'is-tablet');
    }
  }, 150);

  // ===========================================
  // SEO・構造化データ対応
  // ===========================================
  
  function generateProductStructuredData() {
    const bundleCards = document.querySelectorAll('.bundle-product-card');
    const structuredDataArray = [];
    
    bundleCards.forEach(card => {
      const title = card.querySelector('.bundle-product-title')?.textContent?.trim();
      const price = card.querySelector('.bundle-price-current')?.dataset?.originalPrice;
      const image = card.querySelector('.bundle-product-image')?.src;
      
      if (title && price) {
        structuredDataArray.push({
          "@type": "Product",
          "name": title,
          "offers": {
            "@type": "Offer",
            "price": price,
            "priceCurrency": "JPY",
            "availability": "https://schema.org/InStock"
          },
          ...(image && { "image": image })
        });
      }
    });
    
    if (structuredDataArray.length > 0) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": structuredDataArray.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": item
        }))
      };
      
      // 既存の構造化データスクリプトがなければ追加
      if (!document.querySelector('script[type="application/ld+json"][data-bundle-products]')) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-bundle-products', 'true');
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
      }
    }
  }

  // ===========================================
  // 初期化実行
  // ===========================================
  
  // DOM読み込み状態チェック
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSystem);
  } else {
    initializeSystem();
  }
  
  function initializeSystem() {
    // ブラウザ互換性チェック
    if (!checkBrowserCompatibility()) {
      console.error('❌ ブラウザが対応していません');
      return;
    }
    
    // アニメーションスタイル注入
    injectAnimationStyles();
    
    // メインシステム初期化
    initializeBundleProducts();
    
    // レスポンシブイベント設定
    window.addEventListener('resize', handleViewportChange);
    handleViewportChange(); // 初回実行
    
    // 構造化データ生成
    generateProductStructuredData();
    
    // 初期化完了イベント発火
    document.dispatchEvent(new CustomEvent('bundle:initialized', {
      detail: {
        timestamp: new Date().toISOString(),
        config: bundleConfig
      }
    }));
    
    console.log('🚀 バンドル商品システム - 全機能初期化完了');
  }

  // ===========================================
  // クリーンアップ（ページ離脱時）
  // ===========================================
  
  window.addEventListener('beforeunload', () => {
    // イベントリスナーのクリーンアップ
    window.removeEventListener('resize', handleViewportChange);
    
    // タイマーのクリーンアップ
    const tempMessages = document.querySelectorAll('.bundle-temp-message');
    tempMessages.forEach(message => message.remove());
    
    console.log('🧹 バンドル商品システム - クリーンアップ完了');
  });

})();
  // 設定とグローバル変数
  // ===========================================
  
  let bundleConfig = {};
  let isIntegrationReady = false;
  let selectedBundleData = null;
  
  // 既存システム統合用の変数
  let existingCustomOptionsSystem = null;
  let existingGiftSystem = null;

  // ===========================================
  // バンドル商品管理クラス
  // ===========================================
  
  class BundleProductManager {
    constructor() {
      this.bundleSection = document.querySelector('.bundle-products-section');
      this.bundleCards = document.querySelectorAll('.bundle-product-card');
      this.quantitySelectors = document.querySelectorAll('.bundle-quantity-selector');
      this.cartButtons = document.querySelectorAll('.bundle-add-to-cart-btn');
      
      this.init();
    }

    init() {
      this.loadConfig();
      this.setupEventListeners();
      this.detectExistingSystems();
      this.initializeAccessibility();
      
      console.log('✅ バンドル商品システム初期化完了');
    }

    loadConfig() {
      const configElement = document.getElementById('bundle-products-config');
      if (configElement) {
        try {
          bundleConfig = JSON.parse(configElement.textContent);
        } catch (error) {
          console.warn('⚠️ バンドル設定の読み込みに失敗:', error);
          bundleConfig = this.getDefaultConfig();
        }
      } else {
        bundleConfig = this.getDefaultConfig();
      }
    }

    getDefaultConfig() {
      return {
        integrationMode: 'auto',
        requireCustomOptions: true,
        requireGiftOptions: false,
        maxQuantity: 10,
        autoTriggerCustomOptions: true,
        showSuccessMessage: true,
        successMessage: 'バンドル商品をカートに追加しました',
        errorMessage: 'エラーが発生しました。もう一度お試しください。'
      };
    }

    // ===========================================
    // 既存システム検出・統合
    // ===========================================
    
    detectExistingSystems() {
      // カスタムオプションシステムの検出
      if (window.inventoryLinkedConfig || document.querySelector('.inventory-linked-delivery-options')) {
        existingCustomOptionsSystem = {
          available: true,
          controller: window.cartController || null,
          inventoryManager: window.inventoryManager || null
        };
        console.log('🔗 既存カスタムオプションシステムを検出');
      }

      // ギフトシステムの検出
      if (document.querySelector('.gift-settings-simple')) {
        existingGiftSystem = {
          available: true,
          element: document.querySelector('.gift-settings-simple')
        };
        console.log('🎁 既存ギフトシステムを検出');
      }

      isIntegrationReady = true;
    }

    // ===========================================
    // イベントリスナー設定
    // ===========================================
    
    setupEventListeners() {
      // 数量選択ボタン
      this.quantitySelectors.forEach(selector => {
        const minusBtn = selector.querySelector('.bundle-quantity-minus');
        const plusBtn = selector.querySelector('.bundle-quantity-plus');
        const input = selector.querySelector('.bundle-quantity-input');

        if (minusBtn && plusBtn && input) {
          minusBtn.addEventListener('click', () => this.updateQuantity(input, -1));
          plusBtn.addEventListener('click', () => this.updateQuantity(input, 1));
          
          // キーボード対応
          minusBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.updateQuantity(input, -1);
            }
          });
          
          plusBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.updateQuantity(input, 1);
            }
          });
        }
      });

      // カート追加ボタン
      this.cartButtons.forEach(button => {
        button.addEventListener('click', (e) => this.handleAddToCart(e));
      });
    }

    // ===========================================
    // 数量管理
    // ===========================================
    
    updateQuantity(input, change) {
      if (!input) return;

      const currentValue = parseInt(input.value) || 1;
      const newValue = Math.max(1, Math.min(bundleConfig.maxQuantity, currentValue + change));
      
      input.value = newValue;
      
      // 価格更新
      this.updatePrice(input);
      
      // アクセシビリティ通知
      this.announceQuantityChange(input, newValue);
    }

    updatePrice(input) {
      const card = input.closest('.bundle-product-card');
      if (!card) return;

      const priceElement = card.querySelector('.bundle-price-current');
      if (!priceElement) return;

      const originalPrice = parseInt(priceElement.dataset.originalPrice) || 0;
      const quantity = parseInt(input.value) || 1;
      const totalPrice = originalPrice * quantity;

      // Shopifyの金額フォーマット関数があれば使用、なければ基本的なフォーマット
      if (window.Shopify && window.Shopify.formatMoney) {
        priceElement.textContent = window.Shopify.formatMoney(totalPrice);
      } else {
        priceElement.textContent = '¥' + totalPrice.toLocaleString();
      }
    }

    announceQuantityChange(input, newValue) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'visually-hidden';
      announcement.textContent = `数量が ${newValue} に変更されました`;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    // ===========================================
    // カート追加処理
    // ===========================================
    
    async handleAddToCart(event) {
      const button = event.currentTarget;
      const card = button.closest('.bundle-product-card');
      
      if (!card || button.disabled) return;

      // ローディング状態開始
      this.setButtonLoading(button, true);

      try {
        // バンドル商品データ収集
        const bundleData = this.collectBundleData(card);
        selectedBundleData = bundleData;

        // 既存システムとの統合チェック
        const integrationResult = await this.handleSystemIntegration(bundleData);
        
        if (integrationResult.success) {
          // カート追加実行
          await this.addBundleToCart(bundleData);
        } else {
          throw new Error(integrationResult.message || '統合処理に失敗しました');
        }

      } catch (error) {
        console.error('❌ カート追加エラー:', error);
        this.showMessage(bundleConfig.errorMessage, 'error');
      } finally {
        this.setButtonLoading(button, false);
      }
    }

    collectBundleData(card) {
      const variantId = card.querySelector('.bundle-add-to-cart-btn').dataset.variantId;
      const productId = card.querySelector('.bundle-add-to-cart-btn').dataset.productId;
      const bundleType = card.querySelector('.bundle-add-to-cart-btn').dataset.bundleType;
      const quantityInput = card.querySelector('.bundle-quantity-input');
      const quantity = parseInt(quantityInput.value) || 1;

      return {
        variantId: variantId,
        productId: productId,
        bundleType: bundleType,
        quantity: quantity,
        timestamp: new Date().toISOString(),
        bundleId: card.dataset.bundleId
      };
    }

    // ===========================================
    // 既存システム統合処理
    // ===========================================
    
    async handleSystemIntegration(bundleData) {
      // カスタムオプション要求チェック
      if (bundleConfig.requireCustomOptions && existingCustomOptionsSystem?.available) {
        const customOptionsResult = await this.checkCustomOptionsSelection();
        
        if (!customOptionsResult.isSelected && bundleConfig.autoTriggerCustomOptions) {
          // カスタムオプション選択を促す
          this.triggerCustomOptionsSelection();
          return { success: false, message: '配送方法を選択してください' };
        } else if (!customOptionsResult.isSelected) {
          return { success: false, message: '配送方法の選択が必要です' };
        }
      }

      // ギフトオプション要求チェック
      if (bundleConfig.requireGiftOptions && existingGiftSystem?.available) {
        const giftOptionsResult = this.checkGiftOptionsSelection();
        
        if (!giftOptionsResult.isSelected) {
          this.triggerGiftOptionsSelection();
          return { success: false, message: 'ギフト設定を確認してください' };
        }
      }

      return { success: true };
    }

    async checkCustomOptionsSelection() {
      // 既存システムの選択状態を確認
      const selectedMethodField = document.getElementById('selectedMethod');
      const selectedDateTimeField = document.getElementById('selectedDateTime');
      
      const isSelected = selectedMethodField?.value && selectedDateTimeField?.value;
      
      return {
        isSelected: !!isSelected,
        method: selectedMethodField?.value || null,
        datetime: selectedDateTimeField?.value || null
      };
    }

    checkGiftOptionsSelection() {
      // ギフト設定の選択状態を確認
      const giftCompletedField = document.getElementById('giftCompletedHidden');
      const isSelected = giftCompletedField?.value === 'true';
      
      return {
        isSelected: isSelected
      };
    }

    triggerCustomOptionsSelection() {
      // カスタムオプション選択UIにフォーカス
      const customOptionsSection = document.querySelector('.inventory-linked-delivery-options');
      if (customOptionsSection) {
        customOptionsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // メッセージ表示
        this.showSelectionMessage('バンドル商品を選択しました。配送方法をお選びください。');
      }
    }

    triggerGiftOptionsSelection() {
      // ギフトオプション選択UIにフォーカス
      const giftSection = document.querySelector('.gift-settings-simple');
      if (giftSection) {
        giftSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }

    // ===========================================
    // Shopify Cart API連携
    // ===========================================
    
    async addBundleToCart(bundleData) {
      const cartData = {
        id: bundleData.variantId,
        quantity: bundleData.quantity,
        properties: {
          'バンドル商品タイプ': bundleData.bundleType,
          'バンドル選択日時': bundleData.timestamp,
          'バンドルID': bundleData.bundleId
        }
      };

      // 既存システムのプロパティを統合
      const existingProperties = this.getExistingProperties();
      Object.assign(cartData.properties, existingProperties);

      // Shopify Cart APIでカート追加
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData)
      });

      if (!response.ok) {
        throw new Error(`カート追加に失敗: ${response.status}`);
      }

      const result = await response.json();
      
      // 成功時の処理
      this.handleCartAddSuccess(result, bundleData);
      
      return result;
    }

    getExistingProperties() {
      const properties = {};
      
      // カスタムオプションのプロパティ
      const customOptionFields = document.querySelectorAll('input[name^="properties["]');
      customOptionFields.forEach(field => {
        if (field.value) {
          const propertyName = field.name.match(/properties\[(.*?)\]/)?.[1];
          if (propertyName) {
            properties[propertyName] = field.value;
          }
        }
      });

      return properties;
    }

    handleCartAddSuccess(cartResult, bundleData) {
      // 成功メッセージ表示
      if (bundleConfig.showSuccessMessage) {
        this.showMessage(bundleConfig.successMessage, 'success');
      }

      // カート更新イベント発火
      this.dispatchCartUpdateEvent(cartResult, bundleData);
      
      // 既存システムのカート更新処理を呼び出し
      if (existingCustomOptionsSystem?.controller?.updateCartButtonState) {
        existingCustomOptionsSystem.controller.updateCartButtonState();
      }

      // カートドロワーがあれば更新
      this.updateCartDrawer();
    }

    dispatchCartUpdateEvent(cartResult, bundleData) {
      const event = new CustomEvent('bundle:cart:added', {
        detail: {
          cartResult: cartResult,
          bundleData: bundleData,
          timestamp: new Date().toISOString()
        }
      });
      
      document.dispatchEvent(event);
    }

    async updateCartDrawer() {
      // Shopify標準のカートドロワー更新
      if (window.Shopify && window.Shopify.onCartUpdate) {
        window.Shopify.onCartUpdate();
      }
      
      // Dawn テーマのカートドロワー更新
      if (document.querySelector('cart-drawer')) {
        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer && typeof cartDrawer.getSectionInnerHTML === 'function') {
          cartDrawer.getSectionInnerHTML();
        }
      }
    }

    // ===========================================
    // UI フィードバック
    // ===========================================
    
    setButtonLoading(button, isLoading) {
      const textSpan = button.querySelector('.bundle-btn-text');
      const loadingSpan = button.querySelector('.bundle-btn-loading');
      
      if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        if (textSpan) textSpan.style.opacity = '0';
        if (loadingSpan) loadingSpan.style.display = 'flex';
      } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (textSpan) textSpan.style.opacity = '1';
        if (loadingSpan) loadingSpan.style.display = 'none';
      }
    }

    showMessage(message, type = 'info') {
      // 既存のメッセージがあれば削除
      const existingMessage = document.querySelector('.bundle-temp-message');
      if (existingMessage) {
        existingMessage.remove();
      }

      // メッセージ要素作成
      const messageElement = document.createElement('div');
      messageElement.className = `bundle-temp-message bundle-message-${type}`;
      messageElement.setAttribute('role', 'alert');
      messageElement.setAttribute('aria-live', 'polite');
      
      const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        info: '#d1ecf1'
      };
      
      const textColors = {
        success: '#155724',
        error: '#721c24', 
        info: '#0c5460'
      };

      messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: ${textColors[type] || textColors.info};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        animation: bundle-slideInRight 0.3s ease-out;
      `;

      messageElement.textContent = message;
      document.body.appendChild(messageElement);

      // 3秒後に自動削除
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.style.animation = 'bundle-slideOutRight 0.3s ease-in';
          setTimeout(() => {
            messageElement.remove();
          }, 300);
        }
      }, 3000);
    }

    showSelectionMessage(message) {
      const selectionMessage = document.querySelector('.bundle-selection-message');
      if (selectionMessage) {
        const messageContent = selectionMessage.querySelector('.bundle-message-content p');
        if (messageContent) {
          messageContent.textContent = message;
        }
        selectionMessage.style.display = 'block';
        
        // 5秒後に非表示
        setTimeout(() => {
          selectionMessage.style.display = 'none';
        }, 5000);
      }
    }

    // ===========================================
    // アクセシビリティ初期化
    // ===========================================
    
    initializeAccessibility() {
      // ARIA ラベルの設定
      this.bundleCards.forEach((card, index) => {
        card.setAttribute('role', 'group');
        card.setAttribute('aria-labelledby', `bundle-title-${index}`);
        
        const title = card.querySelector('.bundle-product-title');
        if (title) {
          title.id = `bundle-title-${index}`;
        }
      });

      // キーボードナビゲーション
      this.setupKeyboardNavigation();
    }

    setupKeyboardNavigation() {
      this.bundleCards.forEach((card, index) => {
        const focusableElements = card.querySelectorAll(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach((element, elemIndex) => {
          element.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              
              const direction = e.key === 'ArrowRight' ? 1 : -1;
              const nextCardIndex = (index + direction + this.bundleCards.length) % this.bundleCards.length;
              const nextCard = this.bundleCards[nextCardIndex];
              const nextFocusableElements = nextCard.querySelectorAll(
                'button, input, [tabindex]:not([tabindex="-1"])'
              );
              
              if (nextFocusableElements[elemIndex]) {
                nextFocusableElements[elemIndex].focus();
              }
            }
          });
        });
      });
    }
  }

  // ===========================================