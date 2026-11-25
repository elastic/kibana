/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { THREAT_REPORTS_INDEX_PATTERN } from '../../../common/threat_intel';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { buildSpaceFilterTerms } from '../lib/space_filter';

/**
 * Whether `reportId` is reachable from `spaceId` -- its own space, or the global catalog.
 *
 * Routes that write to a report as the internal user need this because the internal user has no
 * space of its own: the route's feature privilege answers "may this caller write reports in the
 * space it is calling from", never "does this report belong to that space". Without the check, an
 * id is enough to write onto a report the caller cannot read.
 *
 * Space-filtered search rather than a direct get, for the same reason `getThreatReport` uses one:
 * a cross-space id has to be indistinguishable from a missing one, or the answer itself tells the
 * caller which reports exist in other spaces.
 */
export const isReportVisibleInSpace = async (
  esClient: ElasticsearchClient,
  { spaceId, reportId }: { spaceId: string; reportId: string }
): Promise<boolean> => {
  const response = await esClient.search({
    index: THREAT_REPORTS_INDEX_PATTERN,
    ...HIDDEN_INDEX_SEARCH_OPTIONS,
    size: 1,
    _source: false,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ ids: { values: [reportId] } }, buildSpaceFilterTerms(spaceId)],
      },
    },
  });

  return response.hits.hits.length > 0;
};
