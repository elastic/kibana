/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.pageTitle', {
  defaultMessage: 'Watches',
});

export const DRAFT_BADGE = i18n.translate('xpack.pnd.watches.badge.draft', {
  defaultMessage: 'Draft',
});

export const PAUSED_BADGE = i18n.translate('xpack.pnd.watches.badge.paused', {
  defaultMessage: 'Paused',
});

export const ENABLED_BADGE = i18n.translate('xpack.pnd.watches.badge.enabledLabel', {
  defaultMessage: 'Enabled',
});

export const ENABLED_TOGGLE = i18n.translate('xpack.pnd.watches.detail.enabledToggleSwitch', {
  defaultMessage: 'Enabled',
});

export const BETA_BADGE = i18n.translate('xpack.pnd.watches.badge.betaLabel', {
  defaultMessage: 'beta',
});

export const RUNS_7D = i18n.translate('xpack.pnd.watches.card.runs7d', {
  defaultMessage: 'Runs · 7d',
});

export const ACCEPTED = i18n.translate('xpack.pnd.watches.card.accepted', {
  defaultMessage: 'Accepted',
});

export const TIME_SAVED = i18n.translate('xpack.pnd.watches.card.timeSaved', {
  defaultMessage: 'Time saved',
});

export const LOADING_WATCHES = i18n.translate('xpack.pnd.watches.loading', {
  defaultMessage: 'Loading watches…',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.watches.loadError.title', {
  defaultMessage: 'Unable to load watches',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.pnd.watches.loadError.body', {
  defaultMessage: 'Something went wrong while fetching the watch catalog.',
});

export const watchSetupFailed = (watchIds: string[]) =>
  i18n.translate('xpack.pnd.watches.setupFailed', {
    defaultMessage: 'Some watch starting points could not be created: {watchIds}',
    values: { watchIds: watchIds.join(', ') },
  });

export const RETRY = i18n.translate('xpack.pnd.watches.retry', {
  defaultMessage: 'Retry',
});

export const OPEN_A_WATCH = i18n.translate('xpack.pnd.watches.detail.openWatchButtonLabel', {
  defaultMessage: 'Open a watch',
});

export const SAVE = i18n.translate('xpack.pnd.watches.detail.save', {
  defaultMessage: 'Save',
});

export const DISCARD = i18n.translate('xpack.pnd.watches.detail.discard', {
  defaultMessage: 'Discard',
});

export const DESCRIPTION_LABEL = i18n.translate('xpack.pnd.watches.detail.description', {
  defaultMessage: 'Description',
});

export const AUTONOMY_TITLE = i18n.translate('xpack.pnd.watches.detail.autonomy.title', {
  defaultMessage: 'Autonomy',
});

export const AUTONOMY_SUBTITLE = i18n.translate('xpack.pnd.watches.detail.autonomy.subtitle', {
  defaultMessage: 'applies to this watch only',
});

export const AUTONOMY_LEVEL = i18n.translate('xpack.pnd.watches.detail.autonomy.level', {
  defaultMessage: 'Level',
});

export const selectedAutonomyLevel = (level: string) =>
  i18n.translate('xpack.pnd.watches.detail.autonomy.selectedLevelDescription', {
    defaultMessage: 'Selected level: {level}',
    values: { level },
  });

export const AUTONOMY_MANUAL_OPTION = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.manualButtonLabel',
  { defaultMessage: 'Manual' }
);

export const AUTONOMY_ASSISTED_OPTION = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.assistedButtonLabel',
  { defaultMessage: 'Assisted' }
);

export const AUTONOMY_SUPERVISED_OPTION = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.supervisedButtonLabel',
  { defaultMessage: 'Supervised' }
);

export const GENERAL_TITLE = i18n.translate('xpack.pnd.watches.detail.general.title', {
  defaultMessage: 'General',
});

export const GENERAL_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.general.subtitleDescription',
  {
    defaultMessage: 'Description and top-level state',
  }
);

export const DESCRIPTION_HELP = i18n.translate(
  'xpack.pnd.watches.detail.general.descriptionHelpDescription',
  {
    defaultMessage: 'Saved with the other watch settings.',
  }
);

export const TRIGGERS_TITLE = i18n.translate('xpack.pnd.watches.detail.triggers.title', {
  defaultMessage: 'Triggers',
});

export const TRIGGERS_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.triggers.subtitleDescription',
  {
    defaultMessage: 'How this watch starts',
  }
);

export const ALLOW_MANUAL_RUN = i18n.translate(
  'xpack.pnd.watches.detail.triggers.allowManualRunToggleSwitch',
  {
    defaultMessage: 'Allow manual run',
  }
);

export const ALLOW_MANUAL_RUN_HELP = i18n.translate(
  'xpack.pnd.watches.detail.triggers.allowManualRunDescription',
  {
    defaultMessage: 'Configured by the backing workflow.',
  }
);

export const NO_SCHEDULED_TRIGGER = i18n.translate(
  'xpack.pnd.watches.detail.triggers.noScheduledTriggerDescription',
  {
    defaultMessage: 'This watch does not have a scheduled trigger.',
  }
);

export const SCOPE_ROUTING_TITLE = i18n.translate('xpack.pnd.watches.detail.scopeRouting.title', {
  defaultMessage: 'Scope & routing',
});

export const SCOPE_ROUTING_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.scopeRouting.subtitleDescription',
  {
    defaultMessage: 'Data available to this watch',
  }
);

export const WORKERS_SECTION_TITLE = i18n.translate('xpack.pnd.watches.detail.workers.title', {
  defaultMessage: 'Workers',
});

export const WORKERS_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.workers.subtitleDescription',
  {
    defaultMessage: 'Workers available to this watch',
  }
);

export const WORKERS_EMPTY = i18n.translate('xpack.pnd.watches.detail.workers.emptyDescription', {
  defaultMessage: 'No workers attached to this watch yet.',
});

export const SKILLS_SECTION_TITLE = i18n.translate('xpack.pnd.watches.detail.skills.title', {
  defaultMessage: 'Skills',
});

export const SKILLS_SECTION_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.skills.subtitleDescription',
  {
    defaultMessage: 'Skills available to this watch',
  }
);

export const SKILLS_EMPTY = i18n.translate('xpack.pnd.watches.detail.skills.emptyDescription', {
  defaultMessage: 'No skills attached to this watch yet.',
});

export const SKILL_DEPENDENCIES_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.skills.dependenciesTitle',
  {
    defaultMessage: 'Skill dependencies',
  }
);

export const SKILL_DEPENDENCIES_BODY = i18n.translate(
  'xpack.pnd.watches.detail.skills.dependenciesDescription',
  {
    defaultMessage: 'Worker availability can depend on these skills.',
  }
);

export const SCHEDULE_INTERVAL_LABEL = i18n.translate(
  'xpack.pnd.watches.detail.schedule.intervalLabel',
  { defaultMessage: 'Schedule interval' }
);

export const SCHEDULE_INTERVAL_HELP = i18n.translate(
  'xpack.pnd.watches.detail.schedule.intervalDescription',
  { defaultMessage: 'Changes the interval used by the scheduled workflow task.' }
);

export const SCHEDULE_INTERVAL_15_MINUTES = i18n.translate(
  'xpack.pnd.watches.detail.schedule.every15MinutesDropDownOptionLabel',
  { defaultMessage: 'Every 15 minutes' }
);

export const SCHEDULE_INTERVAL_1_HOUR = i18n.translate(
  'xpack.pnd.watches.detail.schedule.everyHourDropDownOptionLabel',
  { defaultMessage: 'Every hour' }
);

export const SCHEDULE_INTERVAL_6_HOURS = i18n.translate(
  'xpack.pnd.watches.detail.schedule.every6HoursDropDownOptionLabel',
  { defaultMessage: 'Every 6 hours' }
);

export const SCHEDULE_INTERVAL_1_DAY = i18n.translate(
  'xpack.pnd.watches.detail.schedule.everyDayDropDownOptionLabel',
  { defaultMessage: 'Every day' }
);

export const SETTINGS_SAVED = i18n.translate('xpack.pnd.watches.detail.settingsSavedDescription', {
  defaultMessage: 'Watch settings saved',
});

export const SETTINGS_SAVE_FAILED = i18n.translate(
  'xpack.pnd.watches.detail.settingsSaveFailedErrorMessage',
  { defaultMessage: 'Failed to save watch settings' }
);

export const DATA_BOUNDARIES_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.dataBoundaries.title',
  {
    defaultMessage: 'Data boundaries',
  }
);

export const RECENT_RUNS_TITLE = i18n.translate('xpack.pnd.watches.detail.recentRuns.title', {
  defaultMessage: 'Recent runs',
});

export const RECENT_RUNS_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.detail.recentRuns.subtitleDescription',
  {
    defaultMessage: 'Recent activity for this watch',
  }
);

export const RECENT_RUNS_TABLE_CAPTION = i18n.translate(
  'xpack.pnd.watches.detail.recentRuns.tableCaption',
  {
    defaultMessage: 'Recent watch runs',
  }
);

export const NO_RUNS_YET = i18n.translate('xpack.pnd.watches.detail.recentRuns.empty', {
  defaultMessage: "No runs yet — this watch hasn't been activated.",
});

export const COL_TIME = i18n.translate('xpack.pnd.watches.detail.recentRuns.col.time', {
  defaultMessage: 'Time',
});

export const COL_STATUS = i18n.translate('xpack.pnd.watches.detail.recentRuns.col.status', {
  defaultMessage: 'Status',
});

export const COL_SUMMARY = i18n.translate('xpack.pnd.watches.detail.recentRuns.col.summary', {
  defaultMessage: 'Steps',
});

export const COL_TRIGGER = i18n.translate('xpack.pnd.watches.detail.recentRuns.col.trigger', {
  defaultMessage: 'Trigger',
});

export const SUBNAV_ARIA_LABEL = i18n.translate('xpack.pnd.watches.subnav.ariaLabel', {
  defaultMessage: 'Watches section',
});

export const SUBNAV_COLLAPSE = i18n.translate('xpack.pnd.watches.subnav.collapse', {
  defaultMessage: 'Collapse Watches navigation',
});

export const SUBNAV_EXPAND = i18n.translate('xpack.pnd.watches.subnav.expand', {
  defaultMessage: 'Expand Watches navigation',
});

export const SUBNAV_WATCHES = i18n.translate('xpack.pnd.watches.subnav.watches', {
  defaultMessage: 'Watches',
});

export const SUBNAV_WORKERS = i18n.translate('xpack.pnd.watches.subnav.workersLabel', {
  defaultMessage: 'Workers',
});

export const SUBNAV_SKILLS = i18n.translate('xpack.pnd.watches.subnav.skills', {
  defaultMessage: 'Skills',
});

export const STUB_WORKERS_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.stub.workers.subtitleDescription',
  {
    defaultMessage: 'Workers attached across watches',
  }
);

export const STUB_SKILLS_SUBTITLE = i18n.translate('xpack.pnd.watches.stub.skills.subtitle', {
  defaultMessage: 'Capabilities & connectors',
});

export const STUB_EMPTY_TITLE = i18n.translate('xpack.pnd.watches.stub.emptyTitle', {
  defaultMessage: 'Coming soon',
});

export const STUB_EMPTY_BODY = i18n.translate('xpack.pnd.watches.stub.emptyBody', {
  defaultMessage:
    'This surface will load live Workers and Skills data once those APIs are wired in.',
});

export const NO_WATCHES_TITLE = i18n.translate('xpack.pnd.watches.noWatches.title', {
  defaultMessage: 'No watches yet',
});

export const NO_WATCHES_BODY = i18n.translate('xpack.pnd.watches.noWatches.description', {
  defaultMessage: 'Prebuilt watch starting points could not be loaded or created.',
});

export const WATCH_NOT_FOUND_TITLE = i18n.translate('xpack.pnd.watches.notFound.title', {
  defaultMessage: 'Watch not found',
});

export const WATCH_NOT_FOUND_BODY = i18n.translate('xpack.pnd.watches.notFound.body', {
  defaultMessage: 'This watch may have been removed or the id is invalid.',
});

export const WATCH_LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.watches.detailLoadError.title', {
  defaultMessage: 'Unable to load watch',
});

export const WATCH_LOAD_ERROR_BODY = i18n.translate('xpack.pnd.watches.detailLoadError.body', {
  defaultMessage: 'Something went wrong while fetching this watch. Try again.',
});

export const LOADING_WATCH = i18n.translate('xpack.pnd.watches.detail.loading', {
  defaultMessage: 'Loading watch…',
});

export const LAST_RUN_PREFIX = i18n.translate('xpack.pnd.watches.capability.lastRunPrefix', {
  defaultMessage: 'last run',
});

export const NEVER_RUN_CAPABILITY = i18n.translate('xpack.pnd.watches.capability.neverRun', {
  defaultMessage: 'never run',
});

export const GATED_BADGE = i18n.translate('xpack.pnd.watches.capability.gated', {
  defaultMessage: 'gated',
});

export const CAPABILITY_ENABLED_BADGE = i18n.translate(
  'xpack.pnd.watches.capability.enabledBadgeLabel',
  {
    defaultMessage: 'Enabled',
  }
);

export const CAPABILITY_DISABLED_BADGE = i18n.translate(
  'xpack.pnd.watches.capability.disabledBadgeLabel',
  {
    defaultMessage: 'Disabled',
  }
);
