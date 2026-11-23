/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SESSIONS_LOOKBACK_DAYS } from '../common/sessions';
import type {
  ApplicationSource,
  ApplicationTabId,
  MobilePlatform,
} from '../common/types/applications';

export const DIGITAL_EXPERIENCE_LABEL = i18n.translate('xpack.digitalExperience.label', {
  defaultMessage: 'Digital experience',
});

export const APPLICATIONS_LABEL = i18n.translate('xpack.digitalExperience.applications.label', {
  defaultMessage: 'Applications',
});

export const PAGE_LOADS_LABEL = i18n.translate('xpack.digitalExperience.pageLoads.label', {
  defaultMessage: 'Page loads',
});

/** What the sessions of the applications are counted from, for where they can't be shown. */
export const SESSIONS_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.digitalExperience.sessions.unavailable',
  {
    defaultMessage:
      'Counted for EDOT Browser applications from their session summaries, for time ranges within the last {days} days.',
    values: { days: SESSIONS_LOOKBACK_DAYS },
  }
);

/** The name of the load time at the given percentile, e.g. "Load time (p95)". */
export const loadTimeLabel = (percentile: number): string =>
  i18n.translate('xpack.digitalExperience.loadTime.label', {
    defaultMessage: 'Load time (p{percentile})',
    values: { percentile },
  });

export const LAST_SEEN_LABEL = i18n.translate('xpack.digitalExperience.lastSeen.label', {
  defaultMessage: 'Last seen',
});

export const OCCURRENCES_LABEL = i18n.translate('xpack.digitalExperience.occurrences.label', {
  defaultMessage: 'Occurrences',
});

export const UNKNOWN_ERROR_TYPE_LABEL = i18n.translate(
  'xpack.digitalExperience.unknownErrorType.label',
  { defaultMessage: 'Unknown error type' }
);

export const BROWSER_LABEL = i18n.translate('xpack.digitalExperience.browser.label', {
  defaultMessage: 'Browser',
});

export const OPERATING_SYSTEM_LABEL = i18n.translate(
  'xpack.digitalExperience.operatingSystem.label',
  { defaultMessage: 'Operating system' }
);

export const DEVICE_LABEL = i18n.translate('xpack.digitalExperience.device.label', {
  defaultMessage: 'Device',
});

export const SESSIONS_LABEL = i18n.translate('xpack.digitalExperience.sessions.label', {
  defaultMessage: 'Sessions',
});

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  otel: i18n.translate('xpack.digitalExperience.applications.source.otel', {
    defaultMessage: 'EDOT Browser',
  }),
  classic: i18n.translate('xpack.digitalExperience.applications.source.classic', {
    defaultMessage: 'Classic RUM',
  }),
};

export const ANONYMOUS_USER = i18n.translate(
  'xpack.digitalExperience.sessions.table.anonymousUserLabel',
  { defaultMessage: 'Anonymous' }
);

/** A page visit whose page view carried no URL, so there is no page to name. */
export const UNKNOWN_PAGE = i18n.translate(
  'xpack.digitalExperience.sessionDetail.unknownPageLabel',
  { defaultMessage: 'Unknown page' }
);

export const PLATFORM_LABELS: Record<MobilePlatform, string> = {
  android: i18n.translate('xpack.digitalExperience.mobile.platform.android', {
    defaultMessage: 'Android',
  }),
  ios: i18n.translate('xpack.digitalExperience.mobile.platform.ios', { defaultMessage: 'iOS' }),
};

/** The tabs of an application's page, shared by its web and mobile pages. */
export const APPLICATION_TAB_LABELS: Record<ApplicationTabId, string> = {
  overview: i18n.translate('xpack.digitalExperience.application.tabs.overview', {
    defaultMessage: 'Overview',
  }),
  errors: i18n.translate('xpack.digitalExperience.application.tabs.errors', {
    defaultMessage: 'Errors',
  }),
  network: i18n.translate('xpack.digitalExperience.application.tabs.network', {
    defaultMessage: 'Network',
  }),
  sessions: SESSIONS_LABEL,
  reports: i18n.translate('xpack.digitalExperience.application.tabs.reports', {
    defaultMessage: 'Reports',
  }),
};

/** The header action that opens a page's events in Discover. */
export const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.openInDiscoverLabel',
  { defaultMessage: 'Open in Discover' }
);

/** What a mobile error rate counts: a ratio, so it can exceed 1, unlike the crash-free share. */
export const MOBILE_ERROR_RATE_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.mobile.errorRateDescription',
  { defaultMessage: 'Exceptions per session in the time range.' }
);

/** What mobile users count: installations, not signed-in people. */
export const MOBILE_USERS_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.mobile.usersDescription',
  {
    defaultMessage:
      'Distinct app installations (app.installation.id) in the time range. A reinstall counts as a new one, and so does each device of the same person.',
  }
);

/** A mobile value that can't be computed yet, e.g. crash-free sessions until a crash is defined. */
export const NOT_ENOUGH_DATA_LABEL = i18n.translate(
  'xpack.digitalExperience.mobile.notEnoughData',
  {
    defaultMessage: 'Not enough data',
  }
);

/** A change between two shares, in percentage points, e.g. "+1.5 pp". */
export const percentagePointsLabel = (points: string): string =>
  i18n.translate('xpack.digitalExperience.mobile.percentagePoints', {
    defaultMessage: '{points} pp',
    values: { points },
  });

/** A value with its change against the previous period, e.g. "98% (+1.5 pp)". */
export const valueWithChangeLabel = (value: string, change: string): string =>
  i18n.translate('xpack.digitalExperience.mobile.valueWithChange', {
    defaultMessage: '{value} ({change})',
    values: { value, change },
  });
