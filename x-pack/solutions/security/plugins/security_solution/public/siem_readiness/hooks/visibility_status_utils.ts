/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-exports from @kbn/siem-readiness-common so UI components have a single import point.
 * All status logic lives in the common package — do not add new logic here.
 */
export {
  CRITICAL_FAILURE_RATE_THRESHOLD,
  calculateFailureRate,
  getFailureRateString,
  isCriticalFailureRate,
  isCriticalFailureRateFromString,
} from '@kbn/siem-readiness-common';

export { isQualityIncompatible } from '@kbn/siem-readiness-common';

export { isRetentionNonCompliant } from '@kbn/siem-readiness-common';

export { hasMissingIntegrations } from '@kbn/siem-readiness-common';

/**
 * @deprecated Use RETENTION_THRESHOLD_DAYS from @kbn/siem-readiness-common instead.
 * Kept for backward compatibility.
 */
export { RETENTION_THRESHOLD_DAYS as RETENTION_COMPLIANCE_DAYS } from '@kbn/siem-readiness-common';
