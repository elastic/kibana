/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Logger } from '@kbn/logging';
import type { FeatureUpsert } from '@kbn/significant-events-schema';
import { toTimeSeriesSourceQuery } from '@kbn/nightshift-shared';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { getMetricsCatalogue } from './catalogue';
import { ENTITY_KEY_TABLE, type EsqlCell, type EsqlRow } from './entity_key_table';

const MAX_ENTITIES = 500;

export interface IdentifyMetricsEntitiesOptions {
  esClient: ElasticsearchClient;
  esql: string;
  sourceId: string;
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
  signal?: AbortSignal;
}

export interface IdentifyMetricsEntitiesResult {
  metricsEntitiesCount: number;
  metricsCatalogueRowsCount: number;
  matchedEntityKeyRowsCount: number;
  metricsEntityRowsCount: number;
  droppedIncompleteRowsCount: number;
  droppedOverflowRowsCount: number;
  timings: {
    catalogueMs: number;
    inventoryMs: number;
    totalMs: number;
  };
  errors: Array<{ stage: 'catalogue'; message: string }>;
}

const errorMessage = (error: Error): string => error.message;

const toCell = (value: ESQLSearchResponse['values'][number][number]): EsqlCell => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  return null;
};

const rowsFromResponse = (response: ESQLSearchResponse): EsqlRow[] =>
  response.values.map((values) =>
    response.columns.reduce<Record<string, EsqlCell>>((row, column, index) => {
      row[column.name] = toCell(values[index]);
      return row;
    }, {})
  );

const dataStreamMatchesDataset = (dataStream: string, dataset: string): boolean =>
  dataStream === dataset ||
  dataStream.includes(`-${dataset}-`) ||
  dataStream.endsWith(`-${dataset}`);

const replicasOf = (feature: FeatureUpsert): number => {
  const replicas = feature.properties.replicas;
  return typeof replicas === 'number' ? replicas : 0;
};

/** Catalogues a metrics source and writes its Kubernetes workload and node entities. */
export const identifyMetricsEntities = async ({
  esClient,
  esql,
  sourceId,
  kiClient,
  logger,
  signal,
}: IdentifyMetricsEntitiesOptions): Promise<IdentifyMetricsEntitiesResult> => {
  const startedAt = Date.now();
  let catalogue;

  try {
    catalogue = await getMetricsCatalogue({ esClient, esql, signal });
  } catch (error) {
    const catalogueMs = Date.now() - startedAt;
    const message = errorMessage(error instanceof Error ? error : new Error(String(error)));
    return {
      metricsEntitiesCount: 0,
      metricsCatalogueRowsCount: 0,
      matchedEntityKeyRowsCount: 0,
      metricsEntityRowsCount: 0,
      droppedIncompleteRowsCount: 0,
      droppedOverflowRowsCount: 0,
      timings: { catalogueMs, inventoryMs: 0, totalMs: catalogueMs },
      errors: [{ stage: 'catalogue', message }],
    };
  }

  const catalogueMs = Date.now() - startedAt;
  const metricsCatalogueRowsCount = [...catalogue.values()].reduce(
    (count, rows) => count + rows.length,
    0
  );
  if (metricsCatalogueRowsCount === 0) {
    logger.info(`Metrics catalogue is empty for source [${sourceId}]; no entities were written.`);
    return {
      metricsEntitiesCount: 0,
      metricsCatalogueRowsCount,
      matchedEntityKeyRowsCount: 0,
      metricsEntityRowsCount: 0,
      droppedIncompleteRowsCount: 0,
      droppedOverflowRowsCount: 0,
      timings: { catalogueMs, inventoryMs: 0, totalMs: Date.now() - startedAt },
      errors: [],
    };
  }

  const dataStreams = [...catalogue.keys()];
  const matchedKeyRows = ENTITY_KEY_TABLE.filter(({ datasets }) =>
    datasets.some((dataset) =>
      dataStreams.some((dataStream) => dataStreamMatchesDataset(dataStream, dataset))
    )
  );
  const inventoryStartedAt = Date.now();
  const sourceQuery = toTimeSeriesSourceQuery(esql);
  const features: FeatureUpsert[] = [];
  let metricsEntityRowsCount = 0;
  let droppedIncompleteRowsCount = 0;

  for (const keyRow of matchedKeyRows) {
    const response = (await esClient.esql.query(
      { query: keyRow.buildQuery(sourceQuery) },
      { signal }
    )) as ESQLSearchResponse;
    const rows = rowsFromResponse(response);
    metricsEntityRowsCount += rows.length;

    for (const row of rows) {
      const feature = keyRow.toEntity(row);
      if (feature) {
        features.push(feature);
      } else {
        droppedIncompleteRowsCount += 1;
      }
    }
  }

  const selectedFeatures = [...features].sort(
    (left, right) => replicasOf(right) - replicasOf(left)
  );
  const droppedOverflowRowsCount = Math.max(0, selectedFeatures.length - MAX_ENTITIES);
  if (droppedOverflowRowsCount > 0) {
    logger.info(
      `Metrics entities for source [${sourceId}] exceeded the ${MAX_ENTITIES} entity cap: ${selectedFeatures.length} rows, dropped ${droppedOverflowRowsCount}.`
    );
    selectedFeatures.length = MAX_ENTITIES;
  }

  if (selectedFeatures.length > 0) {
    const expiresAt = kiClient.getDefaultExpiresAt();
    await kiClient.bulk(
      sourceId,
      selectedFeatures.map((feature) => ({
        index: { feature: { ...feature, expires_at: expiresAt } },
      }))
    );
  }

  const inventoryMs = Date.now() - inventoryStartedAt;
  return {
    metricsEntitiesCount: selectedFeatures.length,
    metricsCatalogueRowsCount,
    matchedEntityKeyRowsCount: matchedKeyRows.length,
    metricsEntityRowsCount,
    droppedIncompleteRowsCount,
    droppedOverflowRowsCount,
    timings: { catalogueMs, inventoryMs, totalMs: Date.now() - startedAt },
    errors: [],
  };
};
