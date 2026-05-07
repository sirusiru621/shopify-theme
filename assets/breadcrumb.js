// ファイル名: breadcrumb.js
// パンくずリストセクション機能 - ES6準拠、jQuery非依存
// アクセシビリティとアニメーション機能実装

/**
 * パンくずリストクラス
 * - スクロールアニメーション
 * - キーボードナビゲーション
 * - アクセシビリティ対応
 * - パフォーマンス最適化
 */
class BreadcrumbNavigation {
  constructor() {
    this.breadcrumbSections = document.querySelectorAll('.breadcrumb-section');
    this.observers = new Map();
    this.animationFrameId = null;
    
    // 初期化
    this.init();
  }

  /**
   * 初期化メソッド
   */
  init() {
    if (this.breadcrumbSections.length === 0) {
      return;
    }

    // DOM読み込み完了後に実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupBreadcrumbs();
      });
    } else {
      this.setupBreadcrumbs();
    }
  }

  /**
   * パンくずリストのセットアップ
   */
  setupBreadcrumbs() {
    this.breadcrumbSections.forEach((section, index) => {
      // アニメーション設定
      this.setupScrollAnimation(section);
      
      // キーボードナビゲーション
      this.setupKeyboardNavigation(section);
      
      // アクセシビリティ属性の強化
      this.enhanceAccessibility(section);
      
      // モバイル対応
      this.setupMobileOptimizations(section);
      
      // パフォーマンス監視
      this.setupPerformanceMonitoring(section, index);
    });

    // リサイズ対応
    this.setupResponsiveHandling();
    
    // ページ変更時の対応
    this.setupPageChangeHandling();
  }

  /**
   * スクロールアニメーションの設定
   * @param {Element} section - パンくずリストセクション
   */
  setupScrollAnimation(section) {
    // アニメーションが無効の場合はスキップ
    if (!section.hasAttribute('data-animation')) {
      return;
    }

    // モーション軽減設定をチェック
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      section.classList.add('animate');
      return;
    }

    // Intersection Observer でのアニメーション
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // パフォーマンス考慮でrAFを使用
            this.animationFrameId = requestAnimationFrame(() => {
              entry.target.classList.add('animate');
            });
            
            // 一度アニメーションしたら監視を停止
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -20px 0px'
      }
    );

    observer.observe(section);
    this.observers.set(section, observer);
  }

  /**
   * キーボードナビゲーションの設定
   * @param {Element} section - パンくずリストセクション
   */
  setupKeyboardNavigation(section) {
    const links = section.querySelectorAll('.breadcrumb-link');
    
    links.forEach((link, index) => {
      // Enterキーとスペースキーでの操作
      link.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            link.click();
            break;
            
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            this.focusNextLink(links, index);
            break;
            
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            this.focusPreviousLink(links, index);
            break;
            
          case 'Home':
            event.preventDefault();
            this.focusFirstLink(links);
            break;
            
          case 'End':
            event.preventDefault();
            this.focusLastLink(links);
            break;
        }
      });

      // フォーカス表示の改善
      link.addEventListener('focus', (event) => {
        this.announceToScreenReader(event.target);
      });
    });
  }

  /**
   * 次のリンクにフォーカス
   * @param {NodeList} links - リンク要素のリスト
   * @param {number} currentIndex - 現在のインデックス
   */
  focusNextLink(links, currentIndex) {
    const nextIndex = (currentIndex + 1) % links.length;
    links[nextIndex].focus();
  }

  /**
   * 前のリンクにフォーカス
   * @param {NodeList} links - リンク要素のリスト
   * @param {number} currentIndex - 現在のインデックス
   */
  focusPreviousLink(links, currentIndex) {
    const prevIndex = currentIndex === 0 ? links.length - 1 : currentIndex - 1;
    links[prevIndex].focus();
  }

  /**
   * 最初のリンクにフォーカス
   * @param {NodeList} links - リンク要素のリスト
   */
  focusFirstLink(links) {
    if (links.length > 0) {
      links[0].focus();
    }
  }

  /**
   * 最後のリンクにフォーカス
   * @param {NodeList} links - リンク要素のリスト
   */
  focusLastLink(links) {
    if (links.length > 0) {
      links[links.length - 1].focus();
    }
  }

  /**
   * アクセシビリティの強化
   * @param {Element} section - パンくずリストセクション
   */
  enhanceAccessibility(section) {
    // ARIA属性の設定
    section.setAttribute('role', 'navigation');
    section.setAttribute('aria-label', 'パンくずナビゲーション');

    // 現在のページ要素にaria-current属性を追加
    const currentPageItem = section.querySelector('.breadcrumb-current');
    if (currentPageItem) {
      currentPageItem.setAttribute('aria-current', 'page');
    }

    // リンクにaria-label属性を追加
    const links = section.querySelectorAll('.breadcrumb-link');
    links.forEach((link) => {
      const textContent = link.textContent.trim();
      if (textContent) {
        link.setAttribute('aria-label', `${textContent}に移動`);
      }
    });

    // セパレーターをスクリーンリーダーから隠す
    const separators = section.querySelectorAll('.breadcrumb-separator-wrapper');
    separators.forEach((separator) => {
      separator.setAttribute('aria-hidden', 'true');
    });

    // 最後の項目の後のセパレーターを非表示（JavaScript による確実な対応）
    this.hideLastSeparator(section);
  }

  /**
   * 最後の項目の後のセパレーターを非表示
   * @param {Element} section - パンくずリストセクション
   */
  hideLastSeparator(section) {
    const breadcrumbItems = section.querySelectorAll('.breadcrumb-item');
    if (breadcrumbItems.length > 0) {
      const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
      
      // 最後の項目内のセパレーターを非表示
      const separatorInLastItem = lastItem.querySelector('.breadcrumb-separator-wrapper');
      if (separatorInLastItem) {
        separatorInLastItem.style.display = 'none';
      }

      // 最後の項目の直後のセパレーターを非表示
      const nextSeparator = lastItem.nextElementSibling;
      if (nextSeparator && nextSeparator.classList.contains('breadcrumb-separator-wrapper')) {
        nextSeparator.style.display = 'none';
      }
    }
  }

  /**
   * スクリーンリーダーへのアナウンス
   * @param {Element} element - フォーカスされた要素
   */
  announceToScreenReader(element) {
    const textContent = element.textContent.trim();
    const announcement = `パンくずリスト: ${textContent}`;
    
    // ライブリージョンでアナウンス
    const liveRegion = this.getOrCreateLiveRegion();
    liveRegion.textContent = announcement;
    
    // 短時間後にクリア
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * ライブリージョンの取得または作成
   * @returns {Element} ライブリージョン要素
   */
  getOrCreateLiveRegion() {
    let liveRegion = document.getElementById('breadcrumb-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'breadcrumb-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    
    return liveRegion;
  }

  /**
   * モバイル最適化の設定
   * @param {Element} section - パンくずリストセクション
   */
  setupMobileOptimizations(section) {
    const breadcrumbList = section.querySelector('.breadcrumb-list');
    if (!breadcrumbList) return;

    // タッチデバイスでのスクロール改善
    let isScrolling = false;
    
    breadcrumbList.addEventListener('touchstart', () => {
      isScrolling = true;
    }, { passive: true });
    
    breadcrumbList.addEventListener('touchend', () => {
      setTimeout(() => {
        isScrolling = false;
      }, 100);
    }, { passive: true });

    // モバイルでのホバー対応
    const links = section.querySelectorAll('.breadcrumb-link');
    links.forEach((link) => {
      link.addEventListener('touchstart', function() {
        if (!isScrolling) {
          this.classList.add('touch-hover');
        }
      }, { passive: true });
      
      link.addEventListener('touchend', function() {
        setTimeout(() => {
          this.classList.remove('touch-hover');
        }, 150);
      }, { passive: true });
    });
  }

  /**
   * レスポンシブ対応の設定
   */
  setupResponsiveHandling() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 250);
    }, { passive: true });
  }

  /**
   * リサイズ処理
   */
  handleResize() {
    this.breadcrumbSections.forEach((section) => {
      const breadcrumbList = section.querySelector('.breadcrumb-list');
      if (!breadcrumbList) return;

      // モバイルでのテキスト省略調整
      if (window.innerWidth <= 768) {
        this.adjustMobileTextTruncation(section);
      }
    });
  }

  /**
   * モバイルでのテキスト省略調整
   * @param {Element} section - パンくずリストセクション
   */
  adjustMobileTextTruncation(section) {
    const textElements = section.querySelectorAll('.breadcrumb-text');
    const containerWidth = section.offsetWidth;
    const maxTextWidth = Math.floor(containerWidth / textElements.length * 0.7);
    
    textElements.forEach((textEl) => {
      textEl.style.maxWidth = `${maxTextWidth}px`;
    });
  }

  /**
   * ページ変更時の処理設定
   */
  setupPageChangeHandling() {
    // History API による SPA ナビゲーション対応
    window.addEventListener('popstate', () => {
      this.updateBreadcrumbsForSPA();
    });

    // Shopify の AJAX ナビゲーション対応
    document.addEventListener('shopify:section:load', (event) => {
      if (event.detail.sectionId.includes('breadcrumb')) {
        this.handleSectionReload(event.target);
      }
    });
  }

  /**
   * SPA用パンくずリスト更新
   */
  updateBreadcrumbsForSPA() {
    // SPAでページが変わった際の処理
    // 実装はサイトの要件に応じて調整
    setTimeout(() => {
      this.setupBreadcrumbs();
    }, 100);
  }

  /**
   * セクションリロード処理
   * @param {Element} newSection - 新しいセクション要素
   */
  handleSectionReload(newSection) {
    if (newSection && newSection.classList.contains('breadcrumb-section')) {
      this.setupBreadcrumbs();
    }
  }

  /**
   * パフォーマンス監視の設定
   * @param {Element} section - パンくずリストセクション
   * @param {number} index - セクションインデックス
   */
  setupPerformanceMonitoring(section, index) {
    // Performance Observer でレンダリング性能を監視
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('breadcrumb') && entry.duration > 16) {
            console.warn(`Breadcrumb section ${index} rendering took ${entry.duration}ms`);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        // Performance Observer がサポートされていない場合は無視
      }
    }
  }

  /**
   * リソースのクリーンアップ
   */
  destroy() {
    // Intersection Observer のクリーンアップ
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();

    // Animation Frame のキャンセル
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // イベントリスナーの削除
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('popstate', this.updateBreadcrumbsForSPA);
  }
}

/**
 * パフォーマンス測定用ユーティリティ
 */
class BreadcrumbPerformance {
  static mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`breadcrumb-${name}`);
    }
  }

  static measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(
          `breadcrumb-${name}`,
          `breadcrumb-${startMark}`,
          `breadcrumb-${endMark}`
        );
      } catch (e) {
        // measurement failed
      }
    }
  }
}

/**
 * 初期化とエラーハンドリング
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    BreadcrumbPerformance.mark('init-start');
    
    // メインクラスのインスタンス化
    window.breadcrumbNavigation = new BreadcrumbNavigation();
    
    BreadcrumbPerformance.mark('init-end');
    BreadcrumbPerformance.measure('initialization', 'init-start', 'init-end');
    
  } catch (error) {
    console.error('Breadcrumb navigation initialization failed:', error);
    
    // フォールバック: 基本的なアクセシビリティ属性のみ設定
    const sections = document.querySelectorAll('.breadcrumb-section');
    sections.forEach((section) => {
      section.setAttribute('role', 'navigation');
      section.setAttribute('aria-label', 'パンくずナビゲーション');
    });
  }
});

/**
 * ページアンロード時のクリーンアップ
 */
window.addEventListener('beforeunload', () => {
  if (window.breadcrumbNavigation) {
    window.breadcrumbNavigation.destroy();
  }
});

/**
 * Shopify セクション設定エディター用
 * Theme Inspector for Chrome などでの開発支援
 */
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:select', (event) => {
    const section = event.target;
    if (section && section.classList.contains('breadcrumb-section')) {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}