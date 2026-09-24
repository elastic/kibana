/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';

export const ONBOARDING_TITLE = i18n.translate('xpack.alertzero.onboarding.title', {
  defaultMessage: 'Enable your workers',
});

export const ONBOARDING_SUBTITLE = i18n.translate('xpack.alertzero.onboarding.subtitle', {
  defaultMessage:
    'Choose the workers you need — each covers a job. Every worker starts at the lowest autonomy — it investigates and proposes; nothing runs without your approval.',
});

export const ONBOARDING_WORKERS_FOOTNOTE = i18n.translate(
  'xpack.alertzero.onboarding.workersFootnote',
  {
    defaultMessage: 'Enable acts on the checked set; at least one must stay checked.',
  }
);

export const BEFORE_YOU_ENABLE_TITLE = i18n.translate(
  'xpack.alertzero.onboarding.beforeYouEnable.title',
  { defaultMessage: 'Before you enable' }
);

export const beforeYouEnableRunsAs = (email: string | undefined) =>
  i18n.translate('xpack.alertzero.onboarding.beforeYouEnable.runsAs', {
    defaultMessage:
      'Workers run as you{emailSuffix}. Anything they do is attributed to this account.',
    values: {
      emailSuffix: email ? ` ( ${email} )` : '',
    },
  });

export const BEFORE_YOU_ENABLE_LLM = i18n.translate(
  'xpack.alertzero.onboarding.beforeYouEnable.llm',
  {
    defaultMessage:
      'Workers use your configured LLM connector. Usage scales with the number of workers and data volume.',
  }
);

export const BEFORE_YOU_ENABLE_PRIVILEGE = i18n.translate(
  'xpack.alertzero.onboarding.beforeYouEnable.privilege',
  {
    defaultMessage: 'Requires the manage AlertZero privilege.',
  }
);

export const BEFORE_YOU_ENABLE_AUTONOMY = i18n.translate(
  'xpack.alertzero.onboarding.beforeYouEnable.autonomy',
  {
    defaultMessage:
      'Every worker starts at the lowest autonomy: it investigates and proposes; nothing runs without your approval. Change this any time on Watches.',
  }
);

export const ENABLE_AND_CONTINUE = i18n.translate('xpack.alertzero.onboarding.enableAndContinue', {
  defaultMessage: 'Enable and continue',
});

export const NOT_NOW = i18n.translate('xpack.alertzero.onboarding.notNow', {
  defaultMessage: 'Not now — explore Security without AlertZero',
});

export const ONBOARDING_READ_ONLY_BODY = i18n.translate('xpack.alertzero.onboarding.readOnlyBody', {
  defaultMessage:
    'AlertZero automatically investigates security alerts and proposes actions. Ask an administrator to enable a Watch worker to start receiving investigations.',
});

// Onboarding-specific one-line descriptions, separate from the technical worker descriptions used
// on the Watch settings page.
const ONBOARDING_WORKER_DESCRIPTIONS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.attackDiscovery',
    { defaultMessage: 'Correlates alerts into candidate attacks and opens investigations' }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.alertTriage',
    { defaultMessage: 'Investigates each alert; recommends close or escalate' }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleTuning',
    { defaultMessage: 'Learns from your close decisions; proposes rule tuning' }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.endpointAnalysis',
    { defaultMessage: 'Drafts response actions for your approval' }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.continuousThreatHunt',
    { defaultMessage: 'Scheduled hunts against your data; surfaces leads' }
  ),
};

export const onboardingWorkerDescription = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_DESCRIPTIONS[workerId];
