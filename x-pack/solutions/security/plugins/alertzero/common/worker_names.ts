/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
} from '@kbn/alertzero-common';

// Translated on each call, so server messages use the locale at the time of the request.
const WORKER_NAMES: Record<string, () => string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.floorAlertTriage.name', {
      defaultMessage: 'Alert Triage',
    }),
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.floorAttackDiscovery.name', {
      defaultMessage: 'Attack Discovery',
    }),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.forensicsEndpointAnalysis.name', {
      defaultMessage: 'Endpoint Analysis',
    }),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.huntContinuousThreatHunt.name', {
      defaultMessage: 'Continuous Threat Hunt',
    }),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.detectionRuleTuning.name', {
      defaultMessage: 'Rule Tuning',
    }),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: () =>
    i18n.translate('xpack.alertzero.watches.workers.detectionRuleCoverage.name', {
      defaultMessage: 'Rule Coverage',
    }),
};

/** A Worker's translated name, shared by the UI and server messages. */
export const workerName = (workerId: string, fallbackName?: string): string =>
  WORKER_NAMES[workerId]?.() ?? fallbackName ?? workerId;
