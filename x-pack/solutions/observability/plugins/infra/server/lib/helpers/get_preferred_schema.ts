/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  findInventoryModel,
  METRICSET_MODULE,
} from '@kbn/metrics-data-access-plugin/common';
import type { InfraMetricsClient } from './get_infra_metrics_client';

interface GetPreferredSchemaParams {
  infraMetricsClient: InfraMetricsClient;
  dataSource: InventoryItemType;
  from: number;
  to: number;
  kuery?: string;
  filters?: unknown;
  isInventoryView?: boolean;
}

interface GetPreferredSchemaResult {
  schemas: DataSchemaFormat[];
  preferredSchema: DataSchemaFormat | null;
}

export async function getPreferredSchema({
  infraMetricsClient,
  dataSource,
  from,
  to,
  kuery,
  filters,
  isInventoryView = true,
}: GetPreferredSchemaParams): Promise<GetPreferredSchemaResult> {
  const inventoryModel = findInventoryModel(dataSource);

  // If the inventory model doesn't support OTel, return ECS only
  if (
    typeof inventoryModel.requiredIntegration !== 'object' ||
    !('otel' in inventoryModel.requiredIntegration)
  ) {
    return {
      schemas: ['ecs'],
      preferredSchema: 'ecs',
    };
  }

  const [ecsResponse, otelResponse] = (
    await infraMetricsClient.msearch([
      {
        track_total_hits: true,
        terminate_after: 1,
        size: 0,
        query: {
          bool: {
            should: [
              ...termsQuery(EVENT_MODULE, inventoryModel.requiredIntegration.beats),
              ...termsQuery(METRICSET_MODULE, inventoryModel.requiredIntegration.beats),
              ...(!isInventoryView ? termsQuery(DATASTREAM_DATASET, 'apm*') : []),
            ],
            minimum_should_match: 1,
            filter: [...rangeQuery(from, to), ...kqlQuery(kuery), ...(filters ? [filters] : [])],
          },
        },
      },
      {
        track_total_hits: true,
        terminate_after: 1,
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(DATASTREAM_DATASET, inventoryModel.requiredIntegration.otel),
              ...rangeQuery(from, to),
              ...kqlQuery(kuery),
              ...(filters ? [filters] : []),
            ],
          },
        },
      },
    ])
  ).responses;

  const hasEcsData = ecsResponse.hits.total.value !== 0;
  const hasOtelData = otelResponse.hits.total.value !== 0;

  const allSchemas: DataSchemaFormat[] = ['ecs', 'semconv'];
  const availableSchemas = allSchemas.filter(
    (key) => (key === 'ecs' && hasEcsData) || (key === 'semconv' && hasOtelData)
  );

  const preferredSchema =
    availableSchemas.length > 0
      ? availableSchemas.includes('semconv')
        ? 'semconv'
        : availableSchemas[0]
      : null;

  return {
    schemas: availableSchemas,
    preferredSchema,
  };
}
