/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { existsQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  findInventoryFields,
  findInventoryModel,
  METRICSET_MODULE,
} from '@kbn/metrics-data-access-plugin/common';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import { TIMESTAMP_FIELD } from '../../../common/constants';
import type { InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';

/**
 * Transport-level timeout for each phase of the hasData probe. Without a bound
 * this search can hang indefinitely on an overloaded cluster or an unreachable
 * CCS remote. Mirrors the same guard in InfraElasticsearchSourceStatusAdapter.
 */
export const HAS_DATA_REQUEST_TIMEOUT = '30s';

/**
 * Recent-data window for the fast phase-1 probe, expressed as ES date-math
 * rounded to the hour. Rounding is what makes the result eligible for the
 * shard request cache, so repeated calls within a polling interval are
 * near-free. Written inline (not via rangeQuery) to avoid the epoch_millis
 * format that the helper emits, which disables cache eligibility.
 */
export const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

type HasDataSource = 'host' | 'pod' | 'all' | undefined;

/**
 * The subset of a search response that says whether the probe actually
 * completed. Declared structurally rather than as `estypes.SearchResponse` so
 * it also accepts the `InferSearchResponseOf` type the metrics client returns.
 */
interface ProbeCompleteness {
  timed_out?: boolean;
  _shards: { failed: number };
  _clusters?: { skipped: number; failed: number };
}

/**
 * A zero-hit response that is also incomplete cannot be read as "no data":
 * `timed_out`, shard failures, or skipped/failed CCS remotes all mean the
 * probe may simply not have seen the data. `_clusters` is present only on
 * CCS responses.
 */
export const isInconclusiveResponse = (response: ProbeCompleteness): boolean =>
  response.timed_out === true ||
  response._shards.failed > 0 ||
  (response._clusters != null && (response._clusters.skipped > 0 || response._clusters.failed > 0));

/**
 * Renders the signals behind an inconclusive response into the log message so
 * the rate can be aggregated from logs later. Takes `ProbeCompleteness` rather
 * than the search response so `_clusters` — which only CCS responses carry — is
 * typed at the access site.
 */
const formatIncompleteness = (response: ProbeCompleteness): string =>
  [
    `timed_out=${response.timed_out === true}`,
    `shards_failed=${response._shards.failed}`,
    `clusters_skipped=${response._clusters?.skipped ?? 0}`,
    `clusters_failed=${response._clusters?.failed ?? 0}`,
  ].join(', ');

const getEntityClauses = (source: HasDataSource): estypes.QueryDslQueryContainer[] => {
  const hostInventoryModel = findInventoryModel('host');
  const hostIntegration =
    typeof hostInventoryModel?.requiredIntegration !== 'object' ||
    !('otel' in hostInventoryModel?.requiredIntegration)
      ? undefined
      : hostInventoryModel.requiredIntegration;

  if (source === 'all') {
    return [
      ...existsQuery(hostInventoryModel.fields.id),
      ...existsQuery(findInventoryFields('container').id),
      ...existsQuery(findInventoryFields('pod').id),
      ...existsQuery(findInventoryFields('awsEC2').id),
      ...existsQuery(findInventoryFields('awsS3').id),
      ...existsQuery(findInventoryFields('awsRDS').id),
      ...existsQuery(findInventoryFields('awsSQS').id),
    ];
  }

  if (source === 'host' && hostIntegration) {
    return [
      ...termQuery(EVENT_MODULE, hostIntegration.beats),
      ...termQuery(METRICSET_MODULE, hostIntegration.beats),
      ...termQuery(DATASTREAM_DATASET, hostIntegration.otel),
    ];
  }

  return [];
};

/**
 * Two-phase "does this cluster have any metrics data" probe.
 *
 * Phase 1 restricts to recent data on hot/warm tiers so Elasticsearch's
 * can_match pre-filter can prune cold/frozen shards and CCS remote shards
 * holding no recent data, reducing fan-out from thousands of shards to a
 * handful. Phase 2 only runs when phase 1 finds nothing, and re-queries
 * unbounded to preserve the original "any metrics doc, anywhere, ever"
 * semantics for dormant clusters and clusters whose data lives entirely in
 * cold/frozen tiers.
 *
 * When phase 2 comes back empty *and* incomplete, the answer may be a false
 * negative. That is logged rather than thrown: the caller renders `false` as an
 * onboarding screen, but erroring instead would be a behaviour change, and on
 * clusters that deliberately run unavailable `skip_unavailable` remotes it would
 * turn a working page into an error. Logging keeps the pre-existing behaviour
 * while making the rate measurable. See issue #292516 for the eventual fix,
 * which needs a distinct "unknown" status plus UI treatment.
 */
export const getHasData = async ({
  infraMetricsClient,
  source,
  logger,
}: {
  infraMetricsClient: Pick<InfraMetricsClient, 'search'>;
  source: HasDataSource;
  logger: Logger;
}): Promise<{ hasData: boolean }> => {
  // The entity-field clauses are identical for both phases; only the filter
  // context (range + tier exclusion) differs between them.
  const entityClauses = getEntityClauses(source);

  /**
   * `data_cold` and `data_frozen` are excluded rather than `data_hot`/
   * `data_warm` being included, so that legacy metricbeat-* indices and
   * self-managed clusters without tier roles (which land in `data_content`
   * or have no `_tier`) are not incorrectly pushed to the slow fallback.
   */
  const phase1Response = await infraMetricsClient.search({
    track_total_hits: 1,
    terminate_after: 1,
    size: 0,
    allow_no_indices: true,
    requestTimeout: HAS_DATA_REQUEST_TIMEOUT,
    query: {
      bool: {
        filter: [
          { range: { [TIMESTAMP_FIELD]: { gte: HAS_DATA_RECENT_WINDOW } } },
          ...excludeTiersQuery(['data_cold', 'data_frozen']),
        ],
        should: entityClauses,
        minimum_should_match: 1,
      },
    },
  });

  if (phase1Response.hits.total.value > 0) {
    return { hasData: true };
  }

  const phase2Response = await infraMetricsClient.search({
    track_total_hits: 1,
    terminate_after: 1,
    size: 0,
    allow_no_indices: true,
    requestTimeout: HAS_DATA_REQUEST_TIMEOUT,
    query: {
      bool: {
        should: entityClauses,
        minimum_should_match: 1,
      },
    },
  });

  // Only a zero-hit response is ambiguous. A positive hit conclusively proves
  // data exists, so a skipped remote or a failed shard elsewhere is not worth
  // reporting.
  if (phase2Response.hits.total.value === 0 && isInconclusiveResponse(phase2Response)) {
    logger.warn(
      `hasData probe for GET /api/metrics/source/hasData returned an empty but incomplete result ` +
        `(${formatIncompleteness(phase2Response)}); reporting hasData: false, which may be a ` +
        `false negative.`
    );
  }

  return { hasData: phase2Response.hits.total.value > 0 };
};
