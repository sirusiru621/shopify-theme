/* ================================================
ファイル名: assets/featured-collection-enhanced.js
説明: スライダー操作とカート追加通知（アクセシビリティ対応・安定化）
依存: Dawn theme utils（任意）無しでもフォールバック実装
================================================ */

(function(){
  function $(sel,root){return (root||document).querySelector(sel)}
  function $all(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}

  /* ===== Trap Focus Fallback (Dawn utilsが無い場合) ===== */
  function trapFocus(el){
    if(window.trapFocus){ window.trapFocus(el); return }
    var focusable = $all('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])', el).filter(function(x){ return !x.hasAttribute('disabled') })
    if(!focusable.length) return
    function handle(e){
      if(e.key !== 'Tab') return
      var first = focusable[0], last = focusable[focusable.length-1]
      if(e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault() }
      else if(!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault() }
    }
    el.__trapHandler = handle
    el.addEventListener('keydown', handle)
    firstFocus(el)
  }
  function removeTrapFocus(el){
    if(window.removeTrapFocus){ window.removeTrapFocus(el); return }
    if(el && el.__trapHandler){ el.removeEventListener('keydown', el.__trapHandler); delete el.__trapHandler }
  }
  function firstFocus(el){
    var tgt = el.querySelector('.cart-notification__close') || el
    tgt.focus()
  }

  /* ===== Cart Notification Module ===== */
  var cartEl = $('#cart-notification')
  if(cartEl){
    var closeBtn = $('.cart-notification__close', cartEl)
    function openCartNotice(){
      cartEl.classList.add('animate','active')
      cartEl.setAttribute('aria-hidden','false')
      cartEl.addEventListener('transitionend', function onEnd(){
        cartEl.removeEventListener('transitionend', onEnd)
        cartEl.focus()
        trapFocus(cartEl)
      })
    }
    function closeCartNotice(){
      cartEl.classList.remove('active')
      cartEl.setAttribute('aria-hidden','true')
      removeTrapFocus(cartEl)
    }
    closeBtn && closeBtn.addEventListener('click', closeCartNotice)
    cartEl.addEventListener('keyup', function(e){ if(e.code==='Escape') closeCartNotice() })
    cartEl.__open = openCartNotice
    cartEl.__close = closeCartNotice
  }

  /* ===== Add-to-Cart handlers ===== */
  document.addEventListener('DOMContentLoaded', function(){
    $all('.enhanced-product-form').forEach(function(form){
      form.addEventListener('submit', function(e){
        e.preventDefault()
        var submitButton = form.querySelector('.enhanced-add-to-cart-button')
        var buttonText = submitButton && submitButton.querySelector('.enhanced-add-to-cart-text')
        var spinner = submitButton && submitButton.querySelector('.loading-overlay__spinner')
        var originalText = buttonText ? buttonText.textContent : ''
        if(submitButton){
          submitButton.setAttribute('aria-disabled','true')
          submitButton.disabled = true
        }
        if(buttonText){ buttonText.textContent = ({{ "products.product.adding_to_cart" | t | json }}) }
        if(spinner){ spinner.classList.remove('hidden') }

        var formData = new FormData(form)
        fetch((window.routes && window.routes.cart_add_url ? window.routes.cart_add_url : '/cart/add') + '.js', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin'
        }).then(function(res){ return res.json().then(function(json){ return { ok: res.ok, json: json } }) })
        .then(function(result){
          if(!result.ok){ throw new Error(result.json && (result.json.message || result.json.description) || 'Add to cart failed') }
          if(buttonText){ buttonText.textContent = ({{ "products.product.added_to_cart" | t | json }}) }

          if(cartEl){
            var card = form.closest('.enhanced-product-card') || document
            var img = card.querySelector('.enhanced-product-card__image')
            var title = card.querySelector('.enhanced-product-card__title')
            var nImg = $('.cart-notification__image', cartEl)
            var nTitle = $('.cart-notification-product__name', cartEl)
            var nQty = $('.cart-notification__quantity span', cartEl)
            if(nImg && img){ nImg.src = img.currentSrc || img.src; nImg.alt = img.alt || '' }
            if(nTitle && title){ nTitle.textContent = title.textContent || '' }
            if(nQty){ nQty.textContent = formData.get('quantity') || '1' }
            if(cartEl.__open){ cartEl.__open() }
            setTimeout(function(){ cartEl && cartEl.__close && cartEl.__close() }, 3000)
          }

          setTimeout(function(){
            if(buttonText){ buttonText.textContent = originalText }
            if(submitButton){
              submitButton.removeAttribute('aria-disabled')
              submitButton.disabled = false
            }
            if(spinner){ spinner.classList.add('hidden') }
          }, 1200)
        })
        .catch(function(err){
          console.error('Cart add error:', err)
          if(buttonText){ buttonText.textContent = 'エラーが発生しました' }
          setTimeout(function(){
            if(buttonText){ buttonText.textContent = originalText }
            if(submitButton){
              submitButton.removeAttribute('aria-disabled')
              submitButton.disabled = false
            }
            if(spinner){ spinner.classList.add('hidden') }
          }, 1500)
        })
      })
    })

    /* ===== Slider controls (per section) ===== */
    $all('.enhanced-slider__controls').forEach(function(ctrl){
      var sectionId = ctrl.getAttribute('data-section-id')
      var list = $('#EnhancedProductGrid-' + sectionId)
      if(!list) return
      var prev = $('.enhanced-slider__button--prev', ctrl)
      var next = $('.enhanced-slider__button--next', ctrl)
      var cur = $('.enhanced-slider__current', ctrl)
      var total = $('.enhanced-slider__total', ctrl)
      var slideIndex = 1
      function updateIndex(){
        if(!list || !list.children.length) return
        var scrollLeft = list.scrollLeft
        var widths = list.getBoundingClientRect().width
        slideIndex = Math.max(1, Math.min(list.children.length, Math.round(scrollLeft / (widths * 0.9)) + 1))
        if(cur){ cur.textContent = String(slideIndex) }
      }
      function scrollByPage(dir){
        var amount = list.clientWidth
        list.scrollBy({ left: dir * amount, behavior: 'smooth' })
        setTimeout(updateIndex, 300)
      }
      prev && prev.addEventListener('click', function(){ scrollByPage(-1) })
      next && next.addEventListener('click', function(){ scrollByPage(1) })
      list && list.addEventListener('scroll', function(){ window.requestAnimationFrame(updateIndex) })
      total && (total.textContent = String(list.children.length))
      updateIndex()
    })
  })
})();
