/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { PND_ALERTS_INDEX_BASE } from '../../../../../../common/constants';

/**
 * The ECS fields the blast radius is aggregated on, each with the sub-aggregation name it is
 * addressed by in the response. Shared with `buildDiscoveryContexts`, which maps the buckets back,
 * so a new field is added in exactly one place.
 */
export const PND_DISCOVERY_CONTEXT_ENTITY_FIELDS = [
  { aggName: 'host_name', field: 'host.name' },
  { aggName: 'user_name', field: 'user.name' },
  { aggName: 'source_ip', field: 'source.ip' },
  { aggName: 'destination_ip', field: 'destination.ip' },
] as const;

/**
 * Terms per entity field. Four fields at this size is 80 entities per discovery, inside the
 * contract's `maxItems: 100` on `PndDiscoveryContext.entities` — the bound has to hold here,
 * because nothing downstream trims the response.
 */
export const PND_DISCOVERY_CONTEXT_TERMS_SIZE = 20;

export interface BuildDiscoveryContextQueryParams {
  /** `correlationId → constituent alert ids`, from `buildDiscoveryAlertIds`. */
  alertIdsByDiscoveryId: Record<string, string[]>;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
}

/**
 * The single aggregation behind `GET /internal/pnd/discovery-context`.
 *
 * One `filters` bucket per Attack Discovery, each an `ids` clause over that discovery's own
 * constituent alerts, so N discoveries resolve in one round trip rather than N — a queue of
 * proposals must not cost a search per row.
 *
 * `ignore_unavailable` covers a space in which no detection rule has ever fired and the alerts
 * index therefore does not exist: an empty blast radius is the honest answer there, not an error.
 */
export const buildDiscoveryContextQuery = ({
  alertIdsByDiscoveryId,
  spaceId,
}: BuildDiscoveryContextQueryParams): estypes.SearchRequest => ({
  aggs: {
    by_discovery: {
      aggs: {
        ...PND_DISCOVERY_CONTEXT_ENTITY_FIELDS.reduce<
          Record<string, estypes.AggregationsAggregationContainer>
        >(
          (aggs, { aggName, field }) => ({
            ...aggs,
            [aggName]: { terms: { field, size: PND_DISCOVERY_CONTEXT_TERMS_SIZE } },
          }),
          {}
        ),
        // D5: the MAX of the constituent alerts' own scores, naturally 0-100 — never the Attack
        // Discovery's `risk_score`, which is an unbounded sum of exactly these values.
        max_risk_score: { max: { field: 'kibana.alert.risk_score' } },
      },
      filters: {
        filters: Object.entries(alertIdsByDiscoveryId).reduce<
          Record<string, estypes.QueryDslQueryContainer>
        >(
          (filters, [correlationId, alertIds]) => ({
            ...filters,
            [correlationId]: { ids: { values: alertIds } },
          }),
          {}
        ),
      },
    },
  },
  ignore_unavailable: true,
  index: `${PND_ALERTS_INDEX_BASE}-${spaceId}`,
  size: 0,
  track_total_hits: false,
});
