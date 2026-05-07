// ファイル名: bulk-order-form.js
// まとまったご注文フォーム - 完全修正版（選択項目バグ修正）

(function() {
  'use strict';
  
  console.log('🔧 Bulk Order Form Script Loading (Complete Bug Fix Version)...');
  
  // 初期化済みフォームを追跡（重複初期化防止）
  const initializedForms = new WeakSet();
  
  /**
   * ユーティリティ関数：価格文字列を数値に変換
   */
  function parsePriceString(priceStr) {
    if (!priceStr || priceStr.trim() === "" || priceStr === "0") {
      return 0;
    }
    
    const cleanPrice = priceStr.toString().replace(/[,¥\s]/g, '');
    const numericPrice = parseFloat(cleanPrice);
    
    return isNaN(numericPrice) ? 0 : numericPrice;
  }
  
  /**
   * ユーティリティ関数：価格を表示用にフォーマット
   */
  function formatPrice(price) {
    return Math.floor(price).toLocaleString('ja-JP');
  }
  
  /**
   * デバッグ用ユーティリティ：要素の詳細情報を表示
   */
  function debugElement(element, name) {
    if (element) {
      console.log(`✅ ${name}:`, {
        tagName: element.tagName,
        id: element.id,
        name: element.name,
        className: element.className,
        disabled: element.disabled,
        value: element.value
      });
    } else {
      console.error(`❌ ${name}: 要素が見つかりません`);
    }
  }
  
  /**
   * メインクラス - 完全修正版
   */
  class BulkOrderForm {
    constructor(form) {
      this.form = form;
      this.sectionId = this.getSectionId();
      this.isInitialized = false;
      
      console.log('🚀 Form instance created:', {
        formId: form.id || 'unnamed',
        sectionId: this.sectionId
      });
      
      // 重複初期化チェック
      if (initializedForms.has(form)) {
        console.warn('⚠️ Form already initialized, skipping...');
        return;
      }
      
      // 初期化実行
      this.init();
      
      // 初期化済みとしてマーク
      initializedForms.add(form);
    }
    
    /**
     * セクションIDの取得（改善版）
     */
    getSectionId() {
      const section = this.form.closest('.bulk-order-section') || this.form.closest('[id*="bulk-order"]');
      if (section && section.id) {
        return section.id.replace('bulk-order-', '');
      }
      
      // フォールバック: フォーム内の要素からIDを抽出
      const idElement = this.form.querySelector('[id*="-"][id$="-' + 'section"]') || 
                       this.form.querySelector('[id*="bulk"]');
      if (idElement) {
        const match = idElement.id.match(/(\w+)$/);
        return match ? match[1] : 'default';
      }
      
      return 'default';
    }
    
    /**
     * 初期化メイン処理
     */
    init() {
      console.log('🔄 Initializing form functionality...');
      
      try {
        // 初期化前の要素確認
        this.debugAllElements();
        
        // 各機能の初期化（順序重要）
        this.initProductSelection();      // 最優先
        this.initReceiptToggle();         // 2番目
        this.initBillingSync();          // 3番目
        this.initNoshiImageDisplay();    // 4番目
        this.initEstimateCalculation();  // 5番目
        this.initFormSubmission();       // 最後
        
        this.isInitialized = true;
        console.log('✅ Form initialization completed successfully!');
      } catch (error) {
        console.error('💥 Form initialization failed:', error);
        throw error;
      }
    }
    
    /**
     * 全要素のデバッグ表示
     */
    debugAllElements() {
      console.log('🔍 === 要素デバッグ開始 ===');
      
      // 商品選択関連
      for (let i = 1; i <= 3; i++) {
        const productSelect = this.form.querySelector(`select[name="contact[product_${i}]"]`);
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        const noshiSelect = this.form.querySelector(`select[name="contact[noshi_${i}]"]`);
        
        console.log(`📦 商品${i}関連要素:`);
        debugElement(productSelect, `商品選択${i}`);
        debugElement(quantityInput, `数量入力${i}`);
        debugElement(noshiSelect, `熨斗選択${i}`);
      }
      
      // 領収書関連
      const receiptSelect = this.form.querySelector('select[name="contact[receipt_required]"]');
      const receiptDetails = this.form.querySelector('.receipt-details');
      const receiptNameField = this.form.querySelector('input[name="contact[receipt_name]"]');
      
      console.log('🧾 領収書関連要素:');
      debugElement(receiptSelect, '領収書必要性選択');
      debugElement(receiptDetails, '領収書詳細セクション');
      debugElement(receiptNameField, '領収書宛名フィールド');
      
      // 請求書住所関連
      const billingCheckbox = this.form.querySelector('input[data-target="billing"]');
      const billingSection = this.form.querySelector('.billing-address');
      
      console.log('📮 請求書住所関連要素:');
      debugElement(billingCheckbox, '同一住所チェックボックス');
      debugElement(billingSection, '請求書住所セクション');
      
      console.log('🔍 === 要素デバッグ終了 ===');
    }
    
    /**
     * 商品選択機能（完全修正版）
     */
    initProductSelection() {
      console.log('📦 Setting up product selection...');
      
      for (let i = 1; i <= 3; i++) {
        const productSelect = this.form.querySelector(`select[name="contact[product_${i}]"]`);
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        const noshiSelect = this.form.querySelector(`select[name="contact[noshi_${i}]"]`);
        
        if (!productSelect) {
          console.warn(`⚠️ 商品選択${i}が見つかりません`);
          continue;
        }
        
        console.log(`🔧 商品${i}のイベントリスナー設定中...`);
        
        // 初期状態の設定
        if (quantityInput) {
          quantityInput.disabled = true;
          quantityInput.value = '';
          console.log(`📝 数量入力${i}を初期状態（無効）に設定`);
        }
        
        if (noshiSelect) {
          noshiSelect.disabled = true;
          noshiSelect.value = '';
          console.log(`🎁 熨斗選択${i}を初期状態（無効）に設定`);
        }
        
        // 商品選択のイベントリスナー
        productSelect.addEventListener('change', (e) => {
          const selectedValue = e.target.value;
          console.log(`📦 商品${i}選択変更:`, selectedValue);
          
          if (selectedValue && selectedValue.trim() !== '') {
            // 商品が選択された場合
            console.log(`✅ 商品${i}が選択されました: ${selectedValue}`);
            
            // 数量フィールドを有効化
            if (quantityInput) {
              quantityInput.disabled = false;
              quantityInput.focus();
              console.log(`📝 数量入力${i}を有効化しました`);
            }
            
            // 熨斗フィールドを有効化
            if (noshiSelect) {
              noshiSelect.disabled = false;
              console.log(`🎁 熨斗選択${i}を有効化しました`);
            }
            
            // 商品情報を表示
            this.showProductInfo(i, e.target);
            
          } else {
            // 商品が未選択の場合
            console.log(`❌ 商品${i}が未選択になりました`);
            
            // 数量フィールドを無効化
            if (quantityInput) {
              quantityInput.disabled = true;
              quantityInput.value = '';
              console.log(`📝 数量入力${i}を無効化しました`);
            }
            
            // 熨斗フィールドを無効化
            if (noshiSelect) {
              noshiSelect.disabled = true;
              noshiSelect.value = '';
              console.log(`🎁 熨斗選択${i}を無効化しました`);
            }
            
            // 熨斗イメージを非表示
            this.hideNoshiImage(i);
            
            // 商品情報を非表示
            this.hideProductInfo(i);
          }
          
          // 見積もりを更新
          this.updateEstimate();
        });
        
        // 数量変更時のイベントリスナー
        if (quantityInput) {
          quantityInput.addEventListener('input', () => {
            console.log(`📊 商品${i}の数量変更:`, quantityInput.value);
            this.updateEstimate();
          });
        }
        
        // 熨斗選択時のイベントリスナー
        if (noshiSelect) {
          noshiSelect.addEventListener('change', (e) => {
            console.log(`🎁 熨斗${i}選択変更:`, e.target.value);
            
            if (e.target.value === 'あり') {
              this.showNoshiImage(i);
            } else {
              this.hideNoshiImage(i);
            }
            
            this.updateEstimate();
          });
        }
        
        console.log(`✅ 商品${i}の設定完了`);
      }
      
      console.log('📦 Product selection initialization completed');
    }
    
    /**
     * 領収書表示制御（完全修正版）
     */
    initReceiptToggle() {
      console.log('🧾 Setting up receipt toggle...');
      
      const receiptSelect = this.form.querySelector('select[name="contact[receipt_required]"]');
      const receiptDetails = this.form.querySelector('.receipt-details');
      const receiptNameField = this.form.querySelector('input[name="contact[receipt_name]"]');
      
      if (!receiptSelect) {
        console.warn('⚠️ 領収書選択要素が見つかりません');
        return;
      }
      
      if (!receiptDetails) {
        console.warn('⚠️ 領収書詳細セクションが見つかりません');
        return;
      }
      
      console.log('✅ 領収書関連要素が見つかりました');
      
      // 初期状態設定: 詳細を非表示
      receiptDetails.style.display = 'none';
      receiptDetails.classList.remove('showing', 'hiding');
      
      if (receiptNameField) {
        receiptNameField.value = '';
      }
      
      console.log('📝 領収書詳細を初期状態（非表示）に設定');
      
      // 選択変更イベントリスナー
      receiptSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        console.log('🧾 領収書選択変更:', selectedValue);
        
        if (selectedValue === '必要') {
          console.log('✅ 領収書詳細を表示します');
          
          // 表示アニメーション
          receiptDetails.style.display = 'block';
          receiptDetails.classList.remove('hiding');
          receiptDetails.classList.add('showing');
          
          // 宛名フィールドにフォーカス
          if (receiptNameField) {
            setTimeout(() => {
              receiptNameField.focus();
              console.log('📝 宛名フィールドにフォーカスしました');
            }, 100);
          }
          
        } else {
          console.log('❌ 領収書詳細を非表示にします');
          
          // 非表示アニメーション
          receiptDetails.classList.remove('showing');
          receiptDetails.classList.add('hiding');
          
          setTimeout(() => {
            receiptDetails.style.display = 'none';
          }, 300);
          
          // 宛名フィールドをクリア
          if (receiptNameField) {
            receiptNameField.value = '';
            console.log('📝 宛名フィールドをクリアしました');
          }
        }
      });
      
      console.log('🧾 Receipt toggle initialization completed');
    }
    
    /**
     * 請求書住所同期機能
     */
    initBillingSync() {
      console.log('📮 Setting up billing address sync...');
      
      const checkbox = this.form.querySelector('input[data-target="billing"]');
      const billingSection = this.form.querySelector('.billing-address');
      
      if (!checkbox || !billingSection) {
        console.warn('⚠️ 請求書住所関連要素が見つかりません');
        return;
      }
      
      console.log('✅ 請求書住所関連要素が見つかりました');
      
      // 初期状態設定
      this.updateBillingVisibility(checkbox.checked, billingSection);
      
      // チェックボックスのイベント
      checkbox.addEventListener('change', (e) => {
        console.log('📮 請求書住所チェックボックス変更:', e.target.checked);
        this.updateBillingVisibility(e.target.checked, billingSection);
        
        if (e.target.checked) {
          this.copyShippingToBilling();
        }
      });
      
      // 配送先住所の変更監視
      this.watchShippingChanges(checkbox);
      
      console.log('📮 Billing sync initialization completed');
    }
    
    /**
     * 請求書住所の表示/非表示制御
     */
    updateBillingVisibility(isChecked, billingSection) {
      if (isChecked) {
        console.log('📮 請求書住所フィールドを非表示にします');
        billingSection.classList.add('hiding');
        billingSection.classList.remove('showing');
        
        setTimeout(() => {
          billingSection.style.display = 'none';
        }, 300);
        
        this.setRequiredFields(billingSection, false);
      } else {
        console.log('📮 請求書住所フィールドを表示します');
        billingSection.style.display = 'block';
        billingSection.classList.remove('hiding');
        billingSection.classList.add('showing');
        this.setRequiredFields(billingSection, true);
      }
    }
    
    /**
     * 配送先から請求先への住所コピー
     */
    copyShippingToBilling() {
      console.log('📋 配送先住所を請求先にコピー中...');
      
      const mappings = [
        ['shipping_postal_code', 'billing_postal_code'],
        ['shipping_prefecture', 'billing_prefecture'],
        ['shipping_city', 'billing_city'],
        ['shipping_address', 'billing_address']
      ];
      
      mappings.forEach(([from, to]) => {
        const fromField = this.form.querySelector(`[name="contact[${from}]"]`);
        const toField = this.form.querySelector(`[name="contact[${to}]"]`);
        
        if (fromField && toField && fromField.value) {
          toField.value = fromField.value;
          console.log(`📋 ${from} -> ${to}: ${fromField.value}`);
        }
      });
    }
    
    /**
     * 配送先住所の変更監視
     */
    watchShippingChanges(checkbox) {
      const shippingFields = [
        'input[name="contact[shipping_postal_code]"]',
        'select[name="contact[shipping_prefecture]"]',
        'input[name="contact[shipping_city]"]',
        'input[name="contact[shipping_address]"]'
      ];
      
      shippingFields.forEach(selector => {
        const field = this.form.querySelector(selector);
        if (field) {
          ['input', 'change'].forEach(eventType => {
            field.addEventListener(eventType, () => {
              if (checkbox.checked) {
                this.copyShippingToBilling();
              }
            });
          });
        }
      });
    }
    
    /**
     * 熨斗イメージ表示機能
     */
    initNoshiImageDisplay() {
      console.log('🎁 Setting up noshi image display...');
      // 既に商品選択の中で処理されているため、ここでは追加処理のみ
      console.log('🎁 Noshi image display initialization completed');
    }
    
    /**
     * 熨斗イメージを表示
     */
    showNoshiImage(productNumber) {
      console.log(`🎁 熨斗イメージ表示: 商品${productNumber}`);
      
      const imageDisplay = this.form.querySelector(`#noshi-image-${productNumber}-${this.sectionId}`);
      if (!imageDisplay) {
        console.warn(`⚠️ 熨斗イメージ表示要素が見つかりません: 商品${productNumber}`);
        return;
      }
      
      imageDisplay.style.display = 'block';
      imageDisplay.classList.remove('hiding');
      imageDisplay.classList.add('showing');
      
      console.log(`✅ 熨斗イメージ表示完了: 商品${productNumber}`);
    }
    
    /**
     * 熨斗イメージを非表示
     */
    hideNoshiImage(productNumber) {
      console.log(`🎁 熨斗イメージ非表示: 商品${productNumber}`);
      
      const imageDisplay = this.form.querySelector(`#noshi-image-${productNumber}-${this.sectionId}`);
      if (!imageDisplay) {
        return;
      }
      
      imageDisplay.classList.remove('showing');
      imageDisplay.classList.add('hiding');
      
      setTimeout(() => {
        imageDisplay.style.display = 'none';
      }, 300);
      
      console.log(`✅ 熨斗イメージ非表示完了: 商品${productNumber}`);
    }
    
    /**
     * 見積もり計算機能の初期化
     */
    initEstimateCalculation() {
      console.log('💰 Setting up estimate calculation...');
      this.updateEstimate();
      console.log('💰 Estimate calculation initialization completed');
    }
    
    /**
     * 見積もりの更新
     */
    updateEstimate() {
      console.log('💰 見積もり更新中...');
      
      const estimateItems = document.querySelector(`#estimate-items-${this.sectionId}`);
      const totalAmount = document.querySelector(`#total-amount-${this.sectionId}`);
      
      if (!estimateItems || !totalAmount) {
        console.warn('⚠️ 見積もり表示要素が見つかりません');
        return;
      }
      
      // 選択されたアイテムを収集
      const selectedItems = [];
      let totalPrice = 0;
      
      for (let i = 1; i <= 3; i++) {
        const productSelect = this.form.querySelector(`select[name="contact[product_${i}]"]`);
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        const noshiSelect = this.form.querySelector(`select[name="contact[noshi_${i}]"]`);
        
        if (!productSelect?.value) continue;
        
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const productName = selectedOption.text;
        const productPriceRaw = selectedOption.getAttribute('data-price');
        const quantity = parseInt(quantityInput?.value || 0);
        const noshiValue = noshiSelect?.value || 'なし';
        
        if (quantity > 0) {
          const unitPrice = parsePriceString(productPriceRaw);
          let itemPrice = unitPrice * quantity;
          
          // 熨斗料金の追加
          let noshiPrice = 0;
          if (noshiValue === 'あり') {
            noshiPrice = 50 * quantity;
            itemPrice += noshiPrice;
          }
          
          totalPrice += itemPrice;
          
          selectedItems.push({
            name: productName.replace(/\s*\(¥.*?\)\s*$/, ''),
            quantity: quantity,
            noshi: noshiValue,
            unitPrice: unitPrice,
            noshiPrice: noshiPrice,
            totalPrice: itemPrice
          });
        }
      }
      
      // 見積もり表示の更新
      this.renderEstimateItems(selectedItems, estimateItems);
      this.updateTotalAmount(totalPrice, totalAmount);
      
      console.log('💰 見積もり更新完了:', { selectedItems: selectedItems.length, totalPrice });
    }
    
    /**
     * 見積もり項目の表示
     */
    renderEstimateItems(items, container) {
      if (items.length === 0) {
        container.innerHTML = `
          <div class="estimate-placeholder">
            商品を選択すると、こちらに概算金額が表示されます
          </div>
        `;
        return;
      }
      
      const itemsHtml = items.map((item, index) => {
        const priceDisplay = item.totalPrice > 0 
          ? `¥${formatPrice(item.totalPrice)}`
          : 'お見積もり';
        
        let noshiDisplay = '熨斗なし';
        if (item.noshi === 'あり') {
          noshiDisplay = `熨斗あり（+¥${formatPrice(item.noshiPrice)}）`;
        }
        
        return `
          <div class="estimate-item">
            <div class="estimate-item-info">
              <div class="estimate-item-name">${item.name}</div>
              <div class="estimate-item-details">数量: ${item.quantity}個 / ${noshiDisplay}</div>
            </div>
            <div class="estimate-item-price">${priceDisplay}</div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = itemsHtml;
    }
    
    /**
     * 合計金額の更新
     */
    updateTotalAmount(total, element) {
      const formattedTotal = total > 0 ? `¥${formatPrice(total)}` : '¥0';
      element.textContent = formattedTotal;
      
      // アニメーション効果
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    }
    
    /**
     * 商品情報表示
     */
    showProductInfo(productNumber, selectElement) {
      const productRow = this.form.querySelector(`[data-product-index="${productNumber}"]`);
      if (!productRow) return;
      
      const productContent = productRow.querySelector('.product-row-content');
      if (!productContent) return;
      
      let infoElement = productContent.querySelector('.product-info');
      if (!infoElement) {
        infoElement = document.createElement('div');
        infoElement.className = 'product-info';
        productContent.appendChild(infoElement);
      }
      
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      const productPriceRaw = selectedOption.getAttribute('data-price');
      const unitPrice = parsePriceString(productPriceRaw);
      
      if (unitPrice > 0) {
        infoElement.innerHTML = `
          <small class="product-price">
            価格: ¥${formatPrice(unitPrice)}
          </small>
        `;
      } else {
        infoElement.innerHTML = `
          <small class="product-note">
            価格についてはお見積もりでご案内いたします
          </small>
        `;
      }
      
      infoElement.style.display = 'block';
    }
    
    /**
     * 商品情報非表示
     */
    hideProductInfo(productNumber) {
      const productRow = this.form.querySelector(`[data-product-index="${productNumber}"]`);
      if (productRow) {
        const infoElement = productRow.querySelector('.product-info');
        if (infoElement) {
          infoElement.style.display = 'none';
        }
      }
    }
    
    /**
     * フォーム送信機能
     */
    initFormSubmission() {
      console.log('📤 Setting up form submission...');
      
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
      
      console.log('📤 Form submission initialization completed');
    }
    
    /**
     * フォーム送信処理
     */
    async handleSubmit() {
      console.log('📤 フォーム送信処理開始...');
      
      const submitButton = this.form.querySelector('.submit-button');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('loading');
      }
      
      try {
        if (!this.validateForm()) {
          throw new Error('バリデーションエラー');
        }
        
        this.addEstimateToFormData();
        
        const formData = new FormData(this.form);
        const response = await fetch(this.form.action, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          this.showMessage('success', 'お問い合わせを受け付けました。3営業日以内にお見積もりをお送りいたします。');
          this.resetForm();
        } else {
          throw new Error('送信エラー');
        }
        
      } catch (error) {
        console.error('送信エラー:', error);
        this.showMessage('error', 'エラーが発生しました。再度お試しください。');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove('loading');
        }
      }
    }
    
    /**
     * フォームリセット
     */
    resetForm() {
      this.form.reset();
      
      // 数量・熨斗フィールドを無効化
      for (let i = 1; i <= 3; i++) {
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        const noshiSelect = this.form.querySelector(`select[name="contact[noshi_${i}]"]`);
        
        if (quantityInput) {
          quantityInput.disabled = true;
        }
        if (noshiSelect) {
          noshiSelect.disabled = true;
        }
        
        this.hideNoshiImage(i);
        this.hideProductInfo(i);
      }
      
      // 領収書詳細を非表示
      const receiptDetails = this.form.querySelector('.receipt-details');
      if (receiptDetails) {
        receiptDetails.style.display = 'none';
      }
      
      // 見積もりリセット
      this.updateEstimate();
    }
    
    /**
     * バリデーション
     */
    validateForm() {
      const requiredFields = this.form.querySelectorAll('input[required], select[required]');
      let isValid = true;
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#dc3545';
          field.setAttribute('aria-invalid', 'true');
          isValid = false;
        } else {
          field.style.borderColor = '';
          field.removeAttribute('aria-invalid');
        }
      });
      
      // 商品選択のチェック
      const hasSelectedProduct = Array.from({length: 3}, (_, i) => i + 1).some(i => {
        const productSelect = this.form.querySelector(`select[name="contact[product_${i}]"]`);
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        return productSelect?.value && quantityInput?.value && parseInt(quantityInput.value) > 0;
      });
      
      if (!hasSelectedProduct) {
        this.showMessage('error', '少なくとも1つの商品を選択し、数量を入力してください。');
        isValid = false;
      }
      
      return isValid;
    }
    
    /**
     * 見積もり情報をフォームデータに追加
     */
    addEstimateToFormData() {
      const totalAmount = document.querySelector(`#total-amount-${this.sectionId}`);
      if (totalAmount) {
        const estimateField = document.createElement('input');
        estimateField.type = 'hidden';
        estimateField.name = 'contact[estimated_total]';
        estimateField.value = totalAmount.textContent;
        this.form.appendChild(estimateField);
      }
      
      const selectedProducts = [];
      for (let i = 1; i <= 3; i++) {
        const productSelect = this.form.querySelector(`select[name="contact[product_${i}]"]`);
        const quantityInput = this.form.querySelector(`input[name="contact[quantity_${i}]"]`);
        const noshiSelect = this.form.querySelector(`select[name="contact[noshi_${i}]"]`);
        
        if (productSelect?.value && quantityInput?.value) {
          selectedProducts.push({
            product: productSelect.value,
            quantity: quantityInput.value,
            noshi: noshiSelect?.value || 'なし'
          });
        }
      }
      
      if (selectedProducts.length > 0) {
        const productsField = document.createElement('input');
        productsField.type = 'hidden';
        productsField.name = 'contact[selected_products_summary]';
        productsField.value = JSON.stringify(selectedProducts);
        this.form.appendChild(productsField);
      }
    }
    
    /**
     * メッセージ表示
     */
    showMessage(type, message) {
      const messageContainer = this.form.querySelector('.form-message');
      if (messageContainer) {
        messageContainer.className = `form-message ${type}`;
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        
        if (type === 'success') {
          setTimeout(() => {
            messageContainer.style.display = 'none';
          }, 5000);
        }
      }
    }
    
    /**
     * 必須フィールドの設定
     */
    setRequiredFields(container, required) {
      const fields = container.querySelectorAll('input, select');
      fields.forEach(field => {
        if (required) {
          field.setAttribute('required', '');
        } else {
          field.removeAttribute('required');
        }
      });
    }
  }
  
  /**
   * 初期化管理クラス
   */
  class FormInitializer {
    constructor() {
      this.initialized = false;
      this.retryCount = 0;
      this.maxRetries = 5;
    }
    
    /**
     * 初期化実行
     */
    initialize() {
      if (this.initialized) {
        console.log('⚠️ Already initialized, skipping...');
        return;
      }
      
      console.log(`🔄 Initialization attempt ${this.retryCount + 1}/${this.maxRetries}`);
      
      const forms = document.querySelectorAll('.bulk-order-form');
      
      if (forms.length === 0) {
        console.log('📋 No forms found');
        
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.initialize(), 1000);
          return;
        } else {
          console.warn('❌ Max retries reached, no forms found');
          return;
        }
      }
      
      console.log(`✅ Found ${forms.length} forms, initializing...`);
      
      let successCount = 0;
      forms.forEach((form, index) => {
        try {
          console.log(`🚀 Initializing form ${index + 1}...`);
          new BulkOrderForm(form);
          successCount++;
        } catch (error) {
          console.error(`💥 Failed to initialize form ${index + 1}:`, error);
        }
      });
      
      console.log(`✅ Successfully initialized ${successCount}/${forms.length} forms`);
      
      if (successCount > 0) {
        this.initialized = true;
      }
    }
  }
  
  /**
   * 初期化実行
   */
  const initializer = new FormInitializer();
  
  // 複数のタイミングで初期化を試行
  if (document.readyState === 'loading') {
    console.log('📄 Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOMContentLoaded fired');
      initializer.initialize();
    });
  } else {
    console.log('📄 Document already loaded, initializing immediately');
    initializer.initialize();
  }
  
  // 追加の安全装置
  setTimeout(() => {
    if (!initializer.initialized) {
      console.log('🔄 Safety initialization after 2 seconds');
      initializer.initialize();
    }
  }, 2000);
  
  // 最終安全装置
  window.addEventListener('load', () => {
    if (!initializer.initialized) {
      console.log('🔄 Final initialization on window load');
      initializer.initialize();
    }
  });
  
  console.log('🎉 Bulk Order Form Script Setup Complete');
  
})();