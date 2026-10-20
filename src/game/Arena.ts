import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { PenGame, TABLE, type BodyState } from './physics';
import {
  clamp,
  flickImpulse,
  legalAiShot,
  nextTurn,
  resolveFalls,
  type Difficulty,
  type GameState,
  type Side,
} from './logic';

export interface GameCallbacks {
  onTurn: (side: Side) => void;
  onResult: (winner: Side | 'draw') => void;
  onStateChange?: (state: GameState) => void;
}

export interface DiagnosticsData {
  state: GameState;
  turn: Side;
  player: BodyState;
  opponent: BodyState;
  aimPower: number;
  aimAngle: number;
  isPaused: boolean;
  scale: number;
}

const PEN_THEMES = [
  { barrel: '#c83f2d', ring: '#e8be5b', grip: '#1f1a18', tip: '#dedede', clip: '#f0c765' },
  { barrel: '#1d4f7c', ring: '#d9ab43', grip: '#162b3d', tip: '#d6d6d6', clip: '#cfd7de' },
  { barrel: '#cfa23c', ring: '#3b2f21', grip: '#42331f', tip: '#dedede', clip: '#403322' },
];

const RIVAL_THEME = {
  barrel: '#295443',
  ring: '#c7b489',
  grip: '#182e25',
  tip: '#d8d8d8',
  clip: '#cfc6b0',
};

export class Arena {
  app = new Application();
  physics = new PenGame();
  root = new Container();

  private classroomLayer = new Container();
  private deskLayer = new Container();
  private shadowLayer = new Container();
  private pensLayer = new Container();
  private aimLayer = new Graphics();

  private penGraphics: Graphics[] = [];
  private shadowGraphics: Graphics[] = [];

  state: GameState = 'READY';
  current: Side = 'player';
  difficulty: Difficulty = 'Normal';
  selectedPen = 0;
  score: [number, number] = [0, 0];

  isPaused = false;
  mute = false;
  volume = 0.65;
  private audioCtx?: AudioContext;

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };
  private lastAimImpulse = { x: 0, y: 0 };

  private aiTimer: number | null = null;
  private lastTime = performance.now();
  private penFallProgress: Record<Side, number> = { player: 0, opponent: 0 };

  constructor(
    private host: HTMLElement,
    private callbacks: GameCallbacks
  ) {}

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      preference: 'webgl',
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    this.host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Table No. 21 Pen Fighting Arena');
    this.app.stage.addChild(this.root);

    // Build scene graph layers
    this.root.addChild(this.classroomLayer);
    this.root.addChild(this.deskLayer);
    this.root.addChild(this.shadowLayer);
    this.root.addChild(this.pensLayer);
    this.root.addChild(this.aimLayer);

    for (let i = 0; i < 2; i++) {
      const shadow = new Graphics();
      this.shadowGraphics.push(shadow);
      this.shadowLayer.addChild(shadow);

      const pen = new Graphics();
      this.penGraphics.push(pen);
      this.pensLayer.addChild(pen);
    }

    this.drawEnvironment();

    // Sound collision hook
    this.physics.onCollision = (intensity) => {
      this.playClackSound(intensity);
    };

    // Stage pointer interaction
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.onPointerDown);
    this.app.stage.on('pointermove', this.onPointerMove);
    this.app.stage.on('pointerup', this.onPointerUp);
    this.app.stage.on('pointerupoutside', this.onPointerUp);
    this.app.stage.on('pointercancel', this.onPointerUp);

    this.app.ticker.add(this.onTick);
    window.addEventListener('resize', this.layout);
    this.layout();
  }

  private layout = (): void => {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Viewport encompasses the table (22x13) + generous margins for classroom depth
    const viewW = TABLE.width + 5.0;
    const viewH = TABLE.height + 5.5;

    const scale = Math.min(w / viewW, h / viewH);
    this.root.scale.set(scale);

    // Center the table accurately in the gameplay viewport
    this.root.position.set(w / 2, h / 2 + 12);
  };

  private drawEnvironment(): void {
    this.classroomLayer.removeChildren();
    this.deskLayer.removeChildren();

    // 1. CLASSROOM ATMOSPHERE (Chalkboard & Sunlight)
    const classroom = new Graphics();
    // Green chalkboard wall background
    classroom.rect(-45, -30, 90, 16).fill('#1c3629');
    // Wooden chalkboard frame border
    classroom.rect(-45, -14.2, 90, 0.5).fill('#5e381e');
    classroom.rect(-45, -13.7, 90, 0.35).fill('#7f4f2c');
    // Chalk tray
    classroom.rect(-30, -13.7, 60, 0.45).fill('#3e2515');

    // Chalkboard dust & nostalgic chalk sketches
    classroom.moveTo(-22, -26).lineTo(-22, -16).stroke({ color: '#f3faee', alpha: 0.12, width: 0.08 });
    classroom.moveTo(-22, -16).lineTo(-12, -16).stroke({ color: '#f3faee', alpha: 0.12, width: 0.08 });
    classroom.moveTo(-22, -26).lineTo(-12, -16).stroke({ color: '#f3faee', alpha: 0.12, width: 0.08 });
    // Soft circle formula
    classroom.circle(18, -21, 3.8).stroke({ color: '#f5ebcf', alpha: 0.1, width: 0.07 });

    // Diagonal afternoon golden-hour window rays
    for (let i = 0; i < 6; i++) {
      const startX = -32 + i * 11;
      classroom
        .poly([
          { x: startX, y: -30 },
          { x: startX + 14, y: -30 },
          { x: startX + 26, y: 30 },
          { x: startX + 12, y: 30 },
        ])
        .fill({ color: '#ffeaae', alpha: 0.055 });
    }

    // Classroom floor depth
    classroom.rect(-45, -13.7, 90, 45).fill('#1a1714');

    // Classroom bench legs in background
    classroom.rect(-18, -13.7, 1.2, 7).fill({ color: '#0d0d0c', alpha: 0.6 });
    classroom.rect(16.8, -13.7, 1.2, 7).fill({ color: '#0d0d0c', alpha: 0.6 });

    // Chalkboard chalk text
    const chalkText = new Text({
      text: 'ROOM 3-B  •  AFTERNOON STUDY HALL',
      style: new TextStyle({
        fontFamily: 'DM Mono, monospace',
        fontSize: 28,
        fill: '#9bc2a9',
        letterSpacing: 4,
      }),
      resolution: 2,
    });
    chalkText.scale.set(0.72 / 28);
    chalkText.anchor.set(0.5);
    chalkText.position.set(0, -25);
    this.classroomLayer.addChild(classroom);
    this.classroomLayer.addChild(chalkText);

    // 2. TABLE NO. 21 DESK (Realistic 2.5D wooden battle surface)
    const desk = new Graphics();
    const halfW = TABLE.halfWidth;
    const halfH = TABLE.halfHeight;

    // Floor drop shadow cast by table
    desk
      .roundRect(-halfW - 0.7, -halfH + 0.3, TABLE.width + 1.4, TABLE.height + 2.4, 0.8)
      .fill({ color: '#070605', alpha: 0.68 });

    // Desk thickness / 2.5D front lip
    desk
      .roundRect(-halfW - 0.3, -halfH - 0.15, TABLE.width + 0.6, TABLE.height + 0.95, 0.55)
      .fill('#2e1a10');
    desk
      .roundRect(-halfW - 0.15, halfH - 0.05, TABLE.width + 0.3, 0.75, 0.3)
      .fill('#422617');

    // Solid tabletop battle area (Matches TABLE dimensions exactly)
    desk
      .roundRect(-halfW, -halfH, TABLE.width, TABLE.height, 0.38)
      .fill('#85542f');

    // Primary warm amber wood surface
    desk
      .roundRect(-halfW + 0.12, -halfH + 0.12, TABLE.width - 0.24, TABLE.height - 0.24, 0.32)
      .fill('#996339');

    // Organic wood grain plank lines across desk
    for (let i = 0; i < 26; i++) {
      const y = -halfH + 0.5 + i * 0.48;
      const grainColor = i % 2 === 0 ? '#b57948' : '#734623';
      const grainAlpha = i % 3 === 0 ? 0.24 : 0.12;
      const grainWidth = i % 4 === 0 ? 0.07 : 0.035;

      desk
        .moveTo(-halfW + 0.25, y)
        .bezierCurveTo(
          -4,
          y + Math.sin(i * 0.9) * 0.16,
          4,
          y - Math.cos(i * 0.8) * 0.14,
          halfW - 0.25,
          y + Math.sin(i * 0.6) * 0.1
        )
        .stroke({ color: grainColor, alpha: grainAlpha, width: grainWidth });
    }

    // Top desk varnished highlight
    desk
      .moveTo(-halfW + 0.3, -halfH + 0.25)
      .lineTo(halfW - 0.3, -halfH + 0.25)
      .stroke({ color: '#f5cb98', alpha: 0.36, width: 0.09 });

    // Subtle stationary pen groove near top edge
    desk
      .roundRect(-halfW + 1.6, -halfH + 0.65, TABLE.width - 3.2, 0.42, 0.2)
      .fill({ color: '#573319', alpha: 0.75 });
    desk
      .roundRect(-halfW + 1.62, -halfH + 0.66, TABLE.width - 3.24, 0.08, 0.04)
      .fill({ color: '#2b170a', alpha: 0.6 });

    // Desk rim borders (clearly defined drop-off boundaries)
    desk
      .roundRect(-halfW, -halfH, TABLE.width, TABLE.height, 0.38)
      .stroke({ color: '#3d2314', width: 0.12, alpha: 0.8 });

    // Engraved TABLE NO. 21 stencil mark on the desk
    const tableNumber = new Text({
      text: 'TABLE NO. 21',
      style: new TextStyle({
        fontFamily: 'Georgia, serif',
        fontSize: 32,
        fontWeight: 'bold',
        fill: '#4f2e17',
        fontStyle: 'italic',
      }),
      resolution: 2,
    });
    tableNumber.scale.set(0.65 / 32);
    tableNumber.anchor.set(1, 1);
    tableNumber.position.set(halfW - 1.2, halfH - 0.85);

    const yearStamp = new Text({
      text: 'CLASSROOM 3-B',
      style: new TextStyle({
        fontFamily: 'DM Mono, monospace',
        fontSize: 20,
        fill: '#5e381d',
      }),
      resolution: 2,
    });
    yearStamp.scale.set(0.38 / 20);
    yearStamp.anchor.set(1, 1);
    yearStamp.position.set(halfW - 1.2, halfH - 0.45);

    this.deskLayer.addChild(desk);
    this.deskLayer.addChild(tableNumber);
    this.deskLayer.addChild(yearStamp);
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    const local = this.root.toLocal({ x, y });
    return { x: local.x, y: local.y };
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const global = this.root.toGlobal({ x, y });
    return { x: global.x, y: global.y };
  }

  private isPointerNearPen(x: number, y: number, side: Side): boolean {
    const body = this.physics.bodies[side];
    const pos = body.getPosition();
    const dist = Math.hypot(x - pos.x, y - pos.y);
    return dist <= 2.2;
  }

  private onPointerDown = (e: any): void => {
    if (this.state !== 'READY' || this.current !== 'player' || this.isPaused) {
      return;
    }

    const world = this.screenToWorld(e.global.x, e.global.y);
    if (this.isPointerNearPen(world.x, world.y, 'player')) {
      const penPos = this.physics.bodies.player.getPosition();
      this.isDragging = true;
      this.dragStart = { x: penPos.x, y: penPos.y };
      this.dragCurrent = { x: world.x, y: world.y };
      this.state = 'AIMING';
      this.callbacks.onStateChange?.(this.state);
      this.app.canvas.setPointerCapture?.(e.pointerId);
    }
  };

  private onPointerMove = (e: any): void => {
    if (!this.isDragging || this.state !== 'AIMING') return;
    this.dragCurrent = this.screenToWorld(e.global.x, e.global.y);
  };

  private onPointerUp = (): void => {
    if (!this.isDragging || this.state !== 'AIMING') return;
    this.isDragging = false;

    // Pull-back vector: pulling backward flick forward
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const distance = Math.hypot(dx, dy);

    if (distance >= 0.28) {
      const impulse = flickImpulse(dx, dy, 12.0, 1.35);
      this.lastAimImpulse = impulse;
      this.executeShot('player', impulse.x, impulse.y);
    } else {
      // Drag too short: cancel aim
      this.state = 'READY';
      this.aimLayer.clear();
      this.callbacks.onStateChange?.(this.state);
    }
  };

  private executeShot(side: Side, impulseX: number, impulseY: number): void {
    if (this.physics.flick(side, impulseX, impulseY)) {
      this.playFlickSound();
      this.state = 'SHOT_IN_MOTION';
      this.aimLayer.clear();
      this.callbacks.onStateChange?.(this.state);
    }
  }

  start(score: [number, number], difficulty: Difficulty, pen: number): void {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }

    this.score = score;
    this.difficulty = difficulty;
    this.selectedPen = pen;
    this.current = 'player';
    this.state = 'READY';
    this.isPaused = false;
    this.isDragging = false;
    this.penFallProgress = { player: 0, opponent: 0 };

    this.physics.reset();
    this.aimLayer.clear();
    this.callbacks.onTurn(this.current);
    this.callbacks.onStateChange?.(this.state);
    this.lastTime = performance.now();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  private triggerAiTurn(): void {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
    }

    // Natural opponent hesitation (650ms)
    this.aiTimer = window.setTimeout(() => {
      this.aiTimer = null;
      if (this.state === 'READY' && this.current === 'opponent' && !this.isPaused) {
        const own = this.physics.bodies.opponent.getPosition();
        const target = this.physics.bodies.player.getPosition();
        const shot = legalAiShot(this.difficulty, own, target);
        this.executeShot('opponent', shot.x, shot.y);
      }
    }, 650);
  }

  private onTick = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.isPaused) {
      return;
    }

    // Step physics
    const { settled, fallen } = this.physics.step(dt);
    this.updatePenVisuals(dt, fallen);

    // State machine resolution
    if (this.state === 'SHOT_IN_MOTION' && settled) {
      this.state = 'SETTLING';
      this.callbacks.onStateChange?.(this.state);

      // Evaluate falls once physics has settled
      const winner = resolveFalls(fallen.player, fallen.opponent);
      if (winner !== null) {
        this.state = 'ROUND_RESULT';
        this.callbacks.onStateChange?.(this.state);
        this.playResultSound(winner);
        this.callbacks.onResult(winner);
      } else {
        // Switch turn cleanly
        this.current = nextTurn(this.current);
        this.state = 'READY';
        this.callbacks.onTurn(this.current);
        this.callbacks.onStateChange?.(this.state);

        if (this.current === 'opponent') {
          this.triggerAiTurn();
        }
      }
    }

    if (this.state === 'AIMING') {
      this.drawAimGuide();
    } else {
      this.aimLayer.clear();
    }
  };

  private updatePenVisuals(dt: number, fallen: Record<Side, boolean>): void {
    const sides: Side[] = ['player', 'opponent'];

    for (let i = 0; i < 2; i++) {
      const side = sides[i];
      const gPen = this.penGraphics[i];
      const gShadow = this.shadowGraphics[i];
      const b = this.physics.bodies[side];
      const pos = b.getPosition();
      const angle = b.getAngle();

      // Visual fall off desk edge
      if (fallen[side]) {
        this.penFallProgress[side] = Math.min(this.penFallProgress[side] + dt * 2.8, 1);
        if (this.penFallProgress[side] < 0.1) {
          this.playFallSound();
        }
      }

      const fall = this.penFallProgress[side];
      const visualY = pos.y + fall * 1.5;
      const visualScale = 1 - fall * 0.35;
      const visualAlpha = Math.max(0, 1 - fall * 0.85);

      // Shadow rendering
      gShadow.clear();
      if (visualAlpha > 0.05 && fall < 0.6) {
        gShadow.position.set(pos.x + 0.18, pos.y + 0.26);
        gShadow.rotation = angle;
        gShadow.ellipse(0, 0, 1.45 * visualScale, 0.28 * visualScale).fill({
          color: '#1a100b',
          alpha: 0.38 * (1 - fall),
        });
      }

      // Pen rendering
      gPen.clear();
      gPen.position.set(pos.x, visualY);
      gPen.rotation = angle;
      gPen.scale.set(visualScale);
      gPen.alpha = visualAlpha;

      const theme = i === 0 ? PEN_THEMES[this.selectedPen] : RIVAL_THEME;

      // Outer pen barrel
      gPen.roundRect(-1.25, -0.21, 2.5, 0.42, 0.21).fill(theme.barrel);
      // Top spine 3D reflection highlight
      gPen.roundRect(-1.18, -0.16, 2.36, 0.09, 0.045).fill({ color: '#ffffff', alpha: 0.32 });
      // Front grip section
      gPen.roundRect(-0.72, -0.2, 0.58, 0.4, 0.08).fill(theme.grip);
      // Metal accent ring
      gPen.roundRect(-0.16, -0.21, 0.12, 0.42, 0.04).fill(theme.ring);
      // Tapered nib / writing cone
      gPen
        .moveTo(-1.25, -0.14)
        .lineTo(-1.62, 0)
        .lineTo(-1.25, 0.14)
        .closePath()
        .fill(theme.tip);
      // Pen pocket clip
      gPen.roundRect(0.35, -0.25, 0.62, 0.1, 0.04).fill(theme.clip);
      // Tail plug
      gPen.roundRect(1.12, -0.18, 0.2, 0.36, 0.08).fill(theme.ring);
    }
  }

  private drawAimGuide(): void {
    this.aimLayer.clear();
    const penPos = this.physics.bodies.player.getPosition();
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const power = Math.hypot(dx, dy);

    if (power < 0.12) return;

    const angle = Math.atan2(dy, dx);
    const clampedPower = Math.min(power, 8.5);
    const trajectoryLen = clampedPower * 1.5;
    const endX = penPos.x + Math.cos(angle) * trajectoryLen;
    const endY = penPos.y + Math.sin(angle) * trajectoryLen;

    // 1. Elastic slingshot line connecting finger to pen
    this.aimLayer
      .moveTo(this.dragCurrent.x, this.dragCurrent.y)
      .lineTo(penPos.x, penPos.y)
      .stroke({ color: '#d9ab43', alpha: 0.45, width: 0.06 });

    // 2. Trajectory aim line
    this.aimLayer
      .moveTo(penPos.x, penPos.y)
      .lineTo(endX, endY)
      .stroke({ color: '#fff5db', alpha: 0.85, width: 0.08 });

    // 3. Trajectory lead dots
    const dots = 7;
    for (let i = 1; i <= dots; i++) {
      const t = i / dots;
      const px = penPos.x + Math.cos(angle) * trajectoryLen * t;
      const py = penPos.y + Math.sin(angle) * trajectoryLen * t;
      const radius = 0.05 * (1 - t * 0.35);
      this.aimLayer.circle(px, py, radius).fill('#ffe08a');
    }

    // 4. Directional arrowhead at trajectory tip
    const arrowWing = 0.35;
    const arrowLen = 0.35;
    const leftX = endX - Math.cos(angle - arrowWing) * arrowLen;
    const leftY = endY - Math.sin(angle - arrowWing) * arrowLen;
    const rightX = endX - Math.cos(angle + arrowWing) * arrowLen;
    const rightY = endY - Math.sin(angle + arrowWing) * arrowLen;
    this.aimLayer
      .poly([
        { x: endX, y: endY },
        { x: leftX, y: leftY },
        { x: rightX, y: rightY },
      ])
      .fill('#ffe08a');

    // 5. Power arc meter ring around player pen
    const powerRatio = clamp(power / 6.5, 0, 1);
    const arcColor = powerRatio > 0.75 ? '#e64933' : powerRatio > 0.4 ? '#e8a938' : '#5ec97b';
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * powerRatio;

    // Background gauge ring
    this.aimLayer.beginPath();
    this.aimLayer.arc(penPos.x, penPos.y, 0.88, 0, Math.PI * 2);
    this.aimLayer.stroke({ color: '#ffffff', alpha: 0.15, width: 0.04 });

    // Active power arc
    this.aimLayer.beginPath();
    this.aimLayer.arc(penPos.x, penPos.y, 0.88, startAngle, endAngle);
    this.aimLayer.stroke({ color: arcColor, width: 0.1, alpha: 0.95 });
  }

  // --- AUDIO SYNTHESIS ---

  private getAudio(): AudioContext | null {
    if (this.mute || this.volume <= 0) return null;
    try {
      this.audioCtx ??= new AudioContext();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private playFlickSound(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);

    gain.gain.setValueAtTime(0.08 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  private playClackSound(intensity: number): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);

    const level = Math.min(0.12 * intensity * this.volume, 0.14);
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  private playFallSound(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    gain.gain.setValueAtTime(0.1 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private playResultSound(winner: Side | 'draw'): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = winner === 'player' ? [523.25, 659.25, 783.99] : winner === 'draw' ? [440, 440] : [220, 196];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = now + idx * 0.1;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.07 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.22);
    });
  }

  getDiagnostics(): DiagnosticsData {
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    return {
      state: this.state,
      turn: this.current,
      player: this.physics.getBodyState('player'),
      opponent: this.physics.getBodyState('opponent'),
      aimPower: this.state === 'AIMING' ? Math.hypot(dx, dy) : Math.hypot(this.lastAimImpulse.x, this.lastAimImpulse.y),
      aimAngle: this.state === 'AIMING' ? Math.atan2(dy, dx) : Math.atan2(this.lastAimImpulse.y, this.lastAimImpulse.x),
      isPaused: this.isPaused,
      scale: this.root.scale.x,
    };
  }

  destroy(): void {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
    }
    window.removeEventListener('resize', this.layout);
    this.app.destroy(true, { children: true });
  }
}
