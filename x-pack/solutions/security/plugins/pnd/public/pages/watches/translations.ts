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

export const WORKERS_LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.watches.workersLoadError.title', {
  defaultMessage: 'Unable to load workers',
});

export const WORKERS_LOAD_ERROR_BODY = i18n.translate('xpack.pnd.watches.workersLoadError.body', {
  defaultMessage: 'Something went wrong while fetching workers for this watch. Try again.',
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

export const RUN_STATE_PAUSED = i18n.translate('xpack.pnd.watches.runState.paused', {
  defaultMessage: 'Paused',
});

export const RUN_STATE_UNAVAILABLE = i18n.translate('xpack.pnd.watches.runState.unavailable', {
  defaultMessage: 'Unavailable',
});

export const NOT_RUN_YET = i18n.translate('xpack.pnd.watches.notRunYet', {
  defaultMessage: 'Never run',
});
