/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchRequest } from '@kbn/es-types';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type {
  InfraTimerangeInput,
  SnapshotCustomMetricInput,
} from '../../../../../common/http_api';
import { parseFilterQuery } from '../../../../utils/serialized_query';
import { createMetricAggregations } from './create_metric_aggregations';
import type { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { createBucketSelector } from './create_bucket_selector';
import { KUBERNETES_POD_UID, NUMBER_OF_DOCUMENTS, termsAggField } from '../../common/utils';

/**
 * This function escapes Regex special characters with a (\) so they will behave like normal text.
 * @param str input text
 * @returns input text with regex operators escaped
 * @example
 *   escapeRegex("foo.bar") -> "foo\.bar"
 *   escapeRegex("a+b?")    -> "a\+b\?"
 */
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegex(str: string) {
  return escapeRegex(str).replace(/\\\*/g, '.*');
}

const ADDITIONAL_CONTEXT_ALLOW_LIST = ['host.*', 'labels.*', 'tags', 'cloud.*', 'orchestrator.*'];
export const ADDITIONAL_CONTEXT_BLOCKED_LIST = ['host.cpu.*', 'host.disk.*', 'host.network.*'];

export const ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX = new RegExp(
  `^(${ADDITIONAL_CONTEXT_BLOCKED_LIST.map(wildcardToRegex).join('|')})$`
);

export const createRequest = async (
  index: string,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  compositeSize: number,
  afterKey: { node: string } | undefined,
  condition: InventoryMetricConditions,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput,
  fieldsExisted?: Record<string, boolean> | null,
  schema?: DataSchemaFormat
) => {
  const inventoryModels = findInventoryModel(nodeType);

  const composite: estypes.AggregationsCompositeAggregation = {
    size: compositeSize,
    sources: [{ node: { terms: { field: inventoryModels.fields.id } } }],
    ...(afterKey ? { after: afterKey } : {}),
  };

  const metricAggregations = await createMetricAggregations(
    timerange,
    nodeType,
    metric,
    customMetric,
    schema
  );
  const bucketSelector = createBucketSelector(metric, condition, customMetric);

  const containerContextAgg: Record<string, estypes.AggregationsAggregationContainer> | undefined =
    nodeType === 'pod' && fieldsExisted && fieldsExisted[termsAggField[KUBERNETES_POD_UID]]
      ? {
          containerContext: {
            terms: {
              field: termsAggField[KUBERNETES_POD_UID],
              size: NUMBER_OF_DOCUMENTS,
            },
            aggs: {
              container: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['container.*'],
                  },
                },
              },
            },
          },
        }
      : undefined;

  const allowList = !containerContextAgg
    ? ADDITIONAL_CONTEXT_ALLOW_LIST.concat('container.*')
    : ADDITIONAL_CONTEXT_ALLOW_LIST;

  const additionalContextAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    additionalContext: {
      top_hits: {
        size: 1,
        _source:
          schema === 'semconv'
            ? false
            : {
                includes: allowList,
                excludes: ADDITIONAL_CONTEXT_BLOCKED_LIST,
              },
        // otel docs don't support _source to select fields, so we use docvalue_fields
        docvalue_fields: schema === 'semconv' ? allowList : [],
      },
    },
  };

  const parsedFilters = parseFilterQuery(filterQuery);
  const request: ESSearchRequest = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index,
    size: 0,
    query: {
      bool: {
        filter: [
          ...(parsedFilters
            ? Array.isArray(parsedFilters)
              ? parsedFilters
              : [parsedFilters]
            : []),
          ...rangeQuery(timerange.from, timerange.to),
          ...(schema ? inventoryModels.nodeFilter?.({ schema }) ?? [] : []),
        ],
      },
    },
    aggs: {
      nodes: {
        composite,
        aggs: {
          ...metricAggregations,
          ...bucketSelector,
          ...additionalContextAgg,
          ...containerContextAgg,
        },
      },
    },
  };

  return request;
};
