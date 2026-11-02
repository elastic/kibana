/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HuntAvailabilityReason } from '../../../common/hunt_library';

export const PAGE_TITLE = i18n.translate('xpack.alertzero.huntLibrary.pageTitle', {
  defaultMessage: 'Hunt library',
});

export const PAGE_DESCRIPTION = i18n.translate('xpack.alertzero.huntLibrary.pageDescription', {
  defaultMessage:
    'Curated threat hunts. Each hunt shows whether your data can run it, so you know where to start.',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.alertzero.huntLibrary.searchPlaceholder', {
  defaultMessage: 'Search by name, description or MITRE technique',
});

export const SEARCH_ARIA_LABEL = i18n.translate('xpack.alertzero.huntLibrary.searchAriaLabel', {
  defaultMessage: 'Search hunts',
});

export const PLATFORM_FILTER_LABEL = i18n.translate('xpack.alertzero.huntLibrary.platformFilter', {
  defaultMessage: 'Platform',
});

export const AVAILABILITY_FILTER_LABEL = i18n.translate(
  'xpack.alertzero.huntLibrary.availabilityFilter',
  { defaultMessage: 'Availability' }
);

export const FILTER_ALL = i18n.translate('xpack.alertzero.huntLibrary.filterAll', {
  defaultMessage: 'All',
});

export const FILTER_AVAILABLE = i18n.translate('xpack.alertzero.huntLibrary.filterAvailable', {
  defaultMessage: 'Available',
});

export const FILTER_UNAVAILABLE = i18n.translate('xpack.alertzero.huntLibrary.filterUnavailable', {
  defaultMessage: 'Unavailable',
});

export const COLUMN_NAME = i18n.translate('xpack.alertzero.huntLibrary.column.name', {
  defaultMessage: 'Hunt',
});

export const COLUMN_PLATFORM = i18n.translate('xpack.alertzero.huntLibrary.column.platform', {
  defaultMessage: 'Platform',
});

export const COLUMN_MITRE = i18n.translate('xpack.alertzero.huntLibrary.column.mitre', {
  defaultMessage: 'MITRE',
});

export const COLUMN_RESULT = i18n.translate('xpack.alertzero.huntLibrary.column.result', {
  defaultMessage: 'Returns',
});

export const COLUMN_AVAILABILITY = i18n.translate(
  'xpack.alertzero.huntLibrary.column.availability',
  { defaultMessage: 'Availability' }
);

export const RESULT_RAW_EVENT = i18n.translate('xpack.alertzero.huntLibrary.result.rawEvent', {
  defaultMessage: 'Events',
});

export const RESULT_AGGREGATE = i18n.translate('xpack.alertzero.huntLibrary.result.aggregate', {
  defaultMessage: 'Aggregates',
});

export const TABLE_CAPTION = i18n.translate('xpack.alertzero.huntLibrary.tableCaption', {
  defaultMessage: 'Hunt library',
});

export const NO_RESULTS_TITLE = i18n.translate('xpack.alertzero.huntLibrary.noResults.title', {
  defaultMessage: 'No hunts match your filters',
});

export const NO_RESULTS_BODY = i18n.translate('xpack.alertzero.huntLibrary.noResults.body', {
  defaultMessage: 'Clear the search or a filter to see more hunts.',
});

export const LOADING = i18n.translate('xpack.alertzero.huntLibrary.loading', {
  defaultMessage: 'Loading hunts…',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.alertzero.huntLibrary.loadError.title', {
  defaultMessage: 'Unable to load the hunt library',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.alertzero.huntLibrary.loadError.body', {
  defaultMessage: 'Try again. If this keeps happening, check that you have AlertZero Read access.',
});

export const RETRY = i18n.translate('xpack.alertzero.huntLibrary.retry', {
  defaultMessage: 'Try again',
});

export const BADGE_AVAILABLE = i18n.translate('xpack.alertzero.huntLibrary.badge.available', {
  defaultMessage: 'Available',
});

export const BADGE_REASONS: Record<HuntAvailabilityReason, string> = {
  unavailable_scope: i18n.translate('xpack.alertzero.huntLibrary.badge.scope', {
    defaultMessage: 'Outside your data scope',
  }),
  unavailable_index: i18n.translate('xpack.alertzero.huntLibrary.badge.index', {
    defaultMessage: 'Data not found',
  }),
  unavailable_mapping: i18n.translate('xpack.alertzero.huntLibrary.badge.mapping', {
    defaultMessage: 'Fields missing',
  }),
  probe_failed: i18n.translate('xpack.alertzero.huntLibrary.badge.probe', {
    defaultMessage: 'Query check failed',
  }),
};

export const REASON_EXPLANATIONS: Record<HuntAvailabilityReason, string> = {
  unavailable_scope: i18n.translate('xpack.alertzero.huntLibrary.reason.scope', {
    defaultMessage: 'These sources are not in the index scope this identity can read:',
  }),
  unavailable_index: i18n.translate('xpack.alertzero.huntLibrary.reason.index', {
    defaultMessage: 'No index matches the sources this hunt reads:',
  }),
  unavailable_mapping: i18n.translate('xpack.alertzero.huntLibrary.reason.mapping', {
    defaultMessage: 'The data does not have the fields this hunt needs:',
  }),
  probe_failed: i18n.translate('xpack.alertzero.huntLibrary.reason.probe', {
    defaultMessage: 'The query did not run cleanly against your data:',
  }),
};

export const DETAIL_ROLE_UNREADABLE = i18n.translate(
  'xpack.alertzero.huntLibrary.detail.roleUnreadable',
  { defaultMessage: 'The worker role could not be read.' }
);

export const detailMissingField = (field: string) =>
  i18n.translate('xpack.alertzero.huntLibrary.detail.missingField', {
    defaultMessage: 'Missing field {field}',
    values: { field },
  });

export const detailConflictField = (field: string) =>
  i18n.translate('xpack.alertzero.huntLibrary.detail.conflictField', {
    defaultMessage: 'Field {field} has conflicting types across indices',
    values: { field },
  });

export const detailNestedField = (field: string) =>
  i18n.translate('xpack.alertzero.huntLibrary.detail.nestedField', {
    defaultMessage: 'Field {field} is a nested type, which hunts cannot search',
    values: { field },
  });

export const detailUnsearchableField = (field: string) =>
  i18n.translate('xpack.alertzero.huntLibrary.detail.unsearchableField', {
    defaultMessage: 'Field {field} is not searchable',
    values: { field },
  });

export const FLYOUT_TITLE_ARIA = i18n.translate('xpack.alertzero.huntLibrary.flyout.ariaLabel', {
  defaultMessage: 'Hunt details',
});

export const FLYOUT_HYPOTHESIS = i18n.translate('xpack.alertzero.huntLibrary.flyout.hypothesis', {
  defaultMessage: 'Hypothesis',
});

export const FLYOUT_YOUR_AVAILABILITY = i18n.translate(
  'xpack.alertzero.huntLibrary.flyout.yourAvailability',
  { defaultMessage: 'Your availability' }
);

export const FLYOUT_WORKER_AVAILABILITY = i18n.translate(
  'xpack.alertzero.huntLibrary.flyout.workerAvailability',
  { defaultMessage: 'Worker availability' }
);

export const FLYOUT_WORKER_NOTE = i18n.translate('xpack.alertzero.huntLibrary.flyout.workerNote', {
  defaultMessage:
    'Checked against the worker service account role. The worker query itself is not run from here.',
});

export const FLYOUT_NOTES = i18n.translate('xpack.alertzero.huntLibrary.flyout.notes', {
  defaultMessage: 'Analyst notes',
});

export const FLYOUT_FALSE_POSITIVES = i18n.translate(
  'xpack.alertzero.huntLibrary.flyout.falsePositives',
  { defaultMessage: 'Expected false positives' }
);

export const FLYOUT_PIVOTS = i18n.translate('xpack.alertzero.huntLibrary.flyout.pivots', {
  defaultMessage: 'Suggested pivots',
});

export const FLYOUT_DATA = i18n.translate('xpack.alertzero.huntLibrary.flyout.data', {
  defaultMessage: 'Data this hunt reads',
});

export const FLYOUT_INDEX_PATTERNS = i18n.translate(
  'xpack.alertzero.huntLibrary.flyout.indexPatterns',
  { defaultMessage: 'Index patterns' }
);

export const FLYOUT_QUERY = i18n.translate('xpack.alertzero.huntLibrary.flyout.query', {
  defaultMessage: 'ES|QL query',
});

export const FLYOUT_REFERENCES = i18n.translate('xpack.alertzero.huntLibrary.flyout.references', {
  defaultMessage: 'References',
});

export const FLYOUT_SOURCE = i18n.translate('xpack.alertzero.huntLibrary.flyout.source', {
  defaultMessage: 'Source',
});

export const FLYOUT_LOADING = i18n.translate('xpack.alertzero.huntLibrary.flyout.loading', {
  defaultMessage: 'Loading hunt…',
});

export const FLYOUT_ERROR_TITLE = i18n.translate('xpack.alertzero.huntLibrary.flyout.errorTitle', {
  defaultMessage: 'Unable to load this hunt',
});

export const FLYOUT_CLOSE = i18n.translate('xpack.alertzero.huntLibrary.flyout.close', {
  defaultMessage: 'Close',
});

export const flyoutSourceLine = (path: string, revision: string) =>
  i18n.translate('xpack.alertzero.huntLibrary.flyout.sourceLine', {
    defaultMessage: '{path} at revision {revision}',
    values: { path, revision },
  });

export const CLEAR_FILTERS = i18n.translate('xpack.alertzero.huntLibrary.clearFilters', {
  defaultMessage: 'Clear filters',
});
