/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from './narrative_strategy';
import type { AlertSource } from './narrative_utils';
import {
  threatMatchStrategy,
  machineLearningStrategy,
  dnsStrategy,
  cloudStrategy,
  authenticationStrategy,
  registryStrategy,
  networkStrategy,
  fileStrategy,
  processStrategy,
} from './strategies';

/**
 * All registered narrative strategies, sorted by descending priority.
 * The first strategy whose `match` returns true produces the narrative.
 */
const strategies: NarrativeStrategy[] = [
  threatMatchStrategy,
  machineLearningStrategy,
  dnsStrategy,
  cloudStrategy,
  authenticationStrategy,
  registryStrategy,
  networkStrategy,
  fileStrategy,
  processStrategy,
].sort((a, b) => b.priority - a.priority);

/**
 * Selects the highest-priority matching strategy and builds the narrative.
 * Always returns a value because `processStrategy` matches everything.
 */
export const buildNarrative = (source: AlertSource): string => {
  const strategy = strategies.find((s) => s.match(source));
  if (!strategy) {
    throw new Error('No strategy found for alert source');
  }
  // processStrategy.match always returns true, so this is guaranteed
  return strategy.build(source);
};
