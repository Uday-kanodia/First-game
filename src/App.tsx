import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Home,
  Sliders,
  ChevronRight,
  Shield,
  Zap,
  Sword,
  Flame,
  Award,
  Video,
  Sparkles,
  X,
} from 'lucide-react';
import { GameEngine, HUDState } from './game/game';
import { AIDifficulty, CharacterConfig, CharacterListItem, GameScreen } from './game/types';
import { characterLoader } from './game/characterLoader';
import { audioManager } from './game/audioManager';
import { inputManager } from './game/input';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Screen State
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('title');
  const [characterList, setCharacterList] = useState<CharacterListItem[]>([]);
  const [selectedP1, setSelectedP1] = useState<string>('thala');
  const [selectedP2, setSelectedP2] = useState<string>('titan');
  const [selectedStage, setSelectedStage] = useState<string>('stadium');
  const [p1Config, setP1Config] = useState<CharacterConfig | null>(null);
  const [previewMoveVideo, setPreviewMoveVideo] = useState<{
    moveType: string;
    name: string;
    videoUrl: string;
    caption: string;
  } | null>(null);

  // Match / HUD State
  const [hud, setHud] = useState<HUDState | null>(null);
  const [announceTitle, setAnnounceTitle] = useState<string | null>(null);
  const [announceSub, setAnnounceSub] = useState<string | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{
    player: 1 | 2;
    winner: CharacterConfig;
    loser: CharacterConfig;
  } | null>(null);

  // Settings & Toggles
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableSuperCutscenes, setEnableSuperCutscenes] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [sfxVol, setSfxVol] = useState(0.8);
  const [musicVol, setMusicVol] = useState(0.5);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [is2Player, setIs2Player] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Initialize Game Engine once
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect touch device
    const isTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowTouchControls(isTouch);

    const engine = new GameEngine(mountRef.current, {
      onStateChange: (screen) => setCurrentScreen(screen),
      onHUDUpdate: (newHud) => setHud(newHud),
      onRoundAnnounce: (title, sub) => {
        setAnnounceTitle(title);
        setAnnounceSub(sub || null);
        setTimeout(() => {
          setAnnounceTitle(null);
          setAnnounceSub(null);
        }, 1600);
      },
      onMatchFinish: (player, winner, loser) => {
        setWinnerInfo({ player, winner, loser });
      },
    });

    engineRef.current = engine;
    (window as any).__gameEngine = engine;
    const settings = engine.settings;
    setQuality(settings.quality);
    setAiDifficulty(settings.aiDifficulty);
    setIs2Player(settings.isTwoPlayer);

    const audioSettings = audioManager.getSettings();
    setIsMuted(audioSettings.muted);
    setSfxVol(audioSettings.sfxVolume);
    setMusicVol(audioSettings.musicVolume);

    // Fetch character list
    characterLoader.getCharacterList().then((list) => {
      setCharacterList(list);
      if (list.length > 0) {
        setSelectedP1(list[0].id);
        setSelectedP2(list[1]?.id || list[0].id);
      }
    });

    // Check autostart query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setTimeout(() => {
        engine.startMatch('dummy', 'titan', 'stadium');
      }, 500);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync preview model when P1 changes in Character Select
  useEffect(() => {
    if (currentScreen === 'char_select' && engineRef.current) {
      engineRef.current.setPreviewCharacter(selectedP1);
      characterLoader.loadCharacterConfig(selectedP1).then((cfg) => {
        setP1Config(cfg);
      });
    }
  }, [selectedP1, currentScreen]);

  // Play winner/loser audio on match result screen
  useEffect(() => {
    if (currentScreen === 'result' && winnerInfo) {
      audioManager.stopFightBgm();
      audioManager.playWinAudio(winnerInfo.winner.id);
    }
  }, [currentScreen, winnerInfo]);

  // Handle first user interaction to unlock Web Audio
  const handleUserGesture = () => {
    audioManager.init();
  };

  const handleStartGameCTA = () => {
    handleUserGesture();
    engineRef.current?.setScreen('char_select');
  };

  const handleProceedToStageSelect = () => {
    handleUserGesture();
    setCurrentScreen('stage_select');
  };

  const handleLaunchFight = async () => {
    handleUserGesture();
    setIsLoading(true);
    setLoadingProgress(20);

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 100);

    await engineRef.current?.startMatch(selectedP1, selectedP2, selectedStage);
    setLoadingProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setLoadingProgress(0);
    }, 250);
  };

  const handleRematch = async () => {
    handleUserGesture();
    if (winnerInfo) {
      await engineRef.current?.startMatch(selectedP1, selectedP2, selectedStage);
    }
  };

  const handleBackToSelect = () => {
    handleUserGesture();
    engineRef.current?.setScreen('char_select');
  };

  const handleBackToHome = () => {
    handleUserGesture();
    engineRef.current?.setScreen('title');
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
      setIsPaused(engineRef.current.isPaused);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioManager.setMuted(nextMuted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Convert 2D world coord to screen percentage for Comic Captions
  const getScreenCoordinates = (worldX: number, worldY: number) => {
    if (!engineRef.current) return { left: '50%', top: '50%' };
    const rig = engineRef.current.cameraRig;
    const camX = rig.x + rig.shakeOffsetX;
    const camY = rig.y + rig.shakeOffsetY;
    const zoom = rig.zoom;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const screenX = width / 2 + (worldX - camX) * 72 * zoom;
    const screenY = height * 0.72 - (worldY - camY) * 72 * zoom;
    const xPct = Math.max(8, Math.min(92, (screenX / width) * 100));
    const yPct = Math.max(12, Math.min(85, (screenY / height) * 100));
    return { left: `${xPct}%`, top: `${yPct}%` };
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-white"
      onClick={handleUserGesture}
      data-screen={currentScreen}
    >
      {/* 2D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Screen Darken Overlay during Super Moves */}
      {hud && hud.screenDarkenOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-10 transition-opacity duration-150"
          style={{ opacity: hud.screenDarkenOpacity }}
        />
      )}

      {/* Quick Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg cursor-pointer transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          aria-label="Open settings"
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg cursor-pointer transition-colors"
        >
          <Sliders className="w-5 h-5" />
        </button>

        <button
          onClick={handleToggleFullscreen}
          aria-label="Toggle fullscreen"
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg cursor-pointer transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        {currentScreen === 'fighting' && (
          <button
            onClick={handleTogglePause}
            aria-label="Pause game"
            className="p-2.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white border border-amber-400/50 shadow-lg cursor-pointer transition-colors font-bold"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* =========================================================================
          SCREEN 1: TITLE SCREEN
          ========================================================================= */}
      {currentScreen === 'title' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-12 pointer-events-none">
          {/* Header Title Lockup */}
          <div className="max-w-2xl mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono tracking-widest uppercase mb-3">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> 2D Arcade Fighting Engine
            </div>

            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-400 bg-clip-text text-transparent">
              Clash of Titans 2D
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-lg leading-relaxed drop-shadow-md">
              Cinematic 2D arcade fighting game with plug-in characters, 60fps physics, unblockable grabs, dynamic camera, and explosive supers.
            </p>
          </div>

          {/* Primary CTA and Controls Hint */}
          <div className="flex flex-col items-start gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-4 pointer-events-auto">
              <button
                onClick={handleStartGameCTA}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xl italic tracking-wider uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                Start Fight <ChevronRight className="w-6 h-6 stroke-[3]" />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700/80 shadow-lg cursor-pointer transition-all"
              >
                Settings & Modes
              </button>
            </div>

            {/* Flat Control Hint Line */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400 bg-slate-900/60 backdrop-blur-none px-4 py-2.5 rounded-xl border border-slate-800">
              <span><strong className="text-cyan-400">P1:</strong> A/D Move · W Jump · S Block · J Punch · K Kick · L Grab · I Super</span>
              <span><strong className="text-orange-400">P2:</strong> Arrows Move · 1 Punch · 2 Kick · 3 Grab · 5 Super</span>
              <span><strong className="text-amber-400">Esc:</strong> Pause</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: CHARACTER SELECT SCREEN
          ========================================================================= */}
      {currentScreen === 'char_select' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
          {/* Top Bar */}
          <div className="flex justify-between items-center pointer-events-auto">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm cursor-pointer transition-colors"
            >
              <Home className="w-4 h-4" /> Main Menu
            </button>
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-black italic tracking-wide uppercase text-amber-400 drop-shadow">
                Select Your Fighter
              </h2>
              <p className="text-xs text-slate-400 font-mono">2D Character Roster</p>
            </div>
            <div className="w-24" /> {/* spacer */}
          </div>

          {/* Main Layout: Left Side Info Panel, Right Side Dedicated Arena Stage & Fighter Preview */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-none my-auto">
            {/* Left: Character Info & Moveset Specifications */}
            <div className="w-full max-w-sm md:max-w-md pointer-events-auto bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                  {p1Config?.title || 'Fighter Archetype'}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  HP: {p1Config?.health || 1000}
                </span>
              </div>
              <h3 className="text-3xl font-black italic uppercase text-white mb-2">
                {p1Config?.name || selectedP1}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {p1Config?.bio || 'High-performance combatant calibrated for the championship.'}
              </p>

              {/* Move List Overview */}
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  <span>Moveset Specifications</span>
                  <span className="text-[10px] text-amber-400 font-bold">Click move to preview clip</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'punch', label: 'Punch (J)', icon: Sword, color: 'text-cyan-400', border: 'border-cyan-500/30' },
                    { key: 'kick', label: 'Kick (K)', icon: Zap, color: 'text-amber-400', border: 'border-amber-500/30' },
                    { key: 'grab', label: 'Grab (L)', icon: Shield, color: 'text-red-400', border: 'border-red-500/30' },
                    { key: 'super', label: 'Super (I)', icon: Flame, color: 'text-purple-400', border: 'border-purple-500/30' },
                  ].map(({ key, label, icon: Icon, color, border }) => {
                    const move = p1Config?.moves[key as keyof typeof p1Config.moves];
                    const videoUrl = move?.videoPath || (p1Config?.id === 'thala' ? `/characters/thala/video/${key}.mp4` : null);
                    return (
                      <div
                        key={key}
                        onClick={() => {
                          if (videoUrl && move) {
                            setPreviewMoveVideo({
                              moveType: key,
                              name: move.name || label,
                              videoUrl,
                              caption: move.caption || move.name,
                            });
                          }
                        }}
                        className={`p-2.5 rounded-lg bg-slate-800/60 border ${border} transition-all ${
                          videoUrl ? 'cursor-pointer hover:bg-slate-800 hover:border-amber-400/60 hover:scale-[1.02]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`${color} font-bold flex items-center gap-1`}>
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </div>
                          {videoUrl && (
                            <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 flex items-center gap-0.5">
                              <Play className="w-2.5 h-2.5 fill-current" /> CLIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 font-mono">
                          {move?.name ? `${move.name} · ` : ''}{move?.damage || 0} DMG {move?.unblockable ? '· Unblockable' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Dedicated Arena Stage Showcase Badge */}
            <div className="hidden md:flex flex-col items-end gap-2 pr-6 z-10">
              <div className="px-4 py-1.5 rounded-full bg-slate-950/85 border border-cyan-400/40 text-cyan-300 font-mono text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Live Arena & Fighter Preview
              </div>
              <div className="text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
                Stage: Apex Cyber Arena · Stance Ready
              </div>
            </div>
          </div>

          {/* Bottom Roster Strip */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            {/* Character Selector Pills */}
            <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto">
              <span className="text-xs font-mono uppercase text-slate-400 mr-2">Player 1:</span>
              {characterList.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedP1(char.id)}
                  className={`px-5 py-3 rounded-xl font-black italic uppercase tracking-wider text-sm cursor-pointer transition-all border ${
                    selectedP1 === char.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>

            {/* Opponent Selection (AI or P2) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-slate-400">
                {is2Player ? 'Player 2:' : 'Opponent:'}
              </span>
              <select
                value={selectedP2}
                onChange={(e) => setSelectedP2(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white cursor-pointer"
              >
                {characterList.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} ({char.archetype})
                  </option>
                ))}
              </select>

              <button
                onClick={handleProceedToStageSelect}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black italic uppercase text-sm tracking-wider cursor-pointer shadow-lg transition-transform hover:scale-105"
              >
                Confirm Fighter <ChevronRight className="inline w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 3: STAGE SELECT SCREEN
          ========================================================================= */}
      {currentScreen === 'stage_select' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-12 pointer-events-none">
          <div className="flex justify-between items-center pointer-events-auto">
            <button
              onClick={() => setCurrentScreen('char_select')}
              className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm cursor-pointer"
            >
              Back to Fighter
            </button>
            <h2 className="text-3xl font-black italic uppercase tracking-wider text-amber-400">
              Select Combat Arena
            </h2>
            <div className="w-24" />
          </div>

          {/* Stage Cards */}
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 pointer-events-auto">
            {/* Stage 1: Stadium */}
            <div
              onClick={() => {
                setSelectedStage('stadium');
                engineRef.current?.setStage('stadium');
              }}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedStage === 'stadium'
                  ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] scale-102'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="h-32 rounded-xl bg-gradient-to-br from-slate-800 to-cyan-950 flex items-center justify-center mb-4 border border-cyan-900/50">
                <span className="text-4xl">🏟️</span>
              </div>
              <h3 className="text-2xl font-black italic uppercase text-white">
                Apex Cyber Arena
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                World Championship arena with floodlights, cheering crowd stands, and dynamic holograms.
              </p>
            </div>

            {/* Stage 2: Street */}
            <div
              onClick={() => {
                setSelectedStage('street');
                engineRef.current?.setStage('street');
              }}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedStage === 'street'
                  ? 'bg-slate-900/90 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.4)] scale-102'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="h-32 rounded-xl bg-gradient-to-br from-slate-900 to-pink-950 flex items-center justify-center mb-4 border border-pink-900/50">
                <span className="text-4xl">🌆</span>
              </div>
              <h3 className="text-2xl font-black italic uppercase text-white">
                Neon Underbelly
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Cyberpunk alleyway with wet asphalt road reflections, steam vents, and glowing neon signs.
              </p>
            </div>
          </div>

          <div className="flex justify-center pointer-events-auto">
            <button
              onClick={handleLaunchFight}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-black text-xl italic tracking-wider uppercase shadow-[0_0_35px_rgba(239,68,68,0.5)] cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              Engage Combat!
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: IN-GAME FIGHT HUD
          ========================================================================= */}
      {currentScreen === 'fighting' && hud && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-8">
          {/* Top Status Cluster: Health Bars & 99s Timer */}
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
            {/* P1 Health & Info */}
            <div className="flex-1 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl md:text-2xl font-black italic uppercase text-cyan-400 drop-shadow">
                  {hud.p1Name}
                </span>
                {/* Round Victory Gems */}
                <div className="flex items-center gap-1 ml-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border border-cyan-400 ${
                      hud.p1RoundsWon >= 1 ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-900'
                    }`}
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded-full border border-cyan-400 ${
                      hud.p1RoundsWon >= 2 ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* P1 Health Bar */}
              <div className="w-full h-7 bg-slate-900/90 rounded-lg p-1 border border-slate-700/80 shadow-2xl relative overflow-hidden">
                <div
                  className="h-full rounded bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75 shadow-inner"
                  style={{ width: `${Math.max(0, (hud.p1Health / hud.p1MaxHealth) * 100)}%` }}
                />
                <span className="absolute right-3 top-1 text-[11px] font-mono font-bold tabular-nums text-slate-200 drop-shadow">
                  {hud.p1Health} / {hud.p1MaxHealth}
                </span>
              </div>
            </div>

            {/* Center 99s Countdown Timer */}
            <div className="flex flex-col items-center px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-900/90 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center">
                <span className="text-2xl md:text-3xl font-black font-mono tabular-nums text-amber-300 drop-shadow">
                  {hud.timer}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  R{hud.roundNumber}
                </span>
              </div>
            </div>

            {/* P2 Health & Info */}
            <div className="flex-1 flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1.5">
                {/* Round Victory Gems */}
                <div className="flex items-center gap-1 mr-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border border-orange-400 ${
                      hud.p2RoundsWon >= 2 ? 'bg-orange-400 shadow-[0_0_8px_#f97316]' : 'bg-slate-900'
                    }`}
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded-full border border-orange-400 ${
                      hud.p2RoundsWon >= 1 ? 'bg-orange-400 shadow-[0_0_8px_#f97316]' : 'bg-slate-900'
                    }`}
                  />
                </div>
                <span className="text-xl md:text-2xl font-black italic uppercase text-orange-400 drop-shadow">
                  {hud.p2Name}
                </span>
              </div>

              {/* P2 Health Bar */}
              <div className="w-full h-7 bg-slate-900/90 rounded-lg p-1 border border-slate-700/80 shadow-2xl relative overflow-hidden flex justify-end">
                <div
                  className="h-full rounded bg-gradient-to-l from-orange-500 to-red-500 transition-all duration-75 shadow-inner"
                  style={{ width: `${Math.max(0, (hud.p2Health / hud.p2MaxHealth) * 100)}%` }}
                />
                <span className="absolute left-3 top-1 text-[11px] font-mono font-bold tabular-nums text-slate-200 drop-shadow">
                  {hud.p2Health} / {hud.p2MaxHealth}
                </span>
              </div>
            </div>
          </div>

          {/* Comic Pop-Up Captions */}
          {hud.captions.map((cap) => {
            const coords = getScreenCoordinates(cap.x, cap.y);
            return (
              <div
                key={cap.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 animate-bounce"
                style={{
                  left: coords.left,
                  top: coords.top,
                }}
              >
                <div
                  className="px-4 py-1.5 rounded-xl text-xl md:text-3xl font-black italic uppercase tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] transform -rotate-3 border-2"
                  style={{
                    backgroundColor: cap.color,
                    borderColor: '#ffffff',
                    color: '#090d16',
                  }}
                >
                  {cap.text}
                </div>
              </div>
            );
          })}

          {/* Large Round Announcer Callout ("ROUND 1... FIGHT!", "K.O.!") */}
          {announceTitle && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] text-amber-400 animate-pulse">
                {announceTitle}
              </div>
              {announceSub && (
                <div className="text-xl md:text-3xl font-mono uppercase tracking-widest text-slate-200 mt-2 drop-shadow">
                  {announceSub}
                </div>
              )}
            </div>
          )}

          {/* High-Voltage Move / Super Video Cut-In */}
          {enableSuperCutscenes && hud.superCinematic?.active && (
            <div className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none p-4">
              <div
                className={`w-full ${
                  hud.superCinematic.moveType === 'super' ? 'max-w-xl' : 'max-w-lg'
                } bg-slate-950/95 border-2 ${
                  hud.superCinematic.moveType === 'super'
                    ? 'border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.7)]'
                    : 'border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.6)]'
                } rounded-3xl overflow-hidden transform scale-100 animate-in fade-in zoom-in duration-200`}
              >
                <div
                  className={`px-5 py-2.5 flex items-center justify-between ${
                    hud.superCinematic.moveType === 'super'
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600'
                      : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600'
                  }`}
                >
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-950 font-black flex items-center gap-2">
                    {hud.superCinematic.moveType === 'super' ? (
                      <>
                        <Flame className="w-4 h-4 fill-current animate-bounce" /> SUPER CINEMATIC
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current animate-bounce" /> MOVE: {hud.superCinematic.moveName || hud.superCinematic.moveType?.toUpperCase()}
                      </>
                    )}
                  </span>
                  <span className="font-black italic text-xs uppercase text-slate-950">
                    {hud.superCinematic.attackerName}
                  </span>
                </div>

                {hud.superCinematic.videoUrl ? (
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <video
                      key={hud.superCinematic.videoUrl}
                      src={hud.superCinematic.videoUrl}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <span className="text-2xl md:text-3xl font-black italic uppercase text-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                        {hud.superCinematic.caption}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded font-bold">
                        ACTION CAM
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="text-4xl md:text-5xl font-black italic uppercase text-amber-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                      {hud.superCinematic.caption}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Super Meters */}
          <div className="w-full max-w-5xl mx-auto flex items-end justify-between gap-8 mb-2">
            {/* P1 Super Meter */}
            <div className="flex-1">
              <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                <span className="text-cyan-400">SUPER GAUGE</span>
                <span className={hud.p1Meter >= 100 ? 'text-amber-400 font-black animate-pulse' : 'text-slate-400'}>
                  {hud.p1Meter >= 100 ? 'MAX READY! (I)' : `${Math.floor(hud.p1Meter)}%`}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-900/90 rounded-md p-0.5 border border-slate-700/80 overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-75 ${
                    hud.p1Meter >= 100
                      ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-500'
                  }`}
                  style={{ width: `${hud.p1Meter}%` }}
                />
              </div>
            </div>

            {/* P2 Super Meter */}
            <div className="flex-1">
              <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                <span className={hud.p2Meter >= 100 ? 'text-amber-400 font-black animate-pulse' : 'text-slate-400'}>
                  {hud.p2Meter >= 100 ? 'MAX READY! (5)' : `${Math.floor(hud.p2Meter)}%`}
                </span>
                <span className="text-orange-400">SUPER GAUGE</span>
              </div>
              <div className="w-full h-4 bg-slate-900/90 rounded-md p-0.5 border border-slate-700/80 overflow-hidden flex justify-end">
                <div
                  className={`h-full rounded transition-all duration-75 ${
                    hud.p2Meter >= 100
                      ? 'bg-gradient-to-l from-amber-400 via-orange-400 to-red-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                      : 'bg-gradient-to-l from-orange-600 to-red-500'
                  }`}
                  style={{ width: `${hud.p2Meter}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 5: RESULT / VICTORY SCREEN
          ========================================================================= */}
      {currentScreen === 'result' && winnerInfo && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-12 pointer-events-none">
          {/* Header */}
          <div className="text-center mt-6">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono uppercase tracking-widest inline-flex items-center gap-1.5 mb-2">
              <Award className="w-4 h-4 text-amber-400" /> Match Victory Decided
            </span>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-amber-400 drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]">
              {winnerInfo.winner.name} Wins!
            </h2>
          </div>

          {/* Victory / Defeat Cinematic Showcase Card */}
          <div className="max-w-2xl mx-auto w-full text-center pointer-events-auto bg-slate-950/90 border border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center gap-6">
            {(winnerInfo.winner.id === 'thala' || winnerInfo.loser.id === 'thala') && (
              <div className="w-full md:w-56 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg relative bg-black flex-shrink-0">
                <video
                  src={
                    winnerInfo.winner.id === 'thala'
                      ? '/characters/thala/video/super.mp4'
                      : '/assets/cinematic/defeat_cinematic.mp4'
                  }
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30">
                  {winnerInfo.winner.id === 'thala' ? 'VICTORY CUTSCENE' : 'DEFEAT CUTSCENE'}
                </div>
              </div>
            )}

            <div className="flex-1 text-left">
              <p className="text-lg md:text-xl font-black italic tracking-wide text-amber-200 uppercase mb-2">
                &quot;{winnerInfo.winner.captions?.win || 'VICTORY SECURED. NO OPPONENT REMAINS STANDING.'}&quot;
              </p>
              {winnerInfo.loser.captions?.lose && (
                <p className="text-sm font-mono text-slate-300 italic mb-2">
                  &quot;{winnerInfo.loser.captions.lose}&quot;
                </p>
              )}
              <p className="text-xs font-mono text-slate-400 mb-3">
                Defeated: {winnerInfo.loser.name} ({winnerInfo.loser.title})
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={() => audioManager.playWinAudio(winnerInfo.winner.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-amber-400/40 cursor-pointer transition-colors"
                  title="Replay Victory Audio"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Play Win Audio
                </button>
                <button
                  onClick={() => audioManager.playLoseAudio(winnerInfo.loser.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                  title="Play Defeat Audio"
                >
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" /> Play Defeat Audio
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Thala Signature Victory Reel</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4 pointer-events-auto">
            <button
              onClick={handleRematch}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black italic uppercase text-lg tracking-wider cursor-pointer shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Rematch
            </button>
            <button
              onClick={handleBackToSelect}
              className="px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-base border border-slate-700 cursor-pointer shadow-lg transition-colors"
            >
              Character Select
            </button>
            <button
              onClick={handleBackToHome}
              className="px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-base border border-slate-700 cursor-pointer shadow-lg transition-colors"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE TOUCH CONTROLS (ON-SCREEN JOYSTICK + 4 ACTION BUTTONS)
          ========================================================================= */}
      {showTouchControls && currentScreen === 'fighting' && !isPaused && (
        <div className="absolute inset-0 z-25 pointer-events-none flex justify-between items-end p-6 md:hidden">
          {/* Virtual D-Pad / Move buttons */}
          <div className="flex items-center gap-2 pointer-events-auto mb-2">
            <button
              onTouchStart={() => inputManager.setTouchStick(-1)}
              onTouchEnd={() => inputManager.setTouchStick(0)}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700 active:bg-cyan-500 active:text-slate-950 text-white font-black text-lg flex items-center justify-center shadow-lg"
            >
              ◀
            </button>
            <div className="flex flex-col gap-2">
              <button
                onTouchStart={() => inputManager.setTouchAction('jump', true)}
                onTouchEnd={() => inputManager.setTouchAction('jump', false)}
                className="w-14 h-12 rounded-xl bg-slate-900/80 border border-slate-700 active:bg-cyan-500 active:text-slate-950 text-white font-black text-sm flex items-center justify-center shadow-lg"
              >
                JUMP
              </button>
              <button
                onTouchStart={() => inputManager.setTouchAction('block', true)}
                onTouchEnd={() => inputManager.setTouchAction('block', false)}
                className="w-14 h-12 rounded-xl bg-slate-900/80 border border-slate-700 active:bg-amber-500 active:text-slate-950 text-white font-black text-sm flex items-center justify-center shadow-lg"
              >
                BLOCK
              </button>
            </div>
            <button
              onTouchStart={() => inputManager.setTouchStick(1)}
              onTouchEnd={() => inputManager.setTouchStick(0)}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700 active:bg-cyan-500 active:text-slate-950 text-white font-black text-lg flex items-center justify-center shadow-lg"
            >
              ▶
            </button>
          </div>

          {/* 4 Arcade Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pointer-events-auto mb-2">
            <button
              onTouchStart={() => inputManager.setTouchAction('punch', true)}
              className="w-16 h-16 rounded-full bg-cyan-600/90 active:bg-cyan-400 border-2 border-cyan-300 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl uppercase"
            >
              <Sword className="w-4 h-4 mb-0.5" />
              Punch
            </button>
            <button
              onTouchStart={() => inputManager.setTouchAction('kick', true)}
              className="w-16 h-16 rounded-full bg-amber-600/90 active:bg-amber-400 border-2 border-amber-300 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl uppercase"
            >
              <Zap className="w-4 h-4 mb-0.5" />
              Kick
            </button>
            <button
              onTouchStart={() => inputManager.setTouchAction('grab', true)}
              className="w-16 h-16 rounded-full bg-red-600/90 active:bg-red-400 border-2 border-red-300 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl uppercase"
            >
              <Shield className="w-4 h-4 mb-0.5" />
              Grab
            </button>
            <button
              onTouchStart={() => inputManager.setTouchAction('super', true)}
              className="w-16 h-16 rounded-full bg-purple-600/90 active:bg-purple-400 border-2 border-purple-300 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl uppercase"
            >
              <Flame className="w-4 h-4 mb-0.5" />
              Super
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAUSE MODAL
          ========================================================================= */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <h3 className="text-3xl font-black italic uppercase text-amber-400">
              Game Paused
            </h3>

            <div className="space-y-2 mt-2">
              <button
                onClick={handleTogglePause}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-base cursor-pointer transition-colors"
              >
                Resume Match
              </button>
              <button
                onClick={handleRematch}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer transition-colors"
              >
                Restart Match
              </button>
              <button
                onClick={() => {
                  handleTogglePause();
                  handleBackToSelect();
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer transition-colors"
              >
                Change Character
              </button>
              <button
                onClick={() => {
                  handleTogglePause();
                  handleBackToHome();
                }}
                className="w-full py-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-sm cursor-pointer transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SETTINGS MODAL
          ========================================================================= */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-2xl font-black italic uppercase text-amber-400">
                Game Settings
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Quality Preset */}
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-2">
                Render Quality & Shadows:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuality(q);
                      engineRef.current?.setQuality(q);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold uppercase cursor-pointer border ${
                      quality === q
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Difficulty */}
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-2">
                AI Opponent Difficulty:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => {
                      setAiDifficulty(diff);
                      engineRef.current?.setAIDifficulty(diff);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold uppercase cursor-pointer border ${
                      aiDifficulty === diff
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Volumes */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>SFX VOLUME</span>
                  <span>{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSfxVol(v);
                    audioManager.setSfxVolume(v);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>MUSIC VOLUME</span>
                  <span>{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMusicVol(v);
                    audioManager.setMusicVolume(v);
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Mode: 2P Local Toggle */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div>
                <span className="text-sm font-bold block text-white">2-Player Local Mode</span>
                <span className="text-xs text-slate-400 block">
                  P2 uses Arrow keys + 1, 2, 3, 5
                </span>
              </div>
              <input
                type="checkbox"
                checked={is2Player}
                onChange={(e) => {
                  setIs2Player(e.target.checked);
                  engineRef.current?.setTwoPlayer(e.target.checked);
                }}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Signature Move Video Cut-Ins */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold block text-sky-300">Move Video Cut-Ins</span>
                  <span className="text-xs text-slate-400 block">
                    Play dynamic 3D action video when signature moves execute
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableSuperCutscenes}
                  onChange={(e) => setEnableSuperCutscenes(e.target.checked)}
                  className="w-5 h-5 accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Thala Move Clips:</div>
                  <div className="text-xs font-mono text-amber-400">
                    Punch, Kick, Grab & Super Videos Active
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded">
                  4 MOVES
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHARACTER SELECT: MOVE VIDEO PREVIEW MODAL
          ========================================================================= */}
      {previewMoveVideo && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-400/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-slate-950" />
                <h3 className="font-mono text-xs uppercase tracking-widest text-slate-950 font-black">
                  Move Video Preview: {previewMoveVideo.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewMoveVideo(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-xl bg-slate-950/40 hover:bg-slate-950 text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black overflow-hidden flex-shrink-0">
              <video
                key={previewMoveVideo.videoUrl}
                src={previewMoveVideo.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Caption & Controls */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-black italic uppercase text-amber-400 tracking-wider">
                  {previewMoveVideo.caption}
                </span>
                <span className="text-xs font-mono text-slate-400 block">
                  Signature Animation Clip · High Definition
                </span>
              </div>
              <button
                onClick={() => setPreviewMoveVideo(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LOADING PROGRESS SCREEN
          ========================================================================= */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <h4 className="text-3xl font-black italic uppercase text-amber-400 mb-4 tracking-wider animate-pulse">
              Loading Match...
            </h4>
            <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-150"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-xs font-mono text-slate-400">
              Compiling 3D Arena & Shader Geometry...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
