/**
 * ファイル名: assets/product-reservation.js
 * 機能: 商品予約機能 JavaScript（main-product.liquid統合版）
 * 対応: ES6準拠、jQuery非依存、レスポンシブ対応
 * 改善点: コンマ区切りデータ処理、エラーハンドリング強化
 */

class ProductReservation {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.currentDate = new Date();
    this.selectedDate = null;
    this.selectedTime = null;
    this.config = {};
    this.settings = {};
    this.translations = {};
    this.reservationData = {};
    
    // デバッグモード（開発時にtrue、本番でfalse）
    this.debugMode = document.querySelector('.reservation-debug') !== null;
    
    this.init();
  }

  /**
   * 初期化処理
   */
  init() {
    this.log('🚀 予約システム初期化開始');
    
    // 設定データ読み込み
    if (!this.loadConfig()) return;
    
    // 予約データ生成
    this.generateReservationData();
    
    // DOM要素取得
    this.setupDOMReferences();
    
    // イベントリスナー設定
    this.setupEventListeners();
    
    // カレンダー初期描画
    this.renderCalendar();
    
    // アクセシビリティ設定
    this.setupAccessibility();
    
    this.log('✅ 予約システム初期化完了');
  }

  /**
   * 設定データ読み込み（改善版）
   */
  loadConfig() {
    const configElement = document.getElementById(`reservation-config-${this.sectionId}`);
    if (!configElement) {
      console.error('❌ 予約設定が見つかりません');
      return false;
    }

    try {
      const config = JSON.parse(configElement.textContent);
      this.productId = config.productId;
      this.variantId = config.variantId;
      this.config = config.config || {};
      this.settings = config.settings || {};
      this.translations = config.translations || {};
      
      this.log('📋 設定データ読み込み完了:', {
        productId: this.productId,
        config: this.config,
        settings: this.settings
      });
      
      return true;
    } catch (error) {
      console.error('❌ 設定データの解析に失敗:', error);
      return false;
    }
  }

  /**
   * 予約データ生成（改善版）
   */
  generateReservationData() {
    this.log('🔄 予約データ生成開始');
    
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + this.config.maxDays);

    // 設定データの処理（コンマ区切り対応）
    const timeSlots = this.parseCommaSeparatedString(this.config.timeSlots, [
      '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
    ]);
    
    const businessDays = this.parseCommaSeparatedString(this.config.businessDays, [
      '月', '火', '水', '木', '金'
    ]);
    
    const closedDates = new Set(this.parseCommaSeparatedString(this.config.closedDates, []));
    
    const specialCapacity = this.parseSpecialCapacity(this.config.specialCapacity);
    
    // 基本席数の検証
    let defaultCapacity = parseInt(this.config.defaultCapacity, 10);
    if (isNaN(defaultCapacity) || defaultCapacity < 1) {
      this.log('⚠️ 基本席数が無効です。デフォルト値1を使用します。');
      defaultCapacity = 1;
    }

    this.log('📊 処理後のデータ:', {
      timeSlots,
      businessDays,
      closedDates: Array.from(closedDates),
      specialCapacity,
      defaultCapacity,
      rawConfig: this.config
    });

    // データの妥当性チェック
    if (timeSlots.length === 0) {
      console.error('❌ 営業時間枠が設定されていません');
      this.showError('営業時間枠が設定されていません。メタフィールドで「09:00,10:00,11:00」のようにコンマ区切りで設定してください。');
      return;
    }

    if (businessDays.length === 0) {
      console.error('❌ 営業曜日が設定されていません');
      this.showError('営業曜日が設定されていません。メタフィールドで「月,火,水,木,金」のようにコンマ区切りで設定してください。');
      return;
    }

    // 曜日マッピング
    const dayMapping = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
    const businessDayNumbers = businessDays
      .map(day => dayMapping[day.trim()])
      .filter(num => num !== undefined);

    if (businessDayNumbers.length === 0) {
      console.error('❌ 営業曜日の形式が無効です');
      this.showError('営業曜日は「月,火,水,木,金」のように漢字1文字をコンマ区切りで設定してください。');
      return;
    }

    this.log('🎯 営業設定:', {
      businessDayNumbers,
      timeSlots,
      defaultCapacity,
      advanceDays: this.config.advanceDays,
      maxDays: this.config.maxDays
    });

    // 予約可能日の生成
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + this.config.advanceDays);
    
    let generatedCount = 0;
    
    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();

      // 営業日かつ休業日でない場合のみ予約可能
      if (businessDayNumbers.includes(dayOfWeek) && !closedDates.has(dateStr)) {
        const capacity = specialCapacity[dateStr] !== undefined ? specialCapacity[dateStr] : defaultCapacity;
        
        // 席数が0以上の場合のみ予約可能日として登録
        if (capacity > 0) {
          this.reservationData[dateStr] = {
            timeSlots: [...timeSlots],
            capacity: capacity,
            available: timeSlots.reduce((acc, slot) => {
              acc[slot] = capacity;
              return acc;
            }, {})
          };
          
          generatedCount++;
          this.log(`📅 予約可能日追加: ${dateStr} (${capacity}席) - 曜日: ${dayOfWeek}`);
        } else {
          this.log(`❌ 席数0のため除外: ${dateStr} - 席数: ${capacity}`);
        }
      } else {
        this.log(`❌ 予約不可日: ${dateStr} - 営業日: ${businessDayNumbers.includes(dayOfWeek)}, 休業日でない: ${!closedDates.has(dateStr)}`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.log(`✅ 予約データ生成完了: ${generatedCount}日分`);
    this.log('🗂️ 生成された予約データ:', this.reservationData);
    
    if (generatedCount === 0) {
      console.warn('⚠️ 予約可能日が0日です。設定を確認してください。');
      this.showError('予約可能日が見つかりません。営業曜日、休業日設定、基本席数を確認してください。');
    }
  }

  /**
   * コンマ区切り文字列のパース（新しいシンプルなメソッド）
   */
  parseCommaSeparatedString(str, defaultValue = []) {
    if (!str || typeof str !== 'string' || str.trim() === '') {
      this.log(`⚠️ 空の文字列、デフォルト値を使用:`, defaultValue);
      return defaultValue;
    }
    
    // コンマで分割して、空文字列や空白文字列を除去
    const result = str.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    this.log(`📝 文字列パース結果: "${str}" → [${result.join(', ')}]`);
    
    return result.length > 0 ? result : defaultValue;
  }

  /**
   * 特別席数設定のパース（改善版）
   */
  parseSpecialCapacity(specialCapacityStr) {
    const result = {};
    
    if (!specialCapacityStr || typeof specialCapacityStr !== 'string') {
      return result;
    }
    
    // コンマ区切りで分割
    const entries = specialCapacityStr.split(',');
    
    entries.forEach(entry => {
      const trimmed = entry.trim();
      if (!trimmed || !trimmed.includes(':')) return;
      
      const [date, capacity] = trimmed.split(':');
      if (date && capacity) {
        const cleanDate = date.trim();
        const cleanCapacity = parseInt(capacity.trim(), 10);
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) && !isNaN(cleanCapacity) && cleanCapacity >= 0) {
          result[cleanDate] = cleanCapacity;
          this.log(`📅 特別席数設定: ${cleanDate} → ${cleanCapacity}席`);
        } else {
          this.log(`⚠️ 無効な特別席数設定: "${trimmed}"`);
        }
      }
    });
    
    return result;
  }

  /**
   * DOM要素参照設定
   */
  setupDOMReferences() {
    this.elements = {
      container: document.querySelector(`[data-section-id="${this.sectionId}"]`),
      monthYear: document.querySelector('.calendar-month-year'),
      prevButton: document.querySelector('.calendar-prev'),
      nextButton: document.querySelector('.calendar-next'),
      calendarDays: document.getElementById(`calendar-days-${this.sectionId}`),
      timeSelection: document.getElementById(`time-container-${this.sectionId}`),
      timeSlots: document.getElementById(`time-slots-${this.sectionId}`),
      reservationSummary: document.getElementById(`reservation-summary-${this.sectionId}`),
      summaryDate: document.querySelector('.summary-date'),
      summaryTime: document.querySelector('.summary-time'),
      remainingCapacity: document.getElementById(`remaining-capacity-${this.sectionId}`),
      
      // 隠しフィールド
      hiddenDate: document.getElementById(`reservation-date-${this.sectionId}`),
      hiddenTime: document.getElementById(`reservation-time-${this.sectionId}`),
      hiddenCapacity: document.getElementById(`reservation-capacity-${this.sectionId}`),
      
      // ステップインジケーター
      steps: document.querySelectorAll('.step')
    };

    // DOM要素の存在チェック
    const requiredElements = ['calendarDays', 'timeSelection', 'timeSlots'];
    for (const key of requiredElements) {
      if (!this.elements[key]) {
        console.error(`❌ 必要なDOM要素が見つかりません: ${key}`);
      }
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // カレンダーナビゲーション
    this.elements.prevButton?.addEventListener('click', () => this.previousMonth());
    this.elements.nextButton?.addEventListener('click', () => this.nextMonth());

    // キーボードナビゲーション
    document.addEventListener('keydown', (event) => this.handleKeydown(event));

    // フォーム送信前の検証
    this.setupFormValidation();
  }

  /**
   * フォーム送信前の検証設定
   */
  setupFormValidation() {
    // より柔軟なフォーム検索
    const possibleFormIds = [
      `product-form-${this.sectionId}`,
      `product-form-template--${this.sectionId}`,
      'product-form'
    ];

    let productForm = null;
    for (const formId of possibleFormIds) {
      productForm = document.getElementById(formId);
      if (productForm) break;
    }

    if (!productForm) {
      // フォームが見つからない場合は、action属性で検索
      const forms = document.querySelectorAll('form[action*="cart/add"]');
      if (forms.length > 0) {
        productForm = forms[0]; // 最初のカート追加フォームを使用
      }
    }

    if (productForm) {
      this.attachFormValidation(productForm);
      this.log('📝 フォーム検証設定完了:', productForm.id || 'unnamed form');
    } else {
      console.warn('⚠️ 商品フォームが見つかりません');
    }
  }

  /**
   * フォーム検証の添付
   */
  attachFormValidation(form) {
    form.addEventListener('submit', (event) => {
      if (this.settings.requireReservation && (!this.selectedDate || !this.selectedTime)) {
        event.preventDefault();
        this.announceToScreenReader(this.translations.reservationRequired || '予約の選択が必要です');
        this.elements.container?.scrollIntoView({ behavior: 'smooth' });
        return false;
      }
    });
  }

  /**
   * アクセシビリティ設定
   */
  setupAccessibility() {
    if (this.elements.calendarDays) {
      this.elements.calendarDays.setAttribute('role', 'grid');
      this.elements.calendarDays.setAttribute('aria-label', 'カレンダー');
    }

    if (this.elements.timeSlots) {
      this.elements.timeSlots.setAttribute('role', 'listbox');
      this.elements.timeSlots.setAttribute('aria-label', '時間選択');
    }
  }

  /**
   * カレンダー描画
   */
  renderCalendar() {
    if (!this.elements.calendarDays || !this.elements.monthYear) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // 月年表示更新
    this.elements.monthYear.textContent = this.formatMonthYear(year, month);

    // カレンダー日付生成
    const calendarHTML = this.generateCalendarDays(year, month);
    this.elements.calendarDays.innerHTML = calendarHTML;

    // 日付クリックイベント設定
    this.setupDateClickEvents();
  }

  /**
   * 月年フォーマット
   */
  formatMonthYear(year, month) {
    const monthNames = this.translations.monthNames || [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    return `${year}年 ${monthNames[month]}`;
  }

  /**
   * カレンダー日付生成
   */
  generateCalendarDays(year, month) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻をリセット
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let html = '';
    let currentDate = new Date(startDate);

    // 6週間分の日付を生成
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = this.formatDate(currentDate);
        const isCurrentMonth = currentDate.getMonth() === month;
        const isPast = currentDate < today;
        const isToday = this.isSameDay(currentDate, today);
        
        let classes = ['calendar-day'];
        let ariaLabel = this.formatDateForAria(currentDate);
        let tabIndex = -1;
        let capacity = '';
        let disabled = true;
        
        if (!isCurrentMonth) {
          classes.push('other-month');
        } else if (isPast) {
          classes.push('past');
        } else {
          const availability = this.checkDateAvailability(dateStr);
          if (availability.available) {
            classes.push('available');
            tabIndex = 0;
            disabled = false;
            ariaLabel += ', 予約可能';
            capacity = `<small class="capacity-indicator">${availability.totalSlots}枠</small>`;
          } else {
            classes.push('unavailable');
            ariaLabel += ', 予約不可';
          }
        }

        if (isToday) {
          classes.push('today');
          ariaLabel += ', 本日';
        }

        if (this.selectedDate === dateStr) {
          classes.push('selected');
          ariaLabel += ', 選択中';
        }

        html += `
          <button 
            type="button"
            class="${classes.join(' ')}"
            data-date="${dateStr}"
            aria-label="${ariaLabel}"
            tabindex="${tabIndex}"
            ${disabled ? 'disabled' : ''}
          >
            <span class="day-number">${currentDate.getDate()}</span>
            ${capacity}
          </button>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return html;
  }

  /**
   * 日付クリックイベント設定
   */
  setupDateClickEvents() {
    const dateButtons = this.elements.calendarDays?.querySelectorAll('.calendar-day.available');
    
    dateButtons?.forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.selectDate(button.dataset.date);
      });
    });
  }

  /**
   * 日付選択処理
   */
  selectDate(dateStr) {
    this.log(`📅 日付選択: ${dateStr}`);
    
    // 前の選択をクリア
    this.clearSelection();
    
    this.selectedDate = dateStr;
    this.selectedTime = null;

    // ステップ更新
    this.updateStep(2);

    // 選択状態を視覚的に更新
    const selectedButton = this.elements.calendarDays?.querySelector(`[data-date="${dateStr}"]`);
    if (selectedButton) {
      selectedButton.classList.add('selected');
      selectedButton.setAttribute('aria-selected', 'true');
    }

    // 時間選択を表示
    this.showTimeSelection(dateStr);
    
    // サマリーを非表示
    this.hideReservationSummary();

    // アナウンス
    this.announceToScreenReader(`${this.formatDateForDisplay(dateStr)}が選択されました`);
  }

  /**
   * 時間選択表示（改善版）
   */
  showTimeSelection(dateStr) {
    if (!this.elements.timeSelection || !this.elements.timeSlots) return;

    const availability = this.checkDateAvailability(dateStr);
    const timeSlots = availability.timeSlots || [];

    this.log(`⏰ 時間選択表示: ${dateStr}`, availability);

    if (timeSlots.length === 0 || !availability.available) {
      this.elements.timeSlots.innerHTML = `
        <div class="no-slots-message">
          ${this.translations.noSlotsAvailable || 'この日は予約できません'}
          ${this.debugMode ? `<br><small>デバッグ: ${availability.reason || '時間枠または席数が不足しています'}</small>` : ''}
        </div>
      `;
    } else {
      this.elements.timeSlots.innerHTML = timeSlots.map(time => {
        const remainingCapacity = availability.available[time] || 0;
        const isAvailable = remainingCapacity > 0;
        
        this.log(`🕐 時間枠 ${time}: ${remainingCapacity}席`);
        
        return `
          <button 
            type="button"
            class="time-slot ${isAvailable ? '' : 'unavailable'}"
            data-time="${time}"
            data-capacity="${remainingCapacity}"
            aria-label="${time} (${isAvailable ? `残り${remainingCapacity}席` : '満席'})"
            ${!isAvailable ? 'disabled' : ''}
          >
            <span class="time-display">${this.formatTimeForDisplay(time)}</span>
            <span class="capacity-display">${isAvailable ? `残り${remainingCapacity}席` : this.translations.fullyBooked || '満席'}</span>
          </button>
        `;
      }).join('');

      // 時間選択イベント設定
      this.setupTimeClickEvents();
    }

    // 残り席数表示更新
    if (this.elements.remainingCapacity) {
      const displayCapacity = availability.capacity || 0;
      this.elements.remainingCapacity.textContent = displayCapacity;
      this.log(`💺 表示席数更新: ${displayCapacity}`);
    }

    // 時間選択コンテナを表示
    this.elements.timeSelection.style.display = 'block';
    this.elements.timeSelection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 時間クリックイベント設定
   */
  setupTimeClickEvents() {
    const timeButtons = this.elements.timeSlots?.querySelectorAll('.time-slot:not(.unavailable)');
    
    timeButtons?.forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.selectTime(button.dataset.time);
      });
    });
  }

  /**
   * 時間選択処理
   */
  selectTime(time) {
    this.log(`⏰ 時間選択: ${time}`);
    
    // 前の時間選択をクリア
    this.elements.timeSlots?.querySelectorAll('.time-slot').forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-selected', 'false');
    });

    this.selectedTime = time;

    // ステップ更新
    this.updateStep(3);

    // 選択状態を視覚的に更新
    const selectedButton = this.elements.timeSlots?.querySelector(`[data-time="${time}"]`);
    if (selectedButton) {
      selectedButton.classList.add('selected');
      selectedButton.setAttribute('aria-selected', 'true');
    }

    // 隠しフィールドに値を設定
    this.updateHiddenFields();

    // 予約サマリーを表示
    this.showReservationSummary();

    // アナウンス
    this.announceToScreenReader(`${this.formatTimeForDisplay(time)}が選択されました`);
  }

  /**
   * 隠しフィールド更新
   */
  updateHiddenFields() {
    if (this.elements.hiddenDate) {
      this.elements.hiddenDate.value = this.formatDateForDisplay(this.selectedDate);
    }
    if (this.elements.hiddenTime) {
      this.elements.hiddenTime.value = this.formatTimeForDisplay(this.selectedTime);
    }
    if (this.elements.hiddenCapacity) {
      this.elements.hiddenCapacity.value = '1';
    }

    this.log('📋 隠しフィールド更新完了:', {
      date: this.elements.hiddenDate?.value,
      time: this.elements.hiddenTime?.value,
      capacity: this.elements.hiddenCapacity?.value
    });
  }

  /**
   * ステップインジケーター更新
   */
  updateStep(step) {
    this.elements.steps?.forEach((stepElement, index) => {
      const stepNumber = index + 1;
      if (stepNumber < step) {
        stepElement.classList.add('completed');
        stepElement.classList.remove('active');
      } else if (stepNumber === step) {
        stepElement.classList.add('active');
        stepElement.classList.remove('completed');
      } else {
        stepElement.classList.remove('active', 'completed');
      }
    });
  }

  /**
   * 予約サマリー表示
   */
  showReservationSummary() {
    if (!this.elements.reservationSummary || !this.selectedDate || !this.selectedTime) return;

    // サマリー内容更新
    if (this.elements.summaryDate) {
      this.elements.summaryDate.textContent = this.formatDateForDisplay(this.selectedDate);
    }

    if (this.elements.summaryTime) {
      this.elements.summaryTime.textContent = this.formatTimeForDisplay(this.selectedTime);
    }

    // サマリー表示
    this.elements.reservationSummary.style.display = 'block';
    this.elements.reservationSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    this.log('📋 予約サマリー表示完了');
  }

  /**
   * 予約サマリー非表示
   */
  hideReservationSummary() {
    if (this.elements.reservationSummary) {
      this.elements.reservationSummary.style.display = 'none';
    }
  }

  /**
   * 選択リセット
   */
  resetSelection() {
    this.clearSelection();
    if (this.elements.timeSelection) {
      this.elements.timeSelection.style.display = 'none';
    }
    this.hideReservationSummary();
    this.updateStep(1);
    this.log('🔄 選択リセット完了');
  }

  /**
   * 選択クリア
   */
  clearSelection() {
    // 日付選択クリア
    this.elements.calendarDays?.querySelectorAll('.calendar-day').forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-selected', 'false');
    });

    // 時間選択クリア
    this.elements.timeSlots?.querySelectorAll('.time-slot').forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-selected', 'false');
    });
  }

  /**
   * 前月表示
   */
  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
    this.resetSelection();
  }

  /**
   * 次月表示
   */
  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
    this.resetSelection();
  }

  /**
   * 日付可用性チェック（改善版）
   */
  checkDateAvailability(dateStr) {
    this.log(`🔍 日付チェック開始: ${dateStr}`);
    
    const dateData = this.reservationData[dateStr];
    
    if (!dateData) {
      this.log(`❌ 日付データなし: ${dateStr}`);
      return {
        available: false,
        timeSlots: [],
        totalSlots: 0,
        available: {},
        capacity: 0,
        reason: `予約データなし (日付: ${dateStr})`
      };
    }

    const availableSlots = Object.values(dateData.available).filter(cap => cap > 0).length;
    const totalCapacity = dateData.timeSlots.length * dateData.capacity;

    this.log(`📊 日付詳細 ${dateStr}:`, {
      timeSlots: dateData.timeSlots,
      capacity: dateData.capacity,
      available: dateData.available,
      availableSlots,
      totalCapacity
    });

    const result = {
      available: availableSlots > 0,
      timeSlots: dateData.timeSlots,
      totalSlots: dateData.timeSlots.length,
      available: dateData.available,
      capacity: dateData.capacity,
      totalCapacity: totalCapacity
    };

    this.log(`✅ 可用性結果 ${dateStr}:`, result);
    
    return result;
  }

  /**
   * エラー表示（新機能）
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'reservation-error';
    errorDiv.style.cssText = `
      background: #f8d7da;
      border: 2px solid #dc3545;
      color: #721c24;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
    `;
    errorDiv.textContent = message;
    
    const container = this.elements.container?.querySelector('.reservation-container');
    if (container) {
      container.insertBefore(errorDiv, container.firstChild);
    }
  }

  /**
   * キーボード操作ハンドリング
   */
  handleKeydown(event) {
    if (event.target.closest('.calendar-days')) {
      this.handleCalendarKeydown(event);
    } else if (event.target.closest('.time-slots')) {
      this.handleTimeSlotsKeydown(event);
    }
  }

  /**
   * カレンダーキーボード操作
   */
  handleCalendarKeydown(event) {
    const currentButton = event.target;
    if (!currentButton.classList.contains('calendar-day')) return;

    let targetDate = new Date(currentButton.dataset.date);
    let handled = false;

    switch (event.key) {
      case 'ArrowLeft':
        targetDate.setDate(targetDate.getDate() - 1);
        handled = true;
        break;
      case 'ArrowRight':
        targetDate.setDate(targetDate.getDate() + 1);
        handled = true;
        break;
      case 'ArrowUp':
        targetDate.setDate(targetDate.getDate() - 7);
        handled = true;
        break;
      case 'ArrowDown':
        targetDate.setDate(targetDate.getDate() + 7);
        handled = true;
        break;
      case 'Enter':
      case ' ':
        if (currentButton.classList.contains('available')) {
          this.selectDate(currentButton.dataset.date);
        }
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        const targetDateStr = this.formatDate(targetDate);
        const targetButton = this.elements.calendarDays?.querySelector(`[data-date="${targetDateStr}"]`);
        
        if (targetButton && !targetButton.disabled) {
          targetButton.focus();
        }
      }
    }
  }

  /**
   * 時間選択キーボード操作
   */
  handleTimeSlotsKeydown(event) {
    const timeButtons = Array.from(this.elements.timeSlots?.querySelectorAll('.time-slot:not(.unavailable)') || []);
    const currentIndex = timeButtons.indexOf(event.target);
    
    let targetIndex = currentIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = currentIndex > 0 ? currentIndex - 1 : timeButtons.length - 1;
        handled = true;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = currentIndex < timeButtons.length - 1 ? currentIndex + 1 : 0;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        this.selectTime(event.target.dataset.time);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        timeButtons[targetIndex]?.focus();
      }
    }
  }

  /**
   * ユーティリティ: 日付フォーマット
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('ja-JP', options);
  }

  formatDateForAria(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ja-JP', options);
  }

  formatTimeForDisplay(time) {
    if (this.settings.timeFormat === 'hh:mm A') {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return time;
  }

  /**
   * ユーティリティ: 日付比較
   */
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * スクリーンリーダー向けアナウンス
   */
  announceToScreenReader(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  /**
   * デバッグログ出力
   */
  log(message, data = null) {
    if (this.debugMode) {
      if (data) {
        console.log(`[予約システム] ${message}`, data);
      } else {
        console.log(`[予約システム] ${message}`);
      }
    }
  }
}

/**
 * DOM読み込み完了後に初期化
 */
document.addEventListener('DOMContentLoaded', function() {
  // 各予約セクションを初期化
  const reservationConfigs = document.querySelectorAll('[id^="reservation-config-"]');
  
  reservationConfigs.forEach(config => {
    const sectionId = config.id.replace('reservation-config-', '');
    new ProductReservation(sectionId);
  });

  // スクリーンリーダー専用スタイルを追加
  if (!document.getElementById('reservation-sr-styles')) {
    const srStyles = document.createElement('style');
    srStyles.id = 'reservation-sr-styles';
    srStyles.textContent = `
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(srStyles);
  }
});
