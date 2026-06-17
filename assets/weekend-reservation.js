// weekend-reservation.js - 予約人数制限対応版（既存機能完全保持）

const DISABLE_RESERVATION_SLOT_LIMITS = true;

class WeekendReservationCalendar {
  constructor(container) {
    this.container = container;
    this.config = this.loadConfig();
    this.state = { currentDate: new Date(), selectedDate: null, selectedTime: null };
    if (this.config) this.init();
  }

  loadConfig() {
    const el = this.container.querySelector(`[id^="reservation-config-"]`);
    if (!el) { console.error('Weekend Reservation: Config not found'); return null; }
    try { return JSON.parse(el.textContent); }
    catch (e) { console.error('Weekend Reservation: Config parse error', e); return null; }
  }

  init() {
    this.setupDOM();
    this.bindToForm();
    this.state.currentDate.setDate(1);
    this.renderCalendar();
    this.attachEvents();
    this.renderTimeSlots();
  }

  setupDOM() {
    const id = this.config.sectionId;
    this.els = {
      days: this.container.querySelector(`#calendar-days-${id}`),
      timeSel: this.container.querySelector(`#time-selection-${id}`),
      timeSlots: this.container.querySelector(`#time-slots-${id}`),
      selDate: this.container.querySelector(`#selected-date-${id}`),
      prev: this.container.querySelector('.nav-prev'),
      next: this.container.querySelector('.nav-next'),
      monthYear: this.container.querySelector('.month-year'),
      hiddenDate: document.getElementById(`reservation-date-${id}`),
      hiddenTime: document.getElementById(`reservation-time-${id}`)
    };
  }

  bindToForm() {
    const { hiddenDate, hiddenTime } = this.els;
    if (!hiddenDate || !hiddenTime) return;
    const isBound = (el) => !!el.form || el.getAttribute('form');
    if (isBound(hiddenDate) && isBound(hiddenTime)) return;
    let form = this.container.closest('form') || document.querySelector('form[action*="/cart/add"]');
    if (!form) return;
    try { if (!hiddenDate.form) form.appendChild(hiddenDate); if (!hiddenTime.form) form.appendChild(hiddenTime); } catch {}
  }

  attachEvents() {
    this.els.prev?.addEventListener('click', () => this.navigate(-1));
    this.els.next?.addEventListener('click', () => this.navigate(1));
    this.els.days?.addEventListener('click', (e) => this.onDateClick(e));
    this.els.timeSlots?.addEventListener('click', (e) => this.onTimeClick(e));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this.renderCalendar(), 200);
  }

  navigate(dir) {
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() + dir);
    this.resetSelection();
    this.renderCalendar();
  }

  resetSelection() {
    this.state.selectedDate = null;
    this.state.selectedTime = null;
    if (this.els.timeSel) this.els.timeSel.style.display = 'none';
    this.updateHidden('', '');
  }

  renderCalendar() {
    if (!this.els.days) return;
    const y = this.state.currentDate.getFullYear();
    const m = this.state.currentDate.getMonth();
    this.updateHeader(y, m);
    this.drawGrid(y, m);
  }

  updateHeader(y, m) {
    const names = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    if (this.els.monthYear) this.els.monthYear.textContent = `${y}年 ${names[m]}`;
  }

  getNthWeekdayOfMonth(year, month, weekday, n) {
    const first = new Date(year, month, 1);
    const offset = (7 + weekday - first.getDay()) % 7;
    const day = 1 + offset + (n - 1) * 7;
    return new Date(year, month, day);
  }

  isFutureMonthUnlocked(now) {
    const unlock = this.getNthWeekdayOfMonth(now.getFullYear(), now.getMonth(), 3, 3);
    unlock.setHours(10,0,0,0);
    return now >= unlock;
  }

  isFutureMonth(y, m, base = new Date()) {
    return (y * 12 + m) > (base.getFullYear() * 12 + base.getMonth());
  }

  drawGrid(y, m) {
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const leadEmpty = first.getDay();
    const cells = Math.ceil((leadEmpty + daysInMonth) / 7) * 7;
    const today = new Date(); today.setHours(0,0,0,0);

    const lockFuture = DISABLE_RESERVATION_SLOT_LIMITS ? false : (this.isFutureMonth(y, m, today) && !this.isFutureMonthUnlocked(today));
    const paused = DISABLE_RESERVATION_SLOT_LIMITS ? false : (this.config.paused === true);

    let html = '';

    for (let i = 0; i < cells; i++) {
      const dayNum = i - leadEmpty + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        html += `<button type="button" class="calendar-day other-month" disabled aria-hidden="true"></button>`;
        continue;
      }

      const cur = new Date(y, m, dayNum);
      const dateStr = this.formatDate(cur);
      const dow = cur.getDay();

      let classes = ['calendar-day'];
      let clickable = false;

      if (cur < today) {
        classes.push('past-date');
      } else {
        const isWeekend = (dow === 0 || dow === 6);
        if (isWeekend) {
          if (lockFuture || paused) {
            classes.push('unavailable');
          } else {
            classes.push('weekend-available');
            clickable = true;
          }
        } else {
          classes.push('unavailable');
        }
      }

      if (this.state.selectedDate === dateStr) classes.push('selected');

      html += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" ${clickable ? '' : 'disabled'} aria-label="${y}年${m + 1}月${dayNum}日">${dayNum}</button>`;
    }

    this.els.days.innerHTML = html;
  }

  onDateClick(e) {
    const btn = e.target.closest('.calendar-day.weekend-available');
    if (!btn || btn.disabled) return;

    this.els.days.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    btn.classList.add('selected');

    const dateStr = btn.dataset.date;
    this.state.selectedDate = dateStr;
    this.state.selectedTime = null;

    this.showTimeSelection(dateStr);
    this.updateHidden(dateStr, '');
    this.renderTimeSlotsForDate(dateStr);
  }

  showTimeSelection(dateStr) {
    if (!this.els.timeSel) return;
    if (this.els.selDate) {
      const d = new Date(dateStr);
      const w = ['日','月','火','水','木','金','土'][d.getDay()];
      this.els.selDate.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${w})`;
    }
    this.els.timeSlots.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
    this.els.timeSel.style.display = 'block';
    setTimeout(() => this.els.timeSel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  // ✅ 予約人数制限対応版のタイムスロットレンダリング
  renderTimeSlotsForDate(dateStr) {
    if (!this.els.timeSlots) return;
    
    const slots = String(this.config.timeSlots || '').split(',').map(t => t.trim()).filter(Boolean);
    const disabled = DISABLE_RESERVATION_SLOT_LIMITS ? false : (this.config.paused === true);
    const capacity = this.config.timeSlotCapacity || {};
    const reservations = DISABLE_RESERVATION_SLOT_LIMITS ? {} : (this.config.reservationData || {});
    const soldOutLabel = this.config.labels?.soldOut || '完売';
    
    const dateReservations = reservations[dateStr] || {};
    
    const html = slots.map(time => {
      const maxCapacity = capacity[time] || 999;
      const currentBookings = dateReservations[time] || 0;
      const remaining = maxCapacity - currentBookings;
      const isSoldOut = DISABLE_RESERVATION_SLOT_LIMITS ? false : (remaining <= 0);
      
      let slotClass = 'time-slot';
      let isDisabled = disabled || isSoldOut;
      let statusHTML = '';
      
      if (isSoldOut) {
        slotClass += ' sold-out';
        statusHTML = `<span class="time-status badge-danger">${soldOutLabel}</span>`;
      } else if (maxCapacity < 999) {
        statusHTML = `<span class="time-status badge-success">残り${remaining}名</span>`;
      }
      
      return `
        <button type="button" 
                class="${slotClass}" 
                data-time="${time}" 
                ${isDisabled ? 'disabled' : ''} 
                aria-label="${time}の予約${isSoldOut ? '（' + soldOutLabel + '）' : ''}">
          <span class="time-text">${time}</span>
          ${statusHTML}
        </button>
      `;
    }).join('');
    
    this.els.timeSlots.innerHTML = html;
  }

  renderTimeSlots() {
    // 初期レンダリング（日付未選択時）
    if (!this.els.timeSlots) return;
    const slots = String(this.config.timeSlots || '').split(',').map(t => t.trim()).filter(Boolean);
    const disabled = this.config.paused === true ? 'disabled' : '';
    this.els.timeSlots.innerHTML = slots.map(t => `<button type="button" class="time-slot" data-time="${t}" ${disabled} aria-label="${t}の予約">${t}</button>`).join('');
  }

  onTimeClick(e) {
    const btn = e.target.closest('.time-slot');
    if (!btn || btn.disabled) return;
    this.els.timeSlots.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
    btn.classList.add('selected');
    this.state.selectedTime = btn.dataset.time;
    this.updateHidden(this.state.selectedDate, this.state.selectedTime);
    btn.style.transform = 'scale(1.05)'; setTimeout(() => btn.style.transform = '', 180);
  }

  updateHidden(date, time) {
    if (this.els.hiddenDate) this.els.hiddenDate.value = date || '';
    if (this.els.hiddenTime) this.els.hiddenTime.value = time || '';
  }

  formatDate(d) {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.weekend-reservation').forEach(container => {
    if (!container.weekendReservationCalendar) {
      container.weekendReservationCalendar = new WeekendReservationCalendar(container);
    }
  });
});