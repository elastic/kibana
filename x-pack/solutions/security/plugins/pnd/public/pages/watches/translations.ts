/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AutonomyLevel } from '@kbn/pnd-common';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.pageTitle', {
  defaultMessage: 'Watches',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.watches.pageSubtitle', {
  defaultMessage: 'Coverage, autonomy & schedule',
});

export const COVERAGE_TITLE = i18n.translate('xpack.pnd.watches.coverage.title', {
  defaultMessage: 'Coverage',
});

export const COVERAGE_SUBTITLE = i18n.translate('xpack.pnd.watches.coverage.subtitle', {
  defaultMessage: "who's on duty across 24 hours",
});

export const onDutyNowLabel = (onDuty: number, total: number) =>
  i18n.translate('xpack.pnd.watches.coverage.onDutyNow', {
    defaultMessage: '{onDuty} of {total} on duty now',
    values: { onDuty, total },
  });

export const WATCHES_SECTION_TITLE = i18n.translate('xpack.pnd.watches.sectionTitle', {
  defaultMessage: 'Watches',
});

export const watchesSectionCount = (active: number, drafts: number, paused: number) => {
  const bits: string[] = [
    i18n.translate('xpack.pnd.watches.count.active', {
      defaultMessage: '{active} active',
      values: { active },
    }),
  ];
  if (paused > 0) {
    bits.push(
      i18n.translate('xpack.pnd.watches.count.paused', {
        defaultMessage: '{paused} paused',
        values: { paused },
      })
    );
  }
  if (drafts > 0) {
    bits.push(
      i18n.translate('xpack.pnd.watches.count.draft', {
        defaultMessage: '{drafts} draft',
        values: { drafts },
      })
    );
  }
  return i18n.translate('xpack.pnd.watches.sectionCount', {
    defaultMessage: '{bits} — click a card to configure',
    values: { bits: bits.join(' · ') },
  });
};

export const ALWAYS_ON = i18n.translate('xpack.pnd.watches.schedule.alwaysOn', {
  defaultMessage: 'Always on',
});

export const ON_DEMAND = i18n.translate('xpack.pnd.watches.schedule.onDemand', {
  defaultMessage: 'On demand',
});

export const DRAFT_BADGE = i18n.translate('xpack.pnd.watches.badge.draft', {
  defaultMessage: 'Draft',
});

export const ACTIVE_BADGE = i18n.translate('xpack.pnd.watches.badge.active', {
  defaultMessage: 'Active',
});

export const PAUSED_BADGE = i18n.translate('xpack.pnd.watches.badge.paused', {
  defaultMessage: 'Paused',
});

export const lastRunLabel = (lastRun: string) =>
  i18n.translate('xpack.pnd.watches.card.lastRun', {
    defaultMessage: 'Last run {lastRun}',
    values: { lastRun },
  });

export const NEVER_RUN = i18n.translate('xpack.pnd.watches.card.neverRun', {
  defaultMessage: 'Never run',
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

export const AUTONOMY = i18n.translate('xpack.pnd.watches.card.autonomy', {
  defaultMessage: 'Autonomy',
});

export const DATA_SCOPE = i18n.translate('xpack.pnd.watches.card.dataScope', {
  defaultMessage: 'Data scope',
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

export const STALE_DATA_WARNING = i18n.translate('xpack.pnd.watches.staleDataWarning', {
  defaultMessage: 'The latest refresh failed. Showing the most recently loaded watch data.',
});

export const watchSetupFailed = (watchIds: string[]) =>
  i18n.translate('xpack.pnd.watches.setupFailed', {
    defaultMessage: 'Some watch starting points could not be created: {watchIds}',
    values: { watchIds: watchIds.join(', ') },
  });

export const RETRY = i18n.translate('xpack.pnd.watches.retry', {
  defaultMessage: 'Retry',
});

export const BACK_TO_WATCHES = i18n.translate('xpack.pnd.watches.detail.back', {
  defaultMessage: 'Back to watches',
});

export const SAVE = i18n.translate('xpack.pnd.watches.detail.save', {
  defaultMessage: 'Save',
});

export const DISCARD = i18n.translate('xpack.pnd.watches.detail.discard', {
  defaultMessage: 'Discard',
});

export const IDENTITY_TITLE = i18n.translate('xpack.pnd.watches.detail.identity.title', {
  defaultMessage: 'Identity',
});

export const IDENTITY_SUBTITLE = i18n.translate('xpack.pnd.watches.detail.identity.subtitle', {
  defaultMessage: 'how this watch appears on cards, briefs & records',
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

export const AUTONOMY_GUARDRAILS_NOTE = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.guardrailsNote',
  {
    defaultMessage:
      'Org guardrails still apply — actions outside the allow-list stay gated at any level.',
  }
);

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

export const autonomyLevelLabel = (level: AutonomyLevel): string => {
  switch (level) {
    case 'manual':
      return AUTONOMY_MANUAL_OPTION;
    case 'assisted':
      return AUTONOMY_ASSISTED_OPTION;
    case 'supervised':
      return AUTONOMY_SUPERVISED_OPTION;
  }
};

export const SCHEDULE_TITLE = i18n.translate('xpack.pnd.watches.detail.schedule.title', {
  defaultMessage: 'Schedule',
});

export const SCHEDULE_SUBTITLE = i18n.translate('xpack.pnd.watches.detail.schedule.subtitle', {
  defaultMessage: "when it's on duty, how it sweeps, where work goes after",
});

export const WORKFLOW_TRIGGERS_LABEL = i18n.translate(
  'xpack.pnd.watches.detail.schedule.triggersLabel',
  {
    defaultMessage: 'Workflow triggers',
  }
);

export const SCHEDULE_PROJECTION_NOTE = i18n.translate(
  'xpack.pnd.watches.detail.schedule.projectionNote',
  {
    defaultMessage:
      'Projected from the backing workflow. Interval changes are written to its scheduled trigger.',
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

export const NO_SCHEDULE_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.schedule.unscheduledTitle',
  { defaultMessage: 'No scheduled trigger' }
);

export const NO_SCHEDULE_DESCRIPTION = i18n.translate(
  'xpack.pnd.watches.detail.schedule.unscheduledDescription',
  { defaultMessage: 'This watch is started by an event or on demand, so it has no interval.' }
);

export const SETTINGS_SAVED = i18n.translate('xpack.pnd.watches.detail.settingsSavedDescription', {
  defaultMessage: 'Watch settings saved',
});

export const SETTINGS_SAVE_FAILED = i18n.translate(
  'xpack.pnd.watches.detail.settingsSaveFailedErrorMessage',
  { defaultMessage: 'Failed to save watch settings' }
);

export const AGENT_CAPABILITIES_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.capabilities.heading',
  {
    defaultMessage: 'Agent capabilities',
  }
);

export const agentCapabilitiesSubtitle = (on: number, total: number) =>
  i18n.translate('xpack.pnd.watches.detail.capabilities.subtitle', {
    defaultMessage: '{on} of {total} on — skills and workflows this watch’s agent may call',
    values: { on, total },
  });

export const ADD_CAPABILITY = i18n.translate('xpack.pnd.watches.detail.capabilities.add', {
  defaultMessage: 'Add',
});

export const DATA_BOUNDARIES_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.dataBoundaries.title',
  {
    defaultMessage: 'Data boundaries',
  }
);

export const RECENT_RUNS_TITLE = i18n.translate('xpack.pnd.watches.detail.recentRuns.title', {
  defaultMessage: 'Recent runs',
});

export const RECENT_RUNS_TABLE_CAPTION = i18n.translate(
  'xpack.pnd.watches.detail.recentRuns.tableCaption',
  {
    defaultMessage: 'Recent watch runs',
  }
);

export const VIEW_ALL_RUNS = i18n.translate('xpack.pnd.watches.detail.recentRuns.viewAll', {
  defaultMessage: 'View all runs',
});

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

export const SUBNAV_WORKFLOWS = i18n.translate('xpack.pnd.watches.subnav.workflows', {
  defaultMessage: 'Workflows',
});

export const SUBNAV_SKILLS = i18n.translate('xpack.pnd.watches.subnav.skills', {
  defaultMessage: 'Skills',
});

export const SUBNAV_ACTIVITY = i18n.translate('xpack.pnd.watches.subnav.activity', {
  defaultMessage: 'Activity',
});

export const SUBNAV_PERFORMANCE = i18n.translate('xpack.pnd.watches.subnav.performance', {
  defaultMessage: 'Performance',
});

export const SUBNAV_GUARDRAILS = i18n.translate('xpack.pnd.watches.subnav.guardrails', {
  defaultMessage: 'Guardrails',
});

export const STUB_WORKFLOWS_SUBTITLE = i18n.translate('xpack.pnd.watches.stub.workflows.subtitle', {
  defaultMessage: 'Triggered runs across watches',
});

export const STUB_SKILLS_SUBTITLE = i18n.translate('xpack.pnd.watches.stub.skills.subtitle', {
  defaultMessage: 'Capabilities & connectors',
});

export const STUB_ACTIVITY_SUBTITLE = i18n.translate('xpack.pnd.watches.stub.activity.subtitle', {
  defaultMessage: 'Run & trust ledger',
});

export const STUB_PERFORMANCE_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.stub.performance.subtitle',
  {
    defaultMessage: 'Value, quality & cost',
  }
);

export const STUB_GUARDRAILS_SUBTITLE = i18n.translate(
  'xpack.pnd.watches.stub.guardrails.subtitle',
  {
    defaultMessage: 'Autonomy & approvals',
  }
);

export const STUB_EMPTY_TITLE = i18n.translate('xpack.pnd.watches.stub.emptyTitle', {
  defaultMessage: 'Coming soon',
});

export const STUB_EMPTY_BODY = i18n.translate('xpack.pnd.watches.stub.emptyBody', {
  defaultMessage:
    'This surface will load live Workflows, Skills, and Activity data once those APIs are wired in.',
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

export const capabilityToggleAriaLabel = (name: string) =>
  i18n.translate('xpack.pnd.watches.detail.capabilityToggleAriaLabel', {
    defaultMessage: 'Enable capability {name}',
    values: { name },
  });

export const POC_STUB_TOAST = i18n.translate('xpack.pnd.watches.pocStub', {
  defaultMessage: 'POC stub — changes are not persisted yet.',
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

export const KIND_SKILL = i18n.translate('xpack.pnd.watches.capability.kind.skill', {
  defaultMessage: 'Skill',
});

export const KIND_WORKFLOW = i18n.translate('xpack.pnd.watches.capability.kind.workflow', {
  defaultMessage: 'Workflow',
});
