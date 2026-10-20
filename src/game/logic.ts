export type Side = 'player' | 'opponent';
export type Difficulty = 'Easy' | 'Normal' | 'Hard';
export type GameState = 'READY' | 'AIMING' | 'SHOT_IN_MOTION' | 'SETTLING' | 'ROUND_RESULT';

export interface TableBounds {
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
}

export const TABLE_BOUNDS: TableBounds = {
  width: 22,
  height: 13,
  halfWidth: 11,
  halfHeight: 6.5,
};

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export function flickImpulse(dx: number, dy: number, max = 10, scaleMultiplier = 1.0): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length < 0.05) return { x: 0, y: 0 };
  const scaled = Math.min(length * scaleMultiplier, max);
  const ratio = scaled / length;
  return {
    x: dx * ratio,
    y: dy * ratio,
  };
}

export function nextTurn(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

export function resolveFalls(playerFallen: boolean, opponentFallen: boolean): Side | 'draw' | null {
  if (playerFallen && opponentFallen) return 'draw';
  if (playerFallen) return 'opponent';
  if (opponentFallen) return 'player';
  return null;
}

export function isPenFallen(
  x: number,
  y: number,
  _angle = 0,
  bounds: TableBounds = TABLE_BOUNDS
): boolean {
  // If the pen's center of mass goes beyond the table surface boundaries, gravity takes over and it drops off the desk
  return Math.abs(x) > bounds.halfWidth || Math.abs(y) > bounds.halfHeight;
}

export function legalAiShot(
  difficulty: Difficulty,
  own: { x: number; y: number },
  target: { x: number; y: number },
  noise = () => Math.random()
): { x: number; y: number } {
  const dx = target.x - own.x;
  const dy = target.y - own.y;
  const directAngle = Math.atan2(dy, dx);
  const distance = Math.hypot(dx, dy);

  // Difficulty parameters: error in radians and power
  const maxError = difficulty === 'Easy' ? 0.32 : difficulty === 'Normal' ? 0.12 : 0.03;
  const angle = directAngle + (noise() * 2 - 1) * maxError;

  const basePower = difficulty === 'Easy' ? 5.5 : difficulty === 'Normal' ? 7.6 : 9.2;
  const distFactor = clamp(distance / 10, 0.75, 1.35);
  const power = clamp(basePower * distFactor * (0.9 + noise() * 0.2), 3.0, 11.5);

  return {
    x: Math.cos(angle) * power,
    y: Math.sin(angle) * power,
  };
}
