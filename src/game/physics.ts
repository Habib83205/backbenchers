import planck, { type World, type Body } from 'planck';
import { TABLE_BOUNDS, isPenFallen, type Side } from './logic';

export const TABLE = TABLE_BOUNDS;

export const PHYSICS = {
  step: 1 / 60,
  velocityIterations: 8,
  positionIterations: 4,
  linearDamping: 0.65,
  angularDamping: 1.5,
  penHalfLength: 1.25,
  penHalfWidth: 0.22,
  surfaceFriction: 1.8,
  surfaceAngularFriction: 2.4,
  sleepSpeed: 0.12,
  sleepAngularSpeed: 0.18,
};

export interface BodyState {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  va: number;
  fallen: boolean;
}

export class PenGame {
  world: World;
  bodies: Record<Side, Body>;
  fallen: Record<Side, boolean> = { player: false, opponent: false };
  accumulator = 0;
  isMoving = false;
  lastCollisionIntensity = 0;
  onCollision?: (intensity: number) => void;

  constructor() {
    this.world = new planck.World({ gravity: planck.Vec2(0, 0) });
    this.bodies = {
      player: this.createBody(-4.5, 0, 0),
      opponent: this.createBody(4.5, 0, Math.PI),
    };

    // Collision detection between pens for audio & physics reactions
    this.world.on('post-solve', (_contact, impulse) => {
      let maxImpulse = 0;
      for (let i = 0; i < impulse.normalImpulses.length; i++) {
        if (impulse.normalImpulses[i] > maxImpulse) {
          maxImpulse = impulse.normalImpulses[i];
        }
      }
      if (maxImpulse > 0.15) {
        this.lastCollisionIntensity = Math.min(maxImpulse / 6, 1);
        this.onCollision?.(this.lastCollisionIntensity);
      }
    });
  }

  private createBody(x: number, y: number, angle: number): Body {
    const body = this.world.createBody({
      type: 'dynamic',
      position: planck.Vec2(x, y),
      angle,
      linearDamping: PHYSICS.linearDamping,
      angularDamping: PHYSICS.angularDamping,
      bullet: true,
      allowSleep: true,
    });

    body.createFixture(
      planck.Box(PHYSICS.penHalfLength, PHYSICS.penHalfWidth),
      {
        density: 1.0,
        friction: 0.44,
        restitution: 0.38,
      }
    );

    return body;
  }

  reset(): void {
    const starts: Record<Side, { x: number; y: number; angle: number }> = {
      player: { x: -4.5, y: 0, angle: 0 },
      opponent: { x: 4.5, y: 0, angle: Math.PI },
    };

    for (const side of ['player', 'opponent'] as const) {
      const b = this.bodies[side];
      const start = starts[side];
      b.setTransform(planck.Vec2(start.x, start.y), start.angle);
      b.setLinearVelocity(planck.Vec2(0, 0));
      b.setAngularVelocity(0);
      b.setAwake(true);
      this.fallen[side] = false;
    }

    this.accumulator = 0;
    this.isMoving = false;
    this.lastCollisionIntensity = 0;
  }

  flick(side: Side, impulseX: number, impulseY: number): boolean {
    if (this.fallen[side]) return false;
    const body = this.bodies[side];
    const impulse = planck.Vec2(impulseX, impulseY);

    body.setAwake(true);
    body.applyLinearImpulse(impulse, body.getWorldCenter(), true);
    this.isMoving = true;
    return true;
  }

  step(dt: number): { settled: boolean; fallen: Record<Side, boolean> } {
    this.accumulator = Math.min(this.accumulator + dt, 0.1);
    while (this.accumulator >= PHYSICS.step) {
      this.world.step(PHYSICS.step, PHYSICS.velocityIterations, PHYSICS.positionIterations);

      // Apply kinetic surface friction on the desk
      for (const side of ['player', 'opponent'] as const) {
        if (!this.fallen[side]) {
          const b = this.bodies[side];
          const vel = b.getLinearVelocity();
          const speed = vel.length();
          if (speed > 0.001) {
            const decel = Math.min(speed, PHYSICS.surfaceFriction * PHYSICS.step);
            const newSpeed = speed - decel;
            b.setLinearVelocity(planck.Vec2(vel.x * (newSpeed / speed), vel.y * (newSpeed / speed)));
          }

          const angSpeed = b.getAngularVelocity();
          if (Math.abs(angSpeed) > 0.001) {
            const angDecel = Math.min(Math.abs(angSpeed), PHYSICS.surfaceAngularFriction * PHYSICS.step);
            b.setAngularVelocity(angSpeed > 0 ? angSpeed - angDecel : angSpeed + angDecel);
          }
        }
      }

      this.accumulator -= PHYSICS.step;
    }

    // Check boundary & fall conditions
    for (const side of ['player', 'opponent'] as const) {
      if (!this.fallen[side]) {
        const pos = this.bodies[side].getPosition();
        const angle = this.bodies[side].getAngle();
        if (isPenFallen(pos.x, pos.y, angle, TABLE)) {
          this.fallen[side] = true;
        }
      }
    }

    // Check if simulation has settled
    let anyMoving = false;
    for (const side of ['player', 'opponent'] as const) {
      const b = this.bodies[side];
      if (this.fallen[side]) continue;
      const speed = b.getLinearVelocity().length();
      const angSpeed = Math.abs(b.getAngularVelocity());
      if (speed > PHYSICS.sleepSpeed || angSpeed > PHYSICS.sleepAngularSpeed) {
        anyMoving = true;
      }
    }

    const settled = this.isMoving && !anyMoving;
    if (settled) {
      this.isMoving = false;
    }

    return {
      settled,
      fallen: { ...this.fallen },
    };
  }

  getBodyState(side: Side): BodyState {
    const b = this.bodies[side];
    const pos = b.getPosition();
    const vel = b.getLinearVelocity();
    return {
      x: pos.x,
      y: pos.y,
      angle: b.getAngle(),
      vx: vel.x,
      vy: vel.y,
      va: b.getAngularVelocity(),
      fallen: this.fallen[side],
    };
  }
}
