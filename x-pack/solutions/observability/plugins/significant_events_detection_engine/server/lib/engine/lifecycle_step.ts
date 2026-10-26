/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BaselineDecision,
  SignalStrategyId,
  EngineConfig,
  EngineEvent,
} from '../../../common';
import { BUCKET_MS } from '../../../common';
import type { TaggedObservation } from '../domain';
import { deriveEventInput, type EventInput, nextEventStatus } from '../pipeline/state_machine';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { IEventWorkingSet } from './event_working_set';
import type { IRunRecorder } from './run_recorder';

type MemberHealth = 'firing' | 'healthy' | 'unknown';

/**
 * Sends one input to the state machine for an event and stores the result: the status it
 * returns, the close fields when it closes, and the transition in the run's record.
 */
export function transitionEvent({
  event,
  input,
  at,
  events,
  recorder,
}: {
  /** The event with any facts of this step already applied. */
  event: EngineEvent;
  input: EventInput;
  /** When the transition happens, in data time. */
  at: string;
  events: IEventWorkingSet;
  recorder: IRunRecorder;
}): void {
  const transition = nextEventStatus(event.status, input);
  if (transition.to === event.status) {
    events.set(event, 'facts');
    return;
  }
  const next: EngineEvent = { ...event, status: transition.to, updated_at: at };
  if (transition.to === 'inactive') {
    next.closed_at = at;
    next.close_reason = transition.closeReason;
    next.verification = undefined;
    next.open_windows = event.open_windows.map((window, index) =>
      index === event.open_windows.length - 1 ? { ...window, to: at } : window
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
    message: `"${event.title}": ${event.status} -> ${transition.to} (${input.replace(/_/g, ' ')}).`,
  });
}

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
  enabledSourceIds,
}: {
  bucketStart: number;
  config: EngineConfig;
  events: IEventWorkingSet;
  /** Strategies that evaluated this bucket without failing. */
  evaluatedStrategies: Set<SignalStrategyId>;
  /** This bucket's observations, by series. */
  observations: Map<string, TaggedObservation>;
  /** This bucket's baseline decisions, by series. */
  gates: Map<string, BaselineDecision>;
  recorder: IRunRecorder;
  /** Sources enabled now; an event whose members all came from others can never recover. */
  enabledSourceIds: Set<string>;
}): void {
  const bucketIso = new Date(bucketStart).toISOString();
  const bucketEndIso = new Date(bucketStart + BUCKET_MS).toISOString();

  events
    .open()
    // An event that opened in this bucket has nothing to recover from yet.
    .filter((event) => event.opened_at !== bucketIso)
    .forEach((event) => {
      // Without its source nothing evaluates the event again, so it would stay open for good.
      const orphaned = event.members.every(
        (member) => member.source_id !== undefined && !enabledSourceIds.has(member.source_id)
      );
      if (orphaned) {
        transitionEvent({ event, input: 'source_removed', at: bucketEndIso, events, recorder });
        return;
      }
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

      transitionEvent({
        event: { ...event, members: members.map((item) => item.member) },
        input: deriveEventInput({ members, quietPeriodBuckets: config.quiet_period_buckets }),
        at: bucketEndIso,
        events,
        recorder,
      });
    });
}
