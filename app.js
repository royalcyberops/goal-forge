(() => {
  "use strict";

  const STORAGE_KEY = "goal-forge-state-v1";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DEFAULT_HABITS = [
    "Wake up at 05:00",
    "Gym",
    "Reading / Learning",
    "Day Planning",
    "Project Work",
    "Social Media Detox",
    "Goal Journaling",
    "10k Steps",
    "Plan Tomorrow"
  ];
  const MOODS = ["Awful", "Low", "Okay", "Good", "Great"];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const pad = (n) => String(n).padStart(2, "0");
  const currentDate = new Date();
  const defaultKey = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`;
  let editingHabitId = null;
  let toastTimer = null;

  function makeId() {
    return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function createInitialState() {
    const habits = DEFAULT_HABITS.map((name, index) => ({ id: `starter-${index + 1}`, name }));
    const state = { activeMonth: defaultKey, habits, months: {} };
    state.months[defaultKey] = { checks: {}, moods: {}, sleep: {} };
    const daysElapsed = Math.min(currentDate.getDate() - 1, 12);
    habits.forEach((habit, habitIndex) => {
      state.months[defaultKey].checks[habit.id] = [];
      for (let day = 1; day <= daysElapsed; day += 1) {
        const score = (day * 7 + habitIndex * 11) % 10;
        if (score > (habitIndex % 3 === 0 ? 3 : 4)) state.months[defaultKey].checks[habit.id].push(day);
      }
    });
    for (let day = 1; day <= daysElapsed; day += 1) {
      state.months[defaultKey].moods[day] = 2 + ((day * 3) % 3);
      state.months[defaultKey].sleep[day] = [6.5, 7, 7.5, 8, 6][day % 5];
    }
    return state;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.habits && saved?.months) return saved;
    } catch (error) {
      console.warn("Could not read saved Goal Forge data", error);
    }
    return createInitialState();
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeParts() {
    const [year, month] = state.activeMonth.split("-").map(Number);
    return { year, month: month - 1 };
  }

  function daysInActiveMonth() {
    const { year, month } = activeParts();
    return new Date(year, month + 1, 0).getDate();
  }

  function monthData() {
    if (!state.months[state.activeMonth]) state.months[state.activeMonth] = { checks: {}, moods: {}, sleep: {} };
    const data = state.months[state.activeMonth];
    data.checks ||= {};
    data.moods ||= {};
    data.sleep ||= {};
    state.habits.forEach((habit) => { data.checks[habit.id] ||= []; });
    return data;
  }

  function isCurrentDisplayedMonth() {
    return state.activeMonth === `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`;
  }

  function completionForHabit(id) {
    return monthData().checks[id]?.length || 0;
  }

  function percentage(actual, total) {
    return total ? Math.round((actual / total) * 100) : 0;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function populateCalendarControls() {
    const { year, month } = activeParts();
    const yearSelect = $("#year-select");
    const minYear = Math.min(currentDate.getFullYear() - 2, year - 2);
    const maxYear = Math.max(currentDate.getFullYear() + 4, year + 2);
    yearSelect.innerHTML = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
      .map((value) => `<option value="${value}" ${value === year ? "selected" : ""}>${value}</option>`).join("");
    $("#month-select").innerHTML = MONTHS.map((name, i) => `<option value="${i}" ${i === month ? "selected" : ""}>${name}</option>`).join("");
    $("#month-summary").textContent = `${MONTHS[month]} ${year} · ${daysInActiveMonth()} days`;
  }

  function getWeekGroups(days) {
    const groups = [];
    for (let start = 1, week = 1; start <= days; start += 7, week += 1) {
      groups.push({ week, start, count: Math.min(7, days - start + 1) });
    }
    return groups;
  }

  function renderTracker() {
    const days = daysInActiveMonth();
    const data = monthData();
    const grid = $("#habit-grid");
    const cellWidth = window.matchMedia("(max-width: 820px)").matches ? 44 : 31;
    grid.style.gridTemplateColumns = `220px repeat(${days}, ${cellWidth}px)`;
    grid.style.gridAutoRows = `${cellWidth}px`;
    let html = `<div class="habit-heading" style="grid-column:1">My Habits</div>`;
    getWeekGroups(days).forEach((group) => {
      html += `<div class="week-heading" style="grid-column:span ${group.count}">Week ${group.week}</div>`;
    });
    html += `<div class="day-cell day-label">Day</div>`;
    for (let day = 1; day <= days; day += 1) {
      const today = isCurrentDisplayedMonth() && day === currentDate.getDate();
      html += `<div class="day-cell ${today ? "today" : ""}">${day}</div>`;
    }
    state.habits.forEach((habit) => {
      html += `<div class="habit-name-cell"><span title="${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</span><button class="habit-menu" data-edit="${habit.id}" aria-label="Edit ${escapeHtml(habit.name)}">···</button></div>`;
      for (let day = 1; day <= days; day += 1) {
        const checked = data.checks[habit.id]?.includes(day);
        const today = isCurrentDisplayedMonth() && day === currentDate.getDate();
        html += `<label class="check-cell"><input class="habit-check ${today ? "today-check" : ""}" type="checkbox" data-habit="${habit.id}" data-day="${day}" ${checked ? "checked" : ""} aria-label="${escapeHtml(habit.name)}, ${MONTHS[activeParts().month]} ${day}" /></label>`;
      }
    });
    if (!state.habits.length) {
      html += `<div class="habit-name-cell" style="grid-column:1 / -1; min-height:68px">No habits yet. Add your first habit.</div>`;
    }
    grid.innerHTML = html;
    $("#tracker-subtitle").textContent = `${state.habits.length} habits · tap a square when the habit is done`;
  }

  function dailyPercentages() {
    const days = daysInActiveMonth();
    const data = monthData();
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const done = state.habits.reduce((sum, habit) => sum + (data.checks[habit.id]?.includes(day) ? 1 : 0), 0);
      return percentage(done, state.habits.length);
    });
  }

  function renderCharts() {
    const daily = dailyPercentages();
    $("#daily-chart").innerHTML = daily.map((value, i) => {
      const day = i + 1;
      const label = day === 1 || day % 3 === 1 || day === daily.length ? day : "";
      const current = isCurrentDisplayedMonth() && day === currentDate.getDate();
      return `<div class="bar-wrap" title="Day ${day}: ${value}%"><div class="bar ${current ? "current" : ""}" style="height:${value}%"></div>${label ? `<span class="bar-label">${label}</span>` : ""}</div>`;
    }).join("");
    $("#daily-chart").setAttribute("aria-label", `Daily completion for ${MONTHS[activeParts().month]}: ${daily.slice(0, 7).join(", ")} percent for the first seven days.`);

    const weekly = getWeekGroups(daily.length).map((group) => {
      const slice = daily.slice(group.start - 1, group.start - 1 + group.count);
      return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
    });
    $("#weekly-chart").innerHTML = weekly.map((value, i) => `<div class="bar-wrap" title="Week ${i + 1}: ${value}%"><div class="bar" style="height:${value}%"></div><span class="bar-label">Week ${i + 1}</span></div>`).join("");
    $("#weekly-chart").setAttribute("aria-label", `Weekly completion: ${weekly.map((value, index) => `week ${index + 1}, ${value} percent`).join("; ")}.`);
  }

  function renderStats() {
    const goal = state.habits.length * daysInActiveMonth();
    const completed = state.habits.reduce((sum, habit) => sum + completionForHabit(habit.id), 0);
    const left = Math.max(0, goal - completed);
    const percent = percentage(completed, goal);
    $("#goal-count").textContent = goal;
    $("#completed-count").textContent = completed;
    $("#left-count").textContent = left;
    $("#overall-percent").textContent = `${percent}%`;
    $("#overall-donut").style.background = `conic-gradient(var(--ink) 0 ${percent}%, #e3e4e1 ${percent}% 100%)`;

    const lifetimeCompleted = Object.values(state.months).reduce((all, month) => {
      return all + Object.values(month.checks || {}).reduce((sum, days) => sum + days.length, 0);
    }, 0);
    const xp = lifetimeCompleted * 10;
    const level = Math.floor(xp / 500) + 1;
    const withinLevel = xp % 500;
    $("#level-badge").textContent = `LEVEL ${level}`;
    $("#xp-label").textContent = `${withinLevel} / 500 XP`;
    $("#xp-fill").style.width = `${(withinLevel / 500) * 100}%`;
  }

  function renderAnalysis() {
    const days = daysInActiveMonth();
    const ranked = state.habits.map((habit, index) => {
      const actual = completionForHabit(habit.id);
      return { ...habit, index, actual, left: days - actual, percent: percentage(actual, days) };
    });
    const header = `<div class="analysis-row header"><span>#</span><span>Habit</span><span class="center">Goal</span><span class="center">Actual</span><span class="center">Left</span><span>Progress</span><span class="center">%</span></div>`;
    $("#analysis-table").innerHTML = header + ranked.map((item, index) => `<div class="analysis-row"><span class="center">${index + 1}</span><span class="analysis-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><span class="center">${days}</span><span class="center">${item.actual}</span><span class="center">${item.left}</span><span class="progress-cell"><i class="progress-track"><span style="width:${item.percent}%"></span></i></span><strong class="center">${item.percent}%</strong></div>`).join("");
    $("#top-habits").innerHTML = ranked.sort((a, b) => b.percent - a.percent || a.index - b.index).slice(0, 10).map((item) => `<li class="top-habit"><span class="top-habit-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><i class="progress-track"><span style="width:${item.percent}%"></span></i><strong>${item.percent}%</strong></li>`).join("");
  }

  function currentStreak(id) {
    const checks = new Set(monthData().checks[id] || []);
    const maxDay = isCurrentDisplayedMonth() ? Math.min(currentDate.getDate(), daysInActiveMonth()) : daysInActiveMonth();
    let day = maxDay;
    if (!checks.has(day) && isCurrentDisplayedMonth()) day -= 1;
    let streak = 0;
    while (day > 0 && checks.has(day)) { streak += 1; day -= 1; }
    return streak;
  }

  function renderStreaks() {
    const streaks = state.habits.map((habit) => ({ ...habit, streak: currentStreak(habit.id) })).sort((a, b) => b.streak - a.streak).slice(0, 4);
    $("#streak-list").innerHTML = streaks.some((item) => item.streak) ? streaks.map((item) => `<div class="streak-row"><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><strong>${item.streak}</strong></div>`).join("") : `<div class="empty-streak">Complete two days in a row to start a streak.</div>`;
  }

  function renderLogs() {
    const days = daysInActiveMonth();
    const data = monthData();
    const logCellWidth = window.matchMedia("(max-width: 820px)").matches ? 44 : 38;
    const columns = `150px repeat(${days}, ${logCellWidth}px)`;
    const dayHeaders = Array.from({ length: days }, (_, i) => `<div class="log-cell log-day">${i + 1}</div>`).join("");
    $("#mood-log").style.gridTemplateColumns = columns;
    $("#mood-log").style.gridAutoRows = `${logCellWidth}px`;
    $("#mood-log").innerHTML = `<div class="log-cell log-label">Mood</div>${dayHeaders}<div class="log-cell log-label">Score</div>${Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const mood = Number(data.moods[day] ?? -1);
      return `<div class="log-cell"><button class="mood-button ${mood >= 0 ? "active" : ""}" data-mood-day="${day}" data-mood="${mood}" title="${mood >= 0 ? MOODS[mood] : "Add mood"}" aria-label="Mood for day ${day}: ${mood >= 0 ? MOODS[mood] : "not set"}">${mood >= 0 ? mood + 1 : "·"}</button></div>`;
    }).join("")}`;

    $("#sleep-log").style.gridTemplateColumns = columns;
    $("#sleep-log").style.gridAutoRows = `${logCellWidth}px`;
    $("#sleep-log").innerHTML = `<div class="log-cell log-label">Sleep (hrs)</div>${dayHeaders}<div class="log-cell log-label">Hours</div>${Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const value = data.sleep[day] ?? "";
      return `<div class="log-cell"><input class="sleep-input" type="number" min="0" max="16" step="0.5" value="${value}" data-sleep-day="${day}" aria-label="Hours of sleep for day ${day}" /></div>`;
    }).join("")}`;
  }

  function renderAll({ keepScroll = false } = {}) {
    const trackerScroll = $("#tracker-scroll");
    const scrollLeft = keepScroll ? trackerScroll.scrollLeft : 0;
    populateCalendarControls();
    renderTracker();
    renderCharts();
    renderStats();
    renderAnalysis();
    renderStreaks();
    renderLogs();
    if (keepScroll) $("#tracker-scroll").scrollLeft = scrollLeft;
    saveState();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function toggleHabit(habitId, day, checkbox) {
    const list = monthData().checks[habitId] ||= [];
    const index = list.indexOf(day);
    if (index >= 0) list.splice(index, 1);
    else {
      list.push(day);
      list.sort((a, b) => a - b);
      checkbox.classList.add("celebrate");
      const habit = state.habits.find((item) => item.id === habitId);
      showToast(`+10 XP · ${habit?.name || "Habit"} completed`);
    }
    renderCharts();
    renderStats();
    renderAnalysis();
    renderStreaks();
    saveState();
  }

  function openHabitDialog(habitId = null) {
    editingHabitId = habitId;
    const habit = state.habits.find((item) => item.id === habitId);
    $("#habit-dialog-title").textContent = habit ? "Edit habit" : "Add a habit";
    $("#dialog-habit-name").value = habit?.name || "";
    $("#delete-habit-button").classList.toggle("hidden", !habit);
    $("#habit-dialog").showModal();
    setTimeout(() => $("#dialog-habit-name").focus(), 50);
  }

  function addHabit(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const habit = { id: makeId(), name: trimmed };
    state.habits.push(habit);
    Object.values(state.months).forEach((month) => { month.checks ||= {}; month.checks[habit.id] = []; });
    renderAll();
    showToast(`${trimmed} added`);
  }

  function bindEvents() {
    $("#year-select").addEventListener("change", (event) => {
      const { month } = activeParts();
      state.activeMonth = `${event.target.value}-${pad(month + 1)}`;
      renderAll();
    });
    $("#month-select").addEventListener("change", (event) => {
      const { year } = activeParts();
      state.activeMonth = `${year}-${pad(Number(event.target.value) + 1)}`;
      renderAll();
    });
    $("#today-button").addEventListener("click", () => {
      state.activeMonth = defaultKey;
      renderAll();
      showToast("Jumped to this month");
    });
    $("#quick-add-form").addEventListener("submit", (event) => {
      event.preventDefault();
      addHabit($("#habit-name").value);
      event.target.reset();
    });

    $("#habit-grid").addEventListener("change", (event) => {
      if (!event.target.matches(".habit-check")) return;
      toggleHabit(event.target.dataset.habit, Number(event.target.dataset.day), event.target);
    });
    $("#habit-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit]");
      if (button) openHabitDialog(button.dataset.edit);
    });
    $("#add-habit-inline").addEventListener("click", () => openHabitDialog());
    $("#mobile-add").addEventListener("click", () => openHabitDialog());

    $("#habit-dialog-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = $("#dialog-habit-name").value.trim();
      if (!value) return;
      if (editingHabitId) {
        const habit = state.habits.find((item) => item.id === editingHabitId);
        if (habit) habit.name = value;
        showToast("Habit updated");
      } else addHabit(value);
      $("#habit-dialog").close();
      renderAll();
    });
    $("#delete-habit-button").addEventListener("click", () => {
      const habit = state.habits.find((item) => item.id === editingHabitId);
      if (!habit || !confirm(`Delete “${habit.name}” and all its history?`)) return;
      state.habits = state.habits.filter((item) => item.id !== editingHabitId);
      Object.values(state.months).forEach((month) => delete month.checks?.[editingHabitId]);
      $("#habit-dialog").close();
      renderAll();
      showToast("Habit deleted");
    });

    $("#mood-log").addEventListener("click", (event) => {
      const button = event.target.closest("[data-mood-day]");
      if (!button) return;
      const day = button.dataset.moodDay;
      const current = Number(monthData().moods[day] ?? -1);
      monthData().moods[day] = (current + 1) % MOODS.length;
      renderLogs();
      saveState();
    });
    $("#sleep-log").addEventListener("change", (event) => {
      if (!event.target.matches("[data-sleep-day]")) return;
      const value = Number(event.target.value);
      if (!event.target.value) delete monthData().sleep[event.target.dataset.sleepDay];
      else monthData().sleep[event.target.dataset.sleepDay] = Math.min(16, Math.max(0, value));
      saveState();
    });

    $$('[data-target]').forEach((button) => button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      $$(".nav-item, .mobile-nav button").forEach((item) => item.classList.toggle("active", item.dataset.target === button.dataset.target));
    }));

    const settingsDialog = $("#settings-dialog");
    [$("#settings-button"), $("#settings-nav")].forEach((button) => button.addEventListener("click", () => settingsDialog.showModal()));
    $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeDialog)?.close();
    }));
    $("#export-button").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `goal-forge-backup-${state.activeMonth}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported");
    });
    $("#clear-month-button").addEventListener("click", () => {
      if (!confirm(`Clear all check-ins and logs for ${MONTHS[activeParts().month]} ${activeParts().year}?`)) return;
      state.months[state.activeMonth] = { checks: {}, moods: {}, sleep: {} };
      settingsDialog.close();
      renderAll();
      showToast("This month was cleared");
    });
    $("#reset-button").addEventListener("click", () => {
      if (!confirm("Reset Goal Forge and delete all saved history?")) return;
      state = createInitialState();
      settingsDialog.close();
      renderAll();
      showToast("Goal Forge reset");
    });
  }

  renderAll();
  bindEvents();
})();
