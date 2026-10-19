import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, LEVELS, levelIndex } from './game/levels';
import type { Level } from './game/sim';
import { FAIL_COPY } from './game/sim';
import { garden, startGame, type Finish } from './game/scene';
import { sound } from './audio/sound';
import { haptic, onNative, toNative } from './bridge';
import { freshSave, isUnlocked, loadSave, recordResult, totalStars, writeSave, type Save } from './state/save';
import { Plate } from './ui/Plate';
import * as I from './ui/icons';

type Screen = 'home' | 'herbarium' | 'play' | 'settings';
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [blooms, setBlooms] = useState(0);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!host.current) return;
    garden.reducedMotion = save.settings.reducedMotion;
    return startGame(host.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    sound.setVolumes(save.settings.music, save.settings.sfx);
    garden.reducedMotion = save.settings.reducedMotion;
    document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduced' : 'full';
  }, [save.settings]);

  const buzz = useCallback((s: 'light' | 'medium' | 'success' | 'warning') => haptic(s, saveRef.current.settings.haptics), []);
  useEffect(() => {
    const unlock = () => { sound.unlock(); sound.startMusic(chapter); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [chapter]);

  const startLevel = useCallback((l: Level) => {
    sound.unlock(); sound.startMusic(l.chapter); sound.duck(false); sound.stopGrowth();
    setLevel(l); setChapter(l.chapter); setFinish(null); setPaused(false); setStarted(false); setBlooms(0);
    setScreen('play');
    garden.show('play', l);
  }, []);

  useEffect(() => {
    garden.hooks = {
      onFinish: (f) => { setFinish(f); if (f.result.success) setSave((s) => recordResult(s, f.level.id, f.result.stars, f.path)); sound.duck(true); },
      onStart: () => { setStarted(true); setSave((s) => (s.seenHints.includes(level.id) ? s : { ...s, seenHints: [...s.seenHints, level.id] })); },
      onBloom: (n) => setBlooms(n),
      onHaptic: buzz,
    };
  }, [buzz, level.id]);

  const showMenu = useCallback(() => garden.show('menu', LEVELS[2]), []);
  const goHome = useCallback(() => { setScreen('home'); setFinish(null); setPaused(false); sound.duck(false); sound.stopGrowth(); showMenu(); }, [showMenu]);
  const goHerb = useCallback(() => { setScreen('herbarium'); setFinish(null); setPaused(false); sound.duck(false); sound.stopGrowth(); showMenu(); }, [showMenu]);
  const pause = useCallback((p: boolean) => { setPaused(p); garden.setPaused(p); sound.duck(p); }, []);

  useEffect(() => onNative((e) => {
    if (e.type === 'native.lifecycle') {
      if (e.state === 'background') { sound.suspend(); if (screen === 'play' && !finish) pause(true); }
      else sound.resume();
      return;
    }
    if (screen === 'play') { if (finish) goHerb(); else if (!paused) pause(true); else goHerb(); }
    else if (screen === 'herbarium') goHome();
    else if (screen === 'settings') setScreen(settingsFrom);
    else toNative({ type: 'exit' });
  }), [screen, paused, finish, pause, goHome, goHerb, settingsFrom]);

  useEffect(() => {
    const vis = () => { if (document.hidden) { sound.suspend(); if (screen === 'play' && !finish) pause(true); } else sound.resume(); };
    document.addEventListener('visibilitychange', vis);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && screen === 'play' && !finish) pause(!paused); };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, [screen, paused, finish, pause]);

  const nextLevel = useMemo(() => { const i = levelIndex(level.id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null; }, [level]);
  const firstOpen = useMemo(() => { const i = LEVELS.findIndex((l, idx) => isUnlocked(save, idx) && !save.stars[l.id]); return LEVELS[i >= 0 ? i : 0]; }, [save]);

  return (
    <div className={`app ch-${chapter}`}>
      <div className="stage" ref={host} />
      {screen === 'home' && (
        <Home blooms={totalStars(save)} resume={save.stars[LEVELS[0].id] ? firstOpen : null} onPlay={() => startLevel(firstOpen)}
          onHerb={() => { setChapter(firstOpen.chapter); setScreen('herbarium'); }} onSettings={() => { setSettingsFrom('home'); setScreen('settings'); }} />
      )}
      {screen === 'herbarium' && <Herbarium save={save} chapter={chapter} onChapter={(c) => { setChapter(c); sound.startMusic(c); }} onPick={startLevel} onBack={goHome} />}
      {screen === 'play' && <Hud level={level} started={started} blooms={blooms} dim={paused || !!finish} showHint={!save.seenHints.includes(level.id)} onPause={() => pause(true)} />}
      {screen === 'play' && paused && !finish && (
        <PauseCard level={level} onResume={() => pause(false)} onRestart={() => startLevel(level)} onHerb={goHerb}
          onSettings={() => { setSettingsFrom('play'); setScreen('settings'); }} />
      )}
      {screen === 'play' && finish && (
        <ResultCard finish={finish} next={nextLevel && isUnlocked(save, levelIndex(nextLevel.id)) ? nextLevel : null} onNext={startLevel} onRetry={() => startLevel(level)} onHerb={goHerb} />
      )}
      {screen === 'settings' && (
        <Settings save={save} onChange={(st) => setSave((s) => ({ ...s, settings: st }))} onReset={() => setSave((s) => ({ ...freshSave(), settings: s.settings }))}
          onBack={() => { setScreen(settingsFrom); if (settingsFrom === 'play') pause(true); }} />
      )}
    </div>
  );
}

function Home({ blooms, resume, onPlay, onHerb, onSettings }: { blooms: number; resume: Level | null; onPlay: () => void; onHerb: () => void; onSettings: () => void }) {
  return (
    <div className="screen home">
      <header className="title">
        <span className="plate-no">Plate I · <em>Vitis ludens</em></span>
        <h1><small>Petal</small>Tendril</h1>
        <p>Hold your finger where the vine should grow. Thread it up the garden wall, open every bud, and reach the light.</p>
      </header>
      <div className="home-actions">
        <button className="leafy" onClick={() => { sound.tap(); onPlay(); }} data-testid="play"><I.Sprout size={22} /> {resume ? <>Continue <small>{resume.name}</small></> : 'Plant a seed'}</button>
        <div className="row">
          <button className="paper" onClick={() => { sound.tap(); onHerb(); }}><I.Book /> Herbarium</button>
          <button className="paper round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
        <div className="tally"><I.Bloom size={16} on /> {blooms} / {LEVELS.length * 3} blooms</div>
      </div>
    </div>
  );
}

function Herbarium({ save, chapter, onChapter, onPick, onBack }: { save: Save; chapter: number; onChapter: (c: number) => void; onPick: (l: Level) => void; onBack: () => void }) {
  const levels = LEVELS.filter((l) => l.chapter === chapter);
  const got = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0);
  const chapterOpen = (c: number) => isUnlocked(save, LEVELS.findIndex((l) => l.chapter === c));
  const cardW = Math.min(170, (window.innerWidth - 50) / 2);
  const plateH = Math.max(70, Math.min(120, (window.innerHeight - 330) / 4 - 34));
  return (
    <div className="screen herbarium">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="plate-no">herbarium · {got}/24 blooms</span><h2>{CHAPTERS[chapter].name}</h2></div>
        <span />
      </div>
      <div className="seasons" role="tablist">
        {CHAPTERS.map((c, i) => (
          <button key={c.name} role="tab" aria-selected={i === chapter} disabled={!chapterOpen(i)} className={`season ${i === chapter ? 'on' : ''}`}
            aria-label={`${c.name}${chapterOpen(i) ? '' : ' (locked)'}`} onClick={() => { sound.tap(); onChapter(i); }}>{c.name}</button>
        ))}
      </div>
      <div className="plates">
        {levels.map((l, i) => {
          const idx = levelIndex(l.id), open = isUnlocked(save, idx), st = save.stars[l.id] ?? 0;
          return (
            <button key={l.id} className={`plate ${open ? '' : 'locked'}`} disabled={!open} onClick={() => { sound.tap(); onPick(l); }}
              aria-label={`${l.name}${open ? '' : ' (locked)'}`} data-testid={`level-${idx + 1}`} style={{ width: cardW }}>
              <Plate level={l} path={save.paths[l.id]} stars={st} locked={!open} width={Math.round(cardW * 0.42)} height={plateH} />
              <span className="plate-text">
                <span className="plate-no">fig. {ROMAN[i]}</span>
                <strong>{l.name}</strong>
                <em>{l.latin}</em>
                <span className="blooms">{[0, 1, 2].map((k) => <I.Bloom key={k} size={13} on={k < st} />)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Hud({ level, started, blooms, dim, showHint, onPause }: { level: Level; started: boolean; blooms: number; dim: boolean; showHint: boolean; onPause: () => void }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { if (bar.current) bar.current.style.transform = `scaleY(${Math.max(0, Math.min(1, garden.progress))})`; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const n = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level);
  return (
    <div className={`hud ${dim ? 'dim' : ''}`}>
      <div className="hud-top">
        <button className="icon-btn" aria-label="Pause" onClick={() => { sound.tap(); onPause(); }} data-testid="pause"><I.Pause /></button>
        <div className="hud-title"><span>{CHAPTERS[level.chapter].name} · fig. {ROMAN[n]}</span><strong>{level.name}</strong></div>
        <div className="bud-count" aria-label={`${blooms} of 3 buds in bloom`}>{[0, 1, 2].map((k) => <I.Bloom key={k} size={22} on={k < blooms} />)}</div>
      </div>
      <div className="climb" aria-hidden><div ref={bar} /><i className="sun" /></div>
      {!started && (
        <div className="ready">
          <p className="note">{level.note}</p>
          <p className="press"><I.Sprout size={22} /> {showHint && level.hint ? level.hint : 'Touch and hold above the shoot to start it growing.'}</p>
        </div>
      )}
    </div>
  );
}

function PauseCard({ level, onResume, onRestart, onHerb, onSettings }: { level: Level; onResume: () => void; onRestart: () => void; onHerb: () => void; onSettings: () => void }) {
  return (
    <div className="veil">
      <div className="card" role="dialog" aria-label="Paused">
        <span className="plate-no">{level.latin}</span>
        <h2>Resting in the shade</h2>
        <button className="leafy" onClick={() => { sound.tap(); onResume(); }} data-testid="resume">Keep growing</button>
        <div className="row">
          <button className="paper" onClick={() => { sound.tap(); onRestart(); }}><I.Restart /> Replant</button>
          <button className="paper" onClick={() => { sound.tap(); onHerb(); }}><I.Book /> Herbarium</button>
          <button className="paper round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
      </div>
    </div>
  );
}

const TITLES = ['Into the light', 'In full flower', 'A perfect specimen'];
function ResultCard({ finish, next, onNext, onRetry, onHerb }: { finish: Finish; next: Level | null; onNext: (l: Level) => void; onRetry: () => void; onHerb: () => void }) {
  const r = finish.result;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (!r.success) return;
    const t = [0, 1, 2].filter((i) => i < r.stars).map((i) => window.setTimeout(() => { setLit(i + 1); sound.star(i); }, 380 + i * 330));
    return () => t.forEach(clearTimeout);
  }, [r.success, r.stars]);
  const fail = r.outcome === 'thorn' ? FAIL_COPY.thorn : FAIL_COPY.stone;
  return (
    <div className="veil soft">
      <div className={`card result ${r.success ? 'win' : 'lose'}`} role="dialog" aria-label={r.success ? 'Reached the light' : 'Try again'}>
        <span className="plate-no">{finish.level.latin}</span>
        <h2>{r.success ? TITLES[r.stars - 1] : fail.title}</h2>
        {r.success ? (
          <>
            <div className="big-blooms">{[0, 1, 2].map((i) => <span key={i} className={i < lit ? 'on' : ''}><I.Bloom size={46} on={i < lit} /></span>)}</div>
            <ul className="criteria">
              <li className="on">Reached the light</li>
              <li className={r.blooms >= 2 ? 'on' : ''}>Two buds in bloom</li>
              <li className={r.blooms >= 3 ? 'on' : ''}>Every bud in bloom <small>({r.blooms} of 3)</small></li>
            </ul>
          </>
        ) : <p className="fail-line">{fail.line}</p>}
        {r.success && next ? (
          <button className="leafy" onClick={() => { sound.tap(); onNext(next); }} data-testid="next">Next: {next.name} <I.Next size={18} /></button>
        ) : (
          <button className="leafy" onClick={() => { sound.tap(); onRetry(); }} data-testid="retry"><I.Restart size={18} /> {r.success ? 'Grow it again' : 'Replant'}</button>
        )}
        <div className="row">
          {r.success && next && <button className="paper" onClick={() => { sound.tap(); onRetry(); }}><I.Restart /> Again</button>}
          <button className="paper" onClick={() => { sound.tap(); onHerb(); }}><I.Book /> Herbarium</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ save, onChange, onReset, onBack }: { save: Save; onChange: (s: Save['settings']) => void; onReset: () => void; onBack: () => void }) {
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="plate-no">settings</span><h2>Potting Shed</h2></div>
        <span />
      </div>
      <div className="card flat">
        <label className="slider">Music <input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => onChange({ ...st, music: +e.target.value })} /><output>{Math.round(st.music * 100)}</output></label>
        <label className="slider">Sounds <input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => onChange({ ...st, sfx: +e.target.value })} /><output>{Math.round(st.sfx * 100)}</output></label>
        <label className="toggle">Vibration <input type="checkbox" checked={st.haptics} onChange={(e) => onChange({ ...st, haptics: e.target.checked })} /><i /></label>
        <label className="toggle">Reduce motion <input type="checkbox" checked={st.reducedMotion} onChange={(e) => onChange({ ...st, reducedMotion: e.target.checked })} /><i /></label>
        <div className="reset">
          {confirm ? (
            <>
              <span>Clear the herbarium?</span>
              <button className="paper danger" onClick={() => { onReset(); setConfirm(false); }}>Clear</button>
              <button className="paper" onClick={() => setConfirm(false)}>Keep</button>
            </>
          ) : <button className="paper" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </div>
      <p className="small-print">Plays fully offline. No ads, accounts or tracking.</p>
    </div>
  );
}
