import React, { useState, useEffect } from "react";
import { Plus, Check, Trash2, Flame, Target, StickyNote, CheckSquare, Cpu, CalendarDays, CloudSun, MapPin, RefreshCw } from "lucide-react";

// ── Storage ────────────────────────────────────────────────────────
const store = {
  async get(key, fallback) {
    try { const v = localStorage.getItem("kaisen:" + key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  async set(key, value) {
    try { localStorage.setItem("kaisen:" + key, JSON.stringify(value)); } catch (e) { console.error(e); }
  },
};
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);

// ── HUD panel shell ────────────────────────────────────────────────
function Panel({ label, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <span className="corner tl" /><span className="corner tr" />
      <span className="corner bl" /><span className="corner br" />
      <header className="panel-head">
        <div className="panel-label">{Icon && <Icon size={13} strokeWidth={2.4} />}<span>{label}</span></div>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

// ── Animated core ──────────────────────────────────────────────────
function Core() {
  return (
    <div className="core-wrap">
      <div className="core-rings">
        <span className="ring r1" /><span className="ring r2" /><span className="ring r3" />
        <span className="ring-dash d1" /><span className="ring-dash d2" />
      </div>
      <div className="core-center">
        <div className="core-title">KAISEN</div>
        <div className="core-sub">COMMAND CORE</div>
        <div className="core-ver">v1.0.0</div>
      </div>
      <div className="core-glow" />
    </div>
  );
}

// ── Clock ──────────────────────────────────────────────────────────
function Clock({ now }) {
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Panel label="LOCAL TIME" icon={Cpu} className="clock-panel">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </Panel>
  );
}

// ── Weather (Open-Meteo, no key) ───────────────────────────────────
const WCODE = {
  0: ["Clear", "☀"], 1: ["Mainly clear", "🌤"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁"],
  45: ["Fog", "🌫"], 48: ["Rime fog", "🌫"], 51: ["Light drizzle", "🌦"], 53: ["Drizzle", "🌦"], 55: ["Heavy drizzle", "🌧"],
  61: ["Light rain", "🌦"], 63: ["Rain", "🌧"], 65: ["Heavy rain", "🌧"], 71: ["Light snow", "🌨"], 73: ["Snow", "🌨"], 75: ["Heavy snow", "❄"],
  80: ["Showers", "🌦"], 81: ["Showers", "🌧"], 82: ["Violent showers", "⛈"], 95: ["Thunderstorm", "⛈"], 96: ["Thunderstorm", "⛈"], 99: ["Thunderstorm", "⛈"],
};
function Weather() {
  const [state, setState] = useState({ status: "idle", data: null, place: "" });
  const load = () => {
    setState((s) => ({ ...s, status: "loading" }));
    if (!navigator.geolocation) { setState({ status: "error", data: null, place: "" }); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
          const r = await fetch(url);
          const j = await r.json();
          setState({ status: "ok", data: j, place: `${latitude.toFixed(1)}°, ${longitude.toFixed(1)}°` });
        } catch { setState({ status: "error", data: null, place: "" }); }
      },
      () => setState({ status: "error", data: null, place: "" }),
      { timeout: 10000 }
    );
  };
  useEffect(() => { load(); }, []);

  let body;
  if (state.status === "loading" || state.status === "idle") {
    body = <div className="wx-msg">Locating…</div>;
  } else if (state.status === "error") {
    body = (
      <div className="wx-msg">
        <span>Location unavailable in preview.</span>
        <button className="wx-retry" onClick={load}><RefreshCw size={12} /> Retry</button>
      </div>
    );
  } else {
    const c = state.data.current;
    const [desc, icon] = WCODE[c.weather_code] || ["—", "•"];
    const hi = Math.round(state.data.daily.temperature_2m_max[0]);
    const lo = Math.round(state.data.daily.temperature_2m_min[0]);
    body = (
      <div className="wx">
        <div className="wx-main"><span className="wx-icon">{icon}</span><span className="wx-temp">{Math.round(c.temperature_2m)}°</span></div>
        <div className="wx-info">
          <div className="wx-desc">{desc}</div>
          <div className="wx-sub">Feels {Math.round(c.apparent_temperature)}° · H{hi}° L{lo}°</div>
          <div className="wx-place"><MapPin size={10} /> {state.place}</div>
        </div>
      </div>
    );
  }
  return <Panel label="WEATHER" icon={CloudSun} className="wx-panel">{body}</Panel>;
}

// ── Agenda ─────────────────────────────────────────────────────────
function Agenda({ events, setEvents }) {
  const tk = todayKey();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const todays = events.filter((e) => e.date === tk).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const add = () => { const t = title.trim(); if (!t) return; setEvents([...events, { id: uid(), date: tk, title: t, time }]); setTitle(""); setTime(""); };
  const remove = (id) => setEvents(events.filter((e) => e.id !== id));
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <Panel label="TODAY'S AGENDA" icon={CalendarDays} className="agenda-panel" action={<span className="badge">{todays.length}</span>}>
      <div className="agenda-date">{dateLabel}</div>
      <div className="agenda-input">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="time-in" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New event" className="text-in" />
        <button className="icon-btn" onClick={add} aria-label="Add event"><Plus size={15} /></button>
      </div>
      <ul className="list scroll-tall">
        {todays.map((e) => (
          <li key={e.id} className="agenda-row">
            <span className="agenda-time">{e.time || "—"}</span>
            <span className="agenda-title">{e.title}</span>
            <button className="ghost" onClick={() => remove(e.id)} aria-label="Delete"><Trash2 size={13} /></button>
          </li>
        ))}
        {todays.length === 0 && <li className="empty">Nothing scheduled today.</li>}
      </ul>
      <div className="agenda-note">Manual for now · Google sync available once deployed</div>
    </Panel>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────
function Tasks({ tasks, setTasks }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (!t) return; setTasks([{ id: uid(), text: t, done: false }, ...tasks]); setText(""); };
  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTasks(tasks.filter((t) => t.id !== id));
  const open = tasks.filter((t) => !t.done), done = tasks.filter((t) => t.done);
  return (
    <Panel label="TO-DO" icon={CheckSquare} action={<span className="badge">{open.length}</span>}>
      <div className="input-row">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New task" className="text-in" />
        <button className="icon-btn" onClick={add} aria-label="Add task"><Plus size={15} /></button>
      </div>
      <ul className="list scroll">
        {open.map((t) => (
          <li key={t.id} className="row">
            <button className="check" onClick={() => toggle(t.id)} aria-label="Complete" />
            <span className="flex">{t.text}</span>
            <button className="ghost" onClick={() => remove(t.id)} aria-label="Delete"><Trash2 size={13} /></button>
          </li>
        ))}
        {done.map((t) => (
          <li key={t.id} className="row is-done">
            <button className="check checked" onClick={() => toggle(t.id)} aria-label="Uncomplete"><Check size={11} /></button>
            <span className="flex">{t.text}</span>
            <button className="ghost" onClick={() => remove(t.id)} aria-label="Delete"><Trash2 size={13} /></button>
          </li>
        ))}
        {tasks.length === 0 && <li className="empty">No active tasks.</li>}
      </ul>
    </Panel>
  );
}

// ── Habits ─────────────────────────────────────────────────────────
function streakOf(history) {
  let s = 0; const d = new Date();
  while (history[d.toISOString().slice(0, 10)]) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
function Habits({ habits, setHabits }) {
  const [name, setName] = useState(""); const tk = todayKey();
  const add = () => { const n = name.trim(); if (!n) return; setHabits([...habits, { id: uid(), name: n, history: {} }]); setName(""); };
  const toggle = (id) => setHabits(habits.map((h) => {
    if (h.id !== id) return h; const hist = { ...h.history };
    if (hist[tk]) delete hist[tk]; else hist[tk] = true; return { ...h, history: hist };
  }));
  const remove = (id) => setHabits(habits.filter((h) => h.id !== id));
  const days = [...Array(5)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (4 - i)); return d.toISOString().slice(0, 10); });
  return (
    <Panel label="HABITS" icon={Flame}>
      <div className="input-row">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New habit" className="text-in" />
        <button className="icon-btn" onClick={add} aria-label="Add habit"><Plus size={15} /></button>
      </div>
      <ul className="list scroll">
        {habits.map((h) => {
          const on = !!h.history[tk], streak = streakOf(h.history);
          return (
            <li key={h.id} className="habit">
              <button className={`hab-toggle ${on ? "on" : ""}`} onClick={() => toggle(h.id)}>{on && <Check size={12} />}</button>
              <div className="hab-main">
                <span className="hab-name">{h.name}</span>
                <div className="hab-grid">{days.map((d) => <span key={d} className={`dot ${h.history[d] ? "fill" : ""}`} />)}</div>
              </div>
              <span className="streak"><Flame size={11} />{streak}</span>
              <button className="ghost" onClick={() => remove(h.id)} aria-label="Delete"><Trash2 size={13} /></button>
            </li>
          );
        })}
        {habits.length === 0 && <li className="empty">No habits tracked.</li>}
      </ul>
    </Panel>
  );
}

// ── Goals ──────────────────────────────────────────────────────────
function Goals({ goals, setGoals }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (!t) return; setGoals([...goals, { id: uid(), name: t, value: 0 }]); setText(""); };
  const set = (id, v) => setGoals(goals.map((g) => (g.id === id ? { ...g, value: Math.max(0, Math.min(100, v)) } : g)));
  const remove = (id) => setGoals(goals.filter((g) => g.id !== id));
  return (
    <Panel label="GOALS" icon={Target}>
      <div className="input-row">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New goal" className="text-in" />
        <button className="icon-btn" onClick={add} aria-label="Add goal"><Plus size={15} /></button>
      </div>
      <ul className="list scroll">
        {goals.map((g) => (
          <li key={g.id} className="goal">
            <div className="goal-top"><span className="flex">{g.name}</span><span className="goal-pct">{g.value}%</span>
              <button className="ghost" onClick={() => remove(g.id)} aria-label="Delete"><Trash2 size={13} /></button></div>
            <div className="goal-track"><div className="goal-fill" style={{ width: `${g.value}%` }} /></div>
            <input type="range" min="0" max="100" value={g.value} onChange={(e) => set(g.id, Number(e.target.value))} className="slider" />
          </li>
        ))}
        {goals.length === 0 && <li className="empty">No goals set.</li>}
      </ul>
    </Panel>
  );
}

// ── Notes ──────────────────────────────────────────────────────────
function Notes({ notes, setNotes }) {
  return (
    <Panel label="NOTES" icon={StickyNote} className="notes-panel">
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scratchpad…" className="notepad" />
    </Panel>
  );
}

// ── App ────────────────────────────────────────────────────────────
export default function Kaisen() {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notes, setNotes] = useState("");
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState("cyan");

  useEffect(() => {
    (async () => {
      setTasks(await store.get("tasks", []));
      setHabits(await store.get("habits", []));
      setGoals(await store.get("goals", []));
      setNotes(await store.get("notes", ""));
      setEvents(await store.get("events", []));
      setTheme(await store.get("theme", "cyan"));
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (loaded) store.set("tasks", tasks); }, [tasks, loaded]);
  useEffect(() => { if (loaded) store.set("habits", habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) store.set("goals", goals); }, [goals, loaded]);
  useEffect(() => { if (loaded) store.set("events", events); }, [events, loaded]);
  useEffect(() => { if (loaded) store.set("theme", theme); }, [theme, loaded]);
  useEffect(() => { if (!loaded) return; const id = setTimeout(() => store.set("notes", notes), 400); return () => clearTimeout(id); }, [notes, loaded]);

  const THEMES = [
    { id: "cyan", dot: "#4fd0ff", label: "Cyan" },
    { id: "amber", dot: "#ffb24a", label: "Amber" },
    { id: "violet", dot: "#b48bff", label: "Violet" },
    { id: "emerald", dot: "#4fe0a0", label: "Emerald" },
  ];

  return (
    <div className={`kaisen theme-${theme}`}>
      <style>{css}</style>
      <div className="scanline" />
      <header className="top-bar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><div className="brand-name">KAISEN</div><div className="brand-sub">COMMAND CENTER</div></div>
        </div>
        <div className="top-right">
          <div className="theme-switch">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`swatch ${theme === t.id ? "active" : ""}`}
                style={{ background: t.dot }}
                onClick={() => setTheme(t.id)}
                aria-label={`${t.label} theme`}
                title={t.label}
              />
            ))}
          </div>
          <div className="op"><span className="live">● ONLINE</span><div className="op-name">OPERATOR</div></div>
        </div>
      </header>

      {!loaded ? (
        <div className="loading">INITIALIZING KAISEN…</div>
      ) : (
        <main className="layout">
          <div className="col-left">
            <Agenda events={events} setEvents={setEvents} />
            <Clock now={now} />
            <Weather />
          </div>
          <div className="col-right">
            <Panel label="CORE OVERVIEW" icon={Cpu} className="core-panel" action={<span className="live">● ACTIVE</span>}>
              <Core />
            </Panel>
            <div className="quad">
              <Habits habits={habits} setHabits={setHabits} />
              <Goals goals={goals} setGoals={setGoals} />
              <Tasks tasks={tasks} setTasks={setTasks} />
              <Notes notes={notes} setNotes={setNotes} />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; }
  .kaisen {
    --bg: #060d18; --panel: rgba(13, 27, 48, 0.72);
    --line: rgba(54, 130, 196, 0.28); --line-bright: rgba(80, 180, 255, 0.6);
    --cyan: #4fd0ff; --cyan-dim: #6fa8c7; --ink: #cfe8fb; --muted: #5d7d99;
    --amber: #ffb24a; --green: #5fe0a0;
    --accent: #4fd0ff; --accent-dim: #6fa8c7; --accent-deep: var(--accent-deep); --accent-mid: var(--accent-mid);
    --accent-glow: var(--accent-glow); --accent-soft: var(--accent-soft);
    min-height: 100vh; background:
      radial-gradient(1200px 600px at 50% -10%, rgba(40,110,180,0.18), transparent 60%),
      radial-gradient(900px 500px at 50% 110%, rgba(30,90,150,0.12), transparent 60%),
      var(--bg);
    color: var(--ink); font-family: 'Rajdhani', system-ui, sans-serif;
    padding: clamp(10px, 1.6vw, 20px); position: relative; overflow-x: hidden;
  }
  /* theme overrides */
  .theme-cyan { --accent: #4fd0ff; --accent-dim: #6fa8c7; --accent-deep: var(--accent-deep); --accent-mid: var(--accent-mid); --accent-glow: var(--accent-glow); --accent-soft: var(--accent-soft); }
  .theme-amber { --accent: #ffb24a; --accent-dim: #c79a6f; --accent-deep: #a86a1d; --accent-mid: #d4912b; --accent-glow: rgba(255,178,74,0.5); --accent-soft: rgba(255,178,74,0.3); }
  .theme-violet { --accent: #b48bff; --accent-dim: #9a86c7; --accent-deep: #5e3da8; --accent-mid: #8a5bd4; --accent-glow: rgba(180,139,255,0.5); --accent-soft: rgba(180,139,255,0.3); }
  .theme-emerald { --accent: #4fe0a0; --accent-dim: #6fc79a; --accent-deep: #1da86a; --accent-mid: #2bd491; --accent-glow: rgba(79,224,160,0.5); --accent-soft: rgba(79,224,160,0.3); }
  .scanline { position: fixed; inset: 0; pointer-events: none; z-index: 1;
    background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,0.13) 3px 4px); opacity: 0.4; }
  .loading { text-align: center; padding: 100px 0; color: var(--accent); font-family: 'Orbitron'; letter-spacing: 4px; animation: pulse 1.4s infinite; }

  .top-bar { display: flex; align-items: center; justify-content: space-between; background: var(--panel);
    border: 1px solid var(--line); border-radius: 12px; padding: 10px 18px; margin-bottom: 12px; backdrop-filter: blur(6px); position: relative; z-index: 2; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark { width: 30px; height: 30px; display: grid; place-items: center; position: relative; }
  .brand-mark span { position: absolute; border: 1.5px solid var(--accent); border-radius: 50%; }
  .brand-mark span:nth-child(1) { width: 30px; height: 30px; opacity: 0.4; animation: spin 8s linear infinite; border-style: dashed; }
  .brand-mark span:nth-child(2) { width: 19px; height: 19px; opacity: 0.7; }
  .brand-mark span:nth-child(3) { width: 8px; height: 8px; background: var(--accent); box-shadow: 0 0 12px var(--accent); }
  .brand-name { font-family: 'Orbitron'; font-weight: 700; font-size: 17px; letter-spacing: 5px; color: #eaf6ff; text-shadow: 0 0 14px var(--accent-glow); }
  .brand-sub { font-size: 9px; letter-spacing: 4px; color: var(--accent-dim); }
  .op { text-align: right; } .op-name { font-size: 11px; letter-spacing: 3px; color: var(--accent-dim); margin-top: 2px; }
  .live { color: var(--green); font-size: 10px; letter-spacing: 2px; font-weight: 600; }
  .top-right { display: flex; align-items: center; gap: 16px; }
  .theme-switch { display: flex; gap: 7px; align-items: center; }
  .swatch { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform .15s, border-color .15s; outline: none; }
  .swatch:hover { transform: scale(1.15); }
  .swatch.active { border-color: var(--ink); box-shadow: 0 0 10px currentColor; }

  .layout { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; position: relative; z-index: 2; align-items: start; max-width: 1600px; margin: 0 auto; }
  .top-bar { max-width: 1600px; margin-left: auto; margin-right: auto; }
  .col-left, .col-right { display: flex; flex-direction: column; gap: 12px; }
  .quad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
  @media (max-width: 1100px) { .quad { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 820px) { .layout { grid-template-columns: 1fr; } }
  @media (max-width: 560px) { .quad { grid-template-columns: 1fr; } }

  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; backdrop-filter: blur(6px); position: relative; }
  .panel::before { content: ''; position: absolute; inset: 0; border-radius: 12px; pointer-events: none; box-shadow: inset 0 0 30px rgba(40,120,200,0.06); }
  .corner { position: absolute; width: 9px; height: 9px; border-color: var(--line-bright); border-style: solid; border-width: 0; }
  .corner.tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; border-radius: 12px 0 0 0; }
  .corner.tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; border-radius: 0 12px 0 0; }
  .corner.bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; border-radius: 0 0 0 12px; }
  .corner.br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; border-radius: 0 0 12px 0; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--line); }
  .panel-label { display: flex; align-items: center; gap: 7px; font-family: 'Orbitron'; font-size: 10px; font-weight: 600; letter-spacing: 2px; color: var(--accent); }
  .panel-body { padding: 12px 14px; }
  .badge { font-size: 10px; letter-spacing: 1px; color: var(--accent-dim); border: 1px solid var(--line); border-radius: 20px; padding: 2px 9px; min-width: 22px; text-align: center; }

  .input-row { display: flex; gap: 7px; margin-bottom: 10px; }
  .text-in { flex: 1; min-width: 0; background: rgba(6,16,30,0.7); border: 1px solid var(--line); color: var(--ink); border-radius: 7px; padding: 8px 10px; font-size: 14px; font-family: 'Rajdhani'; font-weight: 500; outline: none; }
  .text-in:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-soft); }
  .text-in::placeholder { color: var(--muted); }
  .time-in { background: rgba(6,16,30,0.7); border: 1px solid var(--line); color: var(--ink); border-radius: 7px; padding: 8px 6px; font-size: 13px; font-family: 'Rajdhani'; outline: none; width: 84px; }
  .time-in:focus { border-color: var(--accent); }
  .icon-btn { background: linear-gradient(135deg, var(--accent-mid), var(--accent-deep)); color: #04101e; border: none; border-radius: 7px; width: 34px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; box-shadow: 0 0 12px var(--accent-soft); }
  .icon-btn:hover { filter: brightness(1.15); }

  .list { list-style: none; display: flex; flex-direction: column; gap: 1px; }
  .scroll { max-height: 180px; overflow-y: auto; padding-right: 2px; }
  .scroll-tall { max-height: 260px; overflow-y: auto; padding-right: 2px; }
  .scroll::-webkit-scrollbar, .scroll-tall::-webkit-scrollbar { width: 5px; }
  .scroll::-webkit-scrollbar-thumb, .scroll-tall::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
  .empty { color: var(--muted); font-size: 13px; padding: 12px 2px; letter-spacing: 1px; }

  .row { display: flex; align-items: center; gap: 9px; padding: 7px 5px; border-radius: 6px; font-size: 14px; font-weight: 500; }
  .row:hover { background: rgba(40,110,180,0.1); }
  .flex { flex: 1; min-width: 0; word-break: break-word; }
  .check { width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid var(--line-bright); background: transparent; cursor: pointer; flex-shrink: 0; display: grid; place-items: center; color: #04101e; }
  .check:hover { border-color: var(--accent); box-shadow: 0 0 8px var(--accent-soft); }
  .check.checked { background: var(--accent); border-color: var(--accent); }
  .is-done .flex { color: var(--muted); text-decoration: line-through; }
  .ghost { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: 5px; opacity: 0; flex-shrink: 0; }
  .row:hover .ghost, .habit:hover .ghost, .goal:hover .ghost, .agenda-row:hover .ghost { opacity: 1; }
  .ghost:hover { color: var(--accent); }

  .agenda-date { font-family: 'Orbitron'; font-size: 12px; color: var(--ink); margin-bottom: 10px; letter-spacing: 0.5px; }
  .agenda-input { display: flex; gap: 6px; margin-bottom: 10px; }
  .agenda-row { display: flex; align-items: center; gap: 9px; padding: 8px 5px 8px 9px; border-radius: 6px; font-size: 14px; border-left: 2px solid var(--accent); margin-bottom: 2px; background: rgba(40,110,180,0.06); }
  .agenda-row:hover { background: rgba(40,110,180,0.12); }
  .agenda-time { font-family: 'Orbitron'; font-size: 12px; color: var(--accent); min-width: 52px; }
  .agenda-title { flex: 1; min-width: 0; font-weight: 500; }
  .agenda-note { margin-top: 10px; font-size: 10px; color: var(--muted); letter-spacing: 0.5px; font-style: italic; }

  .clock-time { font-family: 'Orbitron'; font-size: 34px; font-weight: 600; color: var(--accent); letter-spacing: 2px; text-shadow: 0 0 16px var(--accent-soft); text-align: center; }
  .clock-date { text-align: center; color: var(--accent-dim); font-size: 13px; letter-spacing: 1px; margin-top: 4px; }

  .wx { display: flex; align-items: center; gap: 14px; }
  .wx-main { display: flex; align-items: center; gap: 8px; }
  .wx-icon { font-size: 34px; line-height: 1; }
  .wx-temp { font-family: 'Orbitron'; font-size: 32px; font-weight: 700; color: var(--accent); text-shadow: 0 0 14px var(--accent-soft); }
  .wx-info { flex: 1; }
  .wx-desc { font-size: 15px; font-weight: 600; }
  .wx-sub { font-size: 12px; color: var(--accent-dim); margin-top: 2px; }
  .wx-place { font-size: 11px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 3px; }
  .wx-msg { display: flex; flex-direction: column; gap: 8px; color: var(--muted); font-size: 13px; align-items: flex-start; }
  .wx-retry { display: flex; align-items: center; gap: 5px; background: rgba(40,110,180,0.15); border: 1px solid var(--line); color: var(--accent); border-radius: 6px; padding: 5px 10px; font-size: 12px; font-family: 'Rajdhani'; font-weight: 600; cursor: pointer; }
  .wx-retry:hover { background: rgba(40,110,180,0.25); }

  .habit { display: flex; align-items: center; gap: 8px; padding: 7px 5px; border-radius: 6px; }
  .habit:hover { background: rgba(40,110,180,0.1); }
  .hab-toggle { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--line-bright); background: transparent; cursor: pointer; flex-shrink: 0; display: grid; place-items: center; color: #04101e; }
  .hab-toggle.on { background: var(--green); border-color: var(--green); box-shadow: 0 0 10px rgba(95,224,160,0.4); }
  .hab-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .hab-name { font-size: 14px; font-weight: 500; }
  .hab-grid { display: flex; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 2px; background: rgba(54,130,196,0.2); }
  .dot.fill { background: var(--green); box-shadow: 0 0 6px rgba(95,224,160,0.5); }
  .streak { display: flex; align-items: center; gap: 3px; font-size: 13px; color: var(--amber); font-weight: 700; }

  .goal { padding: 8px 5px; border-radius: 6px; }
  .goal:hover { background: rgba(40,110,180,0.1); }
  .goal-top { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; margin-bottom: 7px; }
  .goal-pct { color: var(--accent); font-weight: 700; font-size: 13px; }
  .goal-track { height: 6px; border-radius: 4px; background: rgba(6,16,30,0.8); overflow: hidden; margin-bottom: 7px; border: 1px solid var(--line); }
  .goal-fill { height: 100%; background: linear-gradient(90deg, var(--accent-mid), #4fd0ff); box-shadow: 0 0 12px var(--accent-glow); transition: width .3s ease; }
  .slider { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 4px; background: rgba(54,130,196,0.25); outline: none; }
  .slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 10px var(--accent-glow); }
  .slider::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 50%; background: var(--accent); cursor: pointer; }

  .notepad { width: 100%; min-height: 150px; resize: vertical; background: rgba(6,16,30,0.7); border: 1px solid var(--line); border-radius: 8px; padding: 11px; color: var(--ink); font-family: 'Rajdhani'; font-weight: 500; font-size: 14px; line-height: 1.5; outline: none; }
  .notepad:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-soft); }
  .notepad::placeholder { color: var(--muted); }

  .core-panel .panel-body { padding: 0; }
  .core-wrap { position: relative; height: 300px; display: grid; place-items: center; overflow: hidden; }
  .core-rings { position: absolute; inset: 0; display: grid; place-items: center; }
  .ring { position: absolute; border-radius: 50%; border: 1px solid var(--accent-soft); }
  .ring.r1 { width: 250px; height: 250px; }
  .ring.r2 { width: 185px; height: 185px; border-color: rgba(79,208,255,0.35); }
  .ring.r3 { width: 125px; height: 125px; border-color: var(--accent-glow); }
  .ring-dash { position: absolute; border-radius: 50%; border: 1.5px dashed var(--accent-soft); }
  .ring-dash.d1 { width: 220px; height: 220px; animation: spin 18s linear infinite; }
  .ring-dash.d2 { width: 155px; height: 155px; animation: spin 12s linear infinite reverse; border-color: rgba(95,224,160,0.35); }
  .core-glow { position: absolute; width: 110px; height: 110px; border-radius: 50%; background: radial-gradient(circle, var(--accent-glow), transparent 70%); filter: blur(14px); animation: breathe 3s ease-in-out infinite; }
  .core-center { position: relative; z-index: 2; text-align: center; }
  .core-title { font-family: 'Orbitron'; font-weight: 700; font-size: 32px; letter-spacing: 8px; color: #eaf6ff; text-shadow: 0 0 24px var(--accent-glow); }
  .core-sub { font-size: 10px; letter-spacing: 6px; color: var(--accent); margin-top: 4px; }
  .core-ver { font-size: 10px; letter-spacing: 3px; color: var(--muted); margin-top: 8px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes breathe { 0%,100% { opacity: 0.6; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
  @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;
