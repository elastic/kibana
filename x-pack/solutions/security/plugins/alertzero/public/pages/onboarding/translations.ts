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
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';

export const ONBOARDING_TITLE = i18n.translate('xpack.alertzero.onboarding.title', {
  defaultMessage: "Let's turn on the Watches?",
});

export const ONBOARDING_INTRO_HEADING = i18n.translate('xpack.alertzero.onboarding.introHeading', {
  defaultMessage: 'Watches are how AlertZero works for you',
});

export const WATCH_SETTINGS = i18n.translate('xpack.alertzero.onboarding.watchSettings', {
  defaultMessage: 'Watch settings',
});

export const ONBOARDING_KEEP_ALL_ENABLED_NOTE = i18n.translate(
  'xpack.alertzero.onboarding.keepAllEnabledNote',
  { defaultMessage: 'We recommend keeping all Watches enabled.' }
);

export const ONBOARDING_WORKERS_FOOTNOTE = i18n.translate(
  'xpack.alertzero.onboarding.workersFootnote',
  {
    defaultMessage: 'Enable acts on the checked set; at least one must stay checked.',
  }
);

export const ONBOARDING_NO_WORKERS_AVAILABLE = i18n.translate(
  'xpack.alertzero.onboarding.noWorkersAvailable',
  {
    defaultMessage:
      'No workers are available for your current subscription. Contact your administrator to enable additional features.',
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
      'Workers keep their existing autonomy settings. New workers default to the lowest level — investigates and proposes only; nothing runs without your approval. Adjust any time on Watches.',
  }
);

export const ENABLE_AND_RUN = i18n.translate('xpack.alertzero.onboarding.enableAndRun', {
  defaultMessage: 'Enable and run',
});

export const READ_MORE = i18n.translate('xpack.alertzero.onboarding.readMore', {
  defaultMessage: 'Read more about Watches in the documentation',
});

export const workersSelectedCount = (selected: number, total: number) =>
  i18n.translate('xpack.alertzero.onboarding.workersSelectedCount', {
    defaultMessage: '{selected} of {total} Workers selected',
    values: { selected, total },
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
    {
      defaultMessage:
        'Finds candidate attacks on its schedule, opens an Investigation for each, and sends true positives to forensics.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.alertTriage',
    {
      defaultMessage:
        'Classifies each batch of alerts a rule execution generates, and reduces the noise Attack Discovery has to analyze.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleTuning',
    {
      defaultMessage:
        'Diagnoses noisy or under-covering rules and produces a tuning proposal with a backtest.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.endpointAnalysis',
    {
      defaultMessage:
        'Runs deeper forensics on the hosts from a promoted attack and proposes response actions.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.continuousThreatHunt',
    {
      defaultMessage:
        'Hunts previously ingested threat reports for matching and related activity, and opens an Investigation for anything it finds.',
    }
  ),
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerDescription.ruleCoverage',
    {
      defaultMessage:
        'Assesses detection gaps surfaced by Hunt Watch and proposes new or existing rules to close them.',
    }
  ),
};

export const onboardingWorkerDescription = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_DESCRIPTIONS[workerId];

// Workers without a schedule interval are event-driven; schedule-driven ones use the cadence label.
const ONBOARDING_WORKER_EVENT_TRIGGERS: Record<string, string> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerTrigger.alertTriage',
    { defaultMessage: 'On new alerts' }
  ),
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: i18n.translate(
    'xpack.alertzero.onboarding.workerTrigger.endpointAnalysis',
    { defaultMessage: 'On Attack Discovery promotion' }
  ),
};

export const onboardingWorkerEventTrigger = (workerId: string): string | undefined =>
  ONBOARDING_WORKER_EVENT_TRIGGERS[workerId];
