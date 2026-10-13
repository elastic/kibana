/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attackDiscoveriesSignal } from './attack_discoveries';
import { highRiskEntitiesSignal } from './high_risk_entities';
import type { Signal } from './engine/types';

/** Every signal the brief runs, in priority order: the order facts are numbered in. */
export const BRIEF_SIGNALS: readonly Signal[] = [attackDiscoveriesSignal, highRiskEntitiesSignal];

export { runSignals } from './engine/run_signals';
export type { Evidence, SignalOutcome } from './engine/types';
