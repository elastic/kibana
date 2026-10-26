/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import type { StatusOutcome } from './lifecycle/lifecycle_controller';

/**
 * A member of an event is a rule whose detection signal asserts a breach: a confirming signal, or
 * an off-topic one backed by query evidence, the observed-error path the write tool accepts. A
 * benign off-topic (no evidence), healthy, inconclusive or unchecked signal is not a member. Event
 * search and the lifecycle report members from this one definition.
 */
export const isBreachMemberSignal = (signal: SignalEntry): boolean => {
  if (signal.type !== 'detection') return false;
  if (signal.verdict === 'confirms') return true;
  return signal.verdict === 'off_topic' && signal.evidence != null;
};

/**
 * What one detection signal says about its member: a breach, a healthy verdict (`refutes`), or
 * nothing judgeable (`inconclusive`, `not_checked`, a benign off-topic row). Non-detection
 * signals are not members.
 */
export const memberOutcomeOfSignal = (signal: SignalEntry): StatusOutcome | undefined => {
  if (signal.type !== 'detection') return undefined;
  if (isBreachMemberSignal(signal)) return 'breached';
  return signal.verdict === 'refutes' ? 'recovered' : 'no_data';
};

/**
 * The event's members as discovery last judged them (one latest signal per rule): any member that
 * breaches makes the event `breached`, otherwise any member that cannot be judged holds it, and
 * only when every member is healthy is it `recovered`. An event with no members cannot be assessed.
 */
export const assessMembers = (signals: readonly SignalEntry[] | undefined): StatusOutcome => {
  const outcomes = (signals ?? []).flatMap((signal) => {
    const outcome = memberOutcomeOfSignal(signal);
    return outcome === undefined ? [] : [outcome];
  });

  if (outcomes.includes('breached')) return 'breached';
  if (outcomes.length === 0 || outcomes.includes('no_data')) return 'no_data';
  return 'recovered';
};
