/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlJobUsageMetric } from './ml_jobs/types';
import type { RuleAdoption } from './rules/types';
// eslint-disable-next-line no-restricted-imports
import type { LegacySiemSignals } from './legacy_siem_signals/types';

export interface DetectionMetrics {
  ml_jobs: MlJobUsageMetric;
  detection_rules: RuleAdoption;
  legacy_siem_signals: LegacySiemSignals;
}
