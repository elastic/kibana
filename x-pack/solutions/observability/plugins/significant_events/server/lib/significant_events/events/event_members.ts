/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';

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
