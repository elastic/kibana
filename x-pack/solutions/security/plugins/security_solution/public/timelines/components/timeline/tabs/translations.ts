/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const QUERY_TAB = i18n.translate(
  'xpack.securitySolution.timeline.tabs.queyTabTimelineTitle',
  {
    defaultMessage: 'Query',
  }
);

export const EQL_TAB = i18n.translate('xpack.securitySolution.timeline.tabs.eqlTabTimelineTitle', {
  defaultMessage: 'Correlation',
});

export const NOTES_TAB = i18n.translate(
  'xpack.securitySolution.timeline.tabs.notesTabTimelineTitle',
  {
    defaultMessage: 'Notes',
  }
);

export const PINNED_TAB = i18n.translate(
  'xpack.securitySolution.timeline.tabs.pinnedTabTimelineTitle',
  {
    defaultMessage: 'Pinned',
  }
);

export const DISCOVER_ESQL_IN_TIMELINE_TAB = i18n.translate(
  'xpack.securitySolution.timeline.tabs.discoverEsqlInTimeline',
  {
    defaultMessage: 'ES|QL',
  }
);
