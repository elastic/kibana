/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import { TIMESTAMP_FIELD } from '../../../common/constants';
import type { createSearchClient } from '../create_search_client';

/**
 * Typed as what `createSearchClient` actually returns rather than the
 * `ESSearchClient` alias from metrics-data-access: that plugin's
 * `CallWithRequestParams` does not declare `requestTimeout`, and widening it
 * would mean changing a second plugin for this probe's benefit.
 */
type InfraSearchClient = ReturnType<typeof createSearchClient>;

/**
 * Transport-level timeout for each phase. Without a bound this search can hang
 * indefinitely on an overloaded cluster or an unreachable CCS remote. Must sit
 * at the top level of the params — `KibanaFramework#callWithRequest` strips it
 * there and forwards it as a transport option.
 */
const HAS_DATA_REQUEST_TIMEOUT = '30s';

/**
 * Recent-data window for the fast phase-1 probe, as ES date-math rounded to the
 * hour. Rounding is what makes the result eligible for the shard request cache.
 */
const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

/**
 * The subset of a search response that says whether the probe completed.
 * Declared structurally because `InfraDatabaseSearchResponse` has no
 * `_clusters` member — it is present at runtime only on CCS responses.
 *
 * Kept in sync with the same guard in
 * `server/routes/metrics_sources/has_data.ts`; the two routes are deliberately
 * independent implementations, so change both together.
 */
interface ProbeCompleteness {
  timed_out?: boolean;
  _shards: { failed: number };
  _clusters?: { skipped: number; failed: number };
}

const isInconclusiveResponse = (response: ProbeCompleteness): boolean =>
  response.timed_out === true ||
  response._shards.failed > 0 ||
  (response._clusters != null && (response._clusters.skipped > 0 || response._clusters.failed > 0));

/**
 * Renders the signals behind an inconclusive response into the log message so
 * the rate can be aggregated from logs later.
 */
const formatIncompleteness = (response: ProbeCompleteness): string =>
  [
    `timed_out=${response.timed_out === true}`,
    `shards_failed=${response._shards.failed}`,
    `clusters_skipped=${response._clusters?.skipped ?? 0}`,
    `clusters_failed=${response._clusters?.failed ?? 0}`,
  ].join(', ');

/**
 * Two-phase "does this index pattern hold any document" probe.
 *
 * Phase 1 restricts to recent data on hot/warm tiers so `can_match` can prune
 * cold/frozen and CCS remote shards holding no recent data. Phase 2 only runs
 * when phase 1 is empty and re-queries unbounded, preserving the original
 * "any doc, anywhere, ever" answer for dormant clusters and clusters whose
 * data lives entirely in cold/frozen tiers.
 *
 * Note `createSearchClient` rewrites whatever is passed as `body.query` into
 * `bool.must`, alongside a `bool.filter` carrying the user's
 * `observability:searchExcludedDataTiers` setting. A `range` inside `must` is
 * still resolvable by `can_match`, so phase 1 still prunes.
 */
export const hasData = async (index: string, client: InfraSearchClient, logger: Logger) => {
  const baseParams = {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    terminate_after: 1,
    requestTimeout: HAS_DATA_REQUEST_TIMEOUT,
  };

  const phase1Response = await client({
    ...baseParams,
    body: {
      size: 0,
      track_total_hits: 1,
      query: {
        bool: {
          filter: [
            { range: { [TIMESTAMP_FIELD]: { gte: HAS_DATA_RECENT_WINDOW } } },
            ...excludeTiersQuery(['data_cold', 'data_frozen']),
          ],
        },
      },
    },
  });

  if (phase1Response.hits.total.value > 0) {
    return true;
  }

  const phase2Response = await client({
    ...baseParams,
    body: {
      size: 0,
      track_total_hits: 1,
    },
  });

  /**
   * Only a zero-hit response is ambiguous: a shard failure or a skipped CCS
   * remote means the probe may simply not have seen the data. A positive hit is
   * conclusive, so it is not worth reporting.
   *
   * Logged rather than thrown — the caller renders `false` as an onboarding
   * screen, but erroring instead would be a behaviour change, and on clusters
   * that deliberately run unavailable `skip_unavailable` remotes it would turn
   * a working page into an error. See issue #292516 for the eventual fix.
   */
  if (phase2Response.hits.total.value === 0 && isInconclusiveResponse(phase2Response)) {
    logger.warn(
      `hasData probe for GET /api/metrics/source/{sourceId}/hasData returned an empty but ` +
        `incomplete result for index pattern "${index}" ` +
        `(${formatIncompleteness(phase2Response)}); reporting hasData: false, which may be a ` +
        `false negative.`
    );
  }

  return phase2Response.hits.total.value !== 0;
};
