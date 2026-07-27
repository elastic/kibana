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

export const TIME_BASED = i18n.translate('xpack.pnd.watches.schedule.timeBased', {
  defaultMessage: 'Time-based',
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

export const NEW_WATCH_TITLE = i18n.translate('xpack.pnd.watches.newWatch.title', {
  defaultMessage: 'New watch',
});

export const NEW_WATCH_DESCRIPTION = i18n.translate('xpack.pnd.watches.newWatch.description', {
  defaultMessage: 'Create a custom tagged workflow',
});

export const NEW_CUSTOM_WATCH_NAME = i18n.translate('xpack.pnd.watches.newWatch.defaultName', {
  defaultMessage: 'Custom watch',
});

export const NEW_CUSTOM_WATCH_DESCRIPTION = i18n.translate(
  'xpack.pnd.watches.newWatch.defaultDescription',
  {
    defaultMessage: 'Custom watch scaffold — edit the workflow YAML to add agent skills.',
  }
);

export const CUSTOM_WATCH_CREATED = i18n.translate('xpack.pnd.watches.newWatch.created', {
  defaultMessage: 'Custom watch created',
});

export const CUSTOM_WATCH_CREATE_FAILED = i18n.translate(
  'xpack.pnd.watches.newWatch.createFailed',
  {
    defaultMessage: 'Failed to create custom watch',
  }
);

export const LOADING_WATCHES = i18n.translate('xpack.pnd.watches.loading', {
  defaultMessage: 'Loading watches…',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.watches.loadError.title', {
  defaultMessage: 'Unable to load watches',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.pnd.watches.loadError.body', {
  defaultMessage: 'Something went wrong while fetching the watch catalog.',
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

export const DELETE = i18n.translate('xpack.pnd.watches.detail.delete', {
  defaultMessage: 'Delete',
});

export const DELETE_CONFIRM_TITLE = i18n.translate('xpack.pnd.watches.detail.deleteConfirm.title', {
  defaultMessage: 'Delete this watch?',
});

export const deleteConfirmBody = (name: string) =>
  i18n.translate('xpack.pnd.watches.detail.deleteConfirm.body', {
    defaultMessage:
      'Permanently delete "{name}" and its workflow. Managed catalog watches cannot be deleted here.',
    values: { name },
  });

export const DELETE_CONFIRM_BUTTON = i18n.translate(
  'xpack.pnd.watches.detail.deleteConfirm.confirm',
  {
    defaultMessage: 'Delete watch',
  }
);

export const DELETE_CANCEL = i18n.translate('xpack.pnd.watches.detail.deleteConfirm.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_SUCCESS = i18n.translate('xpack.pnd.watches.detail.deleteSuccess', {
  defaultMessage: 'Watch deleted',
});

export const DELETE_FAILED = i18n.translate('xpack.pnd.watches.detail.deleteFailed', {
  defaultMessage: 'Failed to delete watch',
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
      'Projected from the backing workflow. Edits below are local stubs until YAML write-back lands.',
  }
);

export const CADENCE_LABEL = i18n.translate('xpack.pnd.watches.detail.schedule.cadence', {
  defaultMessage: 'Cadence',
});

export const HANDOFF_LABEL = i18n.translate('xpack.pnd.watches.detail.schedule.handoff', {
  defaultMessage: 'Hand-off',
});

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

export const COL_INVESTIGATION = i18n.translate(
  'xpack.pnd.watches.detail.recentRuns.col.investigation',
  {
    defaultMessage: 'Investigation',
  }
);

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

// -- Workflows / Skills aggregate tables (shared by both sections) --

export const COL_NAME = i18n.translate('xpack.pnd.watches.callables.col.name', {
  defaultMessage: 'Name',
});

export const COL_USED_BY = i18n.translate('xpack.pnd.watches.callables.col.usedBy', {
  defaultMessage: 'Used by',
});

export const COL_LAST_RUN = i18n.translate('xpack.pnd.watches.callables.col.lastRun', {
  defaultMessage: 'Last run',
});

export const STATUS_ENABLED = i18n.translate('xpack.pnd.watches.callables.status.enabled', {
  defaultMessage: 'Enabled',
});

export const STATUS_DISABLED = i18n.translate('xpack.pnd.watches.callables.status.disabled', {
  defaultMessage: 'Disabled',
});

export const WORKFLOWS_EMPTY_MESSAGE = i18n.translate('xpack.pnd.watches.workflows.emptyMessage', {
  defaultMessage: 'No watch references a managed workflow yet.',
});

export const SKILLS_EMPTY_MESSAGE = i18n.translate('xpack.pnd.watches.skills.emptyMessage', {
  defaultMessage: 'No watch references a skill yet.',
});

export const WORKFLOWS_TOTAL_COUNT = (count: number) =>
  i18n.translate('xpack.pnd.watches.workflows.totalCount', {
    defaultMessage: '{count, plural, one {# workflow} other {# workflows}} across all watches',
    values: { count },
  });

export const SKILLS_TOTAL_COUNT = (count: number) =>
  i18n.translate('xpack.pnd.watches.skills.totalCount', {
    defaultMessage: '{count, plural, one {# skill} other {# skills}} across all watches',
    values: { count },
  });

// -- Guardrails aggregate view --

export const COL_AUTONOMY = i18n.translate('xpack.pnd.watches.guardrails.col.autonomy', {
  defaultMessage: 'Autonomy',
});

export const COL_GATED_CAPABILITIES = i18n.translate(
  'xpack.pnd.watches.guardrails.col.gatedCapabilities',
  {
    defaultMessage: 'Gated capabilities',
  }
);

export const COL_DATA_SCOPE = i18n.translate('xpack.pnd.watches.guardrails.col.dataScope', {
  defaultMessage: 'Data scope',
});

export const GUARDRAILS_EMPTY_MESSAGE = i18n.translate(
  'xpack.pnd.watches.guardrails.emptyMessage',
  {
    defaultMessage: 'No watches configured yet.',
  }
);

// -- Activity aggregate feed --

export const COL_WATCH = i18n.translate('xpack.pnd.watches.activity.col.watch', {
  defaultMessage: 'Watch',
});

export const ACTIVITY_EMPTY_MESSAGE = i18n.translate('xpack.pnd.watches.activity.emptyMessage', {
  defaultMessage: 'No watch has run yet.',
});

export const ACTIVITY_TOTAL_COUNT = (count: number) =>
  i18n.translate('xpack.pnd.watches.activity.totalCount', {
    defaultMessage: '{count, plural, one {# run} other {# runs}} across all watches',
    values: { count },
  });

export const NEW_WATCH = i18n.translate('xpack.pnd.watches.newWatch', {
  defaultMessage: 'New watch',
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

export const CADENCE_STREAM = i18n.translate('xpack.pnd.watches.cadence.stream', {
  defaultMessage: 'Streaming',
});

export const CADENCE_SWEEP = i18n.translate('xpack.pnd.watches.cadence.sweep', {
  defaultMessage: 'Interval sweeps',
});

export const CADENCE_MANUAL = i18n.translate('xpack.pnd.watches.cadence.manual', {
  defaultMessage: 'Manual sessions',
});

export const HANDOFF_OFFICER = i18n.translate('xpack.pnd.watches.handoff.officer', {
  defaultMessage: 'Escalates to Watch Officer',
});

export const HANDOFF_ONCALL = i18n.translate('xpack.pnd.watches.handoff.oncall', {
  defaultMessage: 'Pages on-call for criticals',
});

export const HANDOFF_BRIEF = i18n.translate('xpack.pnd.watches.handoff.brief', {
  defaultMessage: 'Receipts to the morning brief',
});

export const HANDOFF_RECORDS = i18n.translate('xpack.pnd.watches.handoff.records', {
  defaultMessage: 'Findings to Records',
});

export const HANDOFF_NONE = i18n.translate('xpack.pnd.watches.handoff.none', {
  defaultMessage: 'No hand-off',
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
