// ファイル名: assets/product-reservation.js
// 機能説明: 予約カレンダーの全ロジックを管理する【表示保証・最終版】
class ProductReservation {
  constructor(container) {
    this.container = container;
    this.configElement = this.container.querySelector('[id^="reservation-config-"]');
    if (!this.configElement) {
      console.error('Reservation: Config element not found.');
      return;
    }

    try {
      this.settings = JSON.parse(this.configElement.textContent);
    } catch (e) {
      console.error('Reservation: Failed to parse settings.', e);
      return;
    }

    // デバッグモードがONの場合、常にログを出力
    this.debug = this.settings.debug;
    if (this.debug) console.log('Reservation: Settings loaded', this.settings);

    // DOM要素の参照を最初に設定
    this.dom = {
      setupGuide: this.container.querySelector('.reservation-setup-guide'),
      frontendContainer: this.container.querySelector('.reservation-frontend-container'),
      yearDisplay: this.container.querySelector('.year-display'),
      monthDisplay: this.container.querySelector('.month-display'),
      prevButton: this.container.querySelector('.calendar-prev'),
      nextButton: this.container.querySelector('.calendar-next'),
      calendarDays: this.container.querySelector('.calendar-days'),
      timeContainer: this.container.querySelector('.time-selection-container'),
      selectedDateDisplay: this.container.querySelector('.selected-date-value'),
      timeSlotsContainer: this.container.querySelector('.time-slots'),
      hiddenDate: document.getElementById(`reservation-date-${this.settings.sectionId}`),
      hiddenTime: document.getElementById(`reservation-time-${this.settings.sectionId}`),
    };

    // JS側で表示/非表示を決定する
    this.handleDisplay();
  }

  handleDisplay() {
    const isReady = this.settings.showReservation;

    // デバッグモードがONの場合は、設定アシスタントも表示
    if (this.debug) {
      this.dom.setupGuide.style.display = 'block';
      this.updateSetupGuide();
    }
    
    if (isReady) {
      // 設定が正しい場合は、カレンダーを表示
      this.dom.frontendContainer.style.display = 'block';
      this.initCalendar();
    } else {
      // 設定が不完全な場合は、カレンダーを非表示にし、アシスタントを表示
      this.dom.frontendContainer.style.display = 'none';
      this.dom.setupGuide.style.display = 'block'; // 強制的に表示
      this.updateSetupGuide();
    }
  }

  // 設定アシスタントの表示内容を更新する
  updateSetupGuide() {
    if (!this.dom.setupGuide) return;
    const { enabled, timeSlots } = this.settings.reservationConfig;
    const timeSlotsArray = this._parseMultiLineString(timeSlots);

    const enabledCheck = this.dom.setupGuide.querySelector('.setup-check-enabled');
    const enabledValue = this.dom.setupGuide.querySelector('.setup-value-enabled');
    const timeslotsCheck = this.dom.setupGuide.querySelector('.setup-check-timeslots');
    const timeslotsValue = this.dom.setupGuide.querySelector('.setup-value-timeslots');
    
    if (enabled) {
      enabledCheck.textContent = '✅';
      enabledValue.textContent = 'True';
    } else {
      enabledCheck.textContent = '❌';
      enabledValue.textContent = 'False';
    }

    if (timeSlotsArray.length > 0) {
      timeslotsCheck.textContent = '✅';
      timeslotsValue.textContent = `${timeSlotsArray.length}件`;
    } else {
      timeslotsCheck.textContent = '❌';
      timeslotsValue.textContent = `0件`;
    }
  }

  // カレンダー関連の初期化処理
  initCalendar() {
    this.state = { currentDate: new Date(), selectedDate: null, selectedTime: null };
    this.reservationData = this.generateReservationData();
    this.renderCalendar();
    this.addEventListeners();
  }

  _parseMultiLineString(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(/[\n\r,]+/).map(s => s.trim()).filter(Boolean);
  }
  
  // 以降の関数 (generateReservationData, renderCalendar, addEventListenersなど)は、
  // 前回の回答から変更ありませんので、そのまま流用します。
  generateReservationData() {
    const { reservationConfig, debug } = this.settings;
    const data = {};
    const timeSlots = this._parseMultiLineString(reservationConfig.timeSlots).sort();
    const businessDays = this._parseMultiLineString(reservationConfig.businessDays);
    const closedDates = new Set(this._parseMultiLineString(reservationConfig.closedDates));
    const specialCapacityList = this._parseMultiLineString(reservationConfig.specialCapacity);
    const specialCapacity = specialCapacityList.reduce((acc, item) => { const [date, capacity] = item.split(':').map(s => s.trim()); if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(parseInt(capacity))) { acc[date] = parseInt(capacity); } return acc; }, {});
    const dayMap = { '日':0, '月':1, '火':2, '水':3, '木':4, '金':5, '土':6 };
    let businessDayNumbers = (businessDays.length > 0) ? businessDays.map(day => dayMap[day]).filter(n => n !== undefined) : [0, 1, 2, 3, 4, 5, 6];
    if (debug) console.log('Reservation Data Generation:', { timeSlots, businessDayNumbers, closedDates, specialCapacity });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (reservationConfig.advanceDays || 0));
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (reservationConfig.maxDays || 60));
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (businessDayNumbers.includes(d.getDay()) && !closedDates.has(dateStr)) {
        const capacity = specialCapacity[dateStr] ?? reservationConfig.defaultCapacity;
        if (capacity > 0) { data[dateStr] = { isAvailable: true }; }
      }
    }
    if (debug) console.log("Reservation: Data generated", data);
    return data;
  }
  renderCalendar() {
    this.state.currentDate.setDate(1);
    const year = this.state.currentDate.getFullYear();
    const month = this.state.currentDate.getMonth();
    this.dom.yearDisplay.textContent = `${year}年`;
    this.dom.monthDisplay.textContent = new Date(year,month).toLocaleString('ja-JP', {month:'long'});
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.dom.calendarDays.innerHTML = '';
    for (let i = 0; i < firstDayOfMonth; i++) { const cell = document.createElement('div'); cell.className = 'calendar-day other-month'; this.dom.calendarDays.appendChild(cell); }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= daysInMonth; i++) {
      const dayBtn = document.createElement('button');
      dayBtn.type = 'button';
      dayBtn.className = 'calendar-day';
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      dayBtn.dataset.date = dateStr;
      if (date < today) {
        dayBtn.classList.add('is-disabled');
      } else {
        const dayData = this.reservationData[dateStr];
        if (dayData && dayData.isAvailable) {
          dayBtn.classList.add('available');
        } else {
          dayBtn.classList.add('is-disabled', 'unavailable');
        }
      }
      if (this.state.selectedDate === dateStr) dayBtn.classList.add('selected');
      dayBtn.innerHTML = `<span class="day-number">${i}</span>`;
      this.dom.calendarDays.appendChild(dayBtn);
    }
  }
  addEventListeners() { this.dom.prevButton.addEventListener('click',()=>this.changeMonth(-1)); this.dom.nextButton.addEventListener('click',()=>this.changeMonth(1)); this.dom.calendarDays.addEventListener('click', e=>this.handleDateClick(e)); this.dom.timeSlotsContainer.addEventListener('click', e=>this.handleTimeClick(e)); }
  changeMonth(direction) { this.state.currentDate.setMonth(this.state.currentDate.getMonth()+direction); this.resetSelection(); this.renderCalendar(); }
  resetSelection() { this.state.selectedDate=null; this.state.selectedTime=null; this.dom.timeContainer.style.display='none'; this.dom.hiddenDate.value=''; this.dom.hiddenTime.value=''; }
  handleDateClick(e) { const target=e.target.closest('.calendar-day.available'); if(!target)return; this.resetSelection(); this.state.selectedDate=target.dataset.date; this.renderCalendar(); this.renderTimeSlots(target.dataset.date); }
  renderTimeSlots(dateStr) { const timeSlots = this._parseMultiLineString(this.settings.reservationConfig.timeSlots).sort(); this.dom.timeSlotsContainer.innerHTML=''; timeSlots.forEach(time=>{ const button=document.createElement('button'); button.type='button'; button.className='time-slot'; button.dataset.time=time; button.textContent=time; this.dom.timeSlotsContainer.appendChild(button); }); this.dom.selectedDateDisplay.textContent=new Date(dateStr).toLocaleDateString('ja-JP', {year:'numeric',month:'long',day:'numeric',weekday:'short'}); this.dom.timeContainer.style.display='block'; }
  handleTimeClick(e) { const target=e.target.closest('.time-slot'); if(!target||target.disabled)return; this.state.selectedTime=target.dataset.time; this.dom.timeSlotsContainer.querySelectorAll('.time-slot').forEach(btn=>btn.classList.remove('selected')); target.classList.add('selected'); this.dom.hiddenDate.value=this.state.selectedDate; this.dom.hiddenTime.value=this.state.selectedTime; }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.product__reservation').forEach(section => new ProductReservation(section));
});