/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { termQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, type TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { SchemaTypes } from '../../../../../common/http_api/shared/schema_type';
import { integrationNameByEntityType } from '../../../../lib/sources/constants';
import type { EntityTypes } from '../../../../../common/http_api/shared/entity_type';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  METRICSET_MODULE,
  METRIC_SCHEMA_ECS,
} from '../../../../../common/constants';
import type { InfraEntityMetricType } from '../../../../../common/http_api/infra';

export const getFilterForEntityType = (
  entityType: EntityTypes,
  schema: SchemaTypes = METRIC_SCHEMA_ECS
) => {
  const source = integrationNameByEntityType[entityType];
  return {
    bool:
      schema === METRIC_SCHEMA_ECS
        ? {
            should: [
              ...termQuery(EVENT_MODULE, source.beats),
              ...termQuery(METRICSET_MODULE, source.beats),
            ],
            minimum_should_match: 1,
          }
        : {
            filter: [...termQuery(DATASTREAM_DATASET, source.otel)],
          },
  };
};

const getApmDocumentsFilter = async ({
  apmDataAccessServices,
  apmDocumentSources,
  start,
  end,
}: {
  apmDataAccessServices: ApmDataAccessServicesWrapper;
  apmDocumentSources: TimeRangeMetadata['sources'];
  start: number;
  end: number;
}) => {
  const { preferredSource, documentTypeConfig } = apmDataAccessServices.getDocumentTypeConfig({
    start,
    end,
    documentTypes: [ApmDocumentType.TransactionMetric],
    documentSources: apmDocumentSources,
  });

  return 'getQuery' in documentTypeConfig
    ? documentTypeConfig.getQuery(preferredSource.source.rollupInterval)
    : undefined;
};

export const getDocumentsFilter = async ({
  apmDataAccessServices,
  apmDocumentSources,
  from,
  to,
  schema,
}: {
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
  apmDocumentSources?: TimeRangeMetadata['sources'];
  from: number;
  to: number;
  schema?: SchemaTypes;
}) => {
  const filters: estypes.QueryDslQueryContainer[] = [getFilterForEntityType('host', schema)];
  const apmDocumentsFilter =
    apmDataAccessServices && apmDocumentSources
      ? await getApmDocumentsFilter({
          apmDataAccessServices,
          apmDocumentSources,
          start: from,
          end: to,
        })
      : undefined;

  if (apmDocumentsFilter) {
    filters.push(apmDocumentsFilter);
  }

  return filters;
};

export const getInventoryModelAggregations = async (
  entityType: 'host',
  metrics: InfraEntityMetricType[]
) => {
  const inventoryModel = findInventoryModel(entityType);
  const aggregations = await inventoryModel.metrics.getAggregations();

  return metrics.reduce<Partial<Record<InfraEntityMetricType, MetricsUIAggregation>>>(
    (acc, metric) => {
      const metricAgg = aggregations.get(metric);
      if (metricAgg) {
        Object.assign(acc, metricAgg);
      }
      return acc;
    },
    {}
  );
};
