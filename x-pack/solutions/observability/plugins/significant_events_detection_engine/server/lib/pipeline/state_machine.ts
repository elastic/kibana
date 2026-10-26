/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineEventStatus, EventCloseReason } from '../../../common';

/**
 * Inputs the state machine accepts. The agent, operators and cleanup send inputs; none of them
 * picks a status.
 */
export const EVENT_INPUTS = [
  /** At least one member is above normal in this bucket. */
  'member_firing',
  /** Every member was evaluated and is healthy, but not yet for the quiet period. */
  'all_healthy',
  /** Every member has been healthy for the whole quiet period. */
  'quiet_period_elapsed',
  /** Some member could not be evaluated. Missing data never proves recovery. */
  'unknown',
  'operator_close',
  'dismiss',
  /** The Verifier re-ran the evidence, found nothing, and no member is firing. */
  'evidence_gone',
  /** No source of the event's members is enabled any more, so none can prove anything. */
  'source_removed',
] as const;
export type EventInput = (typeof EVENT_INPUTS)[number];

interface Transition {
  to: EngineEventStatus;
  closeReason?: EventCloseReason;
  /** True when the event starts a new episode: the same problem, back again. */
  reopens?: boolean;
}

/**
 * The one table that owns every status change. The live part mirrors Alerting v2's basic
 * transition strategy (active -> recovering -> inactive, recovering -> active on breach), with
 * a quiet period before closing. Keep the two in step when Alerting v2 changes its strategy.
 */
const TRANSITIONS: Record<EngineEventStatus, Record<EventInput, Transition>> = {
  active: {
    member_firing: { to: 'active' },
    all_healthy: { to: 'recovering' },
    quiet_period_elapsed: { to: 'recovering' },
    unknown: { to: 'active' },
    operator_close: { to: 'inactive', closeReason: 'operator' },
    dismiss: { to: 'inactive', closeReason: 'dismissed' },
    evidence_gone: { to: 'recovering' },
    source_removed: { to: 'inactive', closeReason: 'source_removed' },
  },
  recovering: {
    member_firing: { to: 'active' },
    all_healthy: { to: 'recovering' },
    quiet_period_elapsed: { to: 'inactive', closeReason: 'recovered' },
    unknown: { to: 'recovering' },
    operator_close: { to: 'inactive', closeReason: 'operator' },
    dismiss: { to: 'inactive', closeReason: 'dismissed' },
    // A second miss in a row: nothing shows the problem, so the event closes on its own even
    // when a member cannot be evaluated to prove recovery.
    evidence_gone: { to: 'inactive', closeReason: 'evidence_gone' },
    source_removed: { to: 'inactive', closeReason: 'source_removed' },
  },
  inactive: {
    member_firing: { to: 'active', reopens: true },
    all_healthy: { to: 'inactive' },
    quiet_period_elapsed: { to: 'inactive' },
    unknown: { to: 'inactive' },
    operator_close: { to: 'inactive' },
    dismiss: { to: 'inactive', closeReason: 'dismissed' },
    evidence_gone: { to: 'inactive' },
    source_removed: { to: 'inactive' },
  },
};

/** Returns the next status for an event. Pure, so every status change is testable. */
export function nextEventStatus(status: EngineEventStatus, input: EventInput): Transition {
  return TRANSITIONS[status][input];
}

/**
 * Reduces member health to one input. An event recovers only when every member is healthy, and
 * closes only once every member has stayed healthy for the quiet period.
 */
export function deriveEventInput({
  members,
  quietPeriodBuckets,
}: {
  members: Array<{ health: 'firing' | 'healthy' | 'unknown'; healthyStreak: number }>;
  quietPeriodBuckets: number;
}): EventInput {
  if (members.some((member) => member.health === 'firing')) {
    return 'member_firing';
  }
  if (members.some((member) => member.health === 'unknown')) {
    return 'unknown';
  }
  return members.every((member) => member.healthyStreak >= quietPeriodBuckets)
    ? 'quiet_period_elapsed'
    : 'all_healthy';
}
