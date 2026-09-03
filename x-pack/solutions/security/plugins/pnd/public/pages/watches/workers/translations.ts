/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/pnd-common';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.workers.pageTitle', {
  defaultMessage: 'Workers',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.watches.workers.pageSubtitle', {
  defaultMessage: 'Work owned by a Watch grouping',
});

export const TABLE_CAPTION = i18n.translate('xpack.pnd.watches.workers.tableCaption', {
  defaultMessage: 'Workers available to Security Watches',
});

export const COL_WORKER = i18n.translate('xpack.pnd.watches.workers.col.worker', {
  defaultMessage: 'Worker',
});

export const COL_WATCHES = i18n.translate('xpack.pnd.watches.workers.col.watches', {
  defaultMessage: 'Watches',
});

export const COL_LAST_RUN = i18n.translate('xpack.pnd.watches.workers.col.lastRun', {
  defaultMessage: 'Last run',
});

export const COL_ENABLED = i18n.translate('xpack.pnd.watches.workers.col.enabled', {
  defaultMessage: 'Enabled',
});

export const NO_WORKERS = i18n.translate('xpack.pnd.watches.workers.empty', {
  defaultMessage: 'No workers are available yet.',
});

export const LOAD_ERROR = i18n.translate('xpack.pnd.watches.workers.loadError', {
  defaultMessage: 'Unable to load workers.',
});

export const enableWorkerAriaLabel = (name: string) =>
  i18n.translate('xpack.pnd.watches.workers.enableAriaLabel', {
    defaultMessage: 'Enable worker {name}',
    values: { name },
  });

export const WORKER_DESCRIPTIONS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.pnd.watches.workers.floorAlertTriage.description',
    {
      defaultMessage: 'Reduces alert volume and routes what still needs a person.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.pnd.watches.workers.floorAttackDiscovery.description',
    {
      defaultMessage: 'Continues Attack Discovery findings into reviewable investigation evidence.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.pnd.watches.workers.darkContinuousThreatHunt.description',
    {
      defaultMessage: 'Hunts continuously for threats and coverage gaps nobody has reported yet.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.pnd.watches.workers.detectionRuleTuning.description',
    {
      defaultMessage: 'Diagnoses noisy rules and applies approved query changes.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: i18n.translate(
    'xpack.pnd.watches.workers.detectionRuleCreation.description',
    {
      defaultMessage: 'Drafts an ES|QL rule for a detection gap and creates it on approval.',
    }
  ),
};

export const workerDescription = (workerId: string): string | undefined =>
  WORKER_DESCRIPTIONS[workerId];

export const WORKER_NAMES: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.pnd.watches.workers.floorAlertTriage.name',
    { defaultMessage: 'Alert Triage' }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.pnd.watches.workers.floorAttackDiscovery.name',
    { defaultMessage: 'Attack Discovery' }
  ),
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.pnd.watches.workers.darkContinuousThreatHunt.name',
    { defaultMessage: 'Continuous Threat Hunt' }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.pnd.watches.workers.detectionRuleTuning.name',
    { defaultMessage: 'Rule Tuning' }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: i18n.translate(
    'xpack.pnd.watches.workers.detectionRuleCreation.name',
    { defaultMessage: 'Rule Creation' }
  ),
};

export const workerName = (workerId: string, fallbackName?: string): string =>
  WORKER_NAMES[workerId] ?? fallbackName ?? workerId;
