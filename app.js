const DEFAULT_DURATIONS = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

const DURATIONS = loadDurations();

function loadDurations() {
  try {
    const saved = JSON.parse(localStorage.getItem("focusflow_durations"));
    if (saved && saved.focus && saved.short && saved.long) return saved;
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_DURATIONS };
}

function saveDurations() {
  localStorage.setItem("focusflow_durations", JSON.stringify(DURATIONS));
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

const state = {
  mode: "focus",
  secondsLeft: DURATIONS.focus,
  running: false,
  intervalId: null,
  tasks: loadTasks(),
  activeTaskId: loadActiveTaskId(),
  sessionCount: loadSessionCount(),
};

const els = {
  timeDisplay: document.getElementById("timeDisplay"),
  ringProgress: document.querySelector(".ring-progress"),
  modeButtons: document.querySelectorAll(".mode-btn"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  activeTaskLabel: document.getElementById("activeTaskLabel"),
  sessionCount: document.getElementById("sessionCount"),
  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  taskList: document.getElementById("taskList"),
  statsChart: document.getElementById("statsChart"),
  weekTotal: document.getElementById("weekTotal"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsCancel: document.getElementById("settingsCancel"),
  focusInput: document.getElementById("focusInput"),
  shortInput: document.getElementById("shortInput"),
  longInput: document.getElementById("longInput"),
};

els.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem("focusflow_tasks")) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem("focusflow_tasks", JSON.stringify(state.tasks));
}

function loadActiveTaskId() {
  return localStorage.getItem("focusflow_active_task") || null;
}

function saveActiveTaskId() {
  if (state.activeTaskId) {
    localStorage.setItem("focusflow_active_task", state.activeTaskId);
  } else {
    localStorage.removeItem("focusflow_active_task");
  }
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return "focusflow_sessions_" + formatDateKey(new Date());
}

function sessionsOn(date) {
  return parseInt(localStorage.getItem("focusflow_sessions_" + formatDateKey(date)) || "0", 10);
}

function loadSessionCount() {
  return sessionsOn(new Date());
}

function saveSessionCount() {
  localStorage.setItem(todayKey(), String(state.sessionCount));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplay() {
  els.timeDisplay.textContent = formatTime(state.secondsLeft);
  const total = DURATIONS[state.mode];
  const fraction = state.secondsLeft / total;
  els.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);

  const isBreak = state.mode !== "focus";
  els.ringProgress.style.stroke = isBreak
    ? getComputedStyle(document.documentElement).getPropertyValue("--break")
    : getComputedStyle(document.documentElement).getPropertyValue("--accent");

  els.startPauseBtn.textContent = state.running ? "Pause" : "Start";
  els.sessionCount.textContent = state.sessionCount;

  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
  if (activeTask) {
    els.activeTaskLabel.textContent = `Working on: ${activeTask.name}`;
    els.activeTaskLabel.classList.add("set");
  } else {
    els.activeTaskLabel.textContent = "No task selected";
    els.activeTaskLabel.classList.remove("set");
  }

  document.title = state.running
    ? `${formatTime(state.secondsLeft)} · Focus Flow`
    : "Focus Flow";
}

function setMode(mode) {
  state.mode = mode;
  state.secondsLeft = DURATIONS[mode];
  stopTimer();
  els.modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  updateDisplay();
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  updateDisplay();
}

function stopTimer() {
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateDisplay();
}

function resetTimer() {
  stopTimer();
  state.secondsLeft = DURATIONS[state.mode];
  updateDisplay();
}

function endActiveSession() {
  stopTimer();
  state.secondsLeft = DURATIONS[state.mode];
  updateDisplay();
}

function tick() {
  state.secondsLeft -= 1;
  if (state.secondsLeft <= 0) {
    completeSession();
    return;
  }
  updateDisplay();
}

function completeSession() {
  stopTimer();
  playDing();

  if (state.mode === "focus") {
    state.sessionCount += 1;
    saveSessionCount();
    renderStats();

    const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
    if (activeTask) {
      activeTask.pomodoros = (activeTask.pomodoros || 0) + 1;
      saveTasks();
      renderTasks();
    }
  }

  state.secondsLeft = DURATIONS[state.mode];
  updateDisplay();
  notify();
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // audio not available, ignore
  }
}

function notify() {
  const label = state.mode === "focus" ? "Focus session done — take a break!" : "Break's over — back to it!";
  if (Notification && Notification.permission === "granted") {
    new Notification("Focus Flow", { body: label });
  }
}

function requestNotifyPermission() {
  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderStats() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const counts = days.map(sessionsOn);
  const max = Math.max(...counts, 1);
  const MAX_BAR_HEIGHT = 90;

  els.statsChart.innerHTML = "";
  days.forEach((d, idx) => {
    const count = counts[idx];
    const isToday = idx === days.length - 1;

    const col = document.createElement("div");
    col.className = "stats-bar-col" + (isToday ? " today" : "");

    const value = document.createElement("div");
    value.className = "stats-bar-value";
    value.textContent = count;

    const bar = document.createElement("div");
    bar.className = "stats-bar";
    const barHeight = count > 0 ? Math.max((count / max) * MAX_BAR_HEIGHT, 8) : 3;
    bar.style.height = `${barHeight}px`;

    const label = document.createElement("div");
    label.className = "stats-bar-label";
    label.textContent = WEEKDAY_LABELS[d.getDay()];

    col.appendChild(value);
    col.appendChild(bar);
    col.appendChild(label);
    els.statsChart.appendChild(col);
  });

  els.weekTotal.textContent = counts.reduce((a, b) => a + b, 0);
}

function renderTasks() {
  els.taskList.innerHTML = "";

  if (state.tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No tasks yet. Add one to start tracking focus sessions.";
    els.taskList.appendChild(empty);
    return;
  }

  state.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.id === state.activeTaskId) li.classList.add("selected");
    if (task.done) li.classList.add("done");

    const check = document.createElement("div");
    check.className = "task-check";
    check.textContent = task.done ? "✓" : "";
    check.addEventListener("click", (e) => {
      e.stopPropagation();
      task.done = !task.done;
      saveTasks();
      if (task.done && task.id === state.activeTaskId) {
        endActiveSession();
      }
      renderTasks();
    });

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.name;

    const badge = document.createElement("span");
    badge.className = "pomo-badge";
    const count = task.pomodoros || 0;
    badge.textContent = `🍅 ${count}`;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "✕";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      if (state.activeTaskId === task.id) {
        state.activeTaskId = null;
        saveActiveTaskId();
      }
      saveTasks();
      renderTasks();
      updateDisplay();
    });

    li.addEventListener("click", () => {
      state.activeTaskId = task.id;
      saveActiveTaskId();
      renderTasks();
      updateDisplay();
    });

    li.appendChild(check);
    li.appendChild(name);
    li.appendChild(badge);
    li.appendChild(del);
    els.taskList.appendChild(li);
  });
}

function addTask(name) {
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    pomodoros: 0,
    done: false,
  };
  state.tasks.push(task);
  if (!state.activeTaskId) {
    state.activeTaskId = task.id;
    saveActiveTaskId();
  }
  saveTasks();
  renderTasks();
  updateDisplay();
}

els.modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

els.startPauseBtn.addEventListener("click", () => {
  requestNotifyPermission();
  if (state.running) {
    stopTimer();
  } else {
    startTimer();
  }
});

els.resetBtn.addEventListener("click", resetTimer);

els.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = els.taskInput.value.trim();
  if (!value) return;
  addTask(value);
  els.taskInput.value = "";
});

function openSettingsPanel() {
  els.focusInput.value = DURATIONS.focus / 60;
  els.shortInput.value = DURATIONS.short / 60;
  els.longInput.value = DURATIONS.long / 60;
  els.settingsPanel.classList.remove("hidden");
}

function closeSettingsPanel() {
  els.settingsPanel.classList.add("hidden");
}

els.settingsToggle.addEventListener("click", () => {
  if (els.settingsPanel.classList.contains("hidden")) {
    openSettingsPanel();
  } else {
    closeSettingsPanel();
  }
});

els.settingsCancel.addEventListener("click", closeSettingsPanel);

els.settingsPanel.addEventListener("submit", (e) => {
  e.preventDefault();
  const focusMin = Math.min(180, Math.max(1, parseInt(els.focusInput.value, 10) || DEFAULT_DURATIONS.focus / 60));
  const shortMin = Math.min(180, Math.max(1, parseInt(els.shortInput.value, 10) || DEFAULT_DURATIONS.short / 60));
  const longMin = Math.min(180, Math.max(1, parseInt(els.longInput.value, 10) || DEFAULT_DURATIONS.long / 60));

  DURATIONS.focus = focusMin * 60;
  DURATIONS.short = shortMin * 60;
  DURATIONS.long = longMin * 60;
  saveDurations();

  resetTimer();
  closeSettingsPanel();
});

renderTasks();
renderStats();
updateDisplay();
