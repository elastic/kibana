/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionStrategyId } from '../../../common';
import { customerAlertsStrategy } from './customer_alerts';
import { healthChecksStrategy } from './health_checks';
import { kiRulesStrategy } from './ki_rules';
import { newLogPatternsStrategy } from './new_log_patterns';
import type { IDetectionStrategy } from './types';

/**
 * Every strategy the engine knows. Adding a strategy means adding it here; discovery and the
 * event lifecycle do not change, because they read only the common detection format.
 */
export const STRATEGIES: Record<DetectionStrategyId, IDetectionStrategy> = {
  ki_rules: kiRulesStrategy,
  health_checks: healthChecksStrategy,
  customer_alerts: customerAlertsStrategy,
  new_log_patterns: newLogPatternsStrategy,
};
