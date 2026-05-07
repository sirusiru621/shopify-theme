// ファイル名: inventory-delivery-options.js
// 在庫連動配送オプション JavaScript（ES6準拠・jQuery非依存）
// 機能: リアルタイム在庫管理・日程制御・カート連携・完売期間対応

(function() {
  'use strict';
  
  // =============================================================================
  // グローバル変数とコンフィグ
  // =============================================================================
  
  let selectedMethod = null;
  let selectedDate = null;
  let currentInventory = 0;
  let inventoryCheckTimer = null;
  let dateAllocations = {};
  let reservedInventory = {};
  let specialDates = {};
  let isSelectionComplete = false;
  
  // 設定データ取得（Liquidから渡される）
  const config = window.inventoryLinkedConfig || {};
  const inventorySettings = config.inventorySettings || {};
  const displaySettings = config.displaySettings || {};
  const designSettings = config.designSettings || {};
  const storeSettings = config.storeSettings || {};
  const messages = config.messages || {};
  
  // DOM要素キャッシュ
  const dom = {
    methodBtns: null,
    dateSelectionArea: null,
    dateOptions: null,
    selectionInfo: null,
    addToCartBtn: null,
    totalInventorySpan: null,
    inventoryStatus: null,
    lowStockWarning: null,
    lastInventoryUpdate: null,
    selectionRequiredWarning: null,
    currentDateSpan: null,
    currentTimeSpan: null,
    pickupOptionsList: null,
    deliveryOptionsList: null,
    refreshOptionsBtn: null
  };
  
  // =============================================================================
  // 初期化とセットアップ
  // =============================================================================
  
  function initializeSystem() {
    // DOM要素取得
    cacheDOMElements();
    
    // 初期データ設定
    currentInventory = config.productInventory || 0;
    
    // 商品個別設定の読み込み
    loadProductSettings();
    
    // 特別日程データの解析
    loadSpecialDates();
    
    // コンポーネント初期化
    const cartController = new CartController();
    const inventoryManager = new InventoryManager();
    const debugDisplay = new DebugDisplay();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 在庫チェック開始
    inventoryManager.startInventoryCheck();
    
    // 初期表示更新
    inventoryManager.updateInventoryDisplay();
    cartController.updateCartButtonState();
    
    // レスポンシブ対応適用
    applyResponsiveStyles();
    
    // IntersectionObserver設定（スクロールアニメーション）
    setupScrollAnimations();
    
    console.log('在庫連動配送オプションシステム初期化完了');
  }
  
  function cacheDOMElements() {
    dom.methodBtns = document.querySelectorAll('.method-btn');
    dom.dateSelectionArea = document.querySelector('.date-selection-area');
    dom.dateOptions = document.getElementById('dateOptions');
    dom.selectionInfo = document.getElementById('selectionInfo');
    dom.addToCartBtn = document.querySelector('[name="add"]');
    dom.totalInventorySpan = document.getElementById('totalInventory');
    dom.inventoryStatus = document.getElementById('inventoryStatus');
    dom.lowStockWarning = document.getElementById('lowStockWarning');
    dom.lastInventoryUpdate = document.getElementById('lastInventoryUpdate');
    dom.selectionRequiredWarning = document.getElementById('selectionRequiredWarning');
    dom.currentDateSpan = document.getElementById('currentDate');
    dom.currentTimeSpan = document.getElementById('currentTime');
    dom.pickupOptionsList = document.getElementById('pickupOptionsList');
    dom.deliveryOptionsList = document.getElementById('deliveryOptionsList');
    dom.refreshOptionsBtn = document.getElementById('refreshOptionsBtn');
  }
  
  function loadProductSettings() {
    try {
      const productSettings = config.productSettings || {};
      dateAllocations = {
        pickup: parseJSONSafely(productSettings.pickupAllocatedInventory, {}),
        delivery: parseJSONSafely(productSettings.deliveryAllocatedInventory, {})
      };
      reservedInventory = parseJSONSafely(productSettings.reservedInventory, {});
    } catch (e) {
      console.warn('商品設定の解析に失敗しました:', e);
      dateAllocations = { pickup: {}, delivery: {} };
      reservedInventory = {};
    }
  }
  
  function loadSpecialDates() {
    try {
      specialDates = {
        pickup: parseJSONSafely(config.specialDates.pickup, {}),
        delivery: parseJSONSafely(config.specialDates.delivery, {})
      };
    } catch (e) {
      console.warn('特別日程設定の解析に失敗しました:', e);
      specialDates = { pickup: {}, delivery: {} };
    }
  }
  
  function parseJSONSafely(data, fallback) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return fallback;
      }
    }
    return data || fallback;
  }
  
  // =============================================================================
  // カート制御クラス
  // =============================================================================
  
  class CartController {
    constructor() {
      this.originalAddToCartHandler = null;
      this.setupCartControl();
    }
    
    setupCartControl() {
      if (dom.addToCartBtn) {
        dom.addToCartBtn.addEventListener('click', (e) => {
          if (!this.validateSelection()) {
            e.preventDefault();
            e.stopPropagation();
            this.showSelectionWarning();
            return false;
          }
          
          this.hideSelectionWarning();
          return true;
        });
        
        const productForm = dom.addToCartBtn.closest('form');
        if (productForm) {
          productForm.addEventListener('submit', (e) => {
            if (!this.validateSelection()) {
              e.preventDefault();
              this.showSelectionWarning();
              return false;
            }
            return true;
          });
        }
      }
    }
    
    validateSelection() {
      return selectedMethod && selectedDate && isSelectionComplete;
    }
    
    showSelectionWarning() {
      if (dom.selectionRequiredWarning) {
        dom.selectionRequiredWarning.style.display = 'block';
        dom.selectionRequiredWarning.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        setTimeout(() => {
          this.hideSelectionWarning();
        }, 4000);
      }
    }
    
    hideSelectionWarning() {
      if (dom.selectionRequiredWarning) {
        dom.selectionRequiredWarning.style.display = 'none';
      }
    }
    
    updateSelectionStatus(complete) {
      isSelectionComplete = complete;
      this.updateCartButtonState();
    }
    
    updateCartButtonState() {
      if (!dom.addToCartBtn) return;
      
      const isValid = this.validateSelection();
      const hasInventory = currentInventory > 0;
      
      if (!hasInventory) {
        dom.addToCartBtn.textContent = messages.outOfStock || '在庫切れ';
        dom.addToCartBtn.style.backgroundColor = '#6c757d';
        dom.addToCartBtn.style.cursor = 'not-allowed';
        dom.addToCartBtn.style.opacity = '0.7';
        dom.addToCartBtn.disabled = true;
      } else if (!isValid) {
        dom.addToCartBtn.textContent = messages.selectDateTime || '日時を選択してください';
        dom.addToCartBtn.style.backgroundColor = '#6c757d';
        dom.addToCartBtn.style.cursor = 'not-allowed';
        dom.addToCartBtn.style.opacity = '0.7';
        dom.addToCartBtn.disabled = false;
      } else {
        dom.addToCartBtn.textContent = messages.addToCart || 'カートに追加';
        dom.addToCartBtn.style.backgroundColor = designSettings.accentColor || '#007c89';
        dom.addToCartBtn.style.cursor = 'pointer';
        dom.addToCartBtn.style.opacity = '1';
        dom.addToCartBtn.disabled = false;
      }
    }
  }
  
  // =============================================================================
  // 在庫管理クラス（完売期間対応強化版）
  // =============================================================================
  
  class InventoryManager {
    constructor() {
      this.lastCheck = Date.now();
      this.isChecking = false;
    }
    
    startInventoryCheck() {
      if (inventoryCheckTimer) {
        clearInterval(inventoryCheckTimer);
      }
      
      inventoryCheckTimer = setInterval(() => {
        this.checkInventoryUpdate();
      }, inventorySettings.checkInterval * 1000);
      
      this.checkInventoryUpdate();
    }
    
    async checkInventoryUpdate() {
      if (this.isChecking) return;
      this.isChecking = true;
      
      try {
        const response = await fetch(`/products/${config.productId}.js`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const productData = await response.json();
        const currentVariant = productData.variants.find(v => v.id === config.variantId);
        
        if (currentVariant && typeof currentVariant.inventory_quantity === 'number') {
          const newInventory = currentVariant.inventory_quantity;
          
          if (newInventory !== currentInventory) {
            currentInventory = newInventory;
            this.updateInventoryDisplay();
            
            if (selectedMethod) {
              updateDateOptions();
            }
            
            window.cartController?.updateCartButtonState();
          }
        }
        
        this.lastCheck = Date.now();
        if (dom.lastInventoryUpdate) {
          dom.lastInventoryUpdate.textContent = new Date().toLocaleTimeString('ja-JP');
        }
        
      } catch (error) {
        console.error('在庫チェックエラー:', error);
        if (dom.lastInventoryUpdate) {
          dom.lastInventoryUpdate.textContent = 'エラー';
        }
      } finally {
        this.isChecking = false;
      }
    }
    
    updateInventoryDisplay() {
      if (dom.totalInventorySpan) {
        dom.totalInventorySpan.textContent = currentInventory.toString();
      }
      
      const indicator = dom.inventoryStatus?.querySelector('.inventory-indicator');
      if (indicator && dom.inventoryStatus) {
        if (currentInventory <= 0) {
          indicator.style.background = '#dc3545';
          dom.inventoryStatus.style.borderLeftColor = '#dc3545';
        } else if (currentInventory <= inventorySettings.lowStockThreshold) {
          indicator.style.background = '#ffc107';
          dom.inventoryStatus.style.borderLeftColor = '#ffc107';
          if (dom.lowStockWarning) {
            dom.lowStockWarning.style.display = 'block';
          }
        } else {
          indicator.style.background = '#28a745';
          dom.inventoryStatus.style.borderLeftColor = '#28a745';
          if (dom.lowStockWarning) {
            dom.lowStockWarning.style.display = 'none';
          }
        }
      }
      
      this.updateMethodInventoryDisplay();
    }
    
    updateMethodInventoryDisplay() {
      const pickupAvailable = this.calculateMethodAvailableInventory('pickup');
      const deliveryAvailable = this.calculateMethodAvailableInventory('delivery');
      
      const elements = {
        pickupAvailable: document.getElementById('pickupAvailable'),
        deliveryAvailable: document.getElementById('deliveryAvailable'),
        pickupMethod: document.getElementById('pickupMethodInventory'),
        deliveryMethod: document.getElementById('deliveryMethodInventory')
      };
      
      if (elements.pickupAvailable) {
        elements.pickupAvailable.textContent = `${pickupAvailable}個`;
      }
      if (elements.deliveryAvailable) {
        elements.deliveryAvailable.textContent = `${deliveryAvailable}個`;
      }
      if (elements.pickupMethod) {
        elements.pickupMethod.textContent = `利用可能: ${pickupAvailable}個`;
      }
      if (elements.deliveryMethod) {
        elements.deliveryMethod.textContent = `利用可能: ${deliveryAvailable}個`;
      }
    }
    
    calculateMethodAvailableInventory(method) {
      const dates = this.getAvailableDates(method);
      let totalAvailable = 0;
      
      dates.forEach(dateInfo => {
        totalAvailable += dateInfo.inventory.available;
      });
      
      return Math.min(totalAvailable, currentInventory);
    }
    
    getAvailableDates(method) {
      const today = new Date();
      const dates = [];
      const methodSettings = storeSettings[method] || {};
      const weeksAhead = methodSettings.weeksAhead || 4;
      
      // 配送の場合は2週間後からスタート
      const startOffset = method === 'delivery' ? (methodSettings.weeksOffset || 2) * 7 : 0;
      
      for (let week = 0; week < weeksAhead; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date(today);
          date.setDate(today.getDate() + startOffset + (week * 7) + day);
          
          const dateKey = date.toISOString().split('T')[0];
          
          if (this.isAvailableDay(date, method) && !this.isSoldOutPeriod(date, method)) {
            const inventoryStats = this.getDateInventoryStats(dateKey, method);
            
            if (inventoryStats.available > 0) {
              dates.push({
                date: date,
                dateKey: dateKey,
                inventory: inventoryStats
              });
            }
          }
        }
      }
      
      return dates;
    }
    
    // **新機能: 完売期間チェック（金曜10時〜土曜10時）**
    isSoldOutPeriod(date, method) {
      if (method !== 'pickup') return false;
      
      const soldOutConfig = storeSettings.pickup?.soldOutPeriod;
      if (!soldOutConfig?.enabled) return false;
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      
      // 金曜日10時以降の場合
      if (currentDay === 5 && currentTime >= 1000) {
        return true;
      }
      
      // 土曜日10時未満の場合
      if (currentDay === 6 && currentTime < 1000) {
        return true;
      }
      
      return false;
    }
    
    isAvailableDay(date, method) {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      const methodSettings = storeSettings[method] || {};
      
      // 特別日程チェック
      const specialDatesForMethod = specialDates[method] || {};
      if (specialDatesForMethod[dateStr]) {
        return true;
      }
      
      // 通常曜日チェック
      let availableDays = [];
      try {
        const daysString = methodSettings.days;
        if (typeof daysString === 'string') {
          availableDays = JSON.parse(daysString);
        } else if (Array.isArray(daysString)) {
          availableDays = daysString;
        } else {
          availableDays = method === 'pickup' ? [6, 0] : [4]; // デフォルト: pickup=土日, delivery=木曜
        }
      } catch (e) {
        availableDays = method === 'pickup' ? [6, 0] : [4];
      }
      
      if (availableDays.includes(dayOfWeek)) {
        return true;
      }
      
      // 祝日チェック（店舗受け取りの場合）
      if (method === 'pickup' && this.isExtendedWeekendHoliday(date)) {
        return true;
      }
      
      return false;
    }
    
    isExtendedWeekendHoliday(date) {
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 1 && this.isHoliday(date)) {
        const yesterday = new Date(date);
        yesterday.setDate(date.getDate() - 1);
        
        if (yesterday.getDay() === 0) {
          return true;
        }
        
        const dayBeforeYesterday = new Date(yesterday);
        dayBeforeYesterday.setDate(yesterday.getDate() - 1);
        if (yesterday.getDay() === 0 && dayBeforeYesterday.getDay() === 6) {
          return true;
        }
      }
      
      return false;
    }
    
    isHoliday(date) {
      const dateStr = date.toISOString().split('T')[0];
      const year = date.getFullYear().toString();
      const holidays = config.holidays[year] || [];
      return holidays.includes(dateStr);
    }
    
    getDateInventoryStats(dateKey, method) {
      const methodSettings = storeSettings[method] || {};
      const specialDatesForMethod = specialDates[method] || {};
      
      // 配分数決定（特別日程 > 商品個別設定 > テーマ設定）
      let allocated = methodSettings.defaultAllocation || 10;
      
      // 特別日程設定
      if (specialDatesForMethod[dateKey] && specialDatesForMethod[dateKey].allocation) {
        allocated = specialDatesForMethod[dateKey].allocation;
      }
      // 商品個別設定
      else if (dateAllocations[method] && dateAllocations[method][dateKey]) {
        allocated = dateAllocations[method][dateKey];
      }
      
      // 予約済み数
      const reserved = (reservedInventory[dateKey] && reservedInventory[dateKey][method]) || 0;
      
      // 利用可能数（標準在庫数も考慮）
      const available = Math.min(
        Math.max(0, allocated - reserved),
        currentInventory
      );
      
      return {
        allocated: allocated,
        reserved: reserved,
        available: available
      };
    }
    
    isSalesStarted(date, method) {
      const now = new Date();
      const methodSettings = storeSettings[method] || {};
      const dateStr = date.toISOString().split('T')[0];
      const specialDatesForMethod = specialDates[method] || {};
      
      let salesStartTime = methodSettings.salesStartTime || "10:00";
      
      if (specialDatesForMethod[dateStr] && specialDatesForMethod[dateStr].salesStartTime) {
        salesStartTime = specialDatesForMethod[dateStr].salesStartTime;
      }
      
      const [hours, minutes] = salesStartTime.split(':').map(Number);
      const salesStartDateTime = new Date(date);
      salesStartDateTime.setHours(hours, minutes, 0, 0);
      
      return now >= salesStartDateTime;
    }
    
    getTimeSlot(dateKey, method) {
      const methodSettings = storeSettings[method] || {};
      const specialDatesForMethod = specialDates[method] || {};
      
      if (specialDatesForMethod[dateKey] && specialDatesForMethod[dateKey].time) {
        return specialDatesForMethod[dateKey].time;
      }
      
      return methodSettings.time || (method === 'pickup' ? '受取り時間：10時〜16時' : '10:00-16:00');
    }
  }
  
  // =============================================================================
  // デバッグ表示クラス（テスト用機能）
  // =============================================================================
  
  class DebugDisplay {
    constructor() {
      if (displaySettings.showDebugInfo) {
        this.updateCurrentDateTime();
        setInterval(() => {
          this.updateCurrentDateTime();
        }, 60000);
      }
      
      if (displaySettings.showAvailableOptionsList) {
        this.updateAvailableOptions();
        setInterval(() => {
          this.updateAvailableOptions();
        }, 60000);
      }
    }
    
    updateCurrentDateTime() {
      const now = new Date();
      if (dom.currentDateSpan) {
        dom.currentDateSpan.textContent = now.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        });
      }
      if (dom.currentTimeSpan) {
        dom.currentTimeSpan.textContent = now.toLocaleTimeString('ja-JP');
      }
    }
    
    updateAvailableOptions() {
      this.updatePickupOptions();
      this.updateDeliveryOptions();
    }
    
    updatePickupOptions() {
      if (!dom.pickupOptionsList) return;
      
      if (!storeSettings.pickup || !storeSettings.pickup.enabled) {
        dom.pickupOptionsList.innerHTML = '<span style="color: #999;">無効化されています</span>';
        return;
      }
      
      const pickupDates = this.getAvailableDatesForMethod('pickup');
      
      if (pickupDates.length === 0) {
        dom.pickupOptionsList.innerHTML = '<span style="color: #ff5722;">選択可能なオプションがありません</span>';
        return;
      }
      
      let html = '';
      pickupDates.forEach((dateInfo, index) => {
        const statusIcon = dateInfo.salesStarted ? '✅' : '';
        const statusText = dateInfo.salesStarted ? '選択可能' : '販売開始前';
        const inventoryText = `残り${dateInfo.inventory.available}個`;
        
        html += `
          <div style="margin-bottom: 8px; padding: 8px; background: white; border-left: 3px solid #17a2b8;">
            <strong>${dateInfo.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}</strong>
            ${dateInfo.time} 
            <span style="color: #17a2b8;">${inventoryText}</span>
            <span style="color: ${dateInfo.salesStarted ? '#4caf50' : '#ff9800'};">${statusIcon} ${statusText}</span>
            <br>
            <small style="color: #666;">スロットID: ${dateInfo.id}</small>
          </div>
        `;
      });
      
      dom.pickupOptionsList.innerHTML = html;
    }
    
    updateDeliveryOptions() {
      if (!dom.deliveryOptionsList) return;
      
      if (!storeSettings.delivery || !storeSettings.delivery.enabled) {
        dom.deliveryOptionsList.innerHTML = '<span style="color: #999;">無効化されています</span>';
        return;
      }
      
      const deliveryDates = this.getAvailableDatesForMethod('delivery');
      
      if (deliveryDates.length === 0) {
        dom.deliveryOptionsList.innerHTML = '<span style="color: #ff5722;">選択可能なオプションがありません</span>';
        return;
      }
      
      let html = '';
      deliveryDates.forEach((dateInfo, index) => {
        const statusIcon = dateInfo.salesStarted ? '✅' : '';
        const statusText = dateInfo.salesStarted ? '選択可能' : '販売開始前';
        const inventoryText = `残り${dateInfo.inventory.available}個`;
        
        html += `
          <div style="margin-bottom: 8px; padding: 8px; background: white; border-left: 3px solid #fd7e14;">
            <strong>${dateInfo.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}</strong>
            ${dateInfo.time} 
            <span style="color: #fd7e14;">${inventoryText}</span>
            <span style="color: ${dateInfo.salesStarted ? '#4caf50' : '#ff9800'};">${statusIcon} ${statusText}</span>
            <br>
            <small style="color: #666;">スロットID: ${dateInfo.id}</small>
          </div>
        `;
      });
      
      dom.deliveryOptionsList.innerHTML = html;
    }
    
    getAvailableDatesForMethod(method) {
      const today = new Date();
      const dates = [];
      const methodSettings = storeSettings[method] || {};
      const weeksAhead = methodSettings.weeksAhead || 4;
      
      // 配送の場合は2週間後からスタート
      const startOffset = method === 'delivery' ? (methodSettings.weeksOffset || 2) * 7 : 0;
      
      for (let week = 0; week < weeksAhead; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date(today);
          date.setDate(today.getDate() + startOffset + (week * 7) + day);
          
          const dateKey = date.toISOString().split('T')[0];
          
          if (window.inventoryManager.isAvailableDay(date, method)) {
            const inventoryStats = window.inventoryManager.getDateInventoryStats(dateKey, method);
            
            if (inventoryStats.available > 0) {
              const timeSlot = window.inventoryManager.getTimeSlot(dateKey, method);
              const salesStarted = window.inventoryManager.isSalesStarted(date, method);
              
              dates.push({
                date: date,
                type: method,
                time: timeSlot,
                inventory: inventoryStats,
                id: `${method}_${dateKey}`,
                dateKey: dateKey,
                salesStarted: salesStarted
              });
            }
          }
        }
      }
      
      return dates.slice(0, config.maxOptions);
    }
  }
  
  // =============================================================================
  // UI更新関数群
  // =============================================================================
  
  function generateDates() {
    if (!selectedMethod) return [];
    
    const today = new Date();
    const dates = [];
    const methodSettings = storeSettings[selectedMethod] || {};
    const weeksAhead = methodSettings.weeksAhead || 4;
    
    // 配送の場合は2週間後からスタート
    const startOffset = selectedMethod === 'delivery' ? (methodSettings.weeksOffset || 2) * 7 : 0;
    
    for (let week = 0; week < weeksAhead; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + startOffset + (week * 7) + day);
        
        const dateKey = date.toISOString().split('T')[0];
        
        if (window.inventoryManager.isAvailableDay(date, selectedMethod)) {
          const inventoryStats = window.inventoryManager.getDateInventoryStats(dateKey, selectedMethod);
          const isSoldOut = window.inventoryManager.isSoldOutPeriod(date, selectedMethod);
          
          if (inventoryStats.available > 0 || !displaySettings.autoHideUnavailable || isSoldOut) {
            const timeSlot = window.inventoryManager.getTimeSlot(dateKey, selectedMethod);
            const salesStarted = window.inventoryManager.isSalesStarted(date, selectedMethod);
            
            dates.push({
              date: date,
              type: selectedMethod,
              time: timeSlot,
              inventory: inventoryStats,
              id: `${selectedMethod}_${dateKey}`,
              dateKey: dateKey,
              salesStarted: salesStarted,
              isSoldOut: isSoldOut,
              salesStartText: salesStarted ? null : getSalesStartTimeText(date, selectedMethod)
            });
          }
        }
      }
    }
    
    return dates.slice(0, config.maxOptions);
  }
  
  function getSalesStartTimeText(date, method) {
    const methodSettings = storeSettings[method] || {};
    const dateStr = date.toISOString().split('T')[0];
    const specialDatesForMethod = specialDates[method] || {};
    
    let salesStartTime = methodSettings.salesStartTime || "10:00";
    if (specialDatesForMethod[dateStr] && specialDatesForMethod[dateStr].salesStartTime) {
      salesStartTime = specialDatesForMethod[dateStr].salesStartTime;
    }
    
    const dateStr2 = date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric'
    });
    
    return (messages.salesStartsAt || 'DATE TIMEから選択可能')
      .replace('DATE', dateStr2)
      .replace('TIME', salesStartTime);
  }
  
  function updateDateOptions() {
    const dates = generateDates();
    dom.dateOptions.innerHTML = '';
    
    if (dates.length === 0) {
      dom.dateOptions.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #6c757d; border: 2px dashed ${designSettings.borderColor || '#dee2e6'}; background: #f8f9fa;">
          <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📅</div>
          <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 20px; color: #495057;">予約可能な日程がありません</p>
          <p style="margin: 0; font-size: 15px; line-height: 1.5;">
            ${selectedMethod === 'pickup' ? '店舗受け取り' : 'オンライン配送'}の在庫が不足しているか、<br>
            設定された営業日程がありません
          </p>
        </div>
      `;
      return;
    }
    
    dates.forEach(dateInfo => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-option';
      btn.dataset.slotId = dateInfo.id;
      
      const isSelectable = dateInfo.salesStarted && dateInfo.inventory.available > 0 && !dateInfo.isSoldOut;
      const isLowStock = dateInfo.inventory.available <= 3 && dateInfo.inventory.available > 0;
      
      const baseStyle = `
        padding: 24px; 
        border: 2px solid ${designSettings.borderColor || '#e1e5e9'}; 
        text-align: left; 
        transition: all 0.3s ease;
        position: relative;
        min-height: 180px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        overflow: hidden;
      `;
      
      if (dateInfo.isSoldOut) {
        // 完売期間の表示
        btn.className += ' sold-out pickup-sold-out-period';
        btn.style.cssText = baseStyle + `
          background: #f8f9fa;
          cursor: not-allowed;
          opacity: 0.8;
        `;
        btn.disabled = true;
      } else if (isSelectable) {
        btn.style.cssText = baseStyle + `
          background: ${designSettings.customOptionBgColor || '#B3B6BC'};
          cursor: pointer;
        `;
      } else {
        btn.style.cssText = baseStyle + `
          background: #f8f9fa;
          cursor: not-allowed;
          opacity: 0.7;
        `;
        btn.disabled = true;
      }
      
      const dateStr = dateInfo.date.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      });
      
      // 在庫状況による色分け
      let stockColor = designSettings.accentColor || '#007c89';
      let stockBg = '#e8f4fd';
      let stockText = '選択可能';
      
      if (dateInfo.isSoldOut) {
        stockColor = '#dc3545';
        stockBg = '#f8d7da';
        stockText = messages.soldOut || '完売';
      } else if (dateInfo.inventory.available <= 0) {
        stockColor = '#6c757d';
        stockBg = '#f8d7da';
        stockText = '在庫切れ';
      } else if (isLowStock) {
        stockColor = '#fd7e14';
        stockBg = '#fff3cd';
        stockText = '残りわずか';
      }
      
      if (dateInfo.isSoldOut) {
        // 完売表示
        btn.innerHTML = `
          <div class="sold-out-overlay">
            <div class="sold-out-text">${messages.soldOut || '完売'}</div>
          </div>
          <div style="margin-bottom: 18px; position: relative; z-index: 1;">
            <div style="font-weight: ${designSettings.fontWeightTitle || '500'}; font-size: ${designSettings.titleFontSize || 16}px; color: #999; margin-bottom: 10px;">${dateStr}</div>
            <div style="font-size: ${designSettings.subtitleFontSize || 13}px; color: #999; margin-bottom: 12px; line-height: 1.4; font-weight: ${designSettings.fontWeightSubtitle || '400'};">${dateInfo.time}</div>
            ${displaySettings.showDateInventory ? `
            <div style="font-size: ${designSettings.descriptionFontSize || 12}px; color: #6c757d; background: #e9ecef; padding: 6px 12px; display: inline-block;">
              残り ${dateInfo.inventory.available}個
            </div>
            ` : ''}
          </div>
          <div style="border-top: 1px solid #f0f0f0; padding-top: 15px; position: relative; z-index: 1;">
            <div style="text-align: center; color: #dc3545; font-weight: 600; font-size: 14px;">
              金曜10時〜土曜10時は完売です
            </div>
          </div>
        `;
      } else if (isSelectable) {
        btn.innerHTML = `
          ${isLowStock ? `<div style="position: absolute; top: -2px; right: -2px; background: #ff6b6b; color: white; font-size: 10px; padding: 3px 8px; font-weight: 600;">残りわずか</div>` : ''}
          <div style="margin-bottom: 18px;">
            <div style="font-weight: ${designSettings.fontWeightTitle || '500'}; font-size: ${designSettings.titleFontSize || 16}px; color: ${designSettings.customOptionTitleColor || '#FFFFFF'}; margin-bottom: 10px;">${dateStr}</div>
            <div style="font-size: ${designSettings.subtitleFontSize || 13}px; color: ${designSettings.customOptionSubtitleColor || '#84858A'}; margin-bottom: 12px; line-height: 1.4; font-weight: ${designSettings.fontWeightSubtitle || '400'};">${dateInfo.time}</div>
            ${displaySettings.showDateInventory ? `
            <div style="font-size: ${designSettings.descriptionFontSize || 12}px; color: ${stockColor}; font-weight: 600; background: ${stockBg}; padding: 6px 12px; display: inline-block;">
              残り ${dateInfo.inventory.available}個
            </div>
            ` : ''}
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
            <div style="text-align: center; color: ${designSettings.customOptionTitleColor || '#FFFFFF'}; font-weight: 600; font-size: 15px;">
              ${stockText}
            </div>
          </div>
        `;
        
        // ホバー効果
        btn.addEventListener('mouseenter', () => {
          btn.style.borderColor = designSettings.accentColor || '#007c89';
          btn.style.backgroundColor = '#a8adb3';
          btn.style.transform = 'translateY(-4px)';
          btn.style.boxShadow = '0 10px 25px rgba(0, 124, 137, 0.15)';
        });
        
        btn.addEventListener('mouseleave', () => {
          if (!btn.classList.contains('selected')) {
            btn.style.borderColor = designSettings.borderColor || '#e1e5e9';
            btn.style.backgroundColor = designSettings.customOptionBgColor || '#B3B6BC';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)';
          }
        });
        
        btn.addEventListener('click', () => selectDate(dateInfo, btn));
      } else {
        const reason = !dateInfo.salesStarted ? dateInfo.salesStartText : 
                      dateInfo.inventory.available <= 0 ? '在庫切れ' : '選択不可';
        
        btn.innerHTML = `
          <div style="margin-bottom: 18px;">
            <div style="font-weight: ${designSettings.fontWeightTitle || '500'}; font-size: ${designSettings.titleFontSize || 16}px; color: #999; margin-bottom: 10px;">${dateStr}</div>
            <div style="font-size: ${designSettings.subtitleFontSize || 13}px; color: #999; margin-bottom: 12px; font-weight: ${designSettings.fontWeightSubtitle || '400'};">${dateInfo.time}</div>
            ${displaySettings.showDateInventory ? `
            <div style="font-size: ${designSettings.descriptionFontSize || 12}px; color: #6c757d; background: #e9ecef; padding: 6px 12px; display: inline-block;">
              残り ${dateInfo.inventory.available}個
            </div>
            ` : ''}
          </div>
          <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
            <div style="text-align: center; color: #6c757d; font-weight: 600; font-size: 14px;">
              ${reason}
            </div>
          </div>
        `;
      }
      
      dom.dateOptions.appendChild(btn);
    });
  }
  
  // =============================================================================
  // イベントハンドラー関数群
  // =============================================================================
  
  function setupEventListeners() {
    // 配送方法選択
    dom.methodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // UI更新
        dom.methodBtns.forEach(b => {
          b.style.borderColor = designSettings.borderColor || '#e1e5e9';
          b.style.backgroundColor = designSettings.customOptionBgColor || '#B3B6BC';
          b.style.transform = 'translateY(0)';
          b.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
        });
        
        btn.style.borderColor = designSettings.accentColor || '#007c89';
        btn.style.backgroundColor = designSettings.accentColor || '#007c89';
        btn.style.transform = 'translateY(-3px)';
        btn.style.boxShadow = '0 10px 25px rgba(0, 124, 137, 0.2)';
        
        // タイトル色を白に変更
        const titleSpan = btn.querySelector('span');
        if (titleSpan) {
          titleSpan.style.color = '#FFFFFF';
        }
        
        selectedMethod = btn.dataset.method;
        selectedDate = null;
        
        dom.dateSelectionArea.style.display = 'block';
        dom.selectionInfo.style.display = 'none';
        
        window.cartController.updateSelectionStatus(false);
        
        updateDateOptions();
      });
    });
    
    // 更新ボタンイベント
    if (dom.refreshOptionsBtn) {
      dom.refreshOptionsBtn.addEventListener('click', () => {
        window.debugDisplay.updateAvailableOptions();
        window.inventoryManager.checkInventoryUpdate();
      });
    }
    
    // 定期的な販売開始時間チェック（1分間隔）
    setInterval(() => {
      if (selectedMethod) {
        updateDateOptions();
      }
    }, 60000);
    
    // リサイズ対応
    window.addEventListener('resize', applyResponsiveStyles);
    
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
      if (inventoryCheckTimer) {
        clearInterval(inventoryCheckTimer);
      }
    });
  }
  
  function selectDate(dateInfo, btn) {
    if (!dateInfo.salesStarted || dateInfo.inventory.available <= 0 || dateInfo.isSoldOut) return;
    
    // 他のボタンリセット
    document.querySelectorAll('.date-option').forEach(b => {
      b.style.borderColor = designSettings.borderColor || '#e1e5e9';
      b.style.backgroundColor = designSettings.customOptionBgColor || '#B3B6BC';
      b.style.transform = 'translateY(0)';
      b.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)';
      b.classList.remove('selected');
    });
    
    // 選択ボタンスタイル更新
    btn.style.borderColor = designSettings.accentColor || '#007c89';
    btn.style.backgroundColor = designSettings.accentColor || '#007c89';
    btn.style.transform = 'translateY(-4px)';
    btn.style.boxShadow = '0 15px 30px rgba(0, 124, 137, 0.25)';
    btn.classList.add('selected');
    
    selectedDate = dateInfo;
    
    // カートに送信される隠しフィールド
    document.getElementById('selectedMethod').value = selectedMethod === 'pickup' ? '店舗受け取り' : 'オンライン配送';
    document.getElementById('selectedDateTime').value = `${dateInfo.date.toLocaleDateString('ja-JP')} ${dateInfo.time}`;
    document.getElementById('selectedSlotId').value = dateInfo.id;
    document.getElementById('inventoryReserved').value = '1';
    
    window.cartController.updateSelectionStatus(true);
    
    // 選択情報表示
    const methodLabel = selectedMethod === 'pickup' ? '店舗受け取り' : 'オンライン配送';
    const stockWarning = dateInfo.inventory.available <= 3 ? 
      `<div style="color: #fd7e14; font-size: 13px; margin-top: 8px; font-weight: 500;">残り${dateInfo.inventory.available}個です。お急ぎください。</div>` : '';
    
    dom.selectionInfo.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 18px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <span style="font-weight: 700; color: #333; font-size: 20px;">選択完了</span>
            <span style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 6px 15px; font-size: 13px; font-weight: 600; box-shadow: 0 3px 6px rgba(40, 167, 69, 0.3);">✓ 確定</span>
          </div>
          <div style="color: #495057; font-size: 16px; margin-bottom: 6px; font-weight: 500;">
            ${methodLabel} - ${selectedDate.date.toLocaleDateString('ja-JP')}
          </div>
          <div style="color: #6c757d; font-size: 15px; margin-bottom: 6px;">
            時間: ${selectedDate.time}
          </div>
          ${displaySettings.showDateInventory ? `
          <div style="color: ${designSettings.accentColor || '#007c89'}; font-size: 14px; font-weight: 600;">
            この日程の残り在庫: ${dateInfo.inventory.available}個
          </div>
          ` : ''}
          ${stockWarning}
          ${displaySettings.showDebugInfo ? `
          <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; font-size: 13px; color: #1976d2;">
            <strong>テスト用情報:</strong> スロットID: ${dateInfo.id}
          </div>
          ` : ''}
        </div>
      </div>
    `;
    dom.selectionInfo.style.display = 'block';
  }
  
  // =============================================================================
  // レスポンシブ・アクセシビリティ関数群
  // =============================================================================
  
  function applyResponsiveStyles() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && displaySettings.mobileStackLayout) {
      const methodButtons = document.querySelector('.method-buttons');
      if (methodButtons) {
        methodButtons.style.flexDirection = 'column';
      }
      
      dom.dateOptions.style.gridTemplateColumns = '1fr';
      
      dom.methodBtns.forEach(btn => {
        btn.style.marginBottom = '15px';
      });
    } else {
      const methodButtons = document.querySelector('.method-buttons');
      if (methodButtons) {
        methodButtons.style.flexDirection = 'row';
      }
      
      dom.dateOptions.style.gridTemplateColumns = 'repeat(auto-fit, minmax(340px, 1fr))';
    }
  }
  
  function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    const section = document.querySelector('.inventory-linked-delivery-options');
    if (section) {
      observer.observe(section);
    }
  }
  
  // =============================================================================
  // グローバル変数として公開（デバッグ・テスト用）
  // =============================================================================
  
  window.cartController = null;
  window.inventoryManager = null;
  window.debugDisplay = null;
  
  // =============================================================================
  // DOMContentLoaded時の初期化
  // =============================================================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSystem, 100);
    });
  } else {
    setTimeout(initializeSystem, 100);
  }
  
})();