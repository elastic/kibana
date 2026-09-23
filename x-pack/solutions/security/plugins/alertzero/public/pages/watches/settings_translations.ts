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

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export const ENABLED_SWITCH_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.enabledSwitch',
  {
    defaultMessage: 'Enabled',
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
