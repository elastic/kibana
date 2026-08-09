/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Copy shared across the Watches section: the subnav, the Overview page, and pieces reused by more
 * than one page. Per-page copy lives in that page's own `translations.ts`, and the watch settings
 * page uses `settings_translations.ts`.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.watches.pageTitle', {
  defaultMessage: 'Watches',
});

/* -------------------------------------------------------------------------- */
/* Overview page                                                              */
/*                                                                            */
/* Whether the cross-watch Overview survives is still an open design question, */
/* so this copy and the coverage strip / watch cards it feeds stay put.        */
/* -------------------------------------------------------------------------- */

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

export const AUTONOMY = i18n.translate('xpack.pnd.watches.card.autonomy', {
  defaultMessage: 'Autonomy',
});

export const DATA_SCOPE = i18n.translate('xpack.pnd.watches.card.dataScope', {
  defaultMessage: 'Data scope',
});

export const NEW_WATCH = i18n.translate('xpack.pnd.watches.newWatch', {
  defaultMessage: 'New watch',
});

export const STALE_DATA_WARNING = i18n.translate('xpack.pnd.watches.staleDataWarning', {
  defaultMessage: 'The latest refresh failed. Showing the most recently loaded watch data.',
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

export const LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.watches.loadError.title', {
  defaultMessage: 'Unable to load watches',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.pnd.watches.loadError.body', {
  defaultMessage: 'Something went wrong while fetching the watch catalog.',
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

export const SUBNAV_OVERVIEW = i18n.translate('xpack.pnd.watches.subnav.overview', {
  defaultMessage: 'Overview',
});

export const SUBNAV_WORKERS = i18n.translate('xpack.pnd.watches.subnav.workers', {
  defaultMessage: 'Workers',
});

export const SUBNAV_SKILLS = i18n.translate('xpack.pnd.watches.subnav.skills', {
  defaultMessage: 'Skills',
});

export const HEADER_MENU_DOCUMENTATION = i18n.translate(
  'xpack.pnd.watches.headerMenu.documentation',
  { defaultMessage: 'Documentation' }
);

export const HEADER_MENU_GIVE_FEEDBACK = i18n.translate(
  'xpack.pnd.watches.headerMenu.giveFeedback',
  { defaultMessage: 'Give feedback' }
);

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

export const RUN_STATE_PAUSED = i18n.translate('xpack.pnd.watches.runState.paused', {
  defaultMessage: 'Paused',
});

export const RUN_STATE_UNAVAILABLE = i18n.translate('xpack.pnd.watches.runState.unavailable', {
  defaultMessage: 'Unavailable',
});

export const NOT_RUN_YET = i18n.translate('xpack.pnd.watches.notRunYet', {
  defaultMessage: 'Never run',
});

export const POC_STUB_TOAST = i18n.translate('xpack.pnd.watches.pocStub', {
  defaultMessage: 'POC stub — changes are not persisted yet.',
});
