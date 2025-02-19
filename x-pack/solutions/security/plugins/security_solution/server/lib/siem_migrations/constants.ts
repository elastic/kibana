/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SplunkSeverity } from '../../../common/siem_migrations/types';

export const SPLUNK_ELASTIC_ALERT_SEVERITY_MAP: Record<keyof SplunkSeverity, Severity> = {
  '1': 'low',
  '2': 'low',
  '3': 'medium',
  '4': 'high',
  '5': 'critical',
} as const;
