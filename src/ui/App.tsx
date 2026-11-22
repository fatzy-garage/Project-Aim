import { useEffect, useRef, useState } from "react";
import { Activity, Crosshair, Gamepad2, History, Play, Settings, Trophy, RotateCcw, Pause, X } from "lucide-react";
import { GameEngine, type GameStats } from "../game/GameEngine";
import { clearSessions, getSessions, saveSession } from "../game/storage";
import type { ModeId, SessionResult } from "../game/types";

const modes: { id: ModeId; name: string; desc: string; tag: string }[] = [
  { id: "gridshot", name: "Gridshot", desc: "Build speed across multiple targets.", tag: "SPEED" },
  { id: "microshot", name: "Microshot", desc: "Train precision on smaller targets.", tag: "PRECISION" },
  { id: "flick", name: "Flick Training", desc: "Snap between targets quickly.", tag: "FLICK" },
  { id: "tracking", name: "Tracking", desc: "Keep your aim on moving targets.", tag: "TRACK" },
  { id: "reaction", name: "Reaction", desc: "Respond when a target appears.", tag: "REACTION" },
  { id: "precision", name: "Precision", desc: "Hit carefully placed small targets.", tag: "CONTROL" }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  const [screen, setScreen] = useState<"home"|"select"|"game"|"results"|"stats"|"history"|"settings">("home");
  const [mode, setMode] = useState<ModeId>("gridshot");
  const [stats, setStats] = useState<GameStats>({ score: 0, shots: 0, hits: 0, misses: 0, combo: 0 });
  const [time, setTime] = useState(60);
  const [duration, setDuration] = useState(60);
  const [paused, setPaused] = useState(false);
  const [records, setRecords] = useState<SessionResult[]>([]);
  const [fov, setFov] = useState(Number(localStorage.getItem("aim-fov") || 100));
  const [sensitivity, setSensitivity] = useState(Number(localStorage.getItem("aim-sens") || 3));
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", check); window.addEventListener("orientationchange", check);
    getSessions().then(setRecords);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); gameRef.current?.dispose(); };
  }, []);

  useEffect(() => {
    if (screen !== "game" || !canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, (s, t) => { setStats(s); setTime(t); });
    gameRef.current = engine; engine.setFov(fov); engine.setSensitivity(sensitivity * 0.001);
    let count = 3;
    const countdown = window.setInterval(() => {
      count--;
      if (count <= 0) { clearInterval(countdown); engine.start(mode, duration); }
    }, 700);
    return () => { clearInterval(countdown); engine.dispose(); gameRef.current = null; };
  }, [screen]);

  useEffect(() => {
    if (screen === "game" && gameRef.current?.isFinished()) finishSession();
  }, [time, screen]);

  async function finishSession() {
    if (screen !== "game") return;
    gameRef.current?.pause(true);
    const s = gameRef.current?.getStats() || stats;
    const result: SessionResult = {
      id: crypto.randomUUID(), mode, date: Date.now(), duration, score: s.score,
      shots: s.shots, hits: s.hits, misses: s.misses,
      accuracy: s.shots ? s.hits / s.shots * 100 : 0, avgReaction: 0
    };
    await saveSession(result); setRecords(await getSessions()); setStats(s); setScreen("results");
  }
  function startGame(id: ModeId) { setMode(id); setStats({score:0,shots:0,hits:0,misses:0,combo:0}); setTime(duration); setPaused(false); setScreen("game"); }
  const accuracy = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;

  return <main className="app-shell">
    {portrait && <div className="rotate-overlay"><div className="rotate-card"><span className="rotate-icon">↻</span><h2>Rotate your device</h2><p>Mobile Aim Lab is designed for landscape play.</p></div></div>}
    <header className="topbar"><div className="brand"><span className="brand-mark"><Crosshair size={20}/></span><span>MOBILE <b>AIM LAB</b></span></div><div className="top-meta"><span className="online-dot"/> LOCAL TRAINING <span className="version">WEB EDITION</span></div></header>

    {screen === "home" && <section className="hero page">
      <div className="hero-copy"><div className="eyebrow"><span/> 3D FPS TRAINING ENVIRONMENT</div><h1>Train your aim.<br/><em>Own the moment.</em></h1><p>A focused aim-training range built for touchscreens. Warm up, sharpen your precision, and track your progress.</p>
        <button className="primary-btn" onClick={() => setScreen("select")}><Play size={17} fill="currentColor"/> START TRAINING</button>
        <div className="hero-foot"><span><i/> REAL 3D TARGETS</span><span><i/> TOUCH OPTIMIZED</span><span><i/> LOCAL RECORDS</span></div>
      </div>
      <div className="hero-visual"><div className="radar-ring r1"/><div className="radar-ring r2"/><div className="radar-ring r3"/><div className="radar-crosshair"><span/><b/><i/></div><div className="visual-label label-a">TARGET ACQUIRED</div><div className="visual-label label-b">X: 04.82 / Y: 02.16</div><div className="visual-coord">RANGE_01</div></div>
      <div className="home-grid">
        <button className="nav-tile" onClick={() => setScreen("select")}><Gamepad2/><span><b>Training modes</b><small>Six focused drills</small></span></button>
        <button className="nav-tile" onClick={() => setScreen("stats")}><Activity/><span><b>Statistics</b><small>Your training overview</small></span></button>
        <button className="nav-tile" onClick={() => setScreen("history")}><History/><span><b>Session history</b><small>Review recent runs</small></span></button>
        <button className="nav-tile" onClick={() => setScreen("settings")}><Settings/><span><b>Settings</b><small>FOV and sensitivity</small></span></button>
      </div>
    </section>}

    {screen === "select" && <section className="page content-page"><button className="back" onClick={() => setScreen("home")}>← BACK</button><div className="section-head"><div><div className="eyebrow">SELECT YOUR DRILL</div><h2>Training modes</h2><p>Pick a routine and enter the range.</p></div><div className="duration-control"><label>SESSION</label><select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option><option value="120">2 minutes</option></select></div></div>
      <div className="mode-grid">{modes.map((m,i)=><button className="mode-card" key={m.id} onClick={() => startGame(m.id)}><div className="mode-top"><span className="mode-number">0{i+1}</span><span className="mode-tag">{m.tag}</span></div><div className="mode-art"><div className={`target-art art-${i}`}><i/><i/><i/></div></div><h3>{m.name}</h3><p>{m.desc}</p><div className="mode-cta">ENTER DRILL <span>↗</span></div></button>)}</div>
    </section>}

    {screen === "game" && <section className="game-screen">
      <canvas ref={canvasRef} className="game-canvas"/>
      <div className="game-top"><div className="game-mode">{mode.toUpperCase()} <small>TRAINING RANGE</small></div><div className="game-metrics"><span>SCORE <b>{stats.score}</b></span><span>TIME <b>{Math.ceil(time)}s</b></span><span>ACCURACY <b>{accuracy}%</b></span></div></div>
      <div className="crosshair"><i/><b/></div>
      <div className="game-bottom"><div className="hit-stats"><span>HITS <b>{stats.hits}</b></span><span>MISSES <b>{stats.misses}</b></span><span>COMBO <b>{stats.combo}x</b></span></div><div className="game-actions"><button onClick={() => {gameRef.current?.pause(!paused);setPaused(!paused);}}><Pause size={15}/>{paused?"RESUME":"PAUSE"}</button><button onClick={() => { if(confirm("End this training session?")) finishSession(); }}><X size={15}/> EXIT</button></div></div>
      {paused && <div className="pause-overlay"><div><h2>SESSION PAUSED</h2><p>Take a breath. Your session is waiting.</p><button className="primary-btn" onClick={() => {gameRef.current?.pause(false);setPaused(false);}}>RESUME</button></div></div>}
      <div className="mobile-fire" onPointerDown={e => { e.preventDefault(); gameRef.current?.fire(); }}>FIRE</div>
    </section>}

    {screen === "results" && <section className="page results-page"><div className="eyebrow">SESSION COMPLETE</div><h2>Good run.</h2><p className="muted">{mode} · {duration} second session</p><div className="result-score"><small>FINAL SCORE</small><strong>{stats.score.toLocaleString()}</strong></div><div className="result-grid"><div><small>ACCURACY</small><b>{accuracy}%</b></div><div><small>HITS</small><b>{stats.hits}</b></div><div><small>MISSES</small><b>{stats.misses}</b></div><div><small>SHOTS</small><b>{stats.shots}</b></div></div><div className="result-actions"><button className="primary-btn" onClick={() => startGame(mode)}><RotateCcw size={16}/> RETRY</button><button className="secondary-btn" onClick={() => setScreen("select")}>OTHER MODES</button><button className="secondary-btn" onClick={() => setScreen("home")}>MAIN MENU</button></div></section>}

    {screen === "stats" && <section className="page content-page"><button className="back" onClick={() => setScreen("home")}>← BACK</button><div className="eyebrow">YOUR PERFORMANCE</div><h2>Statistics</h2><div className="stats-grid">{[{label:"TOTAL SESSIONS",value:records.length},{label:"TOTAL SHOTS",value:records.reduce((a,r)=>a+r.shots,0)},{label:"TOTAL HITS",value:records.reduce((a,r)=>a+r.hits,0)},{label:"BEST SCORE",value:Math.max(0,...records.map(r=>r.score))}].map(x=><div className="stat-card" key={x.label}><small>{x.label}</small><b>{x.value.toLocaleString()}</b></div>)}</div><div className="chart-panel"><h3>Recent score progression</h3><div className="bars">{records.slice(0,12).reverse().map(r=><div key={r.id} title={`${r.score} points`} style={{height:`${Math.max(4,Math.min(100,r.score/Math.max(1,...records.map(x=>x.score))*100))}%`}}/>)}</div><div className="chart-caption">Each bar represents a saved session, oldest to newest.</div></div><button className="danger-btn" onClick={async()=>{if(confirm("Delete all saved training records?")){await clearSessions();setRecords([]);}}}>RESET STATISTICS</button></section>}

    {screen === "history" && <section className="page content-page"><button className="back" onClick={() => setScreen("home")}>← BACK</button><div className="eyebrow">LOCAL SESSION LOG</div><h2>History</h2>{records.length===0?<p className="muted">No sessions saved yet. Complete a drill to see it here.</p>:<div className="history-list">{records.map(r=><div className="history-row" key={r.id}><div><b>{r.mode}</b><small>{new Date(r.date).toLocaleString()}</small></div><strong>{r.score.toLocaleString()} <small>PTS</small></strong><span>{r.accuracy.toFixed(0)}% ACC</span></div>)}</div>}</section>}

    {screen === "settings" && <section className="page content-page"><button className="back" onClick={() => setScreen("home")}>← BACK</button><div className="eyebrow">PERSONALIZE YOUR RANGE</div><h2>Settings</h2><div className="settings-panel"><label>FIELD OF VIEW <b>{fov}°</b></label><input type="range" min="70" max="120" value={fov} onChange={e=>{const n=Number(e.target.value);setFov(n);localStorage.setItem("aim-fov",String(n));}}/><label>TOUCH SENSITIVITY <b>{sensitivity.toFixed(1)}</b></label><input type="range" min="0.5" max="8" step="0.1" value={sensitivity} onChange={e=>{const n=Number(e.target.value);setSensitivity(n);localStorage.setItem("aim-sens",String(n));}}/><p className="muted">Settings are stored on this device. Sensitivity and FOV apply when the next session starts.</p></div></section>}
    <footer className="footer"><span>MOBILE AIM LAB <b>WEB EDITION</b></span><span>BUILT FOR THE RANGE · RUNS LOCALLY</span></footer>
  </main>;
              }
