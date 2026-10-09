/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';
import { aggregateStatusOutcomes, type StatusOutcome } from './lifecycle/status_outcome';

/**
 * A member of an event is a rule whose detection signal asserts a breach: a confirming signal, or
 * an off-topic one carrying an observed error, which the schema marks with an `effect` other than
 * `none`. A benign off-topic, healthy, inconclusive or unchecked signal is not a member. The status
 * evaluation probes members, and event search reports them, from this one definition.
 */
export const isBreachMemberSignal = (signal: SignalEntry): boolean => {
  if (signal.type !== 'detection') return false;
  if (signal.verdict === 'confirms') return true;
  return signal.verdict === 'off_topic' && signal.effect !== undefined && signal.effect !== 'none';
};

/**
 * What one detection signal says about its member: a breach, a healthy verdict (`refutes`), or
 * nothing judgeable (`inconclusive`, `not_checked`, a benign off-topic row). Non-detection
 * signals are not members.
 */
export const memberOutcomeOfSignal = (signal: SignalEntry): StatusOutcome | undefined => {
  if (signal.type !== 'detection') return undefined;
  if (isBreachMemberSignal(signal)) return 'breaching';
  return signal.verdict === 'refutes' ? 'clean' : 'no_data';
};

/**
 * The event's members as discovery last judged them (one latest signal per rule): any breaching
 * member keeps the event breaching, otherwise any member that cannot be judged holds it, and only
 * when every member is healthy is it clean. An event with no members cannot be assessed.
 */
export const assessMembers = (signals: readonly SignalEntry[] | undefined): StatusOutcome =>
  aggregateStatusOutcomes(
    (signals ?? []).flatMap((signal) => {
      const outcome = memberOutcomeOfSignal(signal);
      return outcome === undefined ? [] : [outcome];
    })
  );
