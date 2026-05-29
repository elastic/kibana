/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import DateMath from '@kbn/datemath';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  FINAL_SUMMARY_FILTER,
  getRangeFilter,
} from '../constants/client_defaults';
import type { CertFacets } from '../runtime_types';
import { createEsQuery } from '../utils/es_search';
import {
  CERT_HASH_SHA256,
  CERT_SUBJECT_COMMON_NAME,
  FIRST_PARTY,
  THIRD_PARTY,
  DEFAULT_FROM,
  DEFAULT_TO,
} from './get_certs_request_body';

const BROWSER_NETWORK_INFO = 'journey/network_info';
const RESOURCE_TYPE_FIELD = 'synthetics.payload.type';
const SAME_SITE_FIELD = 'http.request.is_same_site';
const NOT_AFTER_FIELD = 'tls.server.x509.not_after';

// Distinct certificates are deduped on the subject common name on the certificates
// page (browser network events carry no sha256 fingerprint), so facet counts use
// the same field for their cardinality to stay consistent with the listed totals.
const CERT_ID_FIELD = CERT_SUBJECT_COMMON_NAME;

// Cumulative "Expiring within" windows. Datemath is understood natively by ES range
// queries, and the values must match the UI's EXPIRY_WITHIN_OPTIONS so counts line up.
export const EXPIRY_WITHIN_WINDOWS = ['now+7d', 'now+30d', 'now+90d', 'now+1y'] as const;

function absoluteDate(relativeDate: string) {
  return DateMath.parse(relativeDate)?.valueOf() ?? relativeDate;
}

interface GetCertsFacetsParams {
  monitorIds?: string[];
  from?: string;
  to?: string;
}

const distinctAgg: Record<string, estypes.AggregationsAggregationContainer> = {
  distinct: { cardinality: { field: CERT_ID_FIELD } },
};

export const getCertsFacetsRequestBody = ({
  monitorIds,
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
}: GetCertsFacetsParams) => {
  const lightweightBranchFilter = [FINAL_SUMMARY_FILTER, { exists: { field: CERT_HASH_SHA256 } }];
  const browserBranchFilter = [
    { term: { 'synthetics.type': BROWSER_NETWORK_INFO } },
    { exists: { field: CERT_SUBJECT_COMMON_NAME } },
    { exists: { field: NOT_AFTER_FIELD } },
  ];

  // Counts are global (independent of the active quick-filter selection), so only the
  // base context applies here: certificate-bearing docs from enabled monitors in range.
  const certTypeFilter = {
    bool: {
      minimum_should_match: 1,
      should: [
        { bool: { filter: lightweightBranchFilter } },
        { bool: { filter: browserBranchFilter } },
      ],
    },
  };

  const expiringWithinFilters: Record<string, estypes.QueryDslQueryContainer> = Object.fromEntries(
    EXPIRY_WITHIN_WINDOWS.map((window) => [
      window,
      { range: { [NOT_AFTER_FIELD]: { lte: window } } },
    ])
  );

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
    monitorTypes: {
      terms: { field: 'monitor.type', size: 10 },
      aggs: distinctAgg,
    },
    tags: {
      terms: { field: 'tags', size: 1000 },
      aggs: distinctAgg,
    },
    // Resource type and origin only exist on browser network events.
    resourceTypes: {
      filter: { term: { 'synthetics.type': BROWSER_NETWORK_INFO } },
      aggs: {
        byType: {
          terms: { field: RESOURCE_TYPE_FIELD, size: 50 },
          aggs: distinctAgg,
        },
      },
    },
    party: {
      filter: { term: { 'synthetics.type': BROWSER_NETWORK_INFO } },
      aggs: {
        byParty: {
          filters: {
            filters: {
              [FIRST_PARTY]: { term: { [SAME_SITE_FIELD]: true } },
              [THIRD_PARTY]: { term: { [SAME_SITE_FIELD]: false } },
            },
          },
          aggs: distinctAgg,
        },
      },
    },
    expiringWithin: {
      filters: { filters: expiringWithinFilters },
      aggs: distinctAgg,
    },
  };

  return createEsQuery({
    size: 0,
    query: {
      bool: {
        filter: [
          certTypeFilter,
          EXCLUDE_RUN_ONCE_FILTER,
          ...(monitorIds && monitorIds.length > 0 ? [{ terms: { 'monitor.id': monitorIds } }] : []),
          getRangeFilter({ from: 'now-7d', to: 'now' }),
          {
            range: {
              'monitor.timespan': {
                gte: absoluteDate(from),
                lte: absoluteDate(to),
              },
            },
          },
        ] as estypes.QueryDslQueryContainer,
      },
    },
    aggs,
  });
};

interface DistinctBucket {
  key: string;
  distinct: { value: number };
}

interface CertsFacetsAggs {
  monitorTypes: { buckets: DistinctBucket[] };
  tags: { buckets: DistinctBucket[] };
  resourceTypes: { byType: { buckets: DistinctBucket[] } };
  party: { byParty: { buckets: Record<string, { distinct: { value: number } }> } };
  expiringWithin: { buckets: Record<string, { distinct: { value: number } }> };
}

const fromKeyedBuckets = (
  buckets: Record<string, { distinct: { value: number } }>,
  order: readonly string[]
): CertFacets['party'] =>
  order.map((value) => ({ value, count: buckets[value]?.distinct.value ?? 0 }));

export const processCertsFacetsResult = (aggregations?: CertsFacetsAggs): CertFacets => {
  const toCounts = (buckets?: DistinctBucket[]): CertFacets['monitorTypes'] =>
    (buckets ?? []).map(({ key, distinct }) => ({ value: key, count: distinct.value }));

  return {
    monitorTypes: toCounts(aggregations?.monitorTypes.buckets),
    tags: toCounts(aggregations?.tags.buckets),
    resourceTypes: toCounts(aggregations?.resourceTypes.byType.buckets),
    party: aggregations
      ? fromKeyedBuckets(aggregations.party.byParty.buckets, [FIRST_PARTY, THIRD_PARTY])
      : [],
    expiringWithin: aggregations
      ? fromKeyedBuckets(aggregations.expiringWithin.buckets, EXPIRY_WITHIN_WINDOWS)
      : [],
  };
};
