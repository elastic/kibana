/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Copy shared across the Watches section: the subnav, per-watch and global section pages, and
 * pieces reused by more than one page. Per-page copy lives in that page's own `translations.ts`,
 * and the watch settings page uses `settings_translations.ts`.
 */

import { i18n } from '@kbn/i18n';
import type { PndGateId } from '@kbn/pnd-common';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.pageTitle', {
  defaultMessage: 'Watches',
});

/* -------------------------------------------------------------------------- */
/* Loading and error states                                                   */
/* -------------------------------------------------------------------------- */

export const LOADING_WATCHES = i18n.translate('xpack.pnd.watches.loading', {
  defaultMessage: 'Loading watches…',
});

export const LOADING_WATCH = i18n.translate('xpack.pnd.watches.detail.loading', {
  defaultMessage: 'Loading watch…',
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

export const RETRY = i18n.translate('xpack.pnd.watches.retry', {
  defaultMessage: 'Retry',
});

export const BACK_TO_WATCHES = i18n.translate('xpack.pnd.watches.detail.back', {
  defaultMessage: 'Back to watches',
});

/* -------------------------------------------------------------------------- */
/* Subnav                                                                     */
/* -------------------------------------------------------------------------- */

export const SUBNAV_ARIA_LABEL = i18n.translate('xpack.pnd.watches.subnav.ariaLabel', {
  defaultMessage: 'Watches section',
});

export const SUBNAV_COLLAPSE = i18n.translate('xpack.pnd.watches.subnav.collapse', {
  defaultMessage: 'Collapse Watches navigation',
});

export const SUBNAV_EXPAND = i18n.translate('xpack.pnd.watches.subnav.expand', {
  defaultMessage: 'Expand Watches navigation',
});

export const HEADER_MENU_DOCUMENTATION = i18n.translate(
  'xpack.pnd.watches.headerMenu.documentation',
  { defaultMessage: 'Documentation' }
);

export const HEADER_MENU_GIVE_FEEDBACK = i18n.translate(
  'xpack.pnd.watches.headerMenu.giveFeedback',
  { defaultMessage: 'Give feedback' }
);

/**
 * `SUBNAV_WORKERS` and `SUBNAV_SKILLS` deliberately live in
 * `components/app_chrome/translations.ts`: `deep_links.ts` needs them and is page-load critical, so
 * importing them from here would pull every message in this module into the entry bundle.
 */

export const viewWatchAriaLabel = (name: string) =>
  i18n.translate('xpack.pnd.watches.viewWatchAriaLabel', {
    defaultMessage: 'View {name} settings',
    values: { name },
  });

/* -------------------------------------------------------------------------- */
/* Lifecycle badges                                                           */
/* -------------------------------------------------------------------------- */

export const LIFECYCLE_BETA = i18n.translate('xpack.pnd.watches.lifecycle.beta', {
  defaultMessage: 'beta',
});

export const LIFECYCLE_PILOT = i18n.translate('xpack.pnd.watches.lifecycle.pilot', {
  defaultMessage: 'pilot',
});

/* -------------------------------------------------------------------------- */
/* Relative time and run state                                                */
/* -------------------------------------------------------------------------- */

export const secondsAgoLabel = (seconds: number) =>
  i18n.translate('xpack.pnd.watches.relativeTime.secondsAgo', {
    defaultMessage: '{seconds}s ago',
    values: { seconds },
  });

export const minutesAgoLabel = (minutes: number) =>
  i18n.translate('xpack.pnd.watches.relativeTime.minutesAgo', {
    defaultMessage: '{minutes}m ago',
    values: { minutes },
  });

export const hoursAgoLabel = (hours: number) =>
  i18n.translate('xpack.pnd.watches.relativeTime.hoursAgo', {
    defaultMessage: '{hours}h ago',
    values: { hours },
  });

export const daysAgoLabel = (days: number) =>
  i18n.translate('xpack.pnd.watches.relativeTime.daysAgo', {
    defaultMessage: '{days}d ago',
    values: { days },
  });

export const NOT_RUN_YET = i18n.translate('xpack.pnd.watches.notRunYet', {
  defaultMessage: 'Never run',
});

/* -------------------------------------------------------------------------- */
/* Autonomy dial and gate sweep — the persisted `/internal/pnd/autonomy` lane  */
/* -------------------------------------------------------------------------- */

export const AUTONOMY_LOADING = i18n.translate('xpack.pnd.watches.detail.autonomy.loading', {
  defaultMessage: 'Loading the persisted autonomy level…',
});
export const AUTONOMY_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.unavailableTitle',
  {
    defaultMessage: 'No autonomy level',
  }
);
export const AUTONOMY_APPLY = i18n.translate('xpack.pnd.watches.detail.autonomy.apply', {
  defaultMessage: 'Apply level',
});
export const AUTONOMY_DISCARD = i18n.translate('xpack.pnd.watches.detail.autonomy.discard', {
  defaultMessage: 'Discard',
});
export const AUTONOMY_READ_ONLY_NOTE = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.readOnlyNote',
  {
    defaultMessage:
      'Read-only: changing autonomy needs the "Manage autonomy" privilege, which is granted separately from AlertZero access.',
  }
);
export const AUTONOMY_UNMANAGED_NOTE = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.unmanagedNote',
  {
    defaultMessage:
      'Only managed catalog watches persist an autonomy level, so there is no dial to set here.',
  }
);
export const autonomySavedToast = (levelLabel: string) =>
  i18n.translate('xpack.pnd.watches.detail.autonomy.savedToast', {
    defaultMessage: 'Autonomy set to {levelLabel}',
    values: { levelLabel },
  });
export const AUTONOMY_SAVE_FAILED = i18n.translate('xpack.pnd.watches.detail.autonomy.saveFailed', {
  defaultMessage: 'Could not change the autonomy level',
});
export const AUTONOMY_SAVE_FAILED_FALLBACK = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.saveFailedFallback',
  {
    defaultMessage: 'The level was not persisted, so it is unchanged.',
  }
);
export const AUTONOMY_AT_THIS_LEVEL = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.atThisLevel',
  {
    defaultMessage: 'At this level',
  }
);
export const AUTONOMY_AT_PENDING_LEVEL = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.atPendingLevel',
  {
    defaultMessage: 'If you apply this level',
  }
);
export const GATE_AUTO_ACCEPTED = i18n.translate('xpack.pnd.watches.detail.autonomy.autoAccepted', {
  defaultMessage: 'Auto-accepted',
});
export const GATE_REQUIRES_APPROVAL = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.requiresApproval',
  {
    defaultMessage: 'Requires approval',
  }
);
export const gateLabel = (gateId: PndGateId): string => {
  switch (gateId) {
    // "Open an incident", not "Promote to incident" (2026-08-17 sync, decision 6). The id keeps its
    // `promoteIncident` bytes: the gate id is unchanged, and decision 5's model rename is unsettled.
    case 'promote_incident':
      return i18n.translate('xpack.pnd.watches.detail.autonomy.gate.promoteIncident', {
        defaultMessage: 'Open an incident',
      });
    case 'incident_contained':
      return i18n.translate('xpack.pnd.watches.detail.autonomy.gate.incidentContained', {
        defaultMessage: 'Confirm containment',
      });
    case 'apply_tuning':
      return i18n.translate('xpack.pnd.watches.detail.autonomy.gate.applyTuning', {
        defaultMessage: 'Apply a rule tuning',
      });
    case 'open_investigation':
    default:
      return i18n.translate('xpack.pnd.watches.detail.autonomy.gate.openInvestigation', {
        defaultMessage: 'Open an investigation',
      });
  }
};
export const gateAutoAcceptLabel = (gateId: PndGateId, isAutoAccepted: boolean): string =>
  i18n.translate('xpack.pnd.watches.detail.autonomy.gateFlag', {
    defaultMessage: '{gate}: {outcome}',
    values: {
      gate: gateLabel(gateId),
      outcome: isAutoAccepted ? GATE_AUTO_ACCEPTED : GATE_REQUIRES_APPROVAL,
    },
  });
export const SWEEP_TITLE = i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.title', {
  defaultMessage: 'Clear the approvals this level now auto-accepts?',
});
export const SWEEP_BODY = i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.body', {
  defaultMessage:
    'Raising the level does not resume gates that are already waiting, so anything pending stays pending until it is swept. A sweep auto-accepts only the pending gates this level permits and records that AlertZero, not an analyst, accepted them.',
});
export const SWEEP_ALWAYS_GATE_NOTE = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.sweep.alwaysGateNote',
  {
    defaultMessage:
      'Containing an incident and applying a rule tuning are never swept, at any level.',
  }
);
export const SWEEP_CONFIRM = i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.confirm', {
  defaultMessage: 'Sweep pending approvals',
});
export const SWEEP_CANCEL = i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.cancel', {
  defaultMessage: 'Leave them pending',
});
export const sweepResultToast = (approved: number, skipped: number) =>
  i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.resultToast', {
    defaultMessage:
      '{approved, plural, one {# approval swept} other {# approvals swept}}, {skipped} left for a human',
    values: { approved, skipped },
  });
export const SWEEP_FAILED = i18n.translate('xpack.pnd.watches.detail.autonomy.sweep.failed', {
  defaultMessage: 'Could not sweep pending approvals',
});
export const SWEEP_FAILED_FALLBACK = i18n.translate(
  'xpack.pnd.watches.detail.autonomy.sweep.failedFallback',
  {
    defaultMessage: 'Nothing was resumed, so every pending approval is still waiting.',
  }
);
export const DATA_BOUNDARIES_TITLE = i18n.translate(
  'xpack.pnd.watches.detail.dataBoundaries.title',
  {
    defaultMessage: 'Data boundaries',
  }
);
export const VIEW_ALL_RUNS = i18n.translate('xpack.pnd.watches.detail.recentRuns.viewAll', {
  defaultMessage: 'View all runs',
});
export const COL_TIME = i18n.translate('xpack.pnd.watches.detail.recentRuns.col.time', {
  defaultMessage: 'Time',
});
// The run & trust ledger at `/watches/activity`.

export const ACTIVITY_LOADING = i18n.translate('xpack.pnd.watches.activity.loading', {
  defaultMessage: 'Loading runs…',
});
export const ACTIVITY_EMPTY_TITLE = i18n.translate('xpack.pnd.watches.activity.emptyTitle', {
  defaultMessage: 'No runs yet',
});
export const ACTIVITY_EMPTY_BODY = i18n.translate('xpack.pnd.watches.activity.emptyBody', {
  defaultMessage:
    'A run appears here when an Attack Discovery wakes the Watch Floor, or when a closed incident wakes the Post-Incident Watch.',
});
export const ACTIVITY_TABLE_CAPTION = i18n.translate('xpack.pnd.watches.activity.tableCaption', {
  defaultMessage: 'Recent AlertZero Watch runs, newest first',
});
export const ACTIVITY_COL_WATCH = i18n.translate('xpack.pnd.watches.activity.col.watch', {
  defaultMessage: 'Watch',
});
export const ACTIVITY_COL_STARTED = i18n.translate('xpack.pnd.watches.activity.col.started', {
  defaultMessage: 'Started',
});
export const ACTIVITY_COL_STATUS = i18n.translate('xpack.pnd.watches.activity.col.status', {
  defaultMessage: 'Status',
});
export const ACTIVITY_COL_SUMMARY = i18n.translate('xpack.pnd.watches.activity.col.summary', {
  defaultMessage: 'Summary',
});
export const ACTIVITY_COL_APPROVALS = i18n.translate('xpack.pnd.watches.activity.col.approvals', {
  defaultMessage: 'Waiting on',
});
export const ACTIVITY_COL_ACTIONS = i18n.translate('xpack.pnd.watches.activity.col.actions', {
  defaultMessage: 'Actions',
});
export const pendingGateCountLabel = (pendingGateCount: number) =>
  i18n.translate('xpack.pnd.watches.activity.pendingGateCount', {
    defaultMessage: '{pendingGateCount, plural, one {# approval} other {# approvals}}',
    values: { pendingGateCount },
  });
export const NO_PENDING_GATES = i18n.translate('xpack.pnd.watches.activity.noPendingGates', {
  defaultMessage: 'Nobody',
});
export const RUN_REASON_LABEL = i18n.translate('xpack.pnd.watches.activity.reasonLabel', {
  defaultMessage: 'Reason',
});
export const OPEN_EXECUTION = i18n.translate('xpack.pnd.watches.activity.openExecution', {
  defaultMessage: 'Open execution',
});
export const OPEN_EXECUTION_STEP = i18n.translate('xpack.pnd.watches.activity.openExecutionStep', {
  defaultMessage: 'Open the waiting step',
});
export const OPEN_EXECUTION_STEP_TOOLTIP = i18n.translate(
  'xpack.pnd.watches.activity.openExecutionStepTooltip',
  {
    defaultMessage:
      'Opens the Workflows app on the exact step this run is parked at, in a new tab.',
  }
);
export const OPEN_EXECUTION_TOOLTIP = i18n.translate(
  'xpack.pnd.watches.activity.openExecutionTooltip',
  {
    defaultMessage: 'Opens this run in the Workflows app, in a new tab.',
  }
);
export const OPEN_EXECUTION_UNAVAILABLE = i18n.translate(
  'xpack.pnd.watches.activity.openExecutionUnavailable',
  {
    defaultMessage: 'The Workflows app is not available on this Kibana.',
  }
);
export const VIEW_LIFECYCLE = i18n.translate('xpack.pnd.watches.activity.viewLifecycle', {
  defaultMessage: 'View lifecycle',
});
export const UNCORRELATED_RUN = i18n.translate('xpack.pnd.watches.activity.uncorrelated', {
  defaultMessage: 'No attack discovery',
});
export const watchFilterLabel = (watch: string) =>
  i18n.translate('xpack.pnd.watches.activity.watchFilterLabel', {
    defaultMessage: 'Showing runs for {watch} only',
    values: { watch },
  });
export const CLEAR_WATCH_FILTER = i18n.translate('xpack.pnd.watches.activity.clearWatchFilter', {
  defaultMessage: 'Show every watch',
});
export const SUBNAV_ACTIVITY = i18n.translate('xpack.pnd.watches.subnav.activity', {
  defaultMessage: 'Activity',
});
export const STUB_ACTIVITY_SUBTITLE = i18n.translate('xpack.pnd.watches.stub.activity.subtitle', {
  defaultMessage: 'Run & trust ledger',
});
