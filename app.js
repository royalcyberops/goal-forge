(() => {
  "use strict";

  const STORAGE_KEY = "goal-forge-state-v1";
  const SCHEMA_VERSION = 2;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const CATEGORIES = ["Career", "Health", "Learning", "Mindset", "Life"];
  const MOODS = ["Awful", "Low", "Okay", "Good", "Great"];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const STARTER_HABITS = [
    {
      name: "Wake up at 05:00",
      category: "Mindset",
      why: "Win the first hour before distractions can choose it for me.",
      minimum: "Get out of bed, drink water, and stand by the window.",
      proof: "Log the wake-up time.",
      time: "05:00",
      scheduledDays: ALL_DAYS,
      goalId: "goal-focus"
    },
    {
      name: "Gym",
      category: "Health",
      why: "Build the strength and energy that make every other goal easier.",
      minimum: "Do the first planned set or a 10-minute minimum workout.",
      proof: "Save the workout or timer in the training log.",
      time: "07:00",
      scheduledDays: [1, 2, 3, 4, 5, 6],
      goalId: "goal-health"
    },
    {
      name: "Reading / Learning",
      category: "Learning",
      why: "Turn daily study into practical knowledge I can reuse.",
      minimum: "Read or practise for 10 focused minutes.",
      proof: "Write one dated takeaway or example.",
      time: "20:00",
      scheduledDays: ALL_DAYS,
      goalId: "goal-career"
    },
    {
      name: "Day Planning",
      category: "Mindset",
      why: "Choose the important work before urgent noise takes over.",
      minimum: "Write the top three outcomes for today.",
      proof: "Keep a dated three-line plan.",
      time: "05:15",
      scheduledDays: ALL_DAYS,
      goalId: "goal-focus"
    },
    {
      name: "Project Work",
      category: "Career",
      why: "Create visible proof of my cybersecurity and development ability.",
      minimum: "Work for 10 focused minutes and save one useful artifact.",
      proof: "A dated commit, lab note, screenshot, rule, or result.",
      time: "18:30",
      scheduledDays: [1, 2, 3, 4, 5, 6],
      goalId: "goal-career"
    },
    {
      name: "Social Media Detox",
      category: "Mindset",
      why: "Protect attention for study, health, and meaningful work.",
      minimum: "Keep the phone away for one 25-minute focus block.",
      proof: "Log the finished focus block.",
      time: "09:00",
      scheduledDays: ALL_DAYS,
      goalId: "goal-focus"
    },
    {
      name: "Goal Journaling",
      category: "Mindset",
      why: "Notice what is working and correct course early.",
      minimum: "Write one win, one lesson, and one next move.",
      proof: "A dated three-line journal entry.",
      time: "21:15",
      scheduledDays: ALL_DAYS,
      goalId: ""
    },
    {
      name: "10k Steps",
      category: "Health",
      why: "Keep daily movement high enough to support energy and recovery.",
      minimum: "Take a purposeful 10-minute walk.",
      proof: "Save the step count or walk timer.",
      time: "17:30",
      scheduledDays: ALL_DAYS,
      goalId: "goal-health"
    },
    {
      name: "Plan Tomorrow",
      category: "Mindset",
      why: "Make tomorrow easier to start and harder to avoid.",
      minimum: "Choose tomorrow's first task and prepare what it needs.",
      proof: "A written first task for tomorrow.",
      time: "21:30",
      scheduledDays: ALL_DAYS,
      goalId: "goal-focus"
    }
  ];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const pad = (number) => String(number).padStart(2, "0");
  const freshNow = () => new Date();
  const localDateISO = (date = freshNow()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const monthKeyFor = (date = freshNow()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const defaultKey = monthKeyFor();
  let editingHabitId = null;
  let editingGoalId = null;
  let toastTimer = null;
  let persistenceEnabled = true;

  function makeId(prefix = "h") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function dateAfter(days) {
    const date = freshNow();
    date.setDate(date.getDate() + days);
    return localDateISO(date);
  }

  function createStarterGoals() {
    return [
      {
        id: "goal-career",
        title: "Ship cybersecurity proof",
        category: "Career",
        why: "Turn study time into portfolio evidence that an employer or client can inspect.",
        target: 20,
        unit: "artifacts",
        current: 0,
        deadline: dateAfter(45),
        nextAction: "Spend 10 focused minutes and save one dated note, screenshot, rule, lab result, or commit.",
        proof: "A dated file, screenshot, lab note, detection rule, or repository commit.",
        priority: 1,
        status: "active",
        createdOn: localDateISO()
      },
      {
        id: "goal-health",
        title: "Build strength consistency",
        category: "Health",
        why: "Create a stronger body and steadier energy through repeatable training, not perfect sessions.",
        target: 12,
        unit: "workouts",
        current: 0,
        deadline: dateAfter(35),
        nextAction: "Do the first planned set or complete a 10-minute minimum workout.",
        proof: "A workout entry, timer, or completed routine.",
        priority: 2,
        status: "active",
        createdOn: localDateISO()
      },
      {
        id: "goal-focus",
        title: "Protect focused study",
        category: "Learning",
        why: "Build the attention needed to learn faster and finish meaningful work every week.",
        target: 20,
        unit: "focus blocks",
        current: 0,
        deadline: dateAfter(30),
        nextAction: "Start one 25-minute phone-free study block and save what you produced.",
        proof: "A dated note, solved exercise, code change, or finished study block.",
        priority: 3,
        status: "active",
        createdOn: localDateISO()
      }
    ];
  }

  function inferHabitDefaults(name) {
    const value = String(name || "").toLowerCase();
    if (/gym|workout|step|walk|run|sleep|water|health/.test(value)) {
      return {
        category: "Health",
        why: "Build steady energy and physical resilience.",
        minimum: "Do a 10-minute minimum version.",
        proof: "Save a timer, count, or short activity log.",
        goalId: "goal-health"
      };
    }
    if (/project|cyber|code|portfolio|job|career|lab/.test(value)) {
      return {
        category: "Career",
        why: "Turn focused work into visible career proof.",
        minimum: "Work for 10 focused minutes and save one useful artifact.",
        proof: "A dated file, note, screenshot, result, or commit.",
        goalId: "goal-career"
      };
    }
    if (/read|learn|study|course|practice/.test(value)) {
      return {
        category: "Learning",
        why: "Build knowledge through a small action I can repeat.",
        minimum: "Study or practise for 10 focused minutes.",
        proof: "Write one dated takeaway or completed example.",
        goalId: "goal-focus"
      };
    }
    if (/plan|journal|meditat|detox|wake|focus/.test(value)) {
      return {
        category: "Mindset",
        why: "Protect attention and make deliberate progress easier.",
        minimum: "Complete the two-minute version.",
        proof: "Write a short dated check-in.",
        goalId: "goal-focus"
      };
    }
    return {
      category: "Life",
      why: "Raise my daily baseline through consistent action.",
      minimum: "Complete the smallest useful version in two minutes.",
      proof: "Leave a visible check-in or short note.",
      goalId: ""
    };
  }

  function normalizeDays(value) {
    if (!Array.isArray(value)) return [...ALL_DAYS];
    const days = [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
    return days.length ? days.sort((a, b) => a - b) : [...ALL_DAYS];
  }

  function normalizeGoal(goal, index, usedIds) {
    if (!goal || typeof goal !== "object") return null;
    let id = typeof goal.id === "string" && goal.id ? goal.id : makeId("g");
    if (usedIds.has(id)) id = makeId("g");
    usedIds.add(id);
    const targetValue = Number(goal.target);
    const currentValue = Number(goal.current);
    const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 1;
    const current = Number.isFinite(currentValue) && currentValue >= 0 ? currentValue : 0;
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(goal.deadline || "") ? goal.deadline : "";
    return {
      id,
      title: String(goal.title || `Goal ${index + 1}`).trim().slice(0, 80) || `Goal ${index + 1}`,
      category: CATEGORIES.includes(goal.category) ? goal.category : "Life",
      why: String(goal.why || "Create measurable progress that improves daily life.").trim().slice(0, 240),
      target,
      unit: String(goal.unit || "sessions").trim().slice(0, 32) || "sessions",
      current,
      deadline,
      nextAction: String(goal.nextAction || goal.next || "Complete the smallest useful next action.").trim().slice(0, 240),
      proof: String(goal.proof || "Leave a dated note or visible result.").trim().slice(0, 240),
      priority: Number.isFinite(Number(goal.priority)) ? Number(goal.priority) : index + 1,
      status: current >= target || goal.status === "completed" ? "completed" : "active",
      createdOn: /^\d{4}-\d{2}-\d{2}$/.test(goal.createdOn || "") ? goal.createdOn : localDateISO(),
      completedOn: current >= target ? (goal.completedOn || localDateISO()) : ""
    };
  }

  function normalizeHabit(habit, index, goalIds, seedLinks) {
    if (!habit || typeof habit !== "object") return null;
    const name = String(habit.name || `Habit ${index + 1}`).trim().slice(0, 64) || `Habit ${index + 1}`;
    const starter = STARTER_HABITS.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const inferred = starter || inferHabitDefaults(name);
    const hadSchedule = Array.isArray(habit.scheduledDays || habit.schedule);
    const suggestedGoal = seedLinks ? inferred.goalId : "";
    const requestedGoal = String(habit.goalId || "");
    const goalId = goalIds.has(requestedGoal) ? requestedGoal : (goalIds.has(suggestedGoal) ? suggestedGoal : "");
    const scheduledDays = seedLinks && !hadSchedule
      ? [...ALL_DAYS]
      : normalizeDays(habit.scheduledDays || habit.schedule || starter?.scheduledDays);
    const rawHistory = Array.isArray(habit.scheduleHistory) ? habit.scheduleHistory : [];
    const historyExisted = rawHistory.length > 0;
    const scheduleHistory = rawHistory.map((entry) => ({
      from: /^\d{4}-\d{2}-\d{2}$/.test(entry?.from || "") ? entry.from : "0000-01-01",
      days: normalizeDays(entry?.days)
    })).sort((a, b) => a.from.localeCompare(b.from));
    if (!scheduleHistory.length) scheduleHistory.push({ from: "0000-01-01", days: [...scheduledDays] });
    const scheduleStartedOn = historyExisted && /^\d{4}-\d{2}-\d{2}$/.test(habit.scheduleStartedOn || "") ? habit.scheduleStartedOn : "";
    return {
      id: typeof habit.id === "string" && habit.id ? habit.id : makeId(),
      name,
      category: CATEGORIES.includes(habit.category) ? habit.category : inferred.category,
      why: String(habit.why || inferred.why).trim().slice(0, 240),
      minimum: String(habit.minimum || habit.minimumAction || inferred.minimum).trim().slice(0, 240),
      proof: String(habit.proof || inferred.proof).trim().slice(0, 240),
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(habit.time || habit.timeOfDay || starter?.time || "") ? (habit.time || habit.timeOfDay || starter.time) : "",
      scheduledDays,
      scheduleHistory,
      goalId,
      trackingStartedOn: /^\d{4}-\d{2}-\d{2}$/.test(habit.trackingStartedOn || "") ? habit.trackingStartedOn : (hadSchedule ? localDateISO() : "0000-01-01"),
      scheduleStartedOn,
      createdOn: /^\d{4}-\d{2}-\d{2}$/.test(habit.createdOn || "") ? habit.createdOn : localDateISO()
    };
  }

  function normalizeMonth(rawMonth, habits) {
    const source = rawMonth && typeof rawMonth === "object" ? rawMonth : {};
    const checks = {};
    Object.entries(source.checks && typeof source.checks === "object" ? source.checks : {}).forEach(([id, days]) => {
      checks[id] = Array.isArray(days)
        ? [...new Set(days.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b)
        : [];
    });
    habits.forEach((habit) => { checks[habit.id] ||= []; });
    const moods = {};
    Object.entries(source.moods && typeof source.moods === "object" ? source.moods : {}).forEach(([day, mood]) => {
      const value = Number(mood);
      if (Number.isInteger(value) && value >= 0 && value < MOODS.length) moods[day] = value;
    });
    const sleep = {};
    Object.entries(source.sleep && typeof source.sleep === "object" ? source.sleep : {}).forEach(([day, hours]) => {
      const value = Number(hours);
      if (Number.isFinite(value) && value >= 0 && value <= 16) sleep[day] = value;
    });
    return { checks, moods, sleep };
  }

  function normalizeState(raw) {
    if (!raw || !Array.isArray(raw.habits) || !raw.months || typeof raw.months !== "object") return null;
    const seedGoals = !Array.isArray(raw.goals);
    const usedGoalIds = new Set();
    const goals = (seedGoals ? createStarterGoals() : raw.goals)
      .map((goal, index) => normalizeGoal(goal, index, usedGoalIds))
      .filter(Boolean);
    const goalIds = new Set(goals.map((goal) => goal.id));
    const usedHabitIds = new Set();
    const habits = raw.habits.map((habit, index) => normalizeHabit(habit, index, goalIds, seedGoals)).filter(Boolean).map((habit) => {
      if (usedHabitIds.has(habit.id)) habit.id = makeId();
      usedHabitIds.add(habit.id);
      return habit;
    });
    const months = {};
    Object.entries(raw.months).forEach(([key, month]) => {
      if (/^\d{4}-\d{2}$/.test(key)) months[key] = normalizeMonth(month, habits);
    });
    const activeMonth = /^\d{4}-\d{2}$/.test(raw.activeMonth || "") ? raw.activeMonth : defaultKey;
    months[activeMonth] ||= normalizeMonth({}, habits);
    return { schemaVersion: SCHEMA_VERSION, activeMonth, habits, goals, months };
  }

  function createInitialState() {
    const today = localDateISO();
    const firstOfMonth = `${monthKeyFor()}-01`;
    const goals = createStarterGoals();
    const habits = STARTER_HABITS.map((habit, index) => ({
      id: `starter-${index + 1}`,
      ...habit,
      scheduledDays: [...habit.scheduledDays],
      scheduleHistory: [{ from: firstOfMonth, days: [...habit.scheduledDays] }],
      trackingStartedOn: firstOfMonth,
      scheduleStartedOn: today,
      createdOn: today
    }));
    const initial = { schemaVersion: SCHEMA_VERSION, activeMonth: defaultKey, habits, goals, months: {} };
    initial.months[defaultKey] = normalizeMonth({}, habits);
    const now = freshNow();
    const daysElapsed = Math.min(now.getDate() - 1, 12);
    habits.forEach((habit, habitIndex) => {
      for (let day = 1; day <= daysElapsed; day += 1) {
        const score = (day * 7 + habitIndex * 11) % 10;
        if (score > (habitIndex % 3 === 0 ? 3 : 4)) initial.months[defaultKey].checks[habit.id].push(day);
      }
    });
    for (let day = 1; day <= daysElapsed; day += 1) {
      initial.months[defaultKey].moods[day] = 2 + ((day * 3) % 3);
      initial.months[defaultKey].sleep[day] = [6.5, 7, 7.5, 8, 6][day % 5];
    }
    return initial;
  }

  function loadState() {
    const rawText = localStorage.getItem(STORAGE_KEY);
    if (!rawText) return createInitialState();
    try {
      const normalized = normalizeState(JSON.parse(rawText));
      if (normalized) return normalized;
      persistenceEnabled = false;
      console.warn("Goal Forge found saved data it could not safely migrate. The original browser data was left untouched.");
    } catch (error) {
      persistenceEnabled = false;
      console.warn("Could not read saved Goal Forge data. The original browser data was left untouched.", error);
    }
    return createInitialState();
  }

  let state = loadState();

  function saveState() {
    if (!persistenceEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save Goal Forge data", error);
    }
  }

  function partsForKey(key) {
    const [year, month] = key.split("-").map(Number);
    return { year, month: month - 1 };
  }

  function activeParts() {
    return partsForKey(state.activeMonth);
  }

  function daysInMonthKey(key) {
    const { year, month } = partsForKey(key);
    return new Date(year, month + 1, 0).getDate();
  }

  function daysInActiveMonth() {
    return daysInMonthKey(state.activeMonth);
  }

  function dateForDay(key, day) {
    const { year, month } = partsForKey(key);
    return new Date(year, month, day);
  }

  function ensureMonthData(key) {
    state.months[key] ||= { checks: {}, moods: {}, sleep: {} };
    const data = state.months[key];
    data.checks ||= {};
    data.moods ||= {};
    data.sleep ||= {};
    state.habits.forEach((habit) => { data.checks[habit.id] ||= []; });
    return data;
  }

  function monthData(key = state.activeMonth) {
    return ensureMonthData(key);
  }

  function isCurrentDisplayedMonth() {
    return state.activeMonth === monthKeyFor();
  }

  function isHabitScheduledOn(habit, date) {
    const iso = localDateISO(date);
    if (habit.trackingStartedOn && iso < habit.trackingStartedOn) return false;
    const history = Array.isArray(habit.scheduleHistory) ? [...habit.scheduleHistory].sort((a, b) => a.from.localeCompare(b.from)) : [];
    const schedule = history.filter((entry) => !entry.from || entry.from <= iso).at(-1);
    return normalizeDays(schedule?.days || habit.scheduledDays).includes(date.getDay());
  }

  function isHabitDueOn(habit, key, day, data = monthData(key)) {
    return isHabitScheduledOn(habit, dateForDay(key, day)) || (data.checks[habit.id] || []).includes(day);
  }

  function scheduledTargetForHabit(habit, key = state.activeMonth) {
    const data = monthData(key);
    let target = 0;
    for (let day = 1; day <= daysInMonthKey(key); day += 1) {
      if (isHabitDueOn(habit, key, day, data)) target += 1;
    }
    return target;
  }

  function completionForHabit(id, key = state.activeMonth) {
    return monthData(key).checks[id]?.length || 0;
  }

  function percentage(actual, total) {
    return total ? Math.round((actual / total) * 100) : 0;
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, "");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function populateCalendarControls() {
    const { year, month } = activeParts();
    const yearSelect = $("#year-select");
    if (!yearSelect) return;
    const nowYear = freshNow().getFullYear();
    const minYear = Math.min(nowYear - 2, year - 2);
    const maxYear = Math.max(nowYear + 4, year + 2);
    yearSelect.innerHTML = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index)
      .map((value) => `<option value="${value}" ${value === year ? "selected" : ""}>${value}</option>`).join("");
    $("#month-select").innerHTML = MONTHS.map((name, index) => `<option value="${index}" ${index === month ? "selected" : ""}>${name}</option>`).join("");
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
    const grid = $("#habit-grid");
    if (!grid) return;
    const days = daysInActiveMonth();
    const data = monthData();
    const isMobile = window.matchMedia("(max-width: 820px)").matches;
    const cellWidth = isMobile ? 44 : 31;
    const rowHeight = isMobile ? 48 : 40;
    grid.style.gridTemplateColumns = `220px repeat(${days}, ${cellWidth}px)`;
    grid.style.gridAutoRows = `${rowHeight}px`;
    let html = `<div class="habit-heading" style="grid-column:1">My Habits</div>`;
    getWeekGroups(days).forEach((group) => {
      html += `<div class="week-heading" style="grid-column:span ${group.count}">Week ${group.week}</div>`;
    });
    html += `<div class="day-cell day-label">Day</div>`;
    const today = freshNow();
    for (let day = 1; day <= days; day += 1) {
      const isToday = isCurrentDisplayedMonth() && day === today.getDate();
      html += `<div class="day-cell ${isToday ? "today" : ""}">${day}</div>`;
    }
    state.habits.forEach((habit) => {
      const meta = [habit.category, habit.time ? habit.time : "Flexible"].join(" · ");
      html += `<div class="habit-name-cell"><span class="habit-name-copy"><span class="habit-name-main" title="${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</span><small class="habit-name-meta">${escapeHtml(meta)}</small></span><button class="habit-menu" data-edit="${habit.id}" aria-label="Edit ${escapeHtml(habit.name)}">···</button></div>`;
      for (let day = 1; day <= days; day += 1) {
        const checked = data.checks[habit.id]?.includes(day);
        const scheduled = isHabitScheduledOn(habit, dateForDay(state.activeMonth, day));
        const unavailable = !scheduled && !checked;
        const isToday = isCurrentDisplayedMonth() && day === today.getDate();
        const scheduleText = unavailable ? ", not scheduled" : "";
        html += `<label class="check-cell ${unavailable ? "off-day" : ""}" title="${unavailable ? "Rest / off day" : ""}"><input class="habit-check ${isToday ? "today-check" : ""}" type="checkbox" data-habit="${habit.id}" data-day="${day}" ${checked ? "checked" : ""} ${unavailable ? "disabled" : ""} aria-label="${escapeHtml(habit.name)}, ${MONTHS[activeParts().month]} ${day}${scheduleText}" /></label>`;
      }
    });
    if (!state.habits.length) {
      html += `<div class="habit-name-cell empty-state" style="grid-column:1 / -1; min-height:68px">No habits yet. Plan one small action you can prove today.</div>`;
    }
    grid.innerHTML = html;
    $("#tracker-subtitle").textContent = `${state.habits.length} habits · shaded squares are rest days`;
  }

  function dailyPercentages() {
    const days = daysInActiveMonth();
    const data = monthData();
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const due = state.habits.filter((habit) => isHabitDueOn(habit, state.activeMonth, day, data));
      const done = due.reduce((sum, habit) => sum + (data.checks[habit.id]?.includes(day) ? 1 : 0), 0);
      return percentage(done, due.length);
    });
  }

  function renderCharts() {
    const daily = dailyPercentages();
    $("#daily-chart").innerHTML = daily.map((value, index) => {
      const day = index + 1;
      const label = day === 1 || day % 3 === 1 || day === daily.length ? day : "";
      const current = isCurrentDisplayedMonth() && day === freshNow().getDate();
      return `<div class="bar-wrap" title="Day ${day}: ${value}%"><div class="bar ${current ? "current" : ""}" style="height:${value}%"></div>${label ? `<span class="bar-label">${label}</span>` : ""}</div>`;
    }).join("");
    $("#daily-chart").setAttribute("aria-label", `Daily completion for ${MONTHS[activeParts().month]}: ${daily.slice(0, 7).join(", ")} percent for the first seven days.`);
    const weekly = getWeekGroups(daily.length).map((group) => {
      const slice = daily.slice(group.start - 1, group.start - 1 + group.count);
      return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
    });
    $("#weekly-chart").innerHTML = weekly.map((value, index) => `<div class="bar-wrap" title="Week ${index + 1}: ${value}%"><div class="bar" style="height:${value}%"></div><span class="bar-label">Week ${index + 1}</span></div>`).join("");
    $("#weekly-chart").setAttribute("aria-label", `Weekly completion: ${weekly.map((value, index) => `week ${index + 1}, ${value} percent`).join("; ")}.`);
  }

  function renderStats() {
    const possible = state.habits.reduce((sum, habit) => sum + scheduledTargetForHabit(habit), 0);
    const completed = state.habits.reduce((sum, habit) => sum + completionForHabit(habit.id), 0);
    const left = Math.max(0, possible - completed);
    const percent = percentage(completed, possible);
    $("#goal-count").textContent = possible;
    $("#completed-count").textContent = completed;
    $("#left-count").textContent = left;
    $("#overall-percent").textContent = `${percent}%`;
    $("#overall-donut").style.background = `conic-gradient(var(--ink) 0 ${Math.min(percent, 100)}%, #e3e4e1 ${Math.min(percent, 100)}% 100%)`;
    const lifetimeCompleted = Object.values(state.months).reduce((all, month) => {
      return all + Object.values(month.checks || {}).reduce((sum, days) => sum + (Array.isArray(days) ? days.length : 0), 0);
    }, 0);
    const xp = lifetimeCompleted * 10;
    const level = Math.floor(xp / 500) + 1;
    const withinLevel = xp % 500;
    $("#level-badge").textContent = `LEVEL ${level}`;
    $("#xp-label").textContent = `${withinLevel} / 500 XP`;
    $("#xp-fill").style.width = `${(withinLevel / 500) * 100}%`;
  }

  function renderAnalysis() {
    const ranked = state.habits.map((habit, index) => {
      const target = scheduledTargetForHabit(habit);
      const actual = completionForHabit(habit.id);
      return { ...habit, index, target, actual, left: Math.max(0, target - actual), percent: percentage(actual, target) };
    });
    const header = `<div class="analysis-row header"><span>#</span><span>Habit</span><span class="center">Plan</span><span class="center">Actual</span><span class="center">Left</span><span>Progress</span><span class="center">%</span></div>`;
    $("#analysis-table").innerHTML = header + ranked.map((item, index) => `<div class="analysis-row"><span class="center">${index + 1}</span><span class="analysis-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><span class="center">${item.target}</span><span class="center">${item.actual}</span><span class="center">${item.left}</span><span class="progress-cell"><i class="progress-track"><span style="width:${Math.min(item.percent, 100)}%"></span></i></span><strong class="center">${item.percent}%</strong></div>`).join("");
    const top = [...ranked].sort((a, b) => b.percent - a.percent || a.index - b.index).slice(0, 10);
    $("#top-habits").innerHTML = top.length ? top.map((item) => `<li class="top-habit"><span class="top-habit-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><i class="progress-track"><span style="width:${Math.min(item.percent, 100)}%"></span></i><strong>${item.percent}%</strong></li>`).join("") : `<li class="empty-state">Add a habit to build your first trend.</li>`;
  }

  function currentStreak(habit) {
    const now = freshNow();
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oldest = /^\d{4}-\d{2}-\d{2}$/.test(habit.trackingStartedOn || "")
      ? new Date(`${habit.trackingStartedOn}T00:00:00`)
      : new Date(cursor.getFullYear() - 2, cursor.getMonth(), cursor.getDate());
    let streak = 0;
    let dueDaysSeen = 0;
    for (let scanned = 0; scanned < 730 && cursor >= oldest; scanned += 1) {
      if (isHabitScheduledOn(habit, cursor)) {
        const key = monthKeyFor(cursor);
        const checked = (state.months[key]?.checks?.[habit.id] || []).includes(cursor.getDate());
        if (checked) streak += 1;
        else if (!(dueDaysSeen === 0 && localDateISO(cursor) === localDateISO(now))) break;
        dueDaysSeen += 1;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderStreaks() {
    const streaks = state.habits.map((habit) => ({ ...habit, streak: currentStreak(habit) })).sort((a, b) => b.streak - a.streak).slice(0, 4);
    $("#streak-list").innerHTML = streaks.some((item) => item.streak)
      ? streaks.map((item) => `<div class="streak-row"><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><strong>${item.streak}</strong></div>`).join("")
      : `<div class="empty-streak">Complete two planned days to start a streak.</div>`;
  }

  function renderLogs() {
    const days = daysInActiveMonth();
    const data = monthData();
    const logCellWidth = window.matchMedia("(max-width: 820px)").matches ? 44 : 38;
    const columns = `150px repeat(${days}, ${logCellWidth}px)`;
    const dayHeaders = Array.from({ length: days }, (_, index) => `<div class="log-cell log-day">${index + 1}</div>`).join("");
    $("#mood-log").style.gridTemplateColumns = columns;
    $("#mood-log").style.gridAutoRows = `${logCellWidth}px`;
    $("#mood-log").innerHTML = `<div class="log-cell log-label">Mood</div>${dayHeaders}<div class="log-cell log-label">Score</div>${Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const mood = Number(data.moods[day] ?? -1);
      return `<div class="log-cell"><button class="mood-button ${mood >= 0 ? "active" : ""}" data-mood-day="${day}" data-mood="${mood}" title="${mood >= 0 ? MOODS[mood] : "Add mood"}" aria-label="Mood for day ${day}: ${mood >= 0 ? MOODS[mood] : "not set"}">${mood >= 0 ? mood + 1 : "·"}</button></div>`;
    }).join("")}`;
    $("#sleep-log").style.gridTemplateColumns = columns;
    $("#sleep-log").style.gridAutoRows = `${logCellWidth}px`;
    $("#sleep-log").innerHTML = `<div class="log-cell log-label">Sleep (hrs)</div>${dayHeaders}<div class="log-cell log-label">Hours</div>${Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const value = data.sleep[day] ?? "";
      return `<div class="log-cell"><input class="sleep-input" type="number" min="0" max="16" step="0.5" value="${value}" data-sleep-day="${day}" aria-label="Hours of sleep for day ${day}" /></div>`;
    }).join("")}`;
  }

  function goalDeadlineMeta(goal) {
    if (!goal.deadline) return "No deadline";
    const deadline = new Date(`${goal.deadline}T00:00:00`);
    const today = new Date(`${localDateISO()}T00:00:00`);
    const days = Math.round((deadline - today) / 86400000);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  }

  function renderGoals() {
    const list = $("#goals-list");
    if (!list) return;
    const goals = [...state.goals].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return a.priority - b.priority;
    });
    if (!goals.length) {
      list.innerHTML = `<div class="empty-state"><strong>No goals yet.</strong><span>Add one outcome, give it a number, then link the habits that move it.</span><button class="small-button" type="button" data-empty-add-goal>Add your first goal</button></div>`;
      return;
    }
    list.innerHTML = goals.map((goal) => {
      const progress = Math.min(100, percentage(goal.current, goal.target));
      const linked = state.habits.filter((habit) => habit.goalId === goal.id);
      const complete = goal.status === "completed" || goal.current >= goal.target;
      return `<article class="goal-row ${complete ? "is-complete" : ""}" data-goal-id="${goal.id}">
        <div class="goal-main">
          <div class="goal-top"><span class="goal-category">${escapeHtml(goal.category)}</span><h3>${escapeHtml(goal.title)}</h3>${complete ? `<span class="goal-status">Complete</span>` : ""}</div>
          <p class="goal-why">${escapeHtml(goal.why)}</p>
          <div class="goal-progress" role="progressbar" aria-label="${escapeHtml(goal.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span class="goal-progress-bar" style="width:${progress}%"></span></div>
          <div class="goal-meta"><strong>${formatNumber(goal.current)} / ${formatNumber(goal.target)} ${escapeHtml(goal.unit)}</strong><span>${goalDeadlineMeta(goal)}</span><span>${linked.length} linked habit${linked.length === 1 ? "" : "s"}</span><span>${progress}%</span></div>
          <p class="goal-step"><strong>Next smallest move</strong><span>${escapeHtml(goal.nextAction)}</span><small>Proof: ${escapeHtml(goal.proof)}</small></p>
        </div>
        <div class="goal-actions">
          <button class="small-button" type="button" data-goal-increment="${goal.id}" ${complete ? "disabled" : ""}>${complete ? "Completed" : `+1 ${escapeHtml(goal.unit)}`}</button>
          <button class="secondary-button" type="button" data-goal-edit="${goal.id}">Edit</button>
        </div>
      </article>`;
    }).join("");
  }

  function focusRanking(habit, goal) {
    let score = goal && goal.status === "active" ? 100 - Number(goal.priority || 0) : 0;
    if (goal?.deadline) {
      const days = Math.round((new Date(`${goal.deadline}T00:00:00`) - new Date(`${localDateISO()}T00:00:00`)) / 86400000);
      if (days >= 0 && days <= 14) score += 30 - days;
    }
    if (habit.time) score += 5;
    return score;
  }

  function renderDailyFocus() {
    const list = $("#daily-focus-list");
    if (!list) return;
    const now = freshNow();
    const todayKey = monthKeyFor(now);
    const day = now.getDate();
    const data = monthData(todayKey);
    const due = state.habits.filter((habit) => isHabitDueOn(habit, todayKey, day, data));
    const completed = due.filter((habit) => data.checks[habit.id]?.includes(day));
    const percent = percentage(completed.length, due.length);
    $("#daily-score-value").textContent = `${percent}%`;
    const dateLabel = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const sleep = Number(data.sleep[day]);
    const mood = Number(data.moods[day]);
    let mode = "Small proof beats a perfect plan.";
    if (Number.isFinite(sleep) && sleep > 0 && sleep < 6.5) mode = "Low-energy mode: minimum versions count today.";
    else if (Number.isInteger(mood) && mood <= 1) mode = "Keep the bar low, but keep the promise.";
    $("#daily-score-label").textContent = `${completed.length}/${due.length} planned · ${dateLabel} · ${mode}`;
    const goalsById = new Map(state.goals.map((goal) => [goal.id, goal]));
    const unfinished = due.filter((habit) => !data.checks[habit.id]?.includes(day)).map((habit) => ({ habit, goal: goalsById.get(habit.goalId) })).sort((a, b) => {
      const scoreDiff = focusRanking(b.habit, b.goal) - focusRanking(a.habit, a.goal);
      if (scoreDiff) return scoreDiff;
      return (a.habit.time || "99:99").localeCompare(b.habit.time || "99:99");
    });
    if (unfinished.length) {
      list.innerHTML = unfinished.slice(0, 3).map(({ habit, goal }, index) => `<article class="focus-item">
        <div class="focus-copy">
          <span class="focus-eyebrow">${index + 1 < 10 ? `0${index + 1}` : index + 1} · ${escapeHtml(goal?.title || habit.category)}${habit.time ? ` · ${escapeHtml(habit.time)}` : ""}</span>
          <h3>${escapeHtml(habit.name)}</h3>
          <p class="focus-action"><strong>Minimum win</strong> ${escapeHtml(habit.minimum)}</p>
          <p class="focus-proof">Proof: ${escapeHtml(habit.proof)}</p>
        </div>
        <button class="focus-done" type="button" data-focus-habit="${habit.id}">Mark done</button>
      </article>`).join("") + (unfinished.length > 3 ? `<p class="focus-more">${unfinished.length - 3} more planned habit${unfinished.length - 3 === 1 ? "" : "s"} are waiting in the tracker.</p>` : "");
      return;
    }
    if (due.length && completed.length === due.length) {
      list.innerHTML = `<div class="empty-state focus-complete"><strong>Daily plan complete.</strong><span>You kept today's promises. Log one line about what made it work so you can repeat it.</span></div>`;
      return;
    }
    const nextGoals = state.goals.filter((goal) => goal.status === "active").sort((a, b) => a.priority - b.priority).slice(0, 2);
    list.innerHTML = nextGoals.length ? nextGoals.map((goal) => `<article class="focus-item">
      <div class="focus-copy"><span class="focus-eyebrow">${escapeHtml(goal.category)} · unlinked goal</span><h3>${escapeHtml(goal.title)}</h3><p class="focus-action"><strong>Next move</strong> ${escapeHtml(goal.nextAction)}</p><p class="focus-proof">Proof: ${escapeHtml(goal.proof)}</p></div>
      <button class="focus-done" type="button" data-focus-goal="${goal.id}">View goal</button>
    </article>`).join("") : `<div class="empty-state"><strong>Your day is open.</strong><span>Add one goal and one small habit that makes it more likely.</span></div>`;
  }

  function renderGoalOptions(selectedId = "") {
    const select = $("#dialog-habit-goal");
    if (!select) return;
    select.innerHTML = `<option value="">No linked goal</option>` + state.goals.map((goal) => `<option value="${goal.id}" ${goal.id === selectedId ? "selected" : ""}>${escapeHtml(goal.title)}${goal.status === "completed" ? " (complete)" : ""}</option>`).join("");
  }

  function renderAll({ keepScroll = false } = {}) {
    const trackerScroll = $("#tracker-scroll");
    const scrollLeft = keepScroll && trackerScroll ? trackerScroll.scrollLeft : 0;
    populateCalendarControls();
    renderDailyFocus();
    renderGoals();
    renderTracker();
    renderCharts();
    renderStats();
    renderAnalysis();
    renderStreaks();
    renderLogs();
    if (keepScroll && $("#tracker-scroll")) $("#tracker-scroll").scrollLeft = scrollLeft;
    saveState();
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setHabitCompletion(habitId, key, day, done) {
    const list = monthData(key).checks[habitId] ||= [];
    const index = list.indexOf(day);
    if (done && index < 0) {
      list.push(day);
      list.sort((a, b) => a - b);
      return true;
    }
    if (!done && index >= 0) list.splice(index, 1);
    return false;
  }

  function completeHabitFromUI(habitId, key, day, done) {
    const newlyCompleted = setHabitCompletion(habitId, key, day, done);
    const habit = state.habits.find((item) => item.id === habitId);
    renderAll({ keepScroll: true });
    if (newlyCompleted) showToast(`+10 XP · ${habit?.name || "Habit"} completed`);
  }

  function valueFor(selector, value = "") {
    const field = $(selector);
    if (field) field.value = value;
  }

  function openHabitDialog(habitId = null, prefill = {}) {
    editingHabitId = habitId;
    const habit = state.habits.find((item) => item.id === habitId);
    const defaults = inferHabitDefaults(prefill.name || "");
    const form = $("#habit-form") || $("#habit-dialog-form");
    form?.reset();
    $("#habit-dialog-title").textContent = habit ? "Edit habit" : "Plan a habit";
    valueFor("#habit-edit-id", habit?.id || "");
    valueFor("#dialog-habit-name", habit?.name || prefill.name || "");
    valueFor("#dialog-habit-category", habit?.category || defaults.category);
    renderGoalOptions(habit?.goalId || defaults.goalId);
    valueFor("#dialog-habit-why", habit?.why || defaults.why);
    valueFor("#dialog-habit-minimum", habit?.minimum || defaults.minimum);
    valueFor("#dialog-habit-proof", habit?.proof || defaults.proof);
    valueFor("#dialog-habit-time", habit?.time || "");
    const selectedDays = new Set(habit?.scheduledDays || ALL_DAYS);
    $$('input[name="habit-day"]', $("#dialog-habit-days") || document).forEach((checkbox) => {
      checkbox.checked = selectedDays.has(Number(checkbox.value));
    });
    $("#delete-habit-button")?.classList.toggle("hidden", !habit);
    const dialog = $("#habit-dialog");
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $("#dialog-habit-name")?.focus(), 50);
  }

  function collectHabitForm() {
    const name = $("#dialog-habit-name").value.trim();
    const days = $$('input[name="habit-day"]:checked', $("#dialog-habit-days") || document).map((checkbox) => Number(checkbox.value));
    if (!days.length) {
      showToast("Choose at least one day for this habit");
      $("#dialog-habit-days")?.focus();
      return null;
    }
    const inferred = inferHabitDefaults(name);
    const requestedGoal = $("#dialog-habit-goal")?.value || "";
    return {
      name,
      category: CATEGORIES.includes($("#dialog-habit-category")?.value) ? $("#dialog-habit-category").value : inferred.category,
      goalId: state.goals.some((goal) => goal.id === requestedGoal) ? requestedGoal : "",
      why: ($("#dialog-habit-why")?.value.trim() || inferred.why).slice(0, 240),
      minimum: ($("#dialog-habit-minimum")?.value.trim() || inferred.minimum).slice(0, 240),
      proof: ($("#dialog-habit-proof")?.value.trim() || inferred.proof).slice(0, 240),
      time: $("#dialog-habit-time")?.value || "",
      scheduledDays: normalizeDays(days)
    };
  }

  function addHabit(details) {
    const today = localDateISO();
    const habit = { id: makeId(), ...details, scheduleHistory: [{ from: today, days: [...details.scheduledDays] }], trackingStartedOn: today, scheduleStartedOn: today, createdOn: today };
    state.habits.push(habit);
    Object.values(state.months).forEach((month) => { month.checks ||= {}; month.checks[habit.id] = []; });
    return habit;
  }

  function openGoalDialog(goalId = null) {
    editingGoalId = goalId;
    const goal = state.goals.find((item) => item.id === goalId);
    const form = $("#goal-form");
    form?.reset();
    $("#goal-dialog-title").textContent = goal ? "Edit goal" : "Add a measurable goal";
    valueFor("#goal-edit-id", goal?.id || "");
    valueFor("#dialog-goal-title", goal?.title || "");
    valueFor("#dialog-goal-category", goal?.category || "Career");
    valueFor("#dialog-goal-why", goal?.why || "");
    valueFor("#dialog-goal-target", goal?.target ?? 20);
    valueFor("#dialog-goal-unit", goal?.unit || "sessions");
    valueFor("#dialog-goal-current", goal?.current ?? 0);
    valueFor("#dialog-goal-deadline", goal?.deadline || dateAfter(30));
    valueFor("#dialog-goal-next", goal?.nextAction || "");
    valueFor("#dialog-goal-proof", goal?.proof || "");
    $("#delete-goal-button")?.classList.toggle("hidden", !goal);
    const dialog = $("#goal-dialog");
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $("#dialog-goal-title")?.focus(), 50);
  }

  function collectGoalForm() {
    const title = $("#dialog-goal-title").value.trim();
    const target = Number($("#dialog-goal-target").value);
    const current = Number($("#dialog-goal-current").value || 0);
    if (!title || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0) return null;
    const inferredProof = "A dated note, screenshot, log, file, or completed result.";
    return {
      title: title.slice(0, 80),
      category: CATEGORIES.includes($("#dialog-goal-category")?.value) ? $("#dialog-goal-category").value : "Life",
      why: ($("#dialog-goal-why")?.value.trim() || "Make measurable progress that improves daily life.").slice(0, 240),
      target,
      unit: ($("#dialog-goal-unit")?.value.trim() || "sessions").slice(0, 32),
      current,
      deadline: $("#dialog-goal-deadline")?.value || "",
      nextAction: ($("#dialog-goal-next")?.value.trim() || "Complete the smallest useful next action.").slice(0, 240),
      proof: ($("#dialog-goal-proof")?.value.trim() || inferredProof).slice(0, 240),
      status: current >= target ? "completed" : "active"
    };
  }

  function targetElement(targetId) {
    const aliases = {
      "dashboard-top": ["dashboard-top", "dashboard"],
      dashboard: ["dashboard", "dashboard-top"],
      "habit-section": ["habit-section", "habits-section"],
      "habits-section": ["habits-section", "habit-section"]
    };
    return (aliases[targetId] || [targetId]).map((id) => document.getElementById(id)).find(Boolean) || null;
  }

  function bindEvents() {
    $("#year-select")?.addEventListener("change", (event) => {
      const { month } = activeParts();
      state.activeMonth = `${event.target.value}-${pad(month + 1)}`;
      renderAll();
    });
    $("#month-select")?.addEventListener("change", (event) => {
      const { year } = activeParts();
      state.activeMonth = `${year}-${pad(Number(event.target.value) + 1)}`;
      renderAll();
    });
    $("#today-button")?.addEventListener("click", () => {
      state.activeMonth = monthKeyFor();
      renderAll();
      targetElement("daily-focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Showing today and this month");
    });
    $("#quick-add-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = $("#habit-name");
      const name = input.value.trim();
      if (!name) return;
      openHabitDialog(null, { name });
      event.target.reset();
    });

    $("#habit-grid")?.addEventListener("change", (event) => {
      if (!event.target.matches(".habit-check")) return;
      completeHabitFromUI(event.target.dataset.habit, state.activeMonth, Number(event.target.dataset.day), event.target.checked);
    });
    $("#habit-grid")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit]");
      if (button) openHabitDialog(button.dataset.edit);
    });
    $("#add-habit-inline")?.addEventListener("click", () => openHabitDialog());
    const mobileAdd = $("#add-habit-mobile") || $("#mobile-add");
    mobileAdd?.addEventListener("click", () => openHabitDialog());

    const habitForm = $("#habit-form") || $("#habit-dialog-form");
    habitForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const details = collectHabitForm();
      if (!details) return;
      if (editingHabitId) {
        const habit = state.habits.find((item) => item.id === editingHabitId);
        if (habit) {
          const previousDays = normalizeDays(habit.scheduledDays);
          const scheduleChanged = JSON.stringify(previousDays) !== JSON.stringify(normalizeDays(details.scheduledDays));
          Object.assign(habit, details);
          if (scheduleChanged) {
            const today = localDateISO();
            habit.scheduleStartedOn = today;
            habit.scheduleHistory ||= [{ from: "0000-01-01", days: previousDays }];
            habit.scheduleHistory = habit.scheduleHistory.filter((entry) => entry.from !== today);
            habit.scheduleHistory.push({ from: today, days: [...details.scheduledDays] });
            habit.scheduleHistory.sort((a, b) => a.from.localeCompare(b.from));
          }
        }
        showToast("Habit plan updated");
      } else {
        const habit = addHabit(details);
        showToast(`${habit.name} added`);
      }
      $("#habit-dialog")?.close();
      renderAll();
    });
    $("#habit-cancel")?.addEventListener("click", () => $("#habit-dialog")?.close());
    $("#delete-habit-button")?.addEventListener("click", () => {
      const habit = state.habits.find((item) => item.id === editingHabitId);
      if (!habit || !confirm(`Delete “${habit.name}” and all its history?`)) return;
      state.habits = state.habits.filter((item) => item.id !== editingHabitId);
      Object.values(state.months).forEach((month) => delete month.checks?.[editingHabitId]);
      $("#habit-dialog")?.close();
      renderAll();
      showToast("Habit deleted");
    });

    $("#add-goal-button")?.addEventListener("click", () => openGoalDialog());
    $("#goals-list")?.addEventListener("click", (event) => {
      const emptyAdd = event.target.closest("[data-empty-add-goal]");
      if (emptyAdd) return openGoalDialog();
      const edit = event.target.closest("[data-goal-edit]");
      if (edit) return openGoalDialog(edit.dataset.goalEdit);
      const increment = event.target.closest("[data-goal-increment]");
      if (!increment) return;
      const goal = state.goals.find((item) => item.id === increment.dataset.goalIncrement);
      if (!goal || goal.status === "completed") return;
      goal.current = Math.min(goal.target, Number(goal.current) + 1);
      if (goal.current >= goal.target) {
        goal.status = "completed";
        goal.completedOn = localDateISO();
        showToast(`${goal.title} completed`);
      } else showToast(`Progress logged for ${goal.title}`);
      renderAll();
    });
    $("#goal-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const details = collectGoalForm();
      if (!details) return;
      if (editingGoalId) {
        const goal = state.goals.find((item) => item.id === editingGoalId);
        if (goal) {
          Object.assign(goal, details);
          goal.completedOn = details.status === "completed" ? (goal.completedOn || localDateISO()) : "";
        }
        showToast("Goal updated");
      } else {
        state.goals.push({ id: makeId("g"), ...details, priority: state.goals.length + 1, createdOn: localDateISO(), completedOn: details.status === "completed" ? localDateISO() : "" });
        showToast("Goal added");
      }
      $("#goal-dialog")?.close();
      renderAll();
    });
    $("#goal-cancel")?.addEventListener("click", () => $("#goal-dialog")?.close());
    $("#delete-goal-button")?.addEventListener("click", () => {
      const goal = state.goals.find((item) => item.id === editingGoalId);
      if (!goal || !confirm(`Delete “${goal.title}”? Linked habits and their history will stay.`)) return;
      state.goals = state.goals.filter((item) => item.id !== editingGoalId);
      state.habits.forEach((habit) => { if (habit.goalId === editingGoalId) habit.goalId = ""; });
      $("#goal-dialog")?.close();
      renderAll();
      showToast("Goal deleted; habits kept");
    });

    $("#daily-focus-list")?.addEventListener("click", (event) => {
      const habitButton = event.target.closest("[data-focus-habit]");
      if (habitButton) {
        const now = freshNow();
        completeHabitFromUI(habitButton.dataset.focusHabit, monthKeyFor(now), now.getDate(), true);
        return;
      }
      const goalButton = event.target.closest("[data-focus-goal]");
      if (goalButton) targetElement("goals-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#jump-to-goals")?.addEventListener("click", () => targetElement("goals-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));

    $("#mood-log")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mood-day]");
      if (!button) return;
      const day = button.dataset.moodDay;
      const current = Number(monthData().moods[day] ?? -1);
      monthData().moods[day] = (current + 1) % MOODS.length;
      renderLogs();
      if (isCurrentDisplayedMonth() && Number(day) === freshNow().getDate()) renderDailyFocus();
      saveState();
    });
    $("#sleep-log")?.addEventListener("change", (event) => {
      if (!event.target.matches("[data-sleep-day]")) return;
      const value = Number(event.target.value);
      if (!event.target.value) delete monthData().sleep[event.target.dataset.sleepDay];
      else monthData().sleep[event.target.dataset.sleepDay] = Math.min(16, Math.max(0, value));
      if (isCurrentDisplayedMonth() && Number(event.target.dataset.sleepDay) === freshNow().getDate()) renderDailyFocus();
      saveState();
    });

    $$('[data-target]').forEach((button) => button.addEventListener("click", () => {
      const target = targetElement(button.dataset.target);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      $$(".nav-item, .mobile-nav button").forEach((item) => item.classList.toggle("active", item.dataset.target === button.dataset.target));
    }));

    const settingsDialog = $("#settings-dialog");
    [$("#settings-button"), $("#settings-nav")].filter(Boolean).forEach((button) => button.addEventListener("click", () => settingsDialog.showModal()));
    $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeDialog)?.close();
    }));
    $("#export-button")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `goal-forge-backup-${state.activeMonth}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported");
    });
    $("#clear-month-button")?.addEventListener("click", () => {
      if (!confirm(`Clear all check-ins and logs for ${MONTHS[activeParts().month]} ${activeParts().year}?`)) return;
      state.months[state.activeMonth] = { checks: {}, moods: {}, sleep: {} };
      settingsDialog.close();
      renderAll();
      showToast("This month was cleared; goals were kept");
    });
    $("#reset-button")?.addEventListener("click", () => {
      if (!confirm("Reset Goal Forge and delete all saved history and goals?")) return;
      persistenceEnabled = true;
      state = createInitialState();
      settingsDialog.close();
      renderAll();
      showToast("Goal Forge reset");
    });
  }

  renderAll();
  bindEvents();
})();
