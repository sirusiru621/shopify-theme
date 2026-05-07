// ファイル名: gift-settings-simple.js
// ギフト設定（改修版）の動的機能 - ES6準拠、jQuery非依存

(function() {
  'use strict';

  // ==========================================
  // 設定とグローバル変数
  // ==========================================
  
  let giftSettings = {
    quantity: '',
    purpose: '',
    inscription: '',
    addressee: ''
  };

  let productData = {};
  const ADDRESSEE_MAX_LENGTH = 20;

  // ==========================================
  // DOM要素の取得
  // ==========================================

  const elements = {
    giftBtn: null,
    giftArea: null,
    giftSummary: null,
    giftStatus: null,
    confirmBtn: null,
    cancelBtn: null,
    editBtn: null,
    quantitySelect: null,
    purposeSelect: null,
    inscriptionRadios: null,
    addresseeInput: null,
    addresseeCount: null,
    noshiSamples: null,
    noshiSampleImages: null,
    inscriptionOptions: null
  };

  // ==========================================
  // 初期化関数
  // ==========================================

  function initializeGiftSettings() {
    // DOM要素を取得
    getDOMElements();
    
    // 商品データを読み込み
    loadProductData();
    
    // 数量オプションを生成
    generateQuantityOptions();
    
    // イベントリスナーを設定
    attachEventListeners();
    
    // 初期状態を設定
    updateFormValidation();
    
    console.log('🎁 ギフト設定が初期化されました');
  }

  // ==========================================
  // DOM要素取得
  // ==========================================

  function getDOMElements() {
    const container = document.querySelector('.gift-settings-simple');
    if (!container) {
      console.warn('⚠️ ギフト設定コンテナが見つかりません');
      return;
    }

    elements.giftBtn = container.querySelector('#gift-settings-trigger');
    elements.giftArea = container.querySelector('.gift-settings-area');
    elements.giftSummary = container.querySelector('.gift-summary');
    elements.giftStatus = container.querySelector('.gift-status');
    elements.giftArrow = container.querySelector('.gift-arrow');
    elements.confirmBtn = container.querySelector('.gift-confirm-btn');
    elements.cancelBtn = container.querySelector('.gift-cancel-btn');
    elements.editBtn = container.querySelector('.gift-edit-btn');
    elements.quantitySelect = container.querySelector('.gift-quantity-select');
    elements.purposeSelect = container.querySelector('.gift-purpose-select');
    elements.inscriptionRadios = container.querySelectorAll('input[name="gift_inscription"]');
    elements.addresseeInput = container.querySelector('.gift-addressee-input');
    elements.addresseeCount = container.querySelector('.addressee-count');
    elements.noshiSamples = container.querySelector('.noshi-samples');
    elements.noshiSampleImages = container.querySelector('.noshi-sample-images');
    elements.inscriptionOptions = container.querySelectorAll('.gift-inscription-option');
    elements.inscriptionPreviewArea = container.querySelector('.inscription-preview-area');
    elements.inscriptionPreviewImage = container.querySelector('.inscription-preview-image');
    elements.inscriptionPreviewPlaceholder = container.querySelector('.inscription-preview-placeholder');
    
    console.log('📋 DOM要素を取得しました:', {
      giftBtn: !!elements.giftBtn,
      giftArea: !!elements.giftArea,
      inscriptionPreviewArea: !!elements.inscriptionPreviewArea
    });
  }

  // ==========================================
  // 商品データ読み込み
  // ==========================================

  function loadProductData() {
    const dataScript = document.getElementById('gift-product-data');
    if (dataScript) {
      try {
        productData = JSON.parse(dataScript.textContent);
        console.log('📦 商品データを読み込みました:', productData);
      } catch (error) {
        console.error('❌ 商品データの解析に失敗しました:', error);
        productData = {
          inventory: 0,
          maxQuantity: 10,
          noshiSamples: {}
        };
      }
    }
  }

  // ==========================================
  // 数量オプション生成（在庫連動）
  // ==========================================

  function generateQuantityOptions() {
    if (!elements.quantitySelect) return;

    // 現在の在庫数または設定された最大数の小さい方を使用
    const maxQuantity = Math.min(
      productData.inventory || 0,
      productData.maxQuantity || 10
    );

    // 既存オプションをクリア（プレースホルダー以外）
    const placeholder = elements.quantitySelect.querySelector('option[value=""]');
    elements.quantitySelect.innerHTML = '';
    if (placeholder) {
      elements.quantitySelect.appendChild(placeholder);
    }

    // 在庫がない場合
    if (maxQuantity <= 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '在庫がありません';
      option.disabled = true;
      elements.quantitySelect.appendChild(option);
      return;
    }

    // 数量オプションを生成
    for (let i = 1; i <= maxQuantity; i++) {
      const option = document.createElement('option');
      option.value = `${maxQuantity}点中 ${i}点`;
      option.textContent = `${maxQuantity}点中 ${i}点`;
      elements.quantitySelect.appendChild(option);
    }

    console.log(`📊 数量オプションを生成しました（最大${maxQuantity}点）`);
  }

  // ==========================================
  // イベントリスナー設定
  // ==========================================

  function attachEventListeners() {
    // ギフト設定ボタン - より確実なイベント処理
    if (elements.giftBtn) {
      // 複数のイベントで確実に動作させる
      elements.giftBtn.addEventListener('click', handleGiftButtonClick);
      elements.giftBtn.addEventListener('touchstart', handleGiftButtonClick, { passive: true });
      
      // キーボード操作対応
      elements.giftBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleGiftButtonClick();
        }
      });
      
      console.log('🔘 ギフト設定ボタンにイベントリスナーを設定しました');
    } else {
      console.error('❌ ギフト設定ボタンが見つかりません');
    }

    // フォーム要素の変更監視
    if (elements.quantitySelect) {
      elements.quantitySelect.addEventListener('change', updateFormValidation);
    }

    if (elements.purposeSelect) {
      elements.purposeSelect.addEventListener('change', handlePurposeChange);
    }

    // 表書きラジオボタン
    elements.inscriptionRadios.forEach(radio => {
      radio.addEventListener('change', handleInscriptionChange);
    });

    // 表書きオプションクリック（ラベル全体をクリック可能に）
    elements.inscriptionOptions.forEach(option => {
      // ラベル要素の場合は自動でラジオボタンが選択されるため、追加処理のみ
      option.addEventListener('click', handleInscriptionOptionClick);
    });

    // 宛名書き入力
    if (elements.addresseeInput) {
      elements.addresseeInput.addEventListener('input', handleAddresseeInput);
      elements.addresseeInput.addEventListener('keydown', handleAddresseeKeydown);
    }

    // アクションボタン
    if (elements.confirmBtn) {
      elements.confirmBtn.addEventListener('click', confirmGiftSettings);
    }

    if (elements.cancelBtn) {
      elements.cancelBtn.addEventListener('click', cancelGiftSettings);
    }

    if (elements.editBtn) {
      elements.editBtn.addEventListener('click', editGiftSettings);
    }
  }

  // ==========================================
  // ギフトボタンクリック処理（修正版）
  // ==========================================

  function handleGiftButtonClick(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🔘 ギフト設定ボタンがクリックされました');
    
    if (!elements.giftArea) {
      console.error('❌ ギフト設定エリアが見つかりません');
      return;
    }

    const isVisible = elements.giftArea.style.display !== 'none' && 
                     elements.giftArea.style.display !== '';
    
    console.log('👀 現在の表示状態:', { 
      display: elements.giftArea.style.display, 
      isVisible: isVisible 
    });
    
    if (isVisible) {
      // 閉じる処理
      elements.giftArea.classList.add('closing');
      setTimeout(() => {
        elements.giftArea.style.display = 'none';
        elements.giftArea.classList.remove('closing');
        if (elements.giftBtn) {
          elements.giftBtn.classList.remove('area-open');
        }
      }, 300);
    } else {
      // 開く処理
      elements.giftArea.style.display = 'block';
      elements.giftSummary.style.display = 'none';
      
      if (elements.giftBtn) {
        elements.giftBtn.classList.add('area-open');
      }
      
      // フォーカスを最初の入力要素に移動
      setTimeout(() => {
        if (elements.quantitySelect) {
          elements.quantitySelect.focus();
        }
      }, 100);
      
      console.log('✅ ギフト設定エリアを開きました');
    }
  }

  // ==========================================
  // ギフト設定エリア表示切替（削除 - 上記で置換済み）
  // ==========================================

  // この関数は handleGiftButtonClick に統合されました

  // ==========================================
  // キャンセル処理（修正版）
  // ==========================================

  function cancelGiftSettings() {
    if (elements.giftArea) {
      elements.giftArea.classList.add('closing');
      setTimeout(() => {
        elements.giftArea.style.display = 'none';
        elements.giftArea.classList.remove('closing');
        if (elements.giftBtn) {
          elements.giftBtn.classList.remove('area-open');
        }
      }, 300);
    }
    hideNoshiSamples();
    console.log('❌ ギフト設定をキャンセルしました');
  }

  // ==========================================
  // 編集処理（修正版）
  // ==========================================

  function editGiftSettings() {
    if (elements.giftArea && elements.giftSummary) {
      elements.giftArea.style.display = 'block';
      elements.giftSummary.style.display = 'none';
      
      if (elements.giftBtn) {
        elements.giftBtn.classList.add('area-open');
      }
      
      console.log('✏️ ギフト設定を編集モードにしました');
    }
  }

  // ==========================================
  // 用途変更処理
  // ==========================================

  function handlePurposeChange() {
    const selectedPurpose = elements.purposeSelect.value;
    updateFormValidation();
    
    if (selectedPurpose) {
      showNoshiSamples(selectedPurpose);
    } else {
      hideNoshiSamples();
    }
  }

  // ==========================================
  // 熨斗サンプル表示
  // ==========================================

  function showNoshiSamples(purposeKey) {
    if (!elements.noshiSamples || !elements.noshiSampleImages) return;

    const noshiData = productData.noshiSamples || {};
    const sampleImages = noshiData[purposeKey];

    if (!sampleImages || sampleImages.length === 0) {
      hideNoshiSamples();
      return;
    }

    // サンプル画像を生成
    elements.noshiSampleImages.innerHTML = '';
    
    sampleImages.forEach((imageData, index) => {
      if (imageData && imageData.url) {
        const sampleItem = document.createElement('div');
        sampleItem.className = 'noshi-sample-item';
        sampleItem.innerHTML = `
          <img 
            src="${imageData.url}" 
            alt="${imageData.alt || `${purposeKey}の熨斗サンプル${index + 1}`}"
            class="noshi-sample-image"
            loading="lazy"
          >
          <div class="noshi-sample-label">${imageData.label || `サンプル${index + 1}`}</div>
        `;
        
        // クリックでプレビュー表示（オプション）
        sampleItem.addEventListener('click', () => {
          showImagePreview(imageData.url, imageData.alt);
        });
        
        elements.noshiSampleImages.appendChild(sampleItem);
      }
    });

    // サンプルエリアを表示
    elements.noshiSamples.style.display = 'block';
    console.log(`🖼️ ${purposeKey}の熨斗サンプルを表示しました`);
  }

  function hideNoshiSamples() {
    if (elements.noshiSamples) {
      elements.noshiSamples.style.display = 'none';
    }
  }

  // ==========================================
  // 画像プレビュー表示（簡易モーダル）
  // ==========================================

  function showImagePreview(imageUrl, altText) {
    // 既存のプレビューがあれば削除
    const existingPreview = document.querySelector('.noshi-preview-modal');
    if (existingPreview) {
      existingPreview.remove();
    }

    // プレビューモーダルを作成
    const modal = document.createElement('div');
    modal.className = 'noshi-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = altText;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    // クリックで閉じる
    modal.addEventListener('click', () => {
      modal.remove();
    });

    // ESCキーで閉じる
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  // ==========================================
  // 表書き選択処理（画像プレビュー対応）
  // ==========================================

  function handleInscriptionChange() {
    updateInscriptionUI();
    updateInscriptionPreview();
    updateFormValidation();
  }

  function handleInscriptionOptionClick(event) {
    // ラベル要素の場合は、内部のラジオボタンが自動で選択される
    setTimeout(() => {
      handleInscriptionChange();
    }, 10);
  }

  function updateInscriptionUI() {
    elements.inscriptionOptions.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      
      if (radio && radio.checked) {
        option.style.borderColor = 'var(--gift-accent-color, #007c89)';
        option.style.backgroundColor = '#e8f4fd';
        option.style.boxShadow = '0 0 0 2px rgba(0, 124, 137, 0.1)';
      } else {
        option.style.borderColor = '#e1e5e9';
        option.style.backgroundColor = 'white';
        option.style.boxShadow = 'none';
      }
    });
  }

  // ==========================================
  // 表書き画像プレビュー機能
  // ==========================================

  function updateInscriptionPreview() {
    if (!elements.inscriptionPreviewArea || !elements.inscriptionPreviewImage || !elements.inscriptionPreviewPlaceholder) {
      return;
    }

    const selectedRadio = document.querySelector('input[name="gift_inscription"]:checked');
    
    if (selectedRadio) {
      const imageUrl = selectedRadio.getAttribute('data-image');
      
      if (imageUrl && imageUrl !== 'null' && imageUrl.trim() !== '') {
        // 画像がある場合
        showInscriptionImage(imageUrl, selectedRadio.value);
      } else {
        // 画像がない場合はプレースホルダーを表示
        showInscriptionPlaceholder(`「${selectedRadio.value}」が選択されました`);
      }
    } else {
      // 何も選択されていない場合
      showInscriptionPlaceholder('表書きを選択すると、こちらにサンプル画像が表示されます');
    }
  }

  function showInscriptionImage(imageUrl, altText) {
    // ローディング状態にする
    elements.inscriptionPreviewImage.classList.add('loading');
    elements.inscriptionPreviewPlaceholder.style.display = 'none';
    
    // 画像を読み込み
    const img = new Image();
    img.onload = function() {
      elements.inscriptionPreviewImage.src = imageUrl;
      elements.inscriptionPreviewImage.alt = `${altText}のサンプル画像`;
      elements.inscriptionPreviewImage.style.display = 'block';
      elements.inscriptionPreviewImage.classList.remove('loading');
      
      console.log(`🖼️ 表書き画像を表示しました: ${altText}`);
    };
    
    img.onerror = function() {
      console.warn(`⚠️ 画像の読み込みに失敗しました: ${imageUrl}`);
      showInscriptionPlaceholder(`「${altText}」の画像を読み込めませんでした`);
      elements.inscriptionPreviewImage.classList.remove('loading');
    };
    
    img.src = imageUrl;
  }

  function showInscriptionPlaceholder(text) {
    elements.inscriptionPreviewImage.style.display = 'none';
    elements.inscriptionPreviewPlaceholder.style.display = 'block';
    elements.inscriptionPreviewPlaceholder.textContent = text;
  }

  // ==========================================
  // 宛名書き入力処理
  // ==========================================

  function handleAddresseeInput(event) {
    const value = event.target.value;
    const length = value.length;
    
    // 文字数カウント更新
    if (elements.addresseeCount) {
      elements.addresseeCount.textContent = length;
    }
    
    // 最大文字数制限
    if (length > ADDRESSEE_MAX_LENGTH) {
      event.target.value = value.substring(0, ADDRESSEE_MAX_LENGTH);
      if (elements.addresseeCount) {
        elements.addresseeCount.textContent = ADDRESSEE_MAX_LENGTH;
      }
    }
    
    updateFormValidation();
  }

  function handleAddresseeKeydown(event) {
    // Enterキーでフォーム送信を防ぐ
    if (event.key === 'Enter') {
      event.preventDefault();
      
      if (elements.confirmBtn && !elements.confirmBtn.disabled) {
        confirmGiftSettings();
      }
    }
  }

  // ==========================================
  // フォーム検証
  // ==========================================

  function updateFormValidation() {
    const isValid = elements.quantitySelect.value && 
                   elements.purposeSelect.value && 
                   document.querySelector('input[name="gift_inscription"]:checked');
    
    if (elements.confirmBtn) {
      elements.confirmBtn.disabled = !isValid;
      
      if (isValid) {
        elements.confirmBtn.style.backgroundColor = 'var(--gift-accent-color, #007c89)';
        elements.confirmBtn.style.cursor = 'pointer';
        elements.confirmBtn.style.opacity = '1';
      } else {
        elements.confirmBtn.style.backgroundColor = '#ccc';
        elements.confirmBtn.style.cursor = 'not-allowed';
        elements.confirmBtn.style.opacity = '0.6';
      }
    }
  }

  // ==========================================
  // 設定確定処理（修正版）
  // ==========================================

  function confirmGiftSettings() {
    if (elements.confirmBtn.disabled) return;

    // 設定値を取得
    giftSettings.quantity = elements.quantitySelect.value;
    giftSettings.purpose = elements.purposeSelect.value;
    giftSettings.inscription = document.querySelector('input[name="gift_inscription"]:checked').value;
    giftSettings.addressee = elements.addresseeInput.value.trim();

    // 隠しフィールドに値を設定
    updateHiddenFields();

    // サマリー表示を更新
    updateSummaryDisplay();

    // UI切り替え（アニメーション付き）
    if (elements.giftArea) {
      elements.giftArea.classList.add('closing');
      setTimeout(() => {
        elements.giftArea.style.display = 'none';
        elements.giftArea.classList.remove('closing');
        elements.giftSummary.style.display = 'block';
        
        if (elements.giftBtn) {
          elements.giftBtn.classList.remove('area-open');
        }
      }, 300);
    }
    
    // ステータス更新
    if (elements.giftStatus) {
      elements.giftStatus.textContent = '設定済み';
      elements.giftStatus.style.color = '#28a745';
    }

    // ボタンスタイル更新
    if (elements.giftBtn) {
      elements.giftBtn.classList.add('settings-configured');
    }

    // 熨斗サンプルを非表示
    hideNoshiSamples();

    console.log('✅ ギフト設定が保存されました:', giftSettings);
    
    // 成功メッセージ表示（オプション）
    showSuccessMessage();
  }

  // ==========================================
  // 隠しフィールド更新
  // ==========================================

  function updateHiddenFields() {
    const fields = [
      { id: 'giftQuantityHidden', value: giftSettings.quantity },
      { id: 'giftPurposeHidden', value: giftSettings.purpose },
      { id: 'giftInscriptionHidden', value: giftSettings.inscription },
      { id: 'giftAddresseeHidden', value: giftSettings.addressee }
    ];

    fields.forEach(field => {
      const element = document.getElementById(field.id);
      if (element) {
        element.value = field.value;
      }
    });
  }

  // ==========================================
  // サマリー表示更新
  // ==========================================

  function updateSummaryDisplay() {
    const summaryContent = document.querySelector('.gift-summary-content');
    if (!summaryContent) return;

    const summaryItems = [
      { label: '数量', value: giftSettings.quantity },
      { label: '用途', value: giftSettings.purpose },
      { label: '表書き', value: giftSettings.inscription }
    ];

    // 宛名書きがある場合のみ追加
    if (giftSettings.addressee) {
      summaryItems.push({ label: '宛名書き', value: giftSettings.addressee });
    }

    summaryContent.innerHTML = summaryItems
      .map(item => `<div><strong>${item.label}:</strong> ${item.value}</div>`)
      .join('');
  }

  // ==========================================
  // 成功メッセージ表示
  // ==========================================

  function showSuccessMessage() {
    // 既存のメッセージがあれば削除
    const existingMessage = document.querySelector('.gift-success-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 成功メッセージを作成
    const message = document.createElement('div');
    message.className = 'gift-success-message';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      animation: slideInRight 0.3s ease-out;
    `;
    message.textContent = '🎁 ギフト設定を保存しました';

    // アニメーション定義
    if (!document.querySelector('#gift-success-animation')) {
      const style = document.createElement('style');
      style.id = 'gift-success-animation';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(message);

    // 3秒後に自動削除
    setTimeout(() => {
      message.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // キャンセル処理（削除 - 上記で統合済み）
  // ==========================================

  // この関数は上記で修正済み

  // ==========================================
  // 編集処理（削除 - 上記で統合済み）
  // ==========================================

  // この関数は上記で修正済み

  // ==========================================
  // 初期化実行（強化版）
  // ==========================================

  // DOM読み込み完了後に初期化
  function safeInitialize() {
    try {
      initializeGiftSettings();
    } catch (error) {
      console.error('❌ ギフト設定の初期化に失敗しました:', error);
      handleError(error, '初期化');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInitialize);
  } else {
    // 少し遅延させて他のスクリプトとの競合を避ける
    setTimeout(safeInitialize, 100);
  }

  // ==========================================
  // 追加のデバッグ機能
  // ==========================================

  // 強制的にボタンイベントを再設定する関数（デバッグ用）
  function reinitializeButton() {
    const btn = document.querySelector('#gift-settings-trigger');
    if (btn) {
      // 既存のイベントリスナーをクリア
      btn.replaceWith(btn.cloneNode(true));
      
      // DOM要素を再取得
      getDOMElements();
      
      // イベントリスナーを再設定
      if (elements.giftBtn) {
        elements.giftBtn.addEventListener('click', handleGiftButtonClick);
        console.log('🔄 ボタンイベントを再設定しました');
      }
    }
  }

  // ==========================================
  // バリアント変更時の処理
  // ==========================================

  function handleVariantChange() {
    // 商品バリアント変更時に数量オプションを再生成
    loadProductData();
    generateQuantityOptions();
    
    console.log('🔄 バリアント変更に対応して数量オプションを更新しました');
  }

  // ==========================================
  // エラーハンドリング
  // ==========================================

  function handleError(error, context) {
    console.error(`❌ ギフト設定エラー [${context}]:`, error);
    
    // ユーザーにエラーメッセージを表示
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
      z-index: 9999;
      font-size: 14px;
    `;
    errorMessage.textContent = 'ギフト設定でエラーが発生しました';
    
    document.body.appendChild(errorMessage);
    
    setTimeout(() => errorMessage.remove(), 5000);
  }

  // ==========================================
  // 初期化実行
  // ==========================================

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGiftSettings);
  } else {
    initializeGiftSettings();
  }

  // バリアント変更イベントをリッスン
  document.addEventListener('variant:change', handleVariantChange);

  // グローバルスコープに公開（デバッグ用 - 強化版）
  window.GiftSettings = {
    getCurrentSettings: () => giftSettings,
    getProductData: () => productData,
    getElements: () => elements,
    regenerateQuantityOptions: generateQuantityOptions,
    showNoshiSamples: showNoshiSamples,
    hideNoshiSamples: hideNoshiSamples,
    updateInscriptionPreview: updateInscriptionPreview,
    reinitializeButton: reinitializeButton,
    forceToggle: handleGiftButtonClick,
    // デバッグ用の状態確認
    checkStatus: () => {
      console.log('🔍 ギフト設定デバッグ状況:');
      console.log('ボタン存在:', !!elements.giftBtn);
      console.log('エリア存在:', !!elements.giftArea);
      console.log('エリア表示状態:', elements.giftArea?.style.display);
      console.log('現在の設定:', giftSettings);
      console.log('DOM要素一覧:', elements);
    }
  };

})();