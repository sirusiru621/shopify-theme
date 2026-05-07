/**
 * ファイル名: assets/order-note-fix.js
 * 機能説明: 注文メモ確実反映システム（問題解決版）
 * - フォーム送信直前での確実な注文メモ生成
 * - 複数の方法での注文メモ送信
 * - 詳細なデバッグ機能
 */

class OrderNoteFix {
  constructor() {
    this.cartForm = null;
    this.noteField = null;
    this.isProcessing = false;
    this.debugMode = true; // デバッグモード有効
  }

  /**
   * 初期化
   */
  init() {
    try {
      this.cartForm = document.getElementById('cart');
      if (!this.cartForm) {
        this.log('❌ カートフォームが見つかりません');
        return;
      }

      // 注文メモフィールドを確実に作成
      this.setupNoteField();
      
      // フォーム送信をインターセプト
      this.interceptFormSubmission();
      
      // チェックアウトボタンの監視
      this.monitorCheckoutButtons();
      
      this.log('✅ 注文メモ修正システム初期化完了');
    } catch (error) {
      this.log('❌ 初期化エラー:', error);
    }
  }

  /**
   * 注文メモフィールドを確実に作成
   */
  setupNoteField() {
    // 既存フィールドを探す
    this.noteField = document.getElementById('Cart-note') || 
                    document.querySelector('textarea[name="note"]') ||
                    document.querySelector('input[name="note"]');

    if (!this.noteField) {
      this.log('📝 注文メモフィールドを新規作成');
      
      // 新規作成
      this.noteField = document.createElement('textarea');
      this.noteField.id = 'Cart-note';
      this.noteField.name = 'note';
      this.noteField.style.display = 'none'; // 隠しフィールドとして作成
      this.cartForm.appendChild(this.noteField);
      
      this.log('✅ 隠し注文メモフィールドを作成しました');
    } else {
      this.log('✅ 既存の注文メモフィールドを発見');
    }

    // 追加の隠しフィールドも作成（保険）
    this.createBackupNoteField();
  }

  /**
   * バックアップ用隠しフィールドを作成
   */
  createBackupNoteField() {
    const backupField = document.createElement('input');
    backupField.type = 'hidden';
    backupField.name = 'attributes[注文メモ]'; // カスタム属性として送信
    backupField.id = 'backup-note-field';
    this.cartForm.appendChild(backupField);
    
    this.log('✅ バックアップ注文メモフィールドを作成');
  }

  /**
   * フォーム送信をインターセプト
   */
  interceptFormSubmission() {
    // フォーム送信の直前処理
    this.cartForm.addEventListener('submit', (e) => {
      this.log('🚀 フォーム送信検出 - 注文メモ生成開始');
      
      if (this.isProcessing) {
        this.log('⚠️ 既に処理中のためスキップ');
        return;
      }

      // チェックアウトかどうかを判定
      if (this.isCheckoutSubmission(e)) {
        this.log('🛒 チェックアウト送信と判定');
        
        // 一時的にフォーム送信を停止
        e.preventDefault();
        
        // 注文メモを生成して再送信
        this.processCheckoutWithNote(e);
      }
    }, true); // キャプチャフェーズで実行
  }

  /**
   * チェックアウト送信かどうかを判定
   */
  isCheckoutSubmission(e) {
    // 送信ボタンの内容を確認
    const submitter = e.submitter;
    if (submitter) {
      const buttonText = submitter.textContent || submitter.value || '';
      
      // チェックアウト関連のキーワードをチェック
      const checkoutKeywords = [
        '購入', 'checkout', 'チェックアウト', '注文', '決済', 'order'
      ];
      
      const isCheckout = checkoutKeywords.some(keyword => 
        buttonText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      this.log(`🔍 ボタンテキスト: "${buttonText}" → チェックアウト: ${isCheckout}`);
      return isCheckout;
    }

    // チェックアウト用の隠しフィールドが存在するかチェック
    const checkoutField = this.cartForm.querySelector('input[name="checkout"]');
    if (checkoutField) {
      this.log('🔍 チェックアウトフィールド発見');
      return true;
    }

    return false;
  }

  /**
   * 注文メモ付きでチェックアウト処理
   */
  async processCheckoutWithNote(originalEvent) {
    this.isProcessing = true;
    
    try {
      this.log('📝 注文メモ生成中...');
      
      // 注文メモを生成
      const orderNote = await this.generateOrderNote();
      
      if (orderNote) {
        // 注文メモをフィールドに設定
        this.setOrderNote(orderNote);
        this.log('✅ 注文メモ設定完了');
      } else {
        this.log('ℹ️ ギフト設定なし - 通常の注文として処理');
      }

      // 元のフォーム送信を実行
      this.log('🚀 チェックアウト実行');
      this.executeOriginalSubmission(originalEvent);
      
    } catch (error) {
      this.log('❌ 注文メモ処理エラー:', error);
      
      // エラーでも通常のチェックアウトは実行
      this.executeOriginalSubmission(originalEvent);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 元のフォーム送信を実行
   */
  executeOriginalSubmission(originalEvent) {
    // チェックアウト用フィールドを追加
    const checkoutField = document.createElement('input');
    checkoutField.type = 'hidden';
    checkoutField.name = 'checkout';
    checkoutField.value = '1';
    this.cartForm.appendChild(checkoutField);

    // フォームアクションを設定
    this.cartForm.action = '/cart';
    this.cartForm.method = 'post';

    // 送信実行
    setTimeout(() => {
      this.cartForm.submit();
    }, 100);
  }

  /**
   * 注文メモ生成（同期バージョン）
   */
  async generateOrderNote() {
    try {
      // カートデータを取得
      const response = await fetch('/cart.js');
      const cartData = await response.json();
      
      this.log('🛒 カートデータ取得:', cartData.items.length + '個のアイテム');

      // ギフト設定のあるアイテムを抽出
      const giftItems = this.extractGiftItems(cartData.items);
      
      if (giftItems.length === 0) {
        this.log('ℹ️ ギフト設定のあるアイテムなし');
        return null;
      }

      this.log(`🎁 ${giftItems.length}個のアイテムにギフト設定あり`);

      // 注文メモを構築
      const giftNote = this.buildOrderNote(giftItems);
      
      // 既存メモと統合
      const finalNote = this.mergeWithExistingNote(giftNote);
      
      this.log('📋 生成された注文メモ:\n' + finalNote);
      
      return finalNote;
      
    } catch (error) {
      this.log('❌ 注文メモ生成エラー:', error);
      return null;
    }
  }

  /**
   * ギフト設定アイテムを抽出
   */
  extractGiftItems(items) {
    return items.filter(item => {
      if (!item.properties) return false;
      
      // ギフト関連プロパティの存在をチェック
      const hasGiftSettings = Object.keys(item.properties).some(key => 
        key.includes('ギフト_') || key.includes('Gift_')
      );
      
      if (hasGiftSettings) {
        this.log(`🎁 ギフト設定発見: ${item.title}`);
      }
      
      return hasGiftSettings;
    });
  }

  /**
   * 注文メモを構築
   */
  buildOrderNote(giftItems) {
    let note = '【 🎁 ギフト・ご進物設定 】\n';
    note += '═'.repeat(50) + '\n\n';
    
    giftItems.forEach((item, index) => {
      note += `▼ 商品${index + 1}: ${item.title}\n`;
      note += `   💰 価格: ¥${(item.line_price / 100).toLocaleString()} (${item.quantity}個)\n`;
      
      // ギフト設定詳細
      const props = item.properties;
      
      if (props['Gift_Summary']) {
        note += `   🎁 ${props['Gift_Summary']}\n`;
      } else {
        const settings = [];
        if (props['ギフト_数量']) settings.push(`数量:${props['ギフト_数量']}`);
        if (props['ギフト_のし有無']) settings.push(`のし:${props['ギフト_のし有無']}`);
        if (props['ギフト_用途']) settings.push(`用途:${props['ギフト_用途']}`);
        if (props['ギフト_表書き']) settings.push(`表書き:${props['ギフト_表書き']}`);
        if (props['ギフト_内外']) settings.push(`${props['ギフト_内外']}`);
        
        if (settings.length > 0) {
          note += `   🎁 ${settings.join(' | ')}\n`;
        }
      }
      
      note += '\n';
    });
    
    note += '═'.repeat(50) + '\n';
    note += `⏰ 設定日時: ${new Date().toLocaleString('ja-JP')}\n`;
    note += '💡 上記商品はギフト設定に従って包装をお願いします。\n';
    
    return note;
  }

  /**
   * 既存メモと統合
   */
  mergeWithExistingNote(giftNote) {
    let existingNote = '';
    
    if (this.noteField && this.noteField.value) {
      existingNote = this.noteField.value.trim();
    }

    // 既存のギフト設定メモを削除（重複防止）
    existingNote = existingNote.replace(/【 🎁 ギフト・ご進物設定 】[\s\S]*?💡 上記商品はギフト設定に従って包装をお願いします。\n?/g, '');
    
    if (existingNote) {
      return `${giftNote}\n\n【 その他のご要望 】\n${existingNote}`;
    }
    
    return giftNote;
  }

  /**
   * 注文メモを設定
   */
  setOrderNote(note) {
    // メインの注文メモフィールドに設定
    if (this.noteField) {
      this.noteField.value = note;
      this.log('✅ メイン注文メモフィールドに設定');
    }

    // バックアップフィールドにも設定
    const backupField = document.getElementById('backup-note-field');
    if (backupField) {
      backupField.value = note;
      this.log('✅ バックアップフィールドに設定');
    }

    // 追加の隠しフィールドを作成
    const additionalField = document.createElement('input');
    additionalField.type = 'hidden';
    additionalField.name = 'note';
    additionalField.value = note;
    additionalField.id = 'additional-note-field';
    this.cartForm.appendChild(additionalField);
    
    this.log('✅ 追加注文メモフィールドを作成');
  }

  /**
   * チェックアウトボタンの監視
   */
  monitorCheckoutButtons() {
    // 一般的なチェックアウトボタンセレクタ
    const selectors = [
      'button[name="add"]',
      'input[name="add"]',
      '.cart__checkout-button',
      '.checkout-button',
      '.btn--checkout',
      'button[type="submit"]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(button => {
        if (button.form === this.cartForm || 
            button.closest('#cart') ||
            button.getAttribute('form') === 'cart') {
          
          button.addEventListener('click', () => {
            this.log(`🔘 チェックアウトボタンクリック: ${button.textContent || button.value}`);
          });
        }
      });
    });
  }

  /**
   * ログ出力（デバッグ用）
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[OrderNoteFix]', ...args);
    }
  }

  /**
   * 手動テスト用メソッド
   */
  async testOrderNote() {
    this.log('🧪 手動テスト開始');
    
    const note = await this.generateOrderNote();
    if (note) {
      this.setOrderNote(note);
      this.log('✅ テスト完了 - 注文メモを設定しました');
      
      // フィールドの状態を確認
      this.debugFields();
    } else {
      this.log('ℹ️ ギフト設定なし');
    }
  }

  /**
   * フィールドの状態をデバッグ
   */
  debugFields() {
    this.log('=== フィールド状態 ===');
    this.log('メインフィールド:', this.noteField?.value || 'なし');
    this.log('バックアップフィールド:', document.getElementById('backup-note-field')?.value || 'なし');
    this.log('追加フィールド:', document.getElementById('additional-note-field')?.value || 'なし');
    
    // フォーム内のすべてのnote関連フィールドを確認
    const allNoteFields = this.cartForm.querySelectorAll('[name="note"], [name*="note"], [name*="Note"]');
    this.log('すべてのnoteフィールド:', allNoteFields.length + '個');
    
    allNoteFields.forEach((field, index) => {
      this.log(`  ${index + 1}. ${field.name} = "${field.value}"`);
    });
  }
}

// グローバルインスタンス
window.OrderNoteFix = new OrderNoteFix();

// 初期化
function initOrderNoteFix() {
  try {
    if (window.OrderNoteFix && window.location.pathname.includes('/cart')) {
      window.OrderNoteFix.init();
    }
  } catch (error) {
    console.error('[OrderNoteFix] 初期化失敗:', error);
  }
}

// 複数のタイミングで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOrderNoteFix);
} else {
  initOrderNoteFix();
}

window.addEventListener('load', initOrderNoteFix);
setTimeout(initOrderNoteFix, 1000);

// カート更新時の再初期化
document.addEventListener('shopify:cart_updated', () => {
  setTimeout(initOrderNoteFix, 500);
});

// ===== デバッグ・テスト用関数 =====

window.testOrderNote = async () => {
  console.log('🧪 === 注文メモテスト実行 ===');
  
  if (window.OrderNoteFix) {
    await window.OrderNoteFix.testOrderNote();
  } else {
    console.log('❌ OrderNoteFix が初期化されていません');
  }
};

window.debugOrderNoteSystem = () => {
  console.log('🔍 === 注文メモシステム診断 ===');
  
  const cartForm = document.getElementById('cart');
  console.log('1. カートフォーム:', cartForm ? '✅ 存在' : '❌ なし');
  
  const noteFields = document.querySelectorAll('[name="note"], [name*="note"]');
  console.log('2. 注文メモフィールド:', noteFields.length + '個');
  
  noteFields.forEach((field, index) => {
    console.log(`   ${index + 1}. ${field.name} (${field.type}) = "${field.value}"`);
  });
  
  console.log('3. OrderNoteFix状態:', window.OrderNoteFix ? '✅ 初期化済み' : '❌ 未初期化');
  
  if (window.OrderNoteFix) {
    window.OrderNoteFix.debugFields();
  }
};

window.forceGenerateOrderNote = async () => {
  console.log('🚀 === 強制注文メモ生成 ===');
  
  if (window.OrderNoteFix) {
    const note = await window.OrderNoteFix.generateOrderNote();
    if (note) {
      window.OrderNoteFix.setOrderNote(note);
      console.log('✅ 強制生成完了');
      console.log('📋 生成内容:\n', note);
    } else {
      console.log('ℹ️ ギフト設定なし');
    }
  }
};

// チェックアウト前のプレビュー
window.previewCheckoutNote = async () => {
  console.log('👀 === チェックアウト時の注文メモプレビュー ===');
  
  if (window.OrderNoteFix) {
    const note = await window.OrderNoteFix.generateOrderNote();
    if (note) {
      console.log('📋 管理画面表示予想:\n');
      console.log('┌─────────────────────────────────────┐');
      console.log('│              注文メモ                │');
      console.log('├─────────────────────────────────────┤');
      note.split('\n').forEach(line => {
        console.log(`│ ${line.padEnd(35)} │`);
      });
      console.log('└─────────────────────────────────────┘');
    } else {
      console.log('ℹ️ ギフト設定なし - 通常の注文');
    }
  }
};