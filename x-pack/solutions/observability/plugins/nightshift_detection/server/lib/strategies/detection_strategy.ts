/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type {
  DesiredRules,
  DesiredRulesContext,
  DetectionSignalGenerator,
  DetectionStrategyDescriptor,
} from './types';

/**
 * One way of finding that something may be wrong. A strategy produces detection signals and
 * never decides whether a signal becomes a significant event.
 */
export interface DetectionStrategy {
  descriptor: DetectionStrategyDescriptor;
  generator: DetectionSignalGenerator;
  /** The alerting rules this strategy runs on, when the engine owns them. */
  desiredRules?(context: DesiredRulesContext): Promise<DesiredRules>;
}

/**
 * A detection strategy. Bind one per strategy with `bind(DetectionStrategy).to(...)`; the
 * catalog collects every binding.
 */
export const DetectionStrategy = createToken<DetectionStrategy>(
  'nightshiftDetection.DetectionStrategy'
);
