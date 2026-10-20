import { describe, it, expect } from 'vitest';
import {
  flickImpulse,
  nextTurn,
  resolveFalls,
  isPenFallen,
  legalAiShot,
  TABLE_BOUNDS,
} from './logic';
import { PenGame } from './physics';

describe('Game Rules and Logic', () => {
  it('caps flick power and preserves aim vector direction', () => {
    // 30, 40 -> hypot is 50. With max=10, scale is 0.2 -> 6, 8
    const impulse = flickImpulse(30, 40, 10);
    expect(impulse.x).toBeCloseTo(6);
    expect(impulse.y).toBeCloseTo(8);

    const zero = flickImpulse(0, 0);
    expect(zero).toEqual({ x: 0, y: 0 });
  });

  it('alternates turns correctly', () => {
    expect(nextTurn('player')).toBe('opponent');
    expect(nextTurn('opponent')).toBe('player');
  });

  it('resolves falls and handles simultaneous falls explicitly', () => {
    expect(resolveFalls(false, true)).toBe('player');
    expect(resolveFalls(true, false)).toBe('opponent');
    expect(resolveFalls(true, true)).toBe('draw');
    expect(resolveFalls(false, false)).toBeNull();
  });

  it('detects when pen crosses table bounds', () => {
    // Inside table (-11 to +11, -6.5 to +6.5)
    expect(isPenFallen(0, 0, 0, TABLE_BOUNDS)).toBe(false);
    expect(isPenFallen(-10, 5, 0, TABLE_BOUNDS)).toBe(false);

    // Outside table
    expect(isPenFallen(11.5, 0, 0, TABLE_BOUNDS)).toBe(true);
    expect(isPenFallen(-11.2, 0, 0, TABLE_BOUNDS)).toBe(true);
    expect(isPenFallen(0, 7.0, 0, TABLE_BOUNDS)).toBe(true);
    expect(isPenFallen(0, -6.8, 0, TABLE_BOUNDS)).toBe(true);
  });

  it('generates bounded, directed AI shots for all difficulties', () => {
    const difficulties = ['Easy', 'Normal', 'Hard'] as const;
    const own = { x: 5, y: 0 };
    const target = { x: -5, y: 0 };

    for (const diff of difficulties) {
      const shot = legalAiShot(diff, own, target, () => 0.5);
      const power = Math.hypot(shot.x, shot.y);
      expect(power).toBeGreaterThan(3.0);
      expect(power).toBeLessThanOrEqual(12.0);
      // Aiming from (5,0) towards (-5,0) means shot.x should be negative
      expect(shot.x).toBeLessThan(0);
    }
  });
});

describe('Pen Physics Simulation', () => {
  it('initializes world with two pens at correct starting positions', () => {
    const game = new PenGame();
    const playerState = game.getBodyState('player');
    const opponentState = game.getBodyState('opponent');

    expect(playerState.x).toBeCloseTo(-4.5);
    expect(playerState.y).toBeCloseTo(0);
    expect(playerState.fallen).toBe(false);

    expect(opponentState.x).toBeCloseTo(4.5);
    expect(opponentState.y).toBeCloseTo(0);
    expect(opponentState.fallen).toBe(false);
  });

  it('flick applies impulse and causes physical displacement and rotation', () => {
    const game = new PenGame();
    // Flick player pen towards opponent
    const flicked = game.flick('player', 8.0, 1.0);
    expect(flicked).toBe(true);
    expect(game.isMoving).toBe(true);

    // Step physics forward 15 frames (0.25 seconds)
    for (let i = 0; i < 15; i++) {
      game.step(1 / 60);
    }

    const state = game.getBodyState('player');
    expect(state.x).toBeGreaterThan(-4.5);
    expect(Math.abs(state.vx)).toBeGreaterThan(0.01);
  });

  it('produces collision reactions when pens strike each other', () => {
    const game = new PenGame();
    let collisionDetected = false;
    game.onCollision = (intensity) => {
      collisionDetected = true;
      expect(intensity).toBeGreaterThan(0);
    };

    // Flick player pen straight at opponent pen
    game.flick('player', 10.0, 0);

    // Step physics forward until collision happens
    for (let i = 0; i < 120; i++) {
      game.step(1 / 60);
    }

    expect(collisionDetected).toBe(true);
    const opponentState = game.getBodyState('opponent');
    // Opponent should have been pushed backward by the collision
    expect(opponentState.x).toBeGreaterThan(4.5);
  });

  it('simulation eventually settles after motion ceases', () => {
    const game = new PenGame();
    game.flick('player', 3.0, 0);

    let settled = false;
    for (let i = 0; i < 300; i++) {
      const stepRes = game.step(1 / 60);
      if (stepRes.settled) {
        settled = true;
        break;
      }
    }

    expect(settled).toBe(true);
    expect(game.isMoving).toBe(false);
  });

  it('resets bodies and state cleanly', () => {
    const game = new PenGame();
    game.flick('player', 8.0, 0);
    for (let i = 0; i < 30; i++) game.step(1 / 60);

    game.reset();
    const p = game.getBodyState('player');
    expect(p.x).toBeCloseTo(-4.5);
    expect(p.y).toBeCloseTo(0);
    expect(p.vx).toBeCloseTo(0);
    expect(p.vy).toBeCloseTo(0);
    expect(game.isMoving).toBe(false);
  });
});
