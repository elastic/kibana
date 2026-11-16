/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_DETECTION_THRESHOLD,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_PROBE_AFTER_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
} from '@kbn/management-settings-ids';
import {
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  DEFAULT_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD,
  DEFAULT_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES,
  DEFAULT_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
} from '../../../common/constants';
import type { SignificantEventsScheduledWorkflowsConfig } from '../workflows/significant_events_scheduled_workflows';

/**
 * Maps each numeric scheduled-discovery field to its per-space UI setting id and the default
 * used when nothing is stored. The settings route and the source listener both resolve through
 * this map so the field, setting id, and default stay one triple.
 */
export const SCHEDULED_DISCOVERY_NUMERIC_SETTINGS = {
  detectionIntervalMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  },
  detectionBucketIntervalMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  },
  detectionLookbackMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  },
  targetCoverageMinutes: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  },
  reviewIntervalMinutes: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  },
  discoveryBatchSize: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  },
  maxReviewPasses: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  },
  flakyRuleDetectionThreshold: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_DETECTION_THRESHOLD,
    defaultValue: DEFAULT_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD,
  },
  flakyRuleProbeAfterMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_PROBE_AFTER_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES,
  },
  flakyRuleExemptSeverityScore: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
    defaultValue: DEFAULT_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
  },
} as const;

export type ScheduledDiscoveryNumericField = keyof typeof SCHEDULED_DISCOVERY_NUMERIC_SETTINGS;

/** Resolves workflow config from stored settings, using the registered default for each missing value. */
export const resolveScheduledDiscoveryConfig = (
  settings: Partial<Record<string, boolean | number>>
): SignificantEventsScheduledWorkflowsConfig => {
  const read = (field: ScheduledDiscoveryNumericField): number => {
    const { settingId, defaultValue } = SCHEDULED_DISCOVERY_NUMERIC_SETTINGS[field];
    const stored = settings[settingId];
    return typeof stored === 'number' ? stored : defaultValue;
  };

  return {
    detectionIntervalMinutes: read('detectionIntervalMinutes'),
    detectionBucketIntervalMinutes: read('detectionBucketIntervalMinutes'),
    detectionLookbackMinutes: read('detectionLookbackMinutes'),
    targetCoverageMinutes: read('targetCoverageMinutes'),
    reviewIntervalMinutes: read('reviewIntervalMinutes'),
    discoveryBatchSize: read('discoveryBatchSize'),
    maxReviewPasses: read('maxReviewPasses'),
    flakyRuleDetectionThreshold: read('flakyRuleDetectionThreshold'),
    flakyRuleProbeAfterMinutes: read('flakyRuleProbeAfterMinutes'),
    flakyRuleExemptSeverityScore: read('flakyRuleExemptSeverityScore'),
  };
};
