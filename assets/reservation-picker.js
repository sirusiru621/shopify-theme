/**
   * 指定日付のカート開放状態チェック
   */
  isCartOpenForDate(date) {
    // カレンダー機能自体が無効な場合
    if (!this.config.calendarEnabled) {
      return false;
    }
    
    // 機能的な予約が可能かどうか（受付期間内かつ機能有効）
    return this.config.functionalReservation;
  }

  /**
   * 日付選択処理
   */
  handleDateSelection(event) {
    const dayButton = event.target.closest('.calendar-day.weekend-available');
    if (!dayButton || !this.config.functionalReservation) return;
    
    const selectedDate = dayButton.dataset.date;
    
    // 既存の選択をクリア
    this.dom.calendarDays.querySelectorAll('.calendar-day.selected')
      .forEach(el => el.classList.remove('selected'));
    
    // 新しい選択を設定
    dayButton.classList.add('selected');
    this.state.selectedDate = selectedDate;
    this.state.selectedTime = null;
    // ファイル名: assets/reservation-picker.js
// 機能説明: 土日限定予約システム - カートオープン/クローズ制御とカレンダー機能

class WeekendReservationPicker {
  constructor(container) {
    this.container = container;
    this.sectionId = container.id.replace('reservation-picker-', '');
    
    // 設定データの取得
    this.loadConfiguration();
    
    // 初期化
    if (this.config && this.config.showReservation) {
      this.initializeCalendar();
      this.attachEventListeners();
    }
  }

  /**
   * 設定データの読み込み
   */
  loadConfiguration() {
    const configElement = this.container.querySelector(`#reservation-config-${this.sectionId}`);
    
    if (!configElement) {
      console.error('予約設定が見つかりません');
      return;
    }

    try {
      this.config = JSON.parse(configElement.textContent);
      this.state = {
        currentDate: new Date(),
        selectedDate: null,
        selectedTime: null
      };
      
      // DOM要素の参照を設定
      this.setupDOMReferences();
      
    } catch (error) {
      console.error('設定データの解析に失敗しました:', error);
    }
  }

  /**
   * DOM要素の参照設定
   */
  setupDOMReferences() {
    this.dom = {
      calendarDays: this.container.querySelector(`#calendar-days-${this.sectionId}`),
      timeContainer: this.container.querySelector(`#time-container-${this.sectionId}`),
      timeSlots: this.container.querySelector(`#time-slots-${this.sectionId}`),
      selectedDateDisplay: this.container.querySelector(`#selected-date-display-${this.sectionId}`),
      prevButton: this.container.querySelector('.calendar-prev'),
      nextButton: this.container.querySelector('.calendar-next'),
      monthDisplay: this.container.querySelector('.month-display'),
      yearDisplay: this.container.querySelector('.year-display'),
      hiddenDate: document.getElementById(`reservation-date-${this.sectionId}`),
      hiddenTime: document.getElementById(`reservation-time-${this.sectionId}`)
    };
  }

  /**
   * カレンダー初期化
   */
  initializeCalendar() {
    // 現在の月の1日に設定
    this.state.currentDate.setDate(1);
    this.renderCalendar();
    this.generateTimeSlots();
  }

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // 月ナビゲーション
    this.dom.prevButton?.addEventListener('click', () => this.navigateMonth(-1));
    this.dom.nextButton?.addEventListener('click', () => this.navigateMonth(1));
    
    // 日付選択
    this.dom.calendarDays?.addEventListener('click', (e) => this.handleDateSelection(e));
    
    // 時間選択
    this.dom.timeSlots?.addEventListener('click', (e) => this.handleTimeSelection(e));
  }

  /**
   * 月ナビゲーション
   */
  navigateMonth(direction) {
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() + direction);
    this.resetSelections();
    this.renderCalendar();
  }

  /**
   * 選択状態のリセット
   */
  resetSelections() {
    this.state.selectedDate = null;
    this.state.selectedTime = null;
    
    if (this.dom.timeContainer) {
      this.dom.timeContainer.style.display = 'none';
    }
    
    if (this.dom.hiddenDate) this.dom.hiddenDate.value = '';
    if (this.dom.hiddenTime) this.dom.hiddenTime.value = '';
  }

  /**
   * カレンダーの描画
   */
  renderCalendar() {
    if (!this.dom.calendarDays) return;

    const year = this.state.currentDate.getFullYear();
    const month = this.state.currentDate.getMonth();
    
    // ヘッダー更新
    this.updateCalendarHeader(year, month);
    
    // カレンダーグリッドの生成
    this.generateCalendarGrid(year, month);
  }

  /**
   * カレンダーヘッダーの更新
   */
  updateCalendarHeader(year, month) {
    const monthNames = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    
    if (this.dom.yearDisplay) {
      this.dom.yearDisplay.textContent = `${year}年`;
    }
    
    if (this.dom.monthDisplay) {
      this.dom.monthDisplay.textContent = monthNames[month];
    }
  }

  /**
   * カレンダーグリッドの生成
   */
  generateCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    
    // 前月の空白セル
    for (let i = 0; i < firstDayWeek; i++) {
      html += '<div class="calendar-day other-month"></div>';
    }
    
    // 当月の日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = this.formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();
      
      let classes = ['calendar-day'];
      let isClickable = false;
      let statusText = '';
      
      // 過去の日付チェック
      if (currentDate < today) {
        classes.push('is-disabled');
        statusText = '-';
      }
      // 土日チェック (土曜日: 6, 日曜日: 0)
      else if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (this.isCartOpenForDate(currentDate)) {
          classes.push('weekend-available');
          isClickable = true;
          statusText = this.config.labels.weekend;
        } else {
          classes.push('is-disabled');
          statusText = this.config.labels.unavailable;
        }
      } else {
        // 平日は選択不可
        classes.push('is-disabled');
        statusText = '-';
      }
      
      // 選択状態チェック
      if (this.state.selectedDate === dateString) {
        classes.push('selected');
      }
      
      html += `
        <button type="button" 
                class="${classes.join(' ')}" 
                data-date="${dateString}"
                ${isClickable ? '' : 'disabled'}
                aria-label="${year}年${month + 1}月${day}日">
          <span class="day-number">${day}</span>
          <span class="day-status">${statusText}</span>
        </button>
      `;
    }
    
    this.dom.calendarDays.innerHTML = html;
  }

    
    // 時間選択エリアを表示
    this.showTimeSelection(selectedDate);
    
    // 隠しフィールドを更新
    if (this.dom.hiddenDate) {
      this.dom.hiddenDate.value = selectedDate;
    }
    if (this.dom.hiddenTime) {
      this.dom.hiddenTime.value = '';
    }
  }

  /**
   * 時間選択処理
   */
  handleTimeSelection(event) {
    const timeButton = event.target.closest('.time-slot');
    if (!timeButton || timeButton.disabled || !this.config.functionalReservation) return;
    
    const selectedTime = timeButton.dataset.time;
    
    // 既存の選択をクリア
    this.dom.timeSlots.querySelectorAll('.time-slot.selected')
      .forEach(el => el.classList.remove('selected'));
    
    // 新しい選択を設定
    timeButton.classList.add('selected');
    this.state.selectedTime = selectedTime;
    
    // 隠しフィールドを更新
    if (this.dom.hiddenTime) {
      this.dom.hiddenTime.value = selectedTime;
    }
    
    // 視覚的フィードバック
    this.showSelectionConfirmation(selectedTime);
  }

  /**
   * 時間スロットの生成
   */
  generateTimeSlots() {
    if (!this.dom.timeSlots || !this.config.timeSlots) return;
    
    const timeSlots = this.config.timeSlots.split(',').map(time => time.trim());
    
    let html = '';
    timeSlots.forEach(time => {
      const isDisabled = !this.config.functionalReservation;
      html += `
        <button type="button" 
                class="time-slot" 
                data-time="${time}"
                ${isDisabled ? 'disabled' : ''}
                aria-label="${time}の予約">
          ${time}
        </button>
      `;
    });
    
    this.dom.timeSlots.innerHTML = html;
  }

  /**
   * 選択確認の表示
   */
  showSelectionConfirmation(time) {
    // 簡単な視覚的フィードバックを提供
    const button = this.dom.timeSlots.querySelector(`[data-time="${time}"]`);
    if (button) {
      button.style.transform = 'scale(1.05)';
      setTimeout(() => {
        button.style.transform = '';
      }, 200);
    }
  }

  /**
   * 日付フォーマット (YYYY-MM-DD)
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 表示用日付フォーマット
   */
  formatDateForDisplay(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日（${weekday}）`;
  }

  /**
   * 現在のカート状態チェック
   */
  static checkCartStatus() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentWeekday = now.getDay();
    const currentMonth = now.getMonth();
    
    // 第3週水曜日の判定 (15-21日の間の水曜日)
    const isThirdWednesday = currentWeekday === 3 && currentDay >= 15 && currentDay <= 21;
    
    // カートオープン条件
    if (isThirdWednesday && currentHour >= 10) {
      return { isOpen: true, message: '予約受付中です' };
    }
    
    // 金曜日10時まで
    if (currentWeekday === 5 && currentHour < 10) {
      return { isOpen: true, message: '予約受付中です（本日10時で受付終了）' };
    }
    
    // 金曜日10時以降
    if (currentWeekday === 5 && currentHour >= 10) {
      return { 
        isOpen: false, 
        message: '予約受付を終了しました。次回は来月第3週水曜日10時より受付開始予定' 
      };
    }
    
    // その他の期間
    return { 
      isOpen: false, 
      message: '現在予約受付期間外です。次回は来月第3週水曜日10時より受付開始予定' 
    };
  }
}

/**
 * DOM読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  // main-product.liquid内のブロック要素を対象
  const sections = document.querySelectorAll('.product__reservation-picker, .reservation-picker-section');
  
  sections.forEach(section => {
    try {
      new WeekendReservationPicker(section);
    } catch (error) {
      console.error('予約ピッカーの初期化に失敗しました:', error);
    }
  });
});

/**
 * リサイズイベントの処理 (レスポンシブ対応)
 */
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // 必要に応じてレイアウトの再計算を行う
    const sections = document.querySelectorAll('.product__reservation-picker, .reservation-picker-section');
    sections.forEach(section => {
      const picker = section.reservationPicker;
      if (picker && picker.renderCalendar) {
        picker.renderCalendar();
      }
    });
  }, 250);
});

/**
 * インスタンスをセクションに保存 (デバッグ用)
 */
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.product__reservation-picker, .reservation-picker-section');
  sections.forEach(section => {
    const picker = new WeekendReservationPicker(section);
    section.reservationPicker = picker;
  });
});