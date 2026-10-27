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

export const PAGE_TITLE = i18n.translate('xpack.alertzero.watches.workers.pageTitle', {
  defaultMessage: 'Workers',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.alertzero.watches.workers.pageSubtitle', {
  defaultMessage: 'Work owned by a Watch grouping',
});

export const TABLE_CAPTION = i18n.translate('xpack.alertzero.watches.workers.tableCaption', {
  defaultMessage: 'Workers available to Security Watches',
});

export const COL_WORKER = i18n.translate('xpack.alertzero.watches.workers.col.worker', {
  defaultMessage: 'Worker',
});

export const COL_WATCHES = i18n.translate('xpack.alertzero.watches.workers.col.watches', {
  defaultMessage: 'Watches',
});

export const COL_LAST_RUN = i18n.translate('xpack.alertzero.watches.workers.col.lastRun', {
  defaultMessage: 'Last run',
});

export const COL_ENABLED = i18n.translate('xpack.alertzero.watches.workers.col.enabled', {
  defaultMessage: 'Enabled',
});

export const NO_WORKERS = i18n.translate('xpack.alertzero.watches.workers.empty', {
  defaultMessage: 'No workers are available yet.',
});

export const LOAD_ERROR = i18n.translate('xpack.alertzero.watches.workers.loadError', {
  defaultMessage: 'Unable to load workers.',
});

export const enableWorkerAriaLabel = (name: string) =>
  i18n.translate('xpack.alertzero.watches.workers.enableAriaLabel', {
    defaultMessage: 'Enable worker {name}',
    values: { name },
  });

export const WORKER_DESCRIPTIONS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.floorAlertTriage.description',
    {
      defaultMessage: 'Reduces alert volume and routes what still needs a person.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.floorAttackDiscovery.description',
    {
      defaultMessage: 'Continues Attack Discovery findings into reviewable investigation evidence.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.forensicsEndpointAnalysis.description',
    {
      defaultMessage:
        'Reconstructs the attack timeline on affected hosts and proposes containment. Runs only on attacks handed off by the Attack Discovery Worker and needs Elastic Defend data.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.huntContinuousThreatHunt.description',
    {
      defaultMessage: 'Hunts continuously for threats and coverage gaps nobody has reported yet.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.detectionRuleTuning.description',
    {
      defaultMessage:
        'Works on false-positive dispositions in Alerts. Without Alert Triage worker enabled it only runs the scheduled sweep on FP alerts processed manually or using other tools.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.detectionRuleCoverage.description',
    {
      defaultMessage:
        'Acts on coverage gaps from Continuous Threat Hunt. With Hunt Watch disabled it has nothing to act on.',
    }
  ),
};

export const workerDescription = (workerId: string): string | undefined =>
  WORKER_DESCRIPTIONS[workerId];

export { workerName } from '../../../../common/worker_names';
