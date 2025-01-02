/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import type { TimelineResponse } from '../../../common/api/timeline';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';

export const getTimelineQueryTypes = (timeline: TimelineResponse) => ({
  hasQuery:
    (timeline.kqlQuery != null &&
      timeline.kqlQuery.filterQuery != null &&
      timeline.kqlQuery.filterQuery.kuery != null &&
      timeline.kqlQuery.filterQuery.kuery.expression !== '') ||
    (timeline.dataProviders != null && timeline.dataProviders.length > 0) ||
    (timeline.filters != null && timeline.filters.length > 0),
  hasEql:
    timeline.eqlOptions != null &&
    timeline.eqlOptions.query != null &&
    timeline.eqlOptions.query.length > 0,
});

export const detectionsTimelineIds = [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage];

export const skipQueryForDetectionsPage = (
  id: string,
  defaultIndex: string[],
  useRuleRegistry = false
) =>
  id != null &&
  detectionsTimelineIds.some((timelineId) => timelineId === id) &&
  !defaultIndex.some((di) =>
    di.toLowerCase().startsWith(useRuleRegistry ? DEFAULT_ALERTS_INDEX : '.siem-signals')
  );
