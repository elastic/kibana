/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Logger } from '@kbn/logging';
import { normalizeFeatureSlug, type FeatureUpsert } from '@kbn/significant-events-schema';
import { toFromSourceQuery } from '@kbn/nightshift-shared';
import { timeoutSignal } from '@kbn/std';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { ENTITY_KEY_TABLE } from './entity_key_table';
import { getDatasetFamily } from './entity_rows/helpers';
import {
  ENTITY_QUERY_LIMIT,
  type DroppedMetricsEntityRows,
  type EsqlCell,
  type EsqlRow,
  type EsqlScalar,
} from './entity_rows/types';
import { mergeHostFeatures } from './hosts';

const MAX_ENTITIES = 500;
const DATASET_QUERY_TIMEOUT_MS = 30_000;
const COVERED_DATASET_FAMILIES = new Set(ENTITY_KEY_TABLE.flatMap(({ families }) => families));

export interface IdentifyMetricsEntitiesOptions {
  esClient: ElasticsearchClient;
  esql: string;
  sourceId: string;
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
  signal?: AbortSignal;
}

export interface IdentifyMetricsEntitiesResult {
  /** False only when no entity-key row matches and logs onboarding should run. */
  handled: boolean;
  skipReason?: 'no_data' | 'no_entity_key_row';
  metricsEntitiesCount: number;
  metricsCatalogueRowsCount: number;
  matchedEntityKeyRowsCount: number;
  /** Datasets from families the entity-key table does not cover. */
  uncoveredDatasetsCount: number;
  metricsEntityRowsCount: number;
  droppedIncompleteRowsCount: number;
  droppedOverflowRowsCount: number;
  droppedRows: DroppedMetricsEntityRows;
  unknownClusterRows: number;
  excludedSkippedCount: number;
  timings: {
    catalogueMs: number;
    inventoryMs: number;
    totalMs: number;
  };
}

const createDroppedRows = (): DroppedMetricsEntityRows => ({
  nullNodeName: 0,
  nullCluster: 0,
  idTooLong: 0,
});

const isEsqlScalar = (value: ESQLSearchResponse['values'][number][number]): value is EsqlScalar =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  value === null;

const toCell = (value: ESQLSearchResponse['values'][number][number]): EsqlCell => {
  if (isEsqlScalar(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter(isEsqlScalar);
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

// NULLIFY turns missing fields into null so one query works across ECS and OTel sources that lack some fields.
const buildSourceQuery = (esql: string): string =>
  `SET unmapped_fields = "NULLIFY"; ${toFromSourceQuery(esql)}`;

const buildDatasetQuery = (sourceQuery: string): string =>
  `${sourceQuery} | WHERE @timestamp > NOW() - 1 hour | STATS docs = COUNT(*) BY data_stream.dataset`;

const getMetricsDatasets = async ({
  esClient,
  sourceQuery,
  signal,
}: {
  esClient: ElasticsearchClient;
  sourceQuery: string;
  signal?: AbortSignal;
}): Promise<Array<string | null>> => {
  const deadline = timeoutSignal(DATASET_QUERY_TIMEOUT_MS);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const response = (await esClient.esql.query(
      { query: buildDatasetQuery(sourceQuery) },
      { signal: requestSignal }
    )) as ESQLSearchResponse;
    return rowsFromResponse(response).map((row) => {
      const dataset = row['data_stream.dataset'];
      return typeof dataset === 'string' ? dataset : null;
    });
  } finally {
    deadline.dispose();
  }
};

const compareEntityIds = (left: FeatureUpsert, right: FeatureUpsert): number =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

const entityPriority = (feature: FeatureUpsert): number => {
  switch (feature.subtype) {
    case 'k8s.node':
    case 'k8s.namespace':
      return 0;
    case 'host':
      return 1;
    case 'service':
      return 2;
    case 'k8s.deployment':
    case 'k8s.statefulset':
    case 'k8s.daemonset':
    case 'k8s.cronjob':
      return 3;
    default:
      return 3;
  }
};

/** Lists a metrics source's datasets and writes its deterministic type KIs. */
export const identifyMetricsEntities = async ({
  esClient,
  esql,
  sourceId,
  kiClient,
  logger,
  signal,
}: IdentifyMetricsEntitiesOptions): Promise<IdentifyMetricsEntitiesResult> => {
  const startedAt = Date.now();
  const sourceQuery = buildSourceQuery(esql);
  const datasets = await getMetricsDatasets({ esClient, sourceQuery, signal });

  const catalogueMs = Date.now() - startedAt;
  const metricsCatalogueRowsCount = datasets.length;
  if (metricsCatalogueRowsCount === 0) {
    logger.info(`Metrics source [${sourceId}] returned no data; no entities were written.`);
    return {
      handled: true,
      skipReason: 'no_data',
      metricsEntitiesCount: 0,
      metricsCatalogueRowsCount,
      matchedEntityKeyRowsCount: 0,
      uncoveredDatasetsCount: 0,
      metricsEntityRowsCount: 0,
      droppedIncompleteRowsCount: 0,
      droppedOverflowRowsCount: 0,
      droppedRows: createDroppedRows(),
      unknownClusterRows: 0,
      excludedSkippedCount: 0,
      timings: { catalogueMs, inventoryMs: 0, totalMs: Date.now() - startedAt },
    };
  }

  const matchedKeyRows = ENTITY_KEY_TABLE.filter(
    ({ datasets: keyDatasets, datasetPrefixes = [] }) =>
      keyDatasets.some((dataset) => datasets.includes(dataset)) ||
      datasetPrefixes.some((prefix) =>
        datasets.some((dataset) => typeof dataset === 'string' && dataset.startsWith(prefix))
      )
  );
  const uncoveredDatasets = datasets.filter(
    (dataset) => !COVERED_DATASET_FAMILIES.has(getDatasetFamily(dataset) ?? '')
  );
  const uncoveredDatasetsCount = uncoveredDatasets.length;
  const formatDatasets = (values: Array<string | null>): string =>
    values
      .slice(0, 20)
      .map((dataset) => dataset ?? '<null>')
      .join(', ');
  if (matchedKeyRows.length === 0) {
    logger.info(
      `No metrics entity key row matched source [${sourceId}] datasets [${formatDatasets(
        datasets
      )}]; no entities were written.`
    );
    return {
      handled: false,
      skipReason: 'no_entity_key_row',
      metricsEntitiesCount: 0,
      metricsCatalogueRowsCount,
      matchedEntityKeyRowsCount: 0,
      uncoveredDatasetsCount,
      metricsEntityRowsCount: 0,
      droppedIncompleteRowsCount: 0,
      droppedOverflowRowsCount: 0,
      droppedRows: createDroppedRows(),
      unknownClusterRows: 0,
      excludedSkippedCount: 0,
      timings: { catalogueMs, inventoryMs: 0, totalMs: Date.now() - startedAt },
    };
  }
  if (uncoveredDatasetsCount > 0) {
    logger.info(
      `Metrics entity-key table does not cover source [${sourceId}] datasets [${formatDatasets(
        uncoveredDatasets
      )}].`
    );
  }
  const inventoryStartedAt = Date.now();
  const features: FeatureUpsert[] = [];
  let metricsEntityRowsCount = 0;
  let droppedIncompleteRowsCount = 0;
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;

  for (const keyRow of matchedKeyRows) {
    const response = (await esClient.esql.query(
      { query: keyRow.buildQuery(sourceQuery) },
      { signal }
    )) as ESQLSearchResponse;
    const rows = rowsFromResponse(response);
    if (rows.length === ENTITY_QUERY_LIMIT) {
      logger.info(
        `Metrics entity query for source [${sourceId}] row [${keyRow.id}] reached the ${ENTITY_QUERY_LIMIT} row limit.`
      );
    }
    metricsEntityRowsCount += rows.length;
    const folded = keyRow.foldRows(rows, { sourceQuery, sourceId });
    features.push(...folded.features);
    droppedIncompleteRowsCount += folded.droppedIncompleteRowsCount;
    droppedRows.nullNodeName += folded.droppedRows.nullNodeName;
    droppedRows.nullCluster += folded.droppedRows.nullCluster;
    droppedRows.idTooLong += folded.droppedRows.idTooLong;
    unknownClusterRows += folded.unknownClusterRows;
  }

  const [{ hits: excludedFeatures }, { hits: priorFeatures }] = await Promise.all([
    kiClient.getExcludedFeatures(sourceId),
    kiClient.getFeatures(sourceId),
  ]);
  const excludedFeatureIds = new Set(excludedFeatures.map(({ id }) => normalizeFeatureSlug(id)));
  const priorBySlug = new Map(
    priorFeatures.map((feature) => [normalizeFeatureSlug(feature.id), feature])
  );
  const mergedFeatures = mergeHostFeatures(features);
  const selectedFeatures = mergedFeatures
    .filter(({ id }) => !excludedFeatureIds.has(normalizeFeatureSlug(id)))
    .sort((left, right) => {
      const priority = entityPriority(left) - entityPriority(right);
      if (priority !== 0) {
        return priority;
      }
      return compareEntityIds(left, right);
    });
  const excludedSkippedCount = mergedFeatures.length - selectedFeatures.length;
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
      selectedFeatures.map((feature) => {
        const prior = priorBySlug.get(normalizeFeatureSlug(feature.id));
        return {
          index: {
            feature: {
              ...feature,
              expires_at: !prior || prior.expires_at ? expiresAt : undefined,
            },
          },
        };
      })
    );
  }

  const inventoryMs = Date.now() - inventoryStartedAt;
  return {
    handled: true,
    metricsEntitiesCount: selectedFeatures.length,
    metricsCatalogueRowsCount,
    matchedEntityKeyRowsCount: matchedKeyRows.length,
    uncoveredDatasetsCount,
    metricsEntityRowsCount,
    droppedIncompleteRowsCount,
    droppedOverflowRowsCount,
    droppedRows,
    unknownClusterRows,
    excludedSkippedCount,
    timings: { catalogueMs, inventoryMs, totalMs: Date.now() - startedAt },
  };
};
