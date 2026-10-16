/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BaselineDecision,
  DetectionStrategyId,
  EngineConfig,
  EngineEvent,
} from '../../../common';
import { BUCKET_MS } from '../../../common';
import type { TaggedObservation } from '../domain';
import { deriveEventInput, nextEventStatus } from '../pipeline/state_machine';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { IEventWorkingSet } from './event_working_set';
import type { IRunRecorder } from './run_recorder';

type MemberHealth = 'firing' | 'healthy' | 'unknown';

/**
 * Updates every open event for one bucket. A member's health only moves when its own strategy
 * evaluated the bucket, so a strategy with a longer settle delay never makes its members look
 * unknown or healthy early. Status changes go through the state machine, never around it.
 */
export function applyLifecycle({
  bucketStart,
  config,
  events,
  evaluatedStrategies,
  observations,
  gates,
  recorder,
}: {
  bucketStart: number;
  config: EngineConfig;
  events: IEventWorkingSet;
  /** Strategies that evaluated this bucket without failing. */
  evaluatedStrategies: Set<DetectionStrategyId>;
  /** This bucket's observations, by series. */
  observations: Map<string, TaggedObservation>;
  /** This bucket's baseline decisions, by series. */
  gates: Map<string, BaselineDecision>;
  recorder: IRunRecorder;
}): void {
  const bucketIso = new Date(bucketStart).toISOString();
  const bucketEndIso = new Date(bucketStart + BUCKET_MS).toISOString();

  events
    .open()
    // An event that opened in this bucket has nothing to recover from yet.
    .filter((event) => event.opened_at !== bucketIso)
    .forEach((event) => {
      if (!event.members.some((member) => evaluatedStrategies.has(member.strategy))) {
        return;
      }
      const members = event.members.map((member) => {
        const evaluatedNow =
          evaluatedStrategies.has(member.strategy) &&
          (member.last_evaluated_bucket === undefined || member.last_evaluated_bucket < bucketIso);
        if (!evaluatedNow) {
          // Not evaluated in this bucket: it keeps what it last was, and never proves recovery.
          return {
            member,
            health: (member.healthy ? 'healthy' : 'unknown') as MemberHealth,
            healthyStreak: member.healthy_streak,
          };
        }
        const observation = observations.get(member.fingerprint);
        const gate = gates.get(member.fingerprint);
        const { descriptor } = STRATEGIES[member.strategy];
        const health: MemberHealth = observation
          ? !observation.looks_off || gate === 'background'
            ? 'healthy'
            : gate === 'above_normal' || gate === 'skipped'
            ? 'firing'
            : // Still warming up: the baseline cannot say, and that never proves recovery.
              'unknown'
          : descriptor.reportsOnlyFiring
          ? 'healthy'
          : 'unknown';
        const healthyStreak = health === 'healthy' ? member.healthy_streak + 1 : 0;
        return {
          member: {
            ...member,
            healthy: health === 'healthy',
            healthy_streak: healthyStreak,
            last_evaluated_bucket: bucketIso,
            value: observation?.value ?? member.value,
          },
          health,
          healthyStreak,
        };
      });

      const input = deriveEventInput({ members, quietPeriodBuckets: config.quiet_period_buckets });
      const transition = nextEventStatus(event.status, input);
      const next: EngineEvent = {
        ...event,
        members: members.map((item) => item.member),
        status: transition.to,
      };
      if (transition.to === event.status) {
        events.set(next, 'facts');
        return;
      }
      next.updated_at = bucketEndIso;
      if (transition.to === 'inactive') {
        next.closed_at = bucketEndIso;
        next.close_reason = transition.closeReason;
        next.verification = undefined;
        next.open_windows = event.open_windows.map((window, index) =>
          index === event.open_windows.length - 1 ? { ...window, to: bucketEndIso } : window
        );
      }
      events.set(next, 'changed');
      recorder.summary.transitions.push({
        event_id: event.event_id,
        from: event.status,
        to: transition.to,
      });
      recorder.log({
        step: 'state',
        action: `${event.status}_to_${transition.to}`,
        event_id: event.event_id,
        message: `"${event.title}": ${event.status} -> ${transition.to} (${input.replace(
          /_/g,
          ' '
        )}).`,
      });
    });
}
