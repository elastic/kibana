/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { defaultRiskScoreBySeverity } from '../../../../common/detection_engine/constants';
import type { SplunkSeverity } from './types';

export const SPLUNK_ELASTIC_ALERT_SEVERITY_MAP: Record<SplunkSeverity, Severity> = {
  '1': 'low',
  '2': 'low',
  '3': 'medium',
  '4': 'high',
  '5': 'critical',
} as const;

export const ELASTIC_SEVERITY_TO_RISK_SCORE_MAP = defaultRiskScoreBySeverity;

export const DEFAULT_TRANSLATION_SEVERITY: Severity = 'low';

export const DEFAULT_TRANSLATION_RISK_SCORE =
  ELASTIC_SEVERITY_TO_RISK_SCORE_MAP[DEFAULT_TRANSLATION_SEVERITY];

/** Maximum size for searches, aggregations and terms queries */
export const MAX_ES_SEARCH_SIZE = 10_000 as const;
