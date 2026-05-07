/**
 * ファイル名: assets/checkout-fix.js
 * 機能説明: チェックアウト機能修正用スクリプト
 * - カートからチェックアウトページへの確実な遷移を保証
 * - ギフト設定機能との競合を解決
 */

// チェックアウト修正クラス
class CheckoutFix {
  constructor() {
    this.isInitialized = false;
    this.cartForm = null;
    this.checkoutButtons = [];
  }

  /**
   * 初期化
   */
  init() {
    if (this.isInitialized) return;

    try {
      this.cartForm = document.getElementById('cart');
      this.findCheckoutButtons();
      this.setupCheckoutHandlers();
      this.setupFormProtection();
      
      this.isInitialized = true;
      console.log('✅ チェックアウト修正機能初期化完了');
    } catch (error) {
      console.error('❌ チェックアウト修正初期化エラー:', error);
    }
  }

  /**
   * チェックアウトボタンを検索
   */
  findCheckoutButtons() {
    // 一般的なチェックアウトボタンのセレクタ
    const selectors = [
      'button[name="add"]',
      'button[type="submit"]',
      '.cart__checkout-button',
      '.btn--checkout',
      '.checkout-button',
      'input[name="add"]',
      '[data-testid="Checkout-button"]'
    ];

    this.checkoutButtons = [];
    
    selectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        // カートフォーム内または関連するボタンのみ
        if (button.form === this.cartForm || 
            button.getAttribute('form') === 'cart' ||
            button.closest('.cart') ||
            button.textContent.toLowerCase().includes('checkout') ||
            button.textContent.toLowerCase().includes('購入') ||
            button.textContent.toLowerCase().includes('注文')) {
          
          this.checkoutButtons.push(button);
        }
      });
    });

    console.log(`🔍 ${this.checkoutButtons.length}個のチェックアウトボタンを検出`);
  }

  /**
   * チェックアウトハンドラー設定
   */
  setupCheckoutHandlers() {
    this.checkoutButtons.forEach((button, index) => {
      // 既存のイベントリスナーを保持しつつ、新しいものを追加
      button.addEventListener('click', (e) => {
        console.log(`🛒 チェックアウトボタン ${index + 1} クリック`);
        
        // ギフトモーダルが開いている場合は処理を停止
        const giftModal = document.getElementById('gift-modal');
        if (giftModal && !giftModal.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          alert('ギフト設定を完了してから購入手続きを進めてください。');
          console.log('⚠️ ギフトモーダルが開いているためチェックアウトを停止');
          return false;
        }

        // カートが空でないことを確認
        if (!this.validateCart()) {
          e.preventDefault();
          e.stopPropagation();
          alert('カートに商品がありません。');
          return false;
        }

        // フォームの状態を確認
        if (this.cartForm) {
          // フォームアクションを確実に設定
          if (!this.cartForm.action || this.cartForm.action.includes('#')) {
            this.cartForm.action = '/cart';
          }

          // チェックアウト用の隠しフィールドを追加
          this.addCheckoutField();
        }

        console.log('✅ チェックアウト処理を続行');
        return true;
      }, true); // キャプチャフェーズで実行
    });
  }

  /**
   * カートの状態を検証
   */
  validateCart() {
    if (!this.cartForm) return false;

    const quantityInputs = this.cartForm.querySelectorAll('input[name="updates[]"]');
    if (quantityInputs.length === 0) {
      console.log('⚠️ カートアイテムが見つかりません');
      return false;
    }

    const hasItems = Array.from(quantityInputs).some(input => {
      const value = parseInt(input.value) || 0;
      return value > 0;
    });

    if (!hasItems) {
      console.log('⚠️ カートに商品がありません');
      return false;
    }

    return true;
  }

  /**
   * チェックアウト用フィールドを追加
   */
  addCheckoutField() {
    // 既存のチェックアウトフィールドを削除
    const existingField = this.cartForm.querySelector('input[name="checkout"]');
    if (existingField) {
      existingField.remove();
    }

    // 新しいチェックアウトフィールドを追加
    const checkoutField = document.createElement('input');
    checkoutField.type = 'hidden';
    checkoutField.name = 'checkout';
    checkoutField.value = '1';
    this.cartForm.appendChild(checkoutField);

    console.log('✅ チェックアウトフィールドを追加');
  }

  /**
   * フォーム保護設定
   */
  setupFormProtection() {
    if (!this.cartForm) return;

    // フォーム送信時の最終チェック
    this.cartForm.addEventListener('submit', (e) => {
      // ギフトモーダルが開いている場合は送信を停止
      const giftModal = document.getElementById('gift-modal');
      if (giftModal && !giftModal.classList.contains('hidden')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('⚠️ フォーム送信: ギフトモーダルが開いているため停止');
        return false;
      }

      // チェックアウトフィールドがある場合はチェックアウトとして処理
      const checkoutField = this.cartForm.querySelector('input[name="checkout"]');
      if (checkoutField) {
        console.log('🚀 チェックアウト送信実行');
        // フォームアクションを確実に設定
        this.cartForm.action = '/cart';
        this.cartForm.method = 'post';
      }

      return true;
    }, true);

    console.log('✅ フォーム保護設定完了');
  }

  /**
   * 強制的にチェックアウトページに遷移
   */
  forceCheckout() {
    try {
      // 方法1: フォーム送信
      if (this.cartForm && this.validateCart()) {
        this.addCheckoutField();
        this.cartForm.submit();
        return;
      }

      // 方法2: 直接リダイレクト
      console.log('🔄 直接チェックアウトページにリダイレクト');
      window.location.href = '/checkout';
      
    } catch (error) {
      console.error('❌ 強制チェックアウトエラー:', error);
      
      // 方法3: 最終手段
      window.location.href = '/cart';
    }
  }
}

// グローバルインスタンス
window.CheckoutFix = new CheckoutFix();

// 初期化
function initCheckoutFix() {
  try {
    if (window.CheckoutFix) {
      window.CheckoutFix.init();
    }
  } catch (error) {
    console.error('❌ チェックアウト修正初期化失敗:', error);
  }
}

// 複数のタイミングで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutFix);
} else {
  initCheckoutFix();
}

// 追加の初期化
window.addEventListener('load', initCheckoutFix);
setTimeout(initCheckoutFix, 1000);

// カート更新時の再初期化
document.addEventListener('shopify:cart_updated', () => {
  setTimeout(() => {
    if (window.CheckoutFix) {
      window.CheckoutFix.init();
    }
  }, 500);
});

// カートページ専用
if (window.location.pathname.includes('/cart')) {
  setTimeout(initCheckoutFix, 2000);
}

// デバッグ用関数
window.debugCheckout = () => {
  console.log('=== チェックアウト デバッグ ===');
  console.log('CheckoutFix:', window.CheckoutFix);
  console.log('カートフォーム:', document.getElementById('cart'));
  console.log('チェックアウトボタン数:', window.CheckoutFix.checkoutButtons.length);
  console.log('カート検証:', window.CheckoutFix.validateCart());
};

window.forceCheckout = () => {
  if (window.CheckoutFix) {
    window.CheckoutFix.forceCheckout();
  }
};

// 緊急時のチェックアウト復旧
window.emergencyCheckout = () => {
  console.log('🚨 緊急チェックアウト実行');
  
  // すべてのモーダルを閉じる
  document.querySelectorAll('.modal, .gift-modal').forEach(modal => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  });
  
  // スクロールを復元
  document.body.style.overflow = '';
  
  // チェックアウトページに直接移動
  window.location.href = '/checkout';
};