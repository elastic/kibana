/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { ApmDocumentType, type TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import { getDatasetFilterForSchema } from '@kbn/apm-data-access-plugin/server/lib/helpers/create_es_client/document_type';
import type { estypes } from '@elastic/elasticsearch';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { castArray } from 'lodash';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { InfraEntityMetricType } from '../../../../../common/http_api/infra';

const getApmDocumentsFilter = async ({
  apmDataAccessServices,
  apmDocumentSources,
  start,
  end,
  schema,
}: {
  apmDataAccessServices: ApmDataAccessServicesWrapper;
  apmDocumentSources: TimeRangeMetadata['sources'];
  start: number;
  end: number;
  schema: DataSchemaFormat;
}) => {
  const { preferredSource, documentTypeConfig } = apmDataAccessServices.getDocumentTypeConfig({
    start,
    end,
    documentTypes: [ApmDocumentType.TransactionMetric],
    documentSources: apmDocumentSources,
  });

  const query =
    'getQuery' in documentTypeConfig
      ? documentTypeConfig.getQuery(preferredSource.source.rollupInterval)
      : undefined;

  const schemaFilter = getDatasetFilterForSchema(
    preferredSource.source.documentType,
    preferredSource.source.rollupInterval,
    schema
  );

  return {
    bool: {
      filter: [...castArray(query), ...schemaFilter],
    },
  };
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
  schema: DataSchemaFormat;
}) => {
  const inventoryModel = findInventoryModel('host');
  const filters: estypes.QueryDslQueryContainer[] =
    inventoryModel.nodeFilter?.({
      schema,
    }) ?? [];

  const apmDocumentsFilter =
    apmDataAccessServices && apmDocumentSources
      ? await getApmDocumentsFilter({
          apmDataAccessServices,
          apmDocumentSources,
          start: from,
          end: to,
          schema,
        })
      : undefined;

  if (apmDocumentsFilter) {
    filters.push(apmDocumentsFilter);
  }

  return filters;
};

export const getInventoryModelAggregations = async (
  assetType: 'host',
  metrics: InfraEntityMetricType[],
  schema?: DataSchemaFormat
) => {
  const inventoryModel = findInventoryModel(assetType);
  const aggregations = await inventoryModel.metrics.getAggregations({ schema });

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
