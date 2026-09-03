/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  type GetProposalsActivityResponse,
  INTERNAL_API_ACCESS,
  PND_PROPOSALS_ACTIVITY_URL,
} from '@kbn/pnd-common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import type { PndActivityHistogramBucket } from './helpers/build_activity_buckets';
import { buildActivityBuckets } from './helpers/build_activity_buckets';
import { buildActivityQuery } from './helpers/build_activity_query';

/** The shape {@link buildActivityQuery}'s `aggs` produces, as far as this route reads it. */
interface ActivityAggregations {
  by_hour?: { buckets: PndActivityHistogramBucket[] };
}

/**
 * `GET /internal/pnd/proposals/activity` — the 24-hour sparkline series behind the Brief's KPI
 * tiles.
 *
 * Twenty-four hourly buckets, oldest first, each carrying a count per recommended action: how many
 * PND gates **opened** in that hour. That is deliberately a different metric from the number on
 * the tile itself, which counts what is still awaiting a human and is derived from the queue the
 * page already holds. Neither number is computed from the other, and the series takes no
 * parameters — in particular no watch id — so it does not track the page's watch filter.
 *
 * The read is space-confined to the request's space (S9). Step executions carry the *emitting*
 * space rather than the space their workflow was installed into, which is what makes a single
 * `term` on `spaceId` correct even though every PND watch is installed globally (the same insight
 * behind README Workaround 18).
 *
 * ## Why this reads as the internal user, and what makes that acceptable
 *
 * `.workflows-step-executions` is a Workflows **system index**: the calling user has no privileges
 * on it, so `asCurrentUser` cannot serve this and there is no Workflows management API that
 * aggregates (adding one would be a `@elastic/workflows-eng` CODEOWNERS change this epic's scope
 * forbids). The read therefore runs as `asInternalUser`, which is only acceptable with all four of
 * these in place — every one of them is load-bearing, and none may be relaxed:
 *
 * 1. The route requires the existing `pnd_read` privilege.
 * 2. The query is hard-filtered to `PND_WATCH_WORKFLOW_IDS` **and** the four registry `stepId`s —
 *    a strictly stronger allow-list than "alive in this space" (the S1 argument from Workaround
 *    18).
 * 3. The query is hard-filtered to the caller's `spaceId`.
 * 4. It is **aggregation-only**: `size: 0`, no `_source`. Only bucket counts leave the server; no
 *    document content is ever returned.
 *
 * Mitigations 2, 3 and 4 are built by {@link buildActivityQuery} and pinned by its unit tests, so
 * a change that quietly widened any of them would fail a named test rather than merge.
 *
 * A failed read surfaces as a 500 rather than as a zero-filled series: an hour with no gates and
 * an hour we could not read must not look the same on a chart. The queue is a separate route on a
 * separate react-query key, so this route failing leaves the pending decisions on screen.
 */
export const registerGetProposalsActivityRoute = ({
  getEsClient,
  getSpaceId,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_PROPOSALS_ACTIVITY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get the 24-hour hourly series of PND gates opened, per recommended action',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const now = Date.now();

          logger.debug(() => `Reading PND proposal activity in space "${spaceId}"`);

          const esClient = await getEsClient(context);
          const { aggregations } = await esClient.asInternalUser.search<
            unknown,
            ActivityAggregations
          >(buildActivityQuery({ now, spaceId }));

          const body: GetProposalsActivityResponse = {
            buckets: buildActivityBuckets({
              buckets: aggregations?.by_hour?.buckets ?? [],
              now,
            }),
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to read PND proposal activity: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to read PND proposal activity' },
          });
        }
      }
    );
};
