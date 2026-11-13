/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one service type KI per source from APM service-summary and generic OTel datasets.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import {
  buildDatasetFilter,
  buildScopedFilter,
  formatDatasetList,
  stringsOf,
} from './entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldContext,
  type EntityFoldResult,
  type EsqlRow,
} from './entity_rows/types';
import {
  buildConceptListQuery,
  buildInfrastructureConceptDescription,
} from './kubernetes/concepts';

const SERVICE_DATASETS = [
  'apm.service_summary.1m',
  'apm.service_summary.1m.otel',
  'generic.otel',
] as const;
const SERVICE_DATASET_CONDITION = `data_stream.dataset IN (${formatDatasetList(SERVICE_DATASETS)})`;

export const buildServiceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND ${SERVICE_DATASET_CONDITION}
    AND service.name IS NOT NULL
| EVAL environment = COALESCE(service.environment, deployment.environment.name)
| STATS last_seen = MAX(@timestamp), environments = VALUES(environment),
        docs = COUNT(*)
  BY service.name
| STATS scale = COUNT(*), activity = SUM(docs), last_seen = MAX(last_seen),
        members = TOP(service.name, 50, "asc"),
        environments = VALUES(environments)
| WHERE scale > 0
| SORT activity DESC
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldServiceRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const row = rows[0];
  if (!row) {
    return {
      features: [],
      droppedIncompleteRowsCount: 0,
      droppedRows,
    };
  }

  const id = `services:${sourceId}`;
  const title = 'Services';
  if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
    droppedRows.idTooLong += 1;
    return {
      features: [],
      droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
      droppedRows,
    };
  }

  const members = stringsOf(row.members).slice(0, 50);
  const scale = typeof row.scale === 'number' ? row.scale : 0;
  const features: FeatureUpsert[] = [
    {
      type: 'entity',
      subtype: 'service',
      id,
      title,
      description: buildInfrastructureConceptDescription({
        concept: 'services',
        scope: sourceId,
        scale,
        breakdownFields: ['service.name'],
        members,
      }),
      filter: buildScopedFilter(undefined, buildDatasetFilter(SERVICE_DATASETS), {
        field: 'service.name',
        exists: true,
      }),
      properties: {
        breakdown: ['service.name'],
        entity_store_type: 'service',
        scale,
        members,
        list_query: buildConceptListQuery({
          sourceQuery,
          datasetCondition: `${SERVICE_DATASET_CONDITION} AND service.name IS NOT NULL`,
          breakdownFields: ['service.name'],
        }),
        environments: stringsOf(row.environments),
        origin: 'metrics',
        key_row: 'apm.service',
      },
      confidence: 100,
    },
  ];

  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
  };
};
