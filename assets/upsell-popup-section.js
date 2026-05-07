// ファイル名: upsell-popup-section.js
// アップセルポップアップ機能とカート追加処理

class UpsellPopupSection {
  constructor() {
    this.init();
  }

  init() {
    // カート追加ボタンにイベントリスナーを追加
    this.attachCartButtonListeners();
    // ポップアップイベントリスナーを設定
    this.setupPopupListeners();
  }

  /**
   * カート追加ボタンにイベントリスナーを追加
   */
  attachCartButtonListeners() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.upsell-trigger');
      if (!button) return;

      e.preventDefault();
      
      const sectionId = button.dataset.upsellSection;
      if (sectionId) {
        this.handleCartAdd(button, sectionId);
      }
    });
  }

  /**
   * カート追加処理とアップセルポップアップ表示
   */
  async handleCartAdd(button, sectionId) {
    try {
      // ローディング状態を表示
      this.setButtonLoading(button, true);

      // 商品をカートに追加
      const form = button.closest('form');
      const formData = new FormData(form);
      
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        // カート追加成功後、アップセルポップアップを表示
        this.showUpsellPopup(sectionId);
        
        // カート数量を更新（既存のカート機能と連携）
        this.updateCartCount();
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showError('商品をカートに追加できませんでした。');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  /**
   * アップセルポップアップを表示
   */
  showUpsellPopup(sectionId) {
    const popup = document.getElementById(`upsell-popup-${sectionId}`);
    const collectionData = document.getElementById(`upsell-collection-data-${sectionId}`);
    
    if (!popup || !collectionData) return;

    try {
      const data = JSON.parse(collectionData.textContent);
      this.renderUpsellProducts(sectionId, data.products);
      
      // ポップアップを表示
      popup.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // フォーカス管理
      const closeButton = popup.querySelector('.upsell-popup__close');
      if (closeButton) {
        closeButton.focus();
      }
    } catch (error) {
      console.error('Error showing upsell popup:', error);
    }
  }

  /**
   * アップセル商品をレンダリング
   */
  renderUpsellProducts(sectionId, products) {
    const container = document.getElementById('upsell-products-container');
    if (!container || !products.length) return;

    const productsHTML = products.map(product => {
      const variant = product.variants[0];
      const price = this.formatPrice(variant.price);
      
      return `
        <div class="upsell-product" data-product-id="${product.id}">
          <img 
            src="${product.featured_image}" 
            alt="${this.escapeHtml(product.title)}"
            class="upsell-product__image"
            loading="lazy"
          >
          <div class="upsell-product__info">
            <h4 class="upsell-product__title">${this.escapeHtml(product.title)}</h4>
            <p class="upsell-product__price">${price}</p>
            <div class="upsell-product__actions">
              <div class="upsell-product__quantity">
                <button 
                  type="button" 
                  class="upsell-product__quantity-btn" 
                  data-action="decrease"
                  aria-label="数量を減らす"
                >-</button>
                <input 
                  type="number" 
                  class="upsell-product__quantity-input" 
                  value="1" 
                  min="1" 
                  max="10"
                  aria-label="数量"
                >
                <button 
                  type="button" 
                  class="upsell-product__quantity-btn" 
                  data-action="increase"
                  aria-label="数量を増やす"
                >+</button>
              </div>
              <button 
                type="button" 
                class="upsell-product__add-btn"
                data-variant-id="${variant.id}"
                ${!variant.available ? 'disabled' : ''}
              >
                ${variant.available ? 'カートに追加' : '売り切れ'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="upsell-products">${productsHTML}</div>`;
    
    // 数量調整とカート追加のイベントリスナーを追加
    this.attachUpsellProductListeners(container);
  }

  /**
   * アップセル商品のイベントリスナーを設定
   */
  attachUpsellProductListeners(container) {
    // 数量調整ボタン
    container.addEventListener('click', (e) => {
      if (e.target.matches('.upsell-product__quantity-btn')) {
        this.handleQuantityChange(e.target);
      }
      
      // カート追加ボタン
      if (e.target.matches('.upsell-product__add-btn')) {
        this.handleUpsellAddToCart(e.target);
      }
    });

    // 数量入力フィールド
    container.addEventListener('input', (e) => {
      if (e.target.matches('.upsell-product__quantity-input')) {
        this.validateQuantityInput(e.target);
      }
    });
  }

  /**
   * 数量変更処理
   */
  handleQuantityChange(button) {
    const action = button.dataset.action;
    const quantityInput = button.parentElement.querySelector('.upsell-product__quantity-input');
    let currentValue = parseInt(quantityInput.value) || 1;

    if (action === 'increase' && currentValue < 10) {
      currentValue++;
    } else if (action === 'decrease' && currentValue > 1) {
      currentValue--;
    }

    quantityInput.value = currentValue;
  }

  /**
   * 数量入力の検証
   */
  validateQuantityInput(input) {
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(10, value));
    input.value = value;
  }

  /**
   * アップセル商品をカートに追加
   */
  async handleUpsellAddToCart(button) {
    if (button.disabled) return;

    try {
      this.setButtonLoading(button, true);

      const variantId = button.dataset.variantId;
      const quantityInput = button.parentElement.querySelector('.upsell-product__quantity-input');
      const quantity = parseInt(quantityInput.value) || 1;

      const formData = new FormData();
      formData.append('id', variantId);
      formData.append('quantity', quantity);

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        // 成功メッセージを表示
        this.showSuccess('商品をカートに追加しました！');
        this.updateCartCount();
        
        // ボタンを一時的に無効化
        button.textContent = '追加済み';
        button.disabled = true;
        
        setTimeout(() => {
          button.textContent = 'カートに追加';
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
    } catch (error) {
      console.error('Error adding upsell product to cart:', error);
      this.showError('商品をカートに追加できませんでした。');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  /**
   * ポップアップのイベントリスナーを設定
   */
  setupPopupListeners() {
    document.addEventListener('click', (e) => {
      // 閉じるボタンまたはオーバーレイクリックで閉じる
      if (e.target.matches('.upsell-popup__close') || e.target.matches('.upsell-popup__overlay')) {
        this.closeUpsellPopup(e.target);
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openPopup = document.querySelector('.upsell-popup[style*="display: flex"]');
        if (openPopup) {
          this.closeUpsellPopup(openPopup);
        }
      }
    });
  }

  /**
   * ポップアップを閉じる
   */
  closeUpsellPopup(element) {
    const popup = element.closest('.upsell-popup') || element;
    popup.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
   * ボタンのローディング状態を設定
   */
  setButtonLoading(button, isLoading) {
    const spinner = button.querySelector('.loading-overlay__spinner');
    const text = button.querySelector('span');

    if (isLoading) {
      button.disabled = true;
      if (spinner) spinner.classList.remove('hidden');
      if (text) text.style.opacity = '0.5';
    } else {
      button.disabled = false;
      if (spinner) spinner.classList.add('hidden');
      if (text) text.style.opacity = '1';
    }
  }

  /**
   * カート数量を更新
   */
  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // カート数量表示要素を更新
      const cartCountElements = document.querySelectorAll('[data-cart-count]');
      cartCountElements.forEach(element => {
        element.textContent = cart.item_count;
      });

      // カスタムイベントを発火（他のスクリプトとの連携用）
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { cart }
      }));
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  /**
   * 価格をフォーマット
   */
  formatPrice(price) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price / 100);
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 成功メッセージを表示
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * エラーメッセージを表示
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * 通知を表示
   */
  showNotification(message, type = 'info') {
    // 既存の通知システムがある場合はそれを使用
    // なければシンプルなトースト通知を作成
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  new UpsellPopupSection();
});

// 必要なCSSアニメーションを動的に追加
const style = document.createElement('style');
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
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
