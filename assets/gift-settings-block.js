// gift-settings-block 修正版JavaScript - 干渉問題とサンプル画像の修正

document.addEventListener('DOMContentLoaded', function() {
  console.log('ギフト設定ブロック初期化開始');
  
  var giftBlocks = document.querySelectorAll('.gift-settings-block');
  console.log('見つかったギフトブロック数:', giftBlocks.length);
  
  giftBlocks.forEach(function(block, index) {
    console.log('ブロック ' + (index + 1) + ' を処理中');
    
    var blockId = block.dataset.blockId;
    var trigger = block.querySelector('[data-gift-trigger]');
    var panel = block.querySelector('[data-gift-panel]');
    
    if (!trigger || !panel) {
      console.error('基本要素が見つかりません - trigger:', !!trigger, 'panel:', !!panel);
      return;
    }
    
    console.log('基本要素が見つかりました');
    
    // 干渉を防ぐために独自の状態管理を追加
    var isGiftPanelOpen = false;
    
    // 基本的なタブ開閉機能（干渉防止対策付き）
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation(); // イベントの伝播を防ぐ
      console.log('トリガーがクリックされました');
      
      try {
        // 他のパネルが開いていても強制的に操作する
        if (isGiftPanelOpen) {
          // 閉じる
          panel.style.display = 'none';
          panel.classList.remove('is-open');
          trigger.classList.remove('is-active');
          trigger.setAttribute('aria-expanded', 'false');
          isGiftPanelOpen = false;
          console.log('パネルを閉じました');
        } else {
          // 開く（他の干渉する要素を一時的に無効化）
          temporarilyDisableInterference();
          
          panel.style.display = 'block';
          panel.classList.add('is-open');
          trigger.classList.add('is-active');
          trigger.setAttribute('aria-expanded', 'true');
          isGiftPanelOpen = true;
          console.log('パネルを開きました');
          
          // パネルを開いた時に追加機能を実行
          setTimeout(function() {
            initializeGiftFeatures(block, blockId);
          }, 100);
          
          // 3秒後に干渉防止を解除
          setTimeout(function() {
            restoreInterference();
          }, 3000);
        }
      } catch (error) {
        console.error('タブ開閉エラー:', error);
      }
    });
    
    // 干渉要素の一時的な無効化
    function temporarilyDisableInterference() {
      try {
        // 配送オプションのボタンを一時的に無効化
        var methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(function(btn) {
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.7';
        });
        
        // カート追加ボタンも一時的に無効化
        var addToCartBtn = document.querySelector('[name="add"]');
        if (addToCartBtn) {
          addToCartBtn.style.pointerEvents = 'none';
        }
        
        console.log('干渉要素を一時的に無効化しました');
      } catch (error) {
        console.warn('干渉防止処理でエラー:', error);
      }
    }
    
    // 干渉防止の解除
    function restoreInterference() {
      try {
        var methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(function(btn) {
          btn.style.pointerEvents = '';
          btn.style.opacity = '';
        });
        
        var addToCartBtn = document.querySelector('[name="add"]');
        if (addToCartBtn) {
          addToCartBtn.style.pointerEvents = '';
        }
        
        console.log('干渉防止を解除しました');
      } catch (error) {
        console.warn('干渉防止解除でエラー:', error);
      }
    }
    
    console.log('ブロック ' + (index + 1) + ' の初期化完了');
  });
  
  // ギフト機能の初期化（パネルが開かれた時に実行）
  function initializeGiftFeatures(block, blockId) {
    console.log('ギフト機能を初期化中:', blockId);
    
    try {
      var configScript = document.getElementById('gift-block-data-' + blockId);
      var config = null;
      
      if (configScript) {
        try {
          config = JSON.parse(configScript.textContent);
        } catch (e) {
          console.error('設定解析エラー:', e);
        }
      }
      
      // DOM要素の取得
      var quantitySelect = block.querySelector('[data-gift-quantity]');
      var purposeSelect = block.querySelector('[data-gift-purpose]');
      var sampleImage = block.querySelector('[data-sample-image]');
      var samplePlaceholder = block.querySelector('[data-sample-placeholder]');
      var addresseeInput = block.querySelector('[data-gift-addressee]');
      var charCountSpan = block.querySelector('[data-char-count]');
      var confirmBtn = block.querySelector('[data-gift-confirm]');
      var cancelBtn = block.querySelector('[data-gift-cancel]');
      
      // 数量選択肢の生成
      if (quantitySelect) {
        console.log('数量選択肢を更新中');
        
        // 既存のオプションをクリア（最初のプレースホルダー以外）
        while (quantitySelect.children.length > 1) {
          quantitySelect.removeChild(quantitySelect.lastChild);
        }
        
        var maxQuantity = 10;
        if (config && config.maxQuantity) {
          maxQuantity = config.maxQuantity;
        }
        if (config && config.inventory && config.inventory > 0) {
          maxQuantity = Math.min(maxQuantity, config.inventory);
        }
        
        for (var i = 1; i <= maxQuantity; i++) {
          var option = document.createElement('option');
          option.value = i;
          option.textContent = i + '個';
          quantitySelect.appendChild(option);
        }
        
        console.log('数量選択肢を更新しました。最大:', maxQuantity);
      }
      
      // サンプル画像表示機能の改良（固定画像表示）
      if (purposeSelect && sampleImage && samplePlaceholder) {
        console.log('画像プレビュー機能を設定中');
        
        // 固定のサンプル画像URL（カスタマイズ画面でアップロードされた画像）
        var fixedSampleImageUrl = null;
        
        // 設定から固定サンプル画像を取得（最初に見つかった画像を使用）
        if (config && config.purposeSampleImages) {
          var imageUrls = Object.values(config.purposeSampleImages);
          for (var i = 0; i < imageUrls.length; i++) {
            if (imageUrls[i] && imageUrls[i] !== 'null' && imageUrls[i] !== '') {
              fixedSampleImageUrl = imageUrls[i];
              break;
            }
          }
        }
        
        // 熨斗種類選択時に固定画像を表示
        function showFixedSampleImage() {
          if (fixedSampleImageUrl) {
            sampleImage.src = fixedSampleImageUrl;
            sampleImage.alt = '熨斗のサンプル画像';
            sampleImage.style.display = 'block';
            samplePlaceholder.style.display = 'none';
            console.log('固定サンプル画像を表示:', fixedSampleImageUrl);
            
            sampleImage.onerror = function() {
              console.warn('画像読み込み失敗:', fixedSampleImageUrl);
              sampleImage.style.display = 'none';
              samplePlaceholder.style.display = 'block';
              samplePlaceholder.textContent = 'サンプル画像の読み込みに失敗しました';
            };
          } else {
            sampleImage.style.display = 'none';
            samplePlaceholder.style.display = 'block';
            samplePlaceholder.textContent = 'サンプル画像が設定されていません';
          }
        }
        
        // パネルを開いた時点で固定画像を表示
        if (fixedSampleImageUrl) {
          setTimeout(function() {
            showFixedSampleImage();
          }, 200);
        }
        
        // 既存のリスナーを削除（重複防止）
        var newPurposeSelect = purposeSelect.cloneNode(true);
        purposeSelect.parentNode.replaceChild(newPurposeSelect, purposeSelect);
        purposeSelect = newPurposeSelect;
        
        purposeSelect.addEventListener('change', function() {
          var selectedPurpose = this.value;
          console.log('熨斗種類が選択されました:', selectedPurpose);
          
          if (selectedPurpose) {
            // 種類が選択されたら固定画像を表示
            showFixedSampleImage();
          } else {
            // 選択解除時はプレースホルダーを表示
            sampleImage.style.display = 'none';
            samplePlaceholder.style.display = 'block';
            samplePlaceholder.textContent = '熨斗の種類を選択すると、こちらにサンプル画像が表示されます';
          }
          
          updateConfirmButton();
        });
      }
      
      // 文字数カウント機能
      if (addresseeInput && charCountSpan) {
        console.log('文字数カウント機能を設定');
        
        var updateCharCount = function() {
          var currentLength = addresseeInput.value.length;
          var maxLength = (config && config.addresseeMaxLength) || 20;
          charCountSpan.textContent = currentLength;
          
          if (currentLength > maxLength * 0.8) {
            charCountSpan.style.color = '#ff6b6b';
          } else {
            charCountSpan.style.color = '#666';
          }
        };
        
        addresseeInput.addEventListener('input', updateCharCount);
        updateCharCount(); // 初期化
      }
      
      // 確定ボタンの状態更新
      function updateConfirmButton() {
        if (!confirmBtn) return;
        
        var isValid = quantitySelect && quantitySelect.value && 
                      purposeSelect && purposeSelect.value;
        
        confirmBtn.disabled = !isValid;
        if (isValid) {
          confirmBtn.classList.remove('disabled');
          confirmBtn.style.opacity = '1';
          confirmBtn.style.cursor = 'pointer';
        } else {
          confirmBtn.classList.add('disabled');
          confirmBtn.style.opacity = '0.6';
          confirmBtn.style.cursor = 'not-allowed';
        }
      }
      
      // 数量選択の変更監視
      if (quantitySelect) {
        quantitySelect.addEventListener('change', updateConfirmButton);
      }
      
      // 確定ボタンの処理
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation(); // 干渉防止
          
          if (this.disabled) return;
          
          var giftData = {
            quantity: quantitySelect ? quantitySelect.value : '',
            purpose: purposeSelect ? purposeSelect.value : '',
            addressee: addresseeInput ? addresseeInput.value : ''
          };
          
          console.log('ギフト設定データ:', giftData);
          
          if (!giftData.quantity || !giftData.purpose) {
            alert('数量と熨斗の種類を選択してください');
            return;
          }
          
          // 商品フォームに設定を追加
          var productForm = document.querySelector('form[action*="/cart/add"]');
          if (productForm) {
            // 既存のギフト設定フィールドを削除
            var existingFields = productForm.querySelectorAll('input[name*="熨斗設定"]');
            existingFields.forEach(function(field) {
              field.remove();
            });
            
            // 新しいフィールドを追加
            var fields = [
              { name: '熨斗設定_数量', value: giftData.quantity },
              { name: '熨斗設定_種類', value: giftData.purpose }
            ];
            
            if (giftData.addressee) {
              fields.push({ name: '熨斗設定_宛名書き', value: giftData.addressee });
            }
            
            fields.forEach(function(fieldData) {
              var field = document.createElement('input');
              field.type = 'hidden';
              field.name = 'properties[' + fieldData.name + ']';
              field.value = fieldData.value;
              productForm.appendChild(field);
            });
          }
          
          // パネルを閉じる
          var panel = block.querySelector('[data-gift-panel]');
          var trigger = block.querySelector('[data-gift-trigger]');
          
          if (panel && trigger) {
            panel.style.display = 'none';
            panel.classList.remove('is-open');
            trigger.classList.remove('is-active');
            trigger.setAttribute('aria-expanded', 'false');
            
            // ボタンテキストを更新
            var btnText = trigger.querySelector('.gift-btn-text');
            if (btnText) {
              btnText.textContent = '熨斗設定済み - 変更する場合はこちら';
            }
          }
          
          // 干渉防止を解除
          setTimeout(function() {
            var methodBtns = document.querySelectorAll('.method-btn');
            methodBtns.forEach(function(btn) {
              btn.style.pointerEvents = '';
              btn.style.opacity = '';
            });
          }, 500);
          
          console.log('熨斗設定が完了しました');
          alert('熨斗の設定が完了しました');
        });
      }
      
      // キャンセルボタンの処理
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation(); // 干渉防止
          
          var panel = block.querySelector('[data-gift-panel]');
          var trigger = block.querySelector('[data-gift-trigger]');
          
          if (panel && trigger) {
            panel.style.display = 'none';
            panel.classList.remove('is-open');
            trigger.classList.remove('is-active');
            trigger.setAttribute('aria-expanded', 'false');
          }
          
          // 干渉防止を解除
          setTimeout(function() {
            var methodBtns = document.querySelectorAll('.method-btn');
            methodBtns.forEach(function(btn) {
              btn.style.pointerEvents = '';
              btn.style.opacity = '';
            });
          }, 500);
          
          console.log('ギフト設定をキャンセルしました');
        });
      }
      
      // 初期状態の設定
      updateConfirmButton();
      
    } catch (error) {
      console.error('ギフト機能初期化エラー:', error);
    }
  }
  
  console.log('ギフト設定ブロック初期化完了');
});

// 緊急フォールバック（5秒後）
setTimeout(function() {
  console.log('緊急フォールバック実行中');
  
  var triggers = document.querySelectorAll('[data-gift-trigger]');
  triggers.forEach(function(trigger) {
    if (!trigger.hasAttribute('data-emergency-bound')) {
      trigger.setAttribute('data-emergency-bound', 'true');
      
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('緊急フォールバック: トリガークリック');
        
        var panel = this.closest('.gift-settings-block').querySelector('[data-gift-panel]');
        if (panel) {
          var isOpen = panel.style.display === 'block';
          
          if (isOpen) {
            panel.style.display = 'none';
            this.classList.remove('is-active');
          } else {
            panel.style.display = 'block';
            this.classList.add('is-active');
          }
        }
      });
    }
  });
}, 5000);panel.style.display = 'none';
            this.classList.remove('is-active');
          } else {
            panel.style.display = 'block';
            this.classList.add('is-active');
          }
        }
      });
    }
  });
}, 5000);