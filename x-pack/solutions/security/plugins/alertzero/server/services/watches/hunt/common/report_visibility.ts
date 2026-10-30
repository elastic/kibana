/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { buildHuntSpaceFilterTerms } from './space_filter';

/**
 * Whether `reportId` is reachable from `spaceId`, using the same filter `loadReportHuntContext`
 * reads through.
 *
 * Routes that act on a report run the reports read as the internal user, which can reach every
 * space's reports. The route's feature privilege only says the caller may write in the space it
 * called from, so it is not enough on its own. Without this check an id from another space, or an
 * id that is not a report, would have hunt evidence stamped onto it or an Investigation created
 * for it.
 */
export const isReportVisibleToSpace = async (
  esClient: ElasticsearchClient,
  { spaceId, reportId }: { spaceId: string; reportId: string }
): Promise<boolean> => {
  const response = await esClient.search({
    index: HUNT_REPORTS_INDEX,
    size: 1,
    ignore_unavailable: true,
    _source: false,
    track_total_hits: false,
    query: {
      bool: {
        filter: [buildHuntSpaceFilterTerms(spaceId), { ids: { values: [reportId] } }],
      },
    },
  });

  return response.hits.hits.length > 0;
};
