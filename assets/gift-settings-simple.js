// ファイル名: gift-settings-simple.js
// Shopify Dawn テーマ対応 ギフト設定機能
// バージョン: 2.0 - エラー修正・安全性強化版
// ES6準拠、jQuery非依存、完全レスポンシブ対応

(function() {
  'use strict';

  // ==========================================
  // 設定とグローバル変数
  // ==========================================
  
  const GIFT_SETTINGS = {
    // デバッグモード（本番環境では false に設定）
    DEBUG: false,
    
    // アニメーション設定
    ANIMATION_DURATION: 300,
    SUCCESS_MESSAGE_DURATION: 3000,
    ERROR_MESSAGE_DURATION: 5000,
    
    // バリデーション設定
    ADDRESSEE_MAX_LENGTH: 20,
    MIN_QUANTITY: 1,
    
    // セレクタ
    SELECTORS: {
      container: '.gift-settings-simple',
      button: '[data-gift-button]',
      area: '[data-gift-area]',
      summary: '[data-gift-summary]',
      form: '[data-gift-form]',
      quantitySelect: '[data-gift-quantity]',
      purposeSelect: '[data-gift-purpose]',
      addresseeInput: '[data-gift-addressee]',
      confirmBtn: '[data-gift-confirm]',
      cancelBtn: '[data-gift-cancel]',
      editBtn: '[data-gift-edit]',
      status: '[data-gift-status]',
      sampleDisplay: '[data-sample-display]',
      sampleImage: '[data-sample-image]',
      samplePlaceholder: '[data-sample-placeholder]',
      addresseeCount: '[data-addressee-count]',
      quantityHelp: '[data-quantity-help]',
      summaryContent: '[data-summary-content]',
      errorContainer: '[data-error-container]',
      errorMessage: '[data-error-message]'
    },
    
    // エラーメッセージ
    ERRORS: {
      INITIALIZATION: 'ギフト設定の初期化に失敗しました',
      PRODUCT_DATA: '商品データの取得に失敗しました',
      FORM_VALIDATION: '入力内容に不備があります',
      CART_INTEGRATION: 'カート連携でエラーが発生しました',
      NETWORK: 'ネットワークエラーが発生しました',
      GENERAL: '予期しないエラーが発生しました'
    }
  };

  // インスタンス管理
  const instances = new Map();
  
  // ==========================================
  // メインクラス定義
  // ==========================================
  
  class GiftSettingsManager {
    constructor(container) {
      this.container = container;
      this.sectionId = container.dataset.sectionId;
      this.elements = {};
      this.productData = {};
      this.giftSettings = {
        quantity: '',
        purpose: '',
        addressee: ''
      };
      this.isInitialized = false;
      this.isProcessing = false;
      
      this.init();
    }

    // ==========================================
    // 初期化メソッド
    // ==========================================
    
    async init() {
      try {
        this.log('🎁 ギフト設定マネージャーを初期化中...', this.sectionId);
        
        // DOM要素を取得
        this.getDOMElements();
        
        // 商品データを読み込み
        await this.loadProductData();
        
        // 既存の数量入力フィールドを監視
        this.watchQuantityInput();
        
        // 数量オプションを生成
        this.generateQuantityOptions();
        
        // イベントリスナーを設定
        this.attachEventListeners();
        
        // カート連携を初期化
        this.initializeCartIntegration();
        
        // 初期状態を設定
        this.updateFormValidation();
        
        this.isInitialized = true;
        this.log('✅ ギフト設定が正常に初期化されました');
        
      } catch (error) {
        this.handleError(error, GIFT_SETTINGS.ERRORS.INITIALIZATION);
      }
    }

    // ==========================================
    // DOM要素取得
    // ==========================================
    
    getDOMElements() {
      try {
        const selectors = GIFT_SETTINGS.SELECTORS;
        
        // 必須要素の取得
        this.elements.button = this.container.querySelector(selectors.button);
        this.elements.area = this.container.querySelector(selectors.area);
        this.elements.summary = this.container.querySelector(selectors.summary);
        this.elements.form = this.container.querySelector(selectors.form);
        
        if (!this.elements.button || !this.elements.area || !this.elements.form) {
          throw new Error('必須DOM要素が見つかりません');
        }
        
        // フォーム要素の取得
        this.elements.quantitySelect = this.container.querySelector(selectors.quantitySelect);
        this.elements.purposeSelect = this.container.querySelector(selectors.purposeSelect);
        this.elements.addresseeInput = this.container.querySelector(selectors.addresseeInput);
        
        // ボタン要素の取得
        this.elements.confirmBtn = this.container.querySelector(selectors.confirmBtn);
        this.elements.cancelBtn = this.container.querySelector(selectors.cancelBtn);
        this.elements.editBtn = this.container.querySelector(selectors.editBtn);
        
        // ステータス要素の取得
        this.elements.status = this.container.querySelector(selectors.status);
        this.elements.sampleDisplay = this.container.querySelector(selectors.sampleDisplay);
        this.elements.sampleImage = this.container.querySelector(selectors.sampleImage);
        this.elements.samplePlaceholder = this.container.querySelector(selectors.samplePlaceholder);
        this.elements.addresseeCount = this.container.querySelector(selectors.addresseeCount);
        this.elements.quantityHelp = this.container.querySelector(selectors.quantityHelp);
        this.elements.summaryContent = this.container.querySelector(selectors.summaryContent);
        this.elements.errorContainer = this.container.querySelector(selectors.errorContainer);
        this.elements.errorMessage = this.container.querySelector(selectors.errorMessage);
        
        // 既存の数量入力フィールドを取得
        this.elements.quantityInput = this.findQuantityInput();
        
        this.log('📋 DOM要素を取得しました', {
          button: !!this.elements.button,
          area: !!this.elements.area,
          form: !!this.elements.form,
          quantityInput: !!this.elements.quantityInput
        });
        
      } catch (error) {
        throw new Error(`DOM要素取得エラー: ${error.message}`);
      }
    }

    // ==========================================
    // 数量入力フィールドの検出
    // ==========================================
    
    findQuantityInput() {
      const selectors = [
        'input[name="quantity"]',
        '.quantity__input',
        '[data-quantity-input]',
        'input[type="number"]',
        '.qty',
        '.quantity-input'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.type === 'number') {
          this.log('📊 数量入力フィールドを検出:', selector);
          return element;
        }
      }
      
      this.log('⚠️ 数量入力フィールドが見つかりません');
      return null;
    }

    // ==========================================
    // 商品データ読み込み
    // ==========================================
    
    async loadProductData() {
      try {
        const dataScript = document.getElementById(`gift-product-data-${this.sectionId}`);
        
        if (!dataScript) {
          throw new Error('商品データスクリプトが見つかりません');
        }
        
        this.productData = JSON.parse(dataScript.textContent);
        
        // データの妥当性をチェック
        this.validateProductData();
        
        this.log('📦 商品データを読み込みました:', this.productData);
        
      } catch (error) {
        this.handleError(error, GIFT_SETTINGS.ERRORS.PRODUCT_DATA);
        
        // フォールバックデータを設定
        this.productData = this.getDefaultProductData();
      }
    }

    // ==========================================
    // 商品データの妥当性チェック
    // ==========================================
    
    validateProductData() {
      const required = ['sectionId', 'productId', 'variantId'];
      const missing = required.filter(key => !this.productData[key]);
      
      if (missing.length > 0) {
        throw new Error(`必須商品データが不足: ${missing.join(', ')}`);
      }
      
      // 数値データの正規化
      this.productData.inventory = parseInt(this.productData.inventory) || 0;
      this.productData.maxQuantity = parseInt(this.productData.maxQuantity) || 10;
      this.productData.currentQuantity = parseInt(this.productData.currentQuantity) || 1;
    }

    // ==========================================
    // デフォルト商品データ
    // ==========================================
    
    getDefaultProductData() {
      return {
        sectionId: this.sectionId,
        productId: null,
        variantId: null,
        inventory: 0,
        inventoryPolicy: 'deny',
        inventoryManagement: null,
        currentQuantity: 1,
        maxQuantity: 10,
        productFormId: 'product-form',
        settings: {
          showSuccessMessage: true,
          autoCloseDelay: 3000,
          enableAnimation: true
        },
        purposeSampleImages: {}
      };
    }

    // ==========================================
    // 既存数量入力フィールドの監視
    // ==========================================
    
    watchQuantityInput() {
      if (!this.elements.quantityInput) {
        return;
      }
      
      // 初期値を取得
      this.updateCurrentQuantity();
      
      // イベントリスナーを設定
      const events = ['input', 'change', 'blur'];
      events.forEach(event => {
        this.elements.quantityInput.addEventListener(event, 
          this.debounce(() => this.updateCurrentQuantity(), 100)
        );
      });
      
      // バリアント変更の監視
      document.addEventListener('variant:change', () => {
        setTimeout(() => this.updateCurrentQuantity(), 100);
      });
      
      // フォーム更新の監視
      const productForm = document.querySelector(`#${this.productData.productFormId}`);
      if (productForm) {
        productForm.addEventListener('change', 
          this.debounce(() => this.updateCurrentQuantity(), 100)
        );
      }
      
      this.log('👀 数量入力フィールドの監視を開始');
    }

    // ==========================================
    // 現在数量の更新
    // ==========================================
    
    updateCurrentQuantity() {
      if (!this.elements.quantityInput) {
        return;
      }
      
      const currentValue = parseInt(this.elements.quantityInput.value) || 1;
      
      if (this.productData.currentQuantity !== currentValue) {
        this.productData.currentQuantity = currentValue;
        this.log(`📊 現在の商品数量を更新: ${currentValue}`);
        
        // 数量オプションを再生成
        this.generateQuantityOptions();
      }
    }

    // ==========================================
    // 数量オプション生成
    // ==========================================
    
    generateQuantityOptions() {
      if (!this.elements.quantitySelect) {
        return;
      }
      
      try {
        const currentQuantity = this.productData.currentQuantity || 1;
        const inventory = this.productData.inventory || 0;
        const maxQuantity = this.productData.maxQuantity || 10;
        const inventoryManagement = this.productData.inventoryManagement;
        const inventoryPolicy = this.productData.inventoryPolicy;
        
        this.log('📊 数量オプション生成開始:', {
          currentQuantity,
          inventory,
          maxQuantity,
          inventoryManagement,
          inventoryPolicy
        });
        
        // 既存オプションをクリア（プレースホルダー以外）
        const placeholder = this.elements.quantitySelect.querySelector('option[value=""]');
        this.elements.quantitySelect.innerHTML = '';
        
        if (placeholder) {
          this.elements.quantitySelect.appendChild(placeholder.cloneNode(true));
        }
        
        // ギフト設定可能な最大数量を計算
        let maxGiftQuantity = this.calculateMaxGiftQuantity(
          currentQuantity, inventory, maxQuantity, inventoryManagement, inventoryPolicy
        );
        
        this.log(`📦 ギフト設定可能数量: 1-${maxGiftQuantity}個`);
        
        // 在庫がない場合のチェック
        if (maxGiftQuantity <= 0) {
          this.addDisabledOption('在庫がありません');
          return;
        }
        
        // 数量オプションを生成
        for (let i = 1; i <= maxGiftQuantity; i++) {
          this.addQuantityOption(i, inventory, inventoryManagement, inventoryPolicy);
        }
        
        // ヘルプテキストを更新
        this.updateQuantityHelpText(currentQuantity, maxGiftQuantity);
        
      } catch (error) {
        this.handleError(error, '数量オプション生成エラー');
      }
    }

    // ==========================================
    // 最大ギフト数量の計算
    // ==========================================
    
    calculateMaxGiftQuantity(currentQuantity, inventory, maxQuantity, inventoryManagement, inventoryPolicy) {
      let maxGiftQuantity;
      
      if (inventoryManagement === 'shopify') {
        if (inventoryPolicy === 'continue') {
          // 在庫切れでも販売可能
          maxGiftQuantity = currentQuantity + 1;
        } else {
          // 在庫制限あり
          maxGiftQuantity = Math.min(inventory, currentQuantity + 1);
        }
      } else {
        // 在庫管理なし
        maxGiftQuantity = currentQuantity + 1;
      }
      
      // 設定された最大数量との比較
      return Math.min(maxGiftQuantity, maxQuantity);
    }

    // ==========================================
    // 数量オプションの追加
    // ==========================================
    
    addQuantityOption(quantity, inventory, inventoryManagement, inventoryPolicy) {
      const option = document.createElement('option');
      option.value = quantity.toString();
      option.textContent = `${quantity}個`;
      
      // 在庫制限チェック
      if (inventoryManagement === 'shopify' && inventoryPolicy !== 'continue') {
        if (quantity > inventory) {
          option.disabled = true;
          option.textContent += ' - 在庫不足';
        }
      }
      
      this.elements.quantitySelect.appendChild(option);
    }

    // ==========================================
    // 無効化されたオプションの追加
    // ==========================================
    
    addDisabledOption(text) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = text;
      option.disabled = true;
      this.elements.quantitySelect.appendChild(option);
    }

    // ==========================================
    // 数量ヘルプテキストの更新
    // ==========================================
    
    updateQuantityHelpText(currentQuantity, maxGiftQuantity) {
      if (!this.elements.quantityHelp) {
        return;
      }
      
      let text;
      if (maxGiftQuantity > currentQuantity) {
        text = `商品数量${currentQuantity}個に対して、最大${maxGiftQuantity}個まで選択可能です`;
      } else {
        text = `商品数量${currentQuantity}個に対して、${maxGiftQuantity}個まで選択可能です`;
      }
      
      this.elements.quantityHelp.textContent = text;
    }

    // ==========================================
    // イベントリスナー設定
    // ==========================================
    
    attachEventListeners() {
      try {
        // トリガーボタン
        if (this.elements.button) {
          this.elements.button.addEventListener('click', (e) => this.handleButtonClick(e));
          this.elements.button.addEventListener('keydown', (e) => this.handleButtonKeydown(e));
        }
        
        // フォーム要素
        if (this.elements.quantitySelect) {
          this.elements.quantitySelect.addEventListener('change', () => this.updateFormValidation());
        }
        
        if (this.elements.purposeSelect) {
          this.elements.purposeSelect.addEventListener('change', () => this.handlePurposeChange());
        }
        
        if (this.elements.addresseeInput) {
          this.elements.addresseeInput.addEventListener('input', (e) => this.handleAddresseeInput(e));
          this.elements.addresseeInput.addEventListener('keydown', (e) => this.handleAddresseeKeydown(e));
        }
        
        // アクションボタン
        if (this.elements.confirmBtn) {
          this.elements.confirmBtn.addEventListener('click', () => this.confirmGiftSettings());
        }
        
        if (this.elements.cancelBtn) {
          this.elements.cancelBtn.addEventListener('click', () => this.cancelGiftSettings());
        }
        
        if (this.elements.editBtn) {
          this.elements.editBtn.addEventListener('click', () => this.editGiftSettings());
        }
        
        this.log('🔘 イベントリスナーを設定しました');
        
      } catch (error) {
        this.handleError(error, 'イベントリスナー設定エラー');
      }
    }

    // ==========================================
    // カート連携初期化
    // ==========================================
    
    initializeCartIntegration() {
      try {
        // 商品フォームを取得
        this.productForm = document.querySelector(`#${this.productData.productFormId}`) ||
                          document.querySelector('form[action*="/cart/add"]') ||
                          document.querySelector('form[data-product-form]');
        
        if (!this.productForm) {
          this.log('⚠️ 商品フォームが見つかりません');
          return;
        }
        
        // 隠しフィールドテンプレートを取得
        this.hiddenFieldsTemplate = document.querySelector(`#gift-cart-properties-${this.sectionId}`);
        
        if (!this.hiddenFieldsTemplate) {
          this.log('⚠️ 隠しフィールドテンプレートが見つかりません');
          return;
        }
        
        // フォーム送信をインターセプト
        this.productForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        this.log('🛒 カート連携を初期化しました');
        
      } catch (error) {
        this.handleError(error, 'カート連携初期化エラー');
      }
    }

    // ==========================================
    // ボタンクリック処理
    // ==========================================
    
    handleButtonClick(event) {
      event.preventDefault();
      event.stopPropagation();
      
      if (this.isProcessing) {
        return;
      }
      
      this.log('🔘 ギフト設定ボタンがクリックされました');
      this.toggleGiftArea();
    }

    // ==========================================
    // ボタンキーボード処理
    // ==========================================
    
    handleButtonKeydown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.handleButtonClick(event);
      }
    }

    // ==========================================
    // ギフトエリアの切り替え
    // ==========================================
    
    toggleGiftArea() {
      const isVisible = this.elements.area.style.display !== 'none' && 
                       this.elements.area.style.display !== '';
      
      if (isVisible) {
        this.closeGiftArea();
      } else {
        this.openGiftArea();
      }
    }

    // ==========================================
    // ギフトエリアを開く
    // ==========================================
    
    openGiftArea() {
      try {
        // エリアを表示
        this.elements.area.style.display = 'block';
        this.elements.summary.style.display = 'none';
        
        // ボタンの状態を更新
        this.elements.button.classList.add('area-open');
        this.elements.button.setAttribute('aria-expanded', 'true');
        
        // アニメーション
        if (this.productData.settings?.enableAnimation) {
          this.elements.area.setAttribute('data-animating', '');
          setTimeout(() => {
            this.elements.area.removeAttribute('data-animating');
          }, GIFT_SETTINGS.ANIMATION_DURATION);
        }
        
        // 現在の数量を更新
        this.updateCurrentQuantity();
        
        // フォーカスを最初の入力要素に移動
        setTimeout(() => {
          if (this.elements.quantitySelect) {
            this.elements.quantitySelect.focus();
          }
        }, 100);
        
        this.log('✅ ギフト設定エリアを開きました');
        
      } catch (error) {
        this.handleError(error, 'エリア表示エラー');
      }
    }

    // ==========================================
    // ギフトエリアを閉じる
    // ==========================================
    
    closeGiftArea() {
      try {
        const enableAnimation = this.productData.settings?.enableAnimation;
        
        if (enableAnimation) {
          this.elements.area.classList.add('closing');
          setTimeout(() => {
            this.elements.area.style.display = 'none';
            this.elements.area.classList.remove('closing');
            this.updateButtonState(false);
          }, GIFT_SETTINGS.ANIMATION_DURATION);
        } else {
          this.elements.area.style.display = 'none';
          this.updateButtonState(false);
        }
        
        // サンプル画像を非表示
        this.hidePurposeSampleImage();
        
        this.log('❌ ギフト設定エリアを閉じました');
        
      } catch (error) {
        this.handleError(error, 'エリア非表示エラー');
      }
    }

    // ==========================================
    // ボタン状態の更新
    // ==========================================
    
    updateButtonState(isOpen) {
      this.elements.button.classList.toggle('area-open', isOpen);
      this.elements.button.setAttribute('aria-expanded', isOpen.toString());
    }

    // ==========================================
    // 用途変更処理
    // ==========================================
    
    handlePurposeChange() {
      const selectedPurpose = this.elements.purposeSelect.value;
      
      this.updateFormValidation();
      
      if (selectedPurpose) {
        this.showPurposeSampleImage(selectedPurpose);
      } else {
        this.hidePurposeSampleImage();
      }
    }

    // ==========================================
    // サンプル画像表示
    // ==========================================
    
    showPurposeSampleImage(purposeKey) {
      if (!this.elements.sampleImage || !this.elements.samplePlaceholder) {
        return;
      }
      
      const imageUrl = this.productData.purposeSampleImages?.[purposeKey];
      
      if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('null')) {
        this.loadSampleImage(imageUrl, purposeKey);
      } else {
        this.showSamplePlaceholder(`「${purposeKey}」が選択されました（画像未設定）`);
      }
    }

    // ==========================================
    // サンプル画像の読み込み
    // ==========================================
    
    loadSampleImage(imageUrl, purposeKey) {
      // ローディング状態を表示
      this.elements.sampleImage.classList.add('loading');
      
      const img = new Image();
      
      img.onload = () => {
        this.elements.sampleImage.src = imageUrl;
        this.elements.sampleImage.alt = `${purposeKey}のサンプル画像`;
        this.elements.sampleImage.classList.remove('loading');
        this.elements.sampleImage.style.display = 'block';
        this.elements.samplePlaceholder.style.display = 'none';
        
        this.log(`🖼️ サンプル画像を表示: ${purposeKey}`);
      };
      
      img.onerror = () => {
        this.elements.sampleImage.classList.remove('loading');
        this.showSamplePlaceholder(`「${purposeKey}」の画像を読み込めませんでした`);
        this.log(`⚠️ 画像読み込み失敗: ${imageUrl}`);
      };
      
      img.src = imageUrl;
    }

    // ==========================================
    // サンプル画像プレースホルダー表示
    // ==========================================
    
    showSamplePlaceholder(text) {
      if (this.elements.sampleImage) {
        this.elements.sampleImage.style.display = 'none';
      }
      if (this.elements.samplePlaceholder) {
        this.elements.samplePlaceholder.style.display = 'block';
        this.elements.samplePlaceholder.textContent = text;
      }
    }

    // ==========================================
    // サンプル画像非表示
    // ==========================================
    
    hidePurposeSampleImage() {
      this.showSamplePlaceholder('用途を選択すると、こちらにサンプル画像が表示されます');
    }

    // ==========================================
    // 宛名書き入力処理
    // ==========================================
    
    handleAddresseeInput(event) {
      const value = event.target.value;
      const length = value.length;
      
      // 文字数カウント更新
      if (this.elements.addresseeCount) {
        this.elements.addresseeCount.textContent = length;
      }
      
      // 最大文字数制限
      const maxLength = this.productData.addresseeMaxLength || GIFT_SETTINGS.ADDRESSEE_MAX_LENGTH;
      if (length > maxLength) {
        event.target.value = value.substring(0, maxLength);
        if (this.elements.addresseeCount) {
          this.elements.addresseeCount.textContent = maxLength;
        }
      }
      
      this.updateFormValidation();
    }

    // ==========================================
    // 宛名書きキーボード処理
    // ==========================================
    
    handleAddresseeKeydown(event) {
      // Enterキーでフォーム送信を防ぐ
      if (event.key === 'Enter') {
        event.preventDefault();
        
        if (this.elements.confirmBtn && !this.elements.confirmBtn.disabled) {
          this.confirmGiftSettings();
        }
      }
    }

    // ==========================================
    // フォーム検証
    // ==========================================
    
    updateFormValidation() {
      try {
        const isValid = this.validateForm();
        
        if (this.elements.confirmBtn) {
          this.elements.confirmBtn.disabled = !isValid;
          this.updateConfirmButtonStyle(isValid);
        }
        
      } catch (error) {
        this.handleError(error, 'フォーム検証エラー');
      }
    }

    // ==========================================
    // フォーム検証ロジック
    // ==========================================
    
    validateForm() {
      const quantity = this.elements.quantitySelect?.value;
      const purpose = this.elements.purposeSelect?.value;
      
      return quantity && purpose;
    }

    // ==========================================
    // 確認ボタンスタイル更新
    // ==========================================
    
    updateConfirmButtonStyle(isValid) {
      const button = this.elements.confirmBtn;
      
      if (isValid) {
        button.style.backgroundColor = 'var(--gift-accent-color, #007c89)';
        button.style.borderColor = 'var(--gift-accent-color, #007c89)';
        button.style.cursor = 'pointer';
        button.style.opacity = '1';
      } else {
        button.style.backgroundColor = '#ccc';
        button.style.borderColor = '#ccc';
        button.style.cursor = 'not-allowed';
        button.style.opacity = '0.7';
      }
    }

    // ==========================================
    // ギフト設定確定処理
    // ==========================================
    
    async confirmGiftSettings() {
      if (this.elements.confirmBtn.disabled || this.isProcessing) {
        return;
      }
      
      this.isProcessing = true;
      this.showProcessingState();
      
      try {
        // 設定値を取得
        const settings = this.collectGiftSettings();
        
        // 設定の妥当性チェック
        this.validateGiftSettings(settings);
        
        // ギフト設定を保存
        this.giftSettings = settings;
        
        // カートプロパティを更新
        await this.updateCartProperties();
        
        // UI状態を更新
        this.updateUIAfterConfirm();
        
        // 成功メッセージを表示
        if (this.productData.settings?.showSuccessMessage) {
          this.showSuccessMessage();
        }
        
        this.log('✅ ギフト設定が正常に保存されました:', this.giftSettings);
        
      } catch (error) {
        this.handleError(error, GIFT_SETTINGS.ERRORS.CART_INTEGRATION);
      } finally {
        this.isProcessing = false;
        this.hideProcessingState();
      }
    }

    // ==========================================
    // ギフト設定値の収集
    // ==========================================
    
    collectGiftSettings() {
      const giftQuantity = parseInt(this.elements.quantitySelect.value) || 0;
      const currentQuantity = this.productData.currentQuantity || 1;
      
      return {
        quantity: `${giftQuantity}個（商品数量${currentQuantity}個に対して）`,
        purpose: this.elements.purposeSelect.value,
        addressee: this.elements.addresseeInput.value.trim()
      };
    }

    // ==========================================
    // ギフト設定の妥当性チェック
    // ==========================================
    
    validateGiftSettings(settings) {
      if (!settings.quantity || !settings.purpose) {
        throw new Error('数量と用途を選択してください');
      }
      
      const quantityNumber = parseInt(settings.quantity);
      if (quantityNumber < GIFT_SETTINGS.MIN_QUANTITY) {
        throw new Error('数量は1個以上を選択してください');
      }
    }

    // ==========================================
    // カートプロパティ更新
    // ==========================================
    
    async updateCartProperties() {
      try {
        // 既存の隠しフィールドを削除
        this.removeExistingHiddenFields();
        
        // 新しい隠しフィールドを追加
        this.addHiddenFields();
        
        this.log('✅ カートプロパティを更新しました');
        
      } catch (error) {
        throw new Error(`カートプロパティ更新エラー: ${error.message}`);
      }
    }

    // ==========================================
    // 既存隠しフィールドの削除
    // ==========================================
    
    removeExistingHiddenFields() {
      if (!this.productForm) {
        return;
      }
      
      const existingFields = this.productForm.querySelectorAll('input[name^="properties[ギフト設定"]');
      existingFields.forEach(field => field.remove());
    }

    // ==========================================
    // 隠しフィールドの追加
    // ==========================================
    
    addHiddenFields() {
      if (!this.productForm || !this.hiddenFieldsTemplate) {
        throw new Error('フォームまたはテンプレートが見つかりません');
      }
      
      // テンプレートをクローン
      const template = this.hiddenFieldsTemplate.content.cloneNode(true);
      const fields = template.querySelectorAll('input[type="hidden"]');
      
      // 各フィールドに値を設定
      fields.forEach(field => {
        this.setHiddenFieldValue(field);
      });
      
      // フォームに追加
      this.productForm.appendChild(template);
    }

    // ==========================================
    // 隠しフィールド値の設定
    // ==========================================
    
    setHiddenFieldValue(field) {
      const dataAttr = field.getAttribute('data-gift-quantity-hidden') !== null ? 'quantity' :
                      field.getAttribute('data-gift-purpose-hidden') !== null ? 'purpose' :
                      field.getAttribute('data-gift-addressee-hidden') !== null ? 'addressee' :
                      field.getAttribute('data-gift-completed-hidden') !== null ? 'completed' :
                      field.getAttribute('data-gift-timestamp-hidden') !== null ? 'timestamp' :
                      field.getAttribute('data-gift-product-id-hidden') !== null ? 'productId' : null;
      
      switch (dataAttr) {
        case 'quantity':
          field.value = this.giftSettings.quantity;
          break;
        case 'purpose':
          field.value = this.giftSettings.purpose;
          break;
        case 'addressee':
          field.value = this.giftSettings.addressee;
          break;
        case 'completed':
          field.value = 'true';
          break;
        case 'timestamp':
          field.value = new Date().toISOString();
          break;
        case 'productId':
          field.value = this.productData.productId;
          break;
      }
    }

    // ==========================================
    // 確定後のUI更新
    // ==========================================
    
    updateUIAfterConfirm() {
      // サマリー表示を更新
      this.updateSummaryDisplay();
      
      // エリアを閉じてサマリーを表示
      this.closeGiftArea();
      setTimeout(() => {
        this.elements.summary.style.display = 'block';
      }, GIFT_SETTINGS.ANIMATION_DURATION);
      
      // ステータス更新
      if (this.elements.status) {
        this.elements.status.textContent = '設定済み';
        this.elements.status.style.color = '#28a745';
      }
      
      // ボタンスタイル更新
      this.elements.button.classList.add('settings-configured');
    }

    // ==========================================
    // サマリー表示更新
    // ==========================================
    
    updateSummaryDisplay() {
      if (!this.elements.summaryContent) {
        return;
      }
      
      const summaryItems = [
        { label: '数量', value: this.giftSettings.quantity },
        { label: '用途', value: this.giftSettings.purpose }
      ];
      
      // 宛名書きがある場合のみ追加
      if (this.giftSettings.addressee) {
        summaryItems.push({ label: '宛名書き', value: this.giftSettings.addressee });
      }
      
      this.elements.summaryContent.innerHTML = summaryItems
        .map(item => `<div><strong>${item.label}:</strong> ${item.value}</div>`)
        .join('');
    }

    // ==========================================
    // 処理中状態の表示
    // ==========================================
    
    showProcessingState() {
      if (this.elements.confirmBtn) {
        this.elements.confirmBtn.classList.add('loading');
        this.elements.confirmBtn.disabled = true;
      }
    }

    // ==========================================
    // 処理中状態の非表示
    // ==========================================
    
    hideProcessingState() {
      if (this.elements.confirmBtn) {
        this.elements.confirmBtn.classList.remove('loading');
        this.updateFormValidation();
      }
    }

    // ==========================================
    // キャンセル処理
    // ==========================================
    
    cancelGiftSettings() {
      this.closeGiftArea();
      this.log('❌ ギフト設定をキャンセルしました');
    }

    // ==========================================
    // 編集処理
    // ==========================================
    
    editGiftSettings() {
      if (this.elements.area && this.elements.summary) {
        this.elements.summary.style.display = 'none';
        this.openGiftArea();
        
        this.log('✏️ ギフト設定を編集モードにしました');
      }
    }

    // ==========================================
    // フォーム送信処理
    // ==========================================
    
    handleFormSubmit(event) {
      // ギフト設定が完了していない場合の処理
      if (!this.isGiftSettingsCompleted()) {
        return; // 通常の商品追加を許可
      }
      
      // ギフト設定が完了している場合、検証を行う
      try {
        this.validateCartSubmission();
        this.log('🛒 ギフト設定付き商品をカートに追加');
      } catch (error) {
        event.preventDefault();
        this.handleError(error, 'カート追加エラー');
      }
    }

    // ==========================================
    // ギフト設定完了チェック
    // ==========================================
    
    isGiftSettingsCompleted() {
      return this.giftSettings.quantity && this.giftSettings.purpose;
    }

    // ==========================================
    // カート送信時の検証
    // ==========================================
    
    validateCartSubmission() {
      if (!this.giftSettings.quantity || !this.giftSettings.purpose) {
        throw new Error('ギフト設定が完了していません');
      }
      
      // 隠しフィールドが存在するかチェック
      const hiddenFields = this.productForm.querySelectorAll('input[name^="properties[ギフト設定"]');
      if (hiddenFields.length === 0) {
        throw new Error('ギフト設定データが見つかりません');
      }
    }

    // ==========================================
    // 成功メッセージ表示
    // ==========================================
    
    showSuccessMessage() {
      this.showToast('🎁 ギフト設定を保存しました', 'success');
    }

    // ==========================================
    // トースト表示
    // ==========================================
    
    showToast(message, type = 'success') {
      // 既存のトーストを削除
      const existingToast = document.querySelector('.gift-success-toast, .gift-error-toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      // 新しいトーストを作成
      const toast = document.createElement('div');
      toast.className = `gift-${type}-toast`;
      toast.textContent = message;
      
      document.body.appendChild(toast);
      
      // 自動削除
      const duration = type === 'success' ? 
        GIFT_SETTINGS.SUCCESS_MESSAGE_DURATION : 
        GIFT_SETTINGS.ERROR_MESSAGE_DURATION;
      
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, GIFT_SETTINGS.ANIMATION_DURATION);
      }, duration);
    }

    // ==========================================
    // エラーハンドリング
    // ==========================================
    
    handleError(error, context = '') {
      const errorMessage = `${context}: ${error.message}`;
      
      this.log(`❌ ${errorMessage}`, error);
      
      // ユーザー向けエラー表示
      this.showErrorMessage(this.getUserFriendlyError(error.message));
      
      // プロダクション環境では詳細なエラーを隠す
      if (!GIFT_SETTINGS.DEBUG) {
        console.error('Gift Settings Error:', errorMessage);
      }
    }

    // ==========================================
    // ユーザーフレンドリーなエラーメッセージ
    // ==========================================
    
    getUserFriendlyError(originalError) {
      const errorMap = {
        '数量と用途を選択してください': '数量と用途を選択してください',
        '在庫がありません': '申し訳ございません。在庫が不足しています',
        'ネットワークエラー': 'ネットワーク接続を確認してください',
        '初期化': 'ページを再読み込みしてください',
        'カート連携': 'カート機能でエラーが発生しました。もう一度お試しください'
      };
      
      for (const [key, message] of Object.entries(errorMap)) {
        if (originalError.includes(key)) {
          return message;
        }
      }
      
      return '予期しないエラーが発生しました。もう一度お試しください';
    }

    // ==========================================
    // エラーメッセージ表示
    // ==========================================
    
    showErrorMessage(message) {
      if (this.elements.errorContainer && this.elements.errorMessage) {
        // インライン表示
        this.elements.errorMessage.textContent = message;
        this.elements.errorContainer.style.display = 'block';
        
        setTimeout(() => {
          this.elements.errorContainer.style.display = 'none';
        }, GIFT_SETTINGS.ERROR_MESSAGE_DURATION);
      } else {
        // トースト表示
        this.showToast(`🚫 ${message}`, 'error');
      }
    }

    // ==========================================
    // ユーティリティメソッド
    // ==========================================
    
    // デバウンス処理
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

    // ログ出力
    log(message, data = null) {
      if (GIFT_SETTINGS.DEBUG) {
        console.log(`[GiftSettings:${this.sectionId}] ${message}`, data || '');
      }
    }

    // ==========================================
    // 公開メソッド（デバッグ用）
    // ==========================================
    
    getStatus() {
      return {
        sectionId: this.sectionId,
        isInitialized: this.isInitialized,
        isProcessing: this.isProcessing,
        giftSettings: this.giftSettings,
        productData: this.productData,
        elements: Object.keys(this.elements).reduce((acc, key) => {
          acc[key] = !!this.elements[key];
          return acc;
        }, {})
      };
    }

    // 強制的な数量オプション再生成
    forceRegenerateOptions() {
      this.updateCurrentQuantity();
      this.generateQuantityOptions();
    }

    // 設定のリセット
    resetSettings() {
      this.giftSettings = { quantity: '', purpose: '', addressee: '' };
      this.elements.form?.reset();
      this.updateFormValidation();
      this.hidePurposeSampleImage();
      this.closeGiftArea();
    }
  }

  // ==========================================
  // 初期化とインスタンス管理
  // ==========================================
  
  function initializeGiftSettings() {
    // 既存のインスタンスをクリーンアップ
    instances.clear();
    
    // ギフト設定コンテナを検索
    const containers = document.querySelectorAll(GIFT_SETTINGS.SELECTORS.container);
    
    containers.forEach(container => {
      try {
        const sectionId = container.dataset.sectionId;
        
        if (!sectionId) {
          console.warn('⚠️ セクションIDが見つかりません:', container);
          return;
        }
        
        // 重複チェック
        if (instances.has(sectionId)) {
          console.warn('⚠️ 重複するセクションID:', sectionId);
          return;
        }
        
        // インスタンス作成
        const instance = new GiftSettingsManager(container);
        instances.set(sectionId, instance);
        
        console.log(`✅ ギフト設定を初期化しました: ${sectionId}`);
        
      } catch (error) {
        console.error('❌ ギフト設定初期化エラー:', error);
      }
    });
    
    console.log(`🎁 ${instances.size}個のギフト設定インスタンスを作成しました`);
  }

  // ==========================================
  // DOMContentLoaded時の初期化
  // ==========================================
  
  function safeInitialize() {
    try {
      initializeGiftSettings();
    } catch (error) {
      console.error('❌ ギフト設定の初期化に失敗しました:', error);
    }
  }

  // DOM読み込み状態に応じて初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInitialize);
  } else {
    // すでに読み込み完了している場合は少し遅延させて実行
    setTimeout(safeInitialize, 100);
  }

  // ==========================================
  // Shopifyイベントの監視
  // ==========================================
  
  // バリアント変更時の再初期化
  document.addEventListener('variant:change', () => {
    setTimeout(() => {
      instances.forEach(instance => {
        if (instance.updateCurrentQuantity) {
          instance.updateCurrentQuantity();
        }
      });
    }, 100);
  });

  // セクション再読み込み時の初期化
  document.addEventListener('shopify:section:load', (event) => {
    const container = event.target.querySelector(GIFT_SETTINGS.SELECTORS.container);
    if (container) {
      setTimeout(() => {
        initializeGiftSettings();
      }, 100);
    }
  });

  // セクション削除時のクリーンアップ
  document.addEventListener('shopify:section:unload', (event) => {
    const container = event.target.querySelector(GIFT_SETTINGS.SELECTORS.container);
    if (container) {
      const sectionId = container.dataset.sectionId;
      if (sectionId && instances.has(sectionId)) {
        instances.delete(sectionId);
        console.log(`🗑️ ギフト設定インスタンスを削除: ${sectionId}`);
      }
    }
  });

  // ==========================================
  // グローバルAPI（デバッグ用）
  // ==========================================
  
  window.GiftSettings = {
    // 全インスタンスの取得
    getAllInstances: () => Array.from(instances.values()),
    
    // 特定インスタンスの取得
    getInstance: (sectionId) => instances.get(sectionId),
    
    // 強制初期化
    forceInitialize: initializeGiftSettings,
    
    // デバッグ情報
    getDebugInfo: () => ({
      version: '2.0',
      instanceCount: instances.size,
      instances: Array.from(instances.entries()).map(([id, instance]) => ({
        sectionId: id,
        status: instance.getStatus()
      }))
    }),
    
    // 設定値
    getSettings: () => GIFT_SETTINGS
  };

})();