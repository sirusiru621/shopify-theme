// クロスセル商品の機能
(function() {
  'use strict';
  
  const crossSellSection = document.querySelector('.product__cross-sell');
  if (!crossSellSection) return;

  // バリエーション選択の処理
  const variantSelects = crossSellSection.querySelectorAll('.cross-sell-variant-select');
  variantSelects.forEach(select => {
    select.addEventListener('change', function() {
      const form = this.closest('.cross-sell-item').querySelector('.cross-sell-form');
      const hiddenInput = form.querySelector('.cross-sell-variant-id');
      const priceElement = this.closest('.cross-sell-item').querySelector('.cross-sell-price-current');
      
      const selectedOption = this.options[this.selectedIndex];
      hiddenInput.value = this.value;
      priceElement.textContent = selectedOption.dataset.price;
    });
  });

  // カート追加フォームの処理
  const forms = crossSellSection.querySelectorAll('[data-product-form]');
  forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });

  async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const button = form.querySelector('[data-add-to-cart]');
    const formData = new FormData(form);
    
    // ボタン状態を読み込み中に変更
    button.classList.add('loading');
    button.disabled = true;
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        // 成功時の処理
        button.classList.remove('loading');
        button.classList.add('success');
        
        // カート数を更新
        updateCartCount();
        
        // 3秒後にボタンを元に戻す
        setTimeout(() => {
          button.classList.remove('success');
          button.disabled = false;
        }, 3000);
        
      } else {
        throw new Error('カートへの追加に失敗しました');
      }
      
    } catch (error) {
      console.error('Cart add error:', error);
      
      // エラー時の処理
      button.classList.remove('loading');
      button.disabled = false;
      
      // エラーメッセージを表示（簡易版）
      const originalText = button.querySelector('.add-to-cart-text').textContent;
      button.querySelector('.add-to-cart-text').textContent = 'エラーが発生しました';
      setTimeout(() => {
        button.querySelector('.add-to-cart-text').textContent = originalText;
      }, 3000);
    }
  }

  // カート数更新
  async function updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // カート数を表示している要素を更新
      const cartCounters = document.querySelectorAll('[data-cart-count]');
      cartCounters.forEach(counter => {
        counter.textContent = cart.item_count;
      });
      
    } catch (error) {
      console.error('Cart count update error:', error);
    }
  }

})();