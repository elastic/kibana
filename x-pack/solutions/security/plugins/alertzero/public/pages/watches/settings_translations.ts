/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Copy for the per-Worker settings page.
 *
 * The API carries ids only, so every autonomy level resolves to a message here.
 * Keep AUTONOMY_LEVEL_NAMES in step with WATCH_AUTONOMY_LEVELS.
 */

import { i18n } from '@kbn/i18n';
import {
  BUDGET_PER_HOUR_MAX,
  BUDGET_PER_HOUR_MIN,
  LOOKBACK_HOURS_MAX,
  LOOKBACK_HOURS_MIN,
} from '@kbn/alertzero-common';

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export const ENABLED_SWITCH_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.enabledSwitch',
  {
    defaultMessage: 'Enabled',
  }
);

/* -------------------------------------------------------------------------- */
/* Threat intel supply (Hunt Watch)                                           */
/* -------------------------------------------------------------------------- */

export const THREAT_INTEL_SUPPLY_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.sectionTitle',
  { defaultMessage: 'Threat intel supply' }
);

export const THREAT_INTEL_SUPPLY_SECTION_SUBTITLE = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.sectionSubtitle',
  {
    defaultMessage:
      'These workflows feed Hunt Watch. Ingest and enrich are shared across all spaces.',
  }
);

export const THREAT_INTEL_SUPPLY_INGEST_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.ingestLabel',
  { defaultMessage: 'Ingest' }
);

export const THREAT_INTEL_SUPPLY_ENRICH_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.enrichLabel',
  { defaultMessage: 'Enrich' }
);

export const THREAT_INTEL_SUPPLY_ATTRIBUTE_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.attributeLabel',
  { defaultMessage: 'Attribute alerts to reports' }
);

export const THREAT_INTEL_SUPPLY_SCOPE_DEPLOYMENT = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.scopeDeployment',
  { defaultMessage: 'Deployment' }
);

export const THREAT_INTEL_SUPPLY_SCOPE_SPACE = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.scopeSpace',
  { defaultMessage: 'This space' }
);

export const THREAT_INTEL_SUPPLY_ON = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.on',
  { defaultMessage: 'On' }
);

export const THREAT_INTEL_SUPPLY_OFF = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.off',
  { defaultMessage: 'Off' }
);

export const THREAT_INTEL_SUPPLY_IN_USE_ELSEWHERE = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.inUseElsewhere',
  { defaultMessage: 'In use in other spaces' }
);

export const THREAT_INTEL_SUPPLY_RESTORE_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.restoreLabel',
  { defaultMessage: 'Restore threat intel supply' }
);

export const THREAT_INTEL_SUPPLY_DRIFT_MESSAGE = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.driftMessage',
  {
    defaultMessage:
      'Hunt Watch is on, but one or more threat intel supply workflows are off. Restore supply, or turn Hunt off.',
  }
);

export const THREAT_INTEL_SUPPLY_HARD_GATE_EMBEDDING = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.hardGateEmbedding',
  {
    defaultMessage:
      'Hunt Watch needs Machine Learning embedding support for threat intel report supply. Finish ML and threat intel setup before turning Hunt on.',
  }
);

export const THREAT_INTEL_SUPPLY_HARD_GATE_BLOCKED = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.hardGateBlocked',
  {
    defaultMessage:
      'Threat intel reports are not ready in this deployment. Finish threat intel bootstrap before turning Hunt on.',
  }
);

export const THREAT_INTEL_SUPPLY_STATUS_ERROR = i18n.translate(
  'xpack.alertzero.watches.settings.threatIntelSupply.statusError',
  {
    defaultMessage:
      'Unable to check threat intel supply readiness. Retry later, or refresh the page before turning Hunt on.',
  }
);

export const VIEW_EXECUTIONS = i18n.translate('xpack.alertzero.watches.settings.viewExecutions', {
  defaultMessage: 'View executions',
});

export const viewExecutionsAriaLabel = (workerName: string) =>
  i18n.translate('xpack.alertzero.watches.settings.viewExecutionsAriaLabel', {
    defaultMessage: 'View executions for {workerName}',
    values: { workerName },
  });

export const workerWarningAriaLabel = (workerName: string): string =>
  i18n.translate('xpack.alertzero.watches.settings.workerWarningAriaLabel', {
    defaultMessage: 'Warnings for {workerName}',
    values: { workerName },
  });

export const READ_ONLY_CALLOUT_MESSAGE = i18n.translate(
  'xpack.alertzero.watches.settings.readOnlyCalloutMessage',
  {
    defaultMessage:
      'You have read-only access to Watch settings. Ask an administrator for the required privilege.',
  }
);

export const READ_ONLY_TOOLTIP = i18n.translate(
  'xpack.alertzero.watches.settings.readOnlyTooltip',
  {
    defaultMessage: 'Read-only access',
  }
);

/** Shown instead of navigating when managed workflows are hidden in this space. */
export const MANAGED_WORKFLOWS_DISABLED_POPOVER_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowsDisabledPopoverTitle',
  { defaultMessage: 'Managed workflows are turned off' }
);

export const MANAGED_WORKFLOWS_DISABLED_BODY = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowsDisabledBody',
  {
    defaultMessage:
      'Execution history lives in Managed workflows, which is turned off for this space.',
  }
);

export const MANAGED_WORKFLOWS_DISABLED_DISMISS = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowsDisabledDismiss',
  { defaultMessage: 'Not now' }
);

export const MANAGED_WORKFLOWS_DISABLED_OPEN_SETTINGS = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowsDisabledOpenSettings',
  { defaultMessage: 'Open Advanced Settings' }
);

/** Read-only spaces get no popover, so the requirement is stated on the link itself. */
export const MANAGED_WORKFLOWS_REQUIRED_TOOLTIP = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowsRequiredTooltip',
  {
    defaultMessage: 'Requires Managed workflows. Ask an admin to enable it in Advanced Settings.',
  }
);

export const MANAGED_WORKFLOW_EXECUTIONS_PERMISSION_TOOLTIP = i18n.translate(
  'xpack.alertzero.watches.settings.managedWorkflowExecutionsPermissionTooltip',
  { defaultMessage: 'Requires permission to view managed workflow executions.' }
);

export const SAVE_WATCH_SETTINGS = i18n.translate(
  'xpack.alertzero.watches.settings.saveWatchSettings',
  { defaultMessage: 'Save' }
);

export const DISCARD_WATCH_SETTINGS = i18n.translate(
  'xpack.alertzero.watches.settings.discardWatchSettings',
  { defaultMessage: 'Discard' }
);

export const WORKER_SETTINGS_SAVE_ERROR = i18n.translate(
  'xpack.alertzero.watches.settings.worker.saveError',
  { defaultMessage: 'Could not save this Worker. Other saved changes were kept.' }
);

export const WATCH_SETTINGS_INVALID = i18n.translate(
  'xpack.alertzero.watches.settings.invalidDrafts',
  { defaultMessage: 'Fix invalid settings before saving.' }
);

/* -------------------------------------------------------------------------- */
/* Models                                                                     */
/* -------------------------------------------------------------------------- */

export const FEATURE_SETTINGS_LINK = i18n.translate(
  'xpack.alertzero.watches.settings.featureSettingsLink',
  { defaultMessage: 'Feature settings' }
);

export const MODELS_LABEL = i18n.translate('xpack.alertzero.watches.settings.models.label', {
  defaultMessage: 'Models',
});

export const NO_MODEL_REASON_PLAIN = i18n.translate(
  'xpack.alertzero.watches.settings.worker.blockingReason.noModelPlain',
  {
    defaultMessage:
      'Some AI-powered steps in this Worker may not be configured. Check Feature settings below.',
  }
);

/* -------------------------------------------------------------------------- */
/* Section headings                                                           */
/* -------------------------------------------------------------------------- */

export const AUTONOMY_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.autonomy.sectionTitle',
  { defaultMessage: 'Autonomy' }
);

export const WORKER_SETTINGS_UNAVAILABLE = i18n.translate(
  'xpack.alertzero.watches.settings.worker.unavailable',
  { defaultMessage: 'Settings could not be read; reload and try again' }
);

/* -------------------------------------------------------------------------- */
/* Autonomy                                                                   */
/* -------------------------------------------------------------------------- */

export const AUTONOMY_LEVEL_NAMES: Record<string, string> = {
  manual: i18n.translate('xpack.alertzero.watches.settings.autonomy.manual.name', {
    defaultMessage: 'Manual',
  }),
  assisted: i18n.translate('xpack.alertzero.watches.settings.autonomy.assisted.name', {
    defaultMessage: 'Assisted',
  }),
  supervised: i18n.translate('xpack.alertzero.watches.settings.autonomy.supervised.name', {
    defaultMessage: 'Supervised',
  }),
};

export const autonomyLevelName = (levelId: string): string =>
  AUTONOMY_LEVEL_NAMES[levelId] ?? levelId;

export const AUTONOMY_ACTOR_WORKER = i18n.translate(
  'xpack.alertzero.watches.settings.autonomy.actor.worker',
  { defaultMessage: 'Worker' }
);

export const AUTONOMY_ACTOR_YOU = i18n.translate(
  'xpack.alertzero.watches.settings.autonomy.actor.you',
  { defaultMessage: 'You' }
);

export const AUTONOMY_RADIOGROUP_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.autonomy.radiogroupAriaLabel',
  { defaultMessage: 'Autonomy level' }
);

/* -------------------------------------------------------------------------- */
/* Trigger row and Workers empty state                                        */
/* -------------------------------------------------------------------------- */

export const scheduleUnitDays = (amount: number) =>
  i18n.translate('xpack.alertzero.watches.settings.trigger.unit.days', {
    defaultMessage: '{amount, plural, one {day} other {days}}',
    values: { amount },
  });

export const scheduleUnitHours = (amount: number) =>
  i18n.translate('xpack.alertzero.watches.settings.trigger.unit.hours', {
    defaultMessage: '{amount, plural, one {hour} other {hours}}',
    values: { amount },
  });

export const scheduleUnitMinutes = (amount: number) =>
  i18n.translate('xpack.alertzero.watches.settings.trigger.unit.minutes', {
    defaultMessage: '{amount, plural, one {minute} other {minutes}}',
    values: { amount },
  });

export const TRIGGER_AMOUNT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.trigger.amountAriaLabel',
  { defaultMessage: 'Interval amount' }
);

export const TRIGGER_EVERY = i18n.translate('xpack.alertzero.watches.settings.trigger.every', {
  defaultMessage: 'Every',
});

export const TRIGGER_HELP_TEXT = i18n.translate(
  'xpack.alertzero.watches.settings.trigger.helpText',
  { defaultMessage: 'How often this Worker runs. Applies to this Worker only.' }
);

export const TRIGGER_HELP_READ_ONLY_4H = i18n.translate(
  'xpack.alertzero.watches.settings.trigger.helpTextReadOnly4h',
  {
    defaultMessage:
      'Hunt Watch runs every 4 hours on a fixed schedule. The interval cannot be changed.',
  }
);

export const TRIGGER_LABEL = i18n.translate('xpack.alertzero.watches.settings.trigger.label', {
  defaultMessage: 'Trigger',
});

export const TRIGGER_UNIT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.trigger.unitAriaLabel',
  { defaultMessage: 'Interval unit' }
);

export const WORKERS_EMPTY_BODY = i18n.translate(
  'xpack.alertzero.watches.settings.workers.empty.body',
  {
    defaultMessage: 'This Watch has no Workers yet.',
  }
);

export const WORKERS_EMPTY_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.workers.empty.title',
  {
    defaultMessage: 'No Workers in this Watch',
  }
);

/* -------------------------------------------------------------------------- */
/* Workers section (Watch detail)                                             */
/* -------------------------------------------------------------------------- */

export const WORKERS_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.workers.sectionTitle',
  { defaultMessage: 'Workers' }
);

export const WORKERS_SECTION_SUBTITLE = i18n.translate(
  'xpack.alertzero.watches.settings.workers.sectionSubtitle',
  { defaultMessage: 'Workers tagged as this Watch' }
);

/* -------------------------------------------------------------------------- */
/* Alert Triage Worker extras                                                 */
/* -------------------------------------------------------------------------- */

export const MINIMUM_CONFIDENCE_SCORE_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.minimumConfidenceScoreLabel',
  { defaultMessage: 'Minimum confidence score' }
);

export const MINIMUM_CONFIDENCE_SCORE_HELP_TEXT = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.minimumConfidenceScoreHelpText',
  {
    defaultMessage:
      'False positive alerts must meet or exceed this confidence score to be surfaced for review or auto-closed. Alerts below the threshold are still tagged with the verdict but require no action. Lower values surface more alerts; higher values are more conservative.',
  }
);

export const BUDGET_PER_HOUR_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.budgetPerHourLabel',
  { defaultMessage: 'Triage budget per hour' }
);

export const BUDGET_PER_HOUR_HELP_TEXT = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.budgetPerHourHelpText',
  {
    defaultMessage:
      'How much triage work the worker plans each hour, in cost units. A batch of alerts costs a fixed overhead plus a cost per alert, so a larger budget triages more alerts and uses more model capacity. Each run gets its share of the hourly budget, so changing the schedule does not change the total: a shorter schedule runs more often with smaller runs, and only raising this budget triages more alerts per hour. Between {min} and {max}.',
    values: { min: BUDGET_PER_HOUR_MIN, max: BUDGET_PER_HOUR_MAX },
  }
);

export const BUDGET_PER_HOUR_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.budgetPerHourAriaLabel',
  { defaultMessage: 'Triage budget per hour' }
);

export const LOOKBACK_HOURS_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.lookbackHoursLabel',
  { defaultMessage: 'Lookback (hours)' }
);

export const LOOKBACK_HOURS_HELP_TEXT = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.lookbackHoursHelpText',
  {
    defaultMessage:
      'How many hours back each run looks for alerts to triage. Alerts older than this are not triaged. Between {min} and {max}.',
    values: { min: LOOKBACK_HOURS_MIN, max: LOOKBACK_HOURS_MAX },
  }
);

export const LOOKBACK_HOURS_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.alertTriage.lookbackHoursAriaLabel',
  { defaultMessage: 'Lookback in hours' }
);
