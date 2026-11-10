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
      defaultMessage:
        'Classifies new alerts and proposes closing false positives, so you can focus on the alerts that matter.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.floorAttackDiscovery.description',
    {
      defaultMessage:
        'Groups related alerts into potential attacks, opens an investigation for each, and proposes forensic analysis of the hosts when an attack looks real.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.forensicsEndpointAnalysis.description',
    {
      defaultMessage:
        'Investigates the hosts involved in a potential attack and proposes response actions, such as isolating a host, so you can contain the attack faster.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.huntContinuousThreatHunt.description',
    {
      defaultMessage:
        "Searches your data for activity that matches threat reports and opens an investigation for each match, so you can catch threats that didn't trigger an alert.",
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.detectionRuleTuning.description',
    {
      defaultMessage:
        'Finds rules that are too noisy or too narrow and proposes tuning changes tested against past data, so your alerts are more accurate.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: i18n.translate(
    'xpack.alertzero.watches.workers.detectionRuleCoverage.description',
    {
      defaultMessage:
        'Reviews gaps in your detection coverage and proposes rules to close them, so fewer threats go undetected.',
    }
  ),
};

export const workerDescription = (workerId: string): string | undefined =>
  WORKER_DESCRIPTIONS[workerId];

export { workerName } from '../../../../common/worker_names';
