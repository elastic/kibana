/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { esql, type ComposerQuery } from '@elastic/esql';
import { SERVICE_NAME } from '@kbn/apm-types';
import { dateRangeQuery, termsQuery } from '@kbn/es-query';
import { mobileDocuments } from '../../../../common/mobile/documents';
import { mobileColumn, resultColumn } from '../../../../common/mobile/fields';
import { dateHistogram, type HistogramParams } from '../../../lib/helpers/time_series';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

/** The indices of a source's applications and the filter that picks their documents. */
export interface IngestDocuments {
  index: string[];
  /** Without the time range, which the searches add. */
  filter: estypes.QueryDslQueryContainer[];
}

/**
 * Indices per application or bucket: a time range spans a few backing indices per data stream, so
 * this leaves room for many data streams (namespaces, datasets).
 */
export const MAX_INDICES = 100;

/** Rows of the mobile count query: an application's documents in one index. */
export const MAX_MOBILE_COUNT_ROWS = 10_000;

export const INDEX_FIELD = '_index';

const indicesTerms = { terms: { field: INDEX_FIELD, size: MAX_INDICES } };

type IngestSearchRequest = estypes.SearchRequest & {
  index: string[];
  size: number;
  track_total_hits: boolean;
};

const documentsSearch = (
  { index, filter }: IngestDocuments,
  start: number,
  end: number
): IngestSearchRequest => ({
  index,
  size: 0,
  track_total_hits: false,
  // A source without data, e.g. no Classic RUM, finds nothing instead of failing.
  ignore_unavailable: true,
  allow_no_indices: true,
  // A shard that fails fails the search, so the estimate is missing, not too low.
  allow_partial_search_results: false,
  query: { bool: { filter: [...dateRangeQuery(start, end), ...filter] } },
});

/** Each application's documents per index in the time range. */
export const countsSearch = ({
  documents,
  start,
  end,
}: {
  documents: IngestDocuments;
  start: number;
  end: number;
}) => ({
  ...documentsSearch(documents, start, end),
  aggs: {
    applications: {
      terms: { field: SERVICE_NAME, size: MAX_APPLICATIONS_PER_SOURCE },
      aggs: { indices: indicesTerms },
    },
  },
});

/**
 * The documents per index in each bucket: of every application, and of each of `serviceNames`, so
 * the chart stacks them and puts the rest in one series.
 */
export const overTimeSearch = ({
  documents,
  start,
  end,
  histogram,
  serviceNames,
}: {
  documents: IngestDocuments;
  start: number;
  end: number;
  histogram: HistogramParams;
  serviceNames: string[];
}) => ({
  ...documentsSearch(documents, start, end),
  aggs: {
    overTime: {
      ...dateHistogram({ start, end, histogram }),
      aggs: {
        indices: indicesTerms,
        top: {
          filter: { bool: { filter: termsQuery(SERVICE_NAME, serviceNames) } },
          aggs: {
            applications: {
              terms: { field: SERVICE_NAME, size: Math.max(serviceNames.length, 1) },
              aggs: { indices: indicesTerms },
            },
          },
        },
      },
    },
  },
});

interface IndicesAggregation {
  buckets: Array<{ key: string; doc_count: number }>;
}

interface ApplicationsAggregation {
  buckets: Array<{ key: string; indices: IndicesAggregation }>;
}

export interface CountsAggregations {
  applications: ApplicationsAggregation;
}

export interface OverTimeAggregations {
  overTime: {
    buckets: Array<{
      key: number;
      indices: IndicesAggregation;
      top: { applications: ApplicationsAggregation };
    }>;
  };
}

export const toIndexCounts = (aggregation?: IndicesAggregation) =>
  (aggregation?.buckets ?? []).map(({ key, doc_count: docs }) => ({ index: key, docs }));

export const toApplicationCounts = (aggregation?: ApplicationsAggregation) =>
  (aggregation?.buckets ?? []).map(({ key, indices }) => ({
    serviceName: key,
    indices: toIndexCounts(indices),
  }));

/** The mobile applications' documents per index, as rows of `service.name`, `_index`, `docs`. */
export const mobileCountsQuery = (): ComposerQuery =>
  mobileDocuments({ metadataFields: [INDEX_FIELD] }).pipe`WHERE ${mobileColumn('serviceName')} IS NOT NULL`
    .pipe`STATS ${resultColumn('docs')} = COUNT(*) BY ${mobileColumn('serviceName')}, ${esql.col(
    INDEX_FIELD
  )}`.pipe`LIMIT ${MAX_MOBILE_COUNT_ROWS}`;
