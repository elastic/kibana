/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalStrategyId } from '../../../common';
import { changeRegressionsStrategy } from './change_regressions';
import { customerAlertsStrategy } from './customer_alerts';
import { dependencyHealthStrategy } from './dependency_health';
import { healthChecksStrategy } from './health_checks';
import { knownFailureQueriesStrategy } from './known_failure_queries';
import { learnedDetectorsStrategy } from './learned_detectors';
import { newLogPatternsStrategy } from './new_log_patterns';
import type { ISignalStrategy } from './types';

/**
 * Every strategy the engine knows. Adding a strategy means adding it here; triage and the
 * event lifecycle do not change, because they read only the common signal format.
 */
export const STRATEGIES: Record<SignalStrategyId, ISignalStrategy> = {
  known_failure_queries: knownFailureQueriesStrategy,
  health_checks: healthChecksStrategy,
  customer_alerts: customerAlertsStrategy,
  new_log_patterns: newLogPatternsStrategy,
  learned_detectors: learnedDetectorsStrategy,
  dependency_health: dependencyHealthStrategy,
  change_regressions: changeRegressionsStrategy,
};
