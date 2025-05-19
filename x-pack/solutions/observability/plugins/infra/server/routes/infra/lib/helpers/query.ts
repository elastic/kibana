/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { termQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, type TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { SYSTEM_INTEGRATION } from '../../../../../common/constants';
import { EVENT_MODULE, EVENT_DATASET, OTEL_RECEIVER_DATASET_VALUE, METRICSET_MODULE } from '../../../../../common/constants';
import type { InfraAssetMetricType } from '../../../../../common/http_api/infra';

export const getFilterByIntegration = (integration: typeof SYSTEM_INTEGRATION) => {
  return {
    bool: {
      should: [
        ...termQuery(EVENT_MODULE, integration),
        ...termQuery(METRICSET_MODULE, integration),
      ],
      minimum_should_match: 1,
    },
  };
};

export const getOTelHostmetricsOrSystemIntegrationFilter = () => {
    return {
        bool: {
        should: [
            ...termQuery(EVENT_MODULE, 'system'),
            ...termQuery(METRICSET_MODULE, 'system'),
            ...termQuery(EVENT_DATASET, OTEL_RECEIVER_DATASET_VALUE),
        ],
        minimum_should_match: 1,
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
}: {
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
  apmDocumentSources?: TimeRangeMetadata['sources'];
  from: number;
  to: number;
}) => {
  const filters: estypes.QueryDslQueryContainer[] = [getOTelHostmetricsOrSystemIntegrationFilter()];
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

export const getInventoryModelAggregations = (
  assetType: 'host',
  metrics: InfraAssetMetricType[]
) => {
  const inventoryModel = findInventoryModel(assetType);
  return metrics.reduce<
    Partial<
      Record<
        InfraAssetMetricType,
        (typeof inventoryModel.metrics.snapshot)[keyof typeof inventoryModel.metrics.snapshot]
      >
    >
  >(
    (acc, metric) =>
      inventoryModel.metrics.snapshot?.[metric]
        ? Object.assign(acc, inventoryModel.metrics.snapshot[metric])
        : acc,
    {}
  );
};
