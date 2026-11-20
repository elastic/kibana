/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one host type KI per source; a host that is also a Kubernetes node is still listed.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
import { buildTypeFilter, stringsOf } from './entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldContext,
  type EntityFoldResult,
  type EsqlRow,
} from './entity_rows/types';
import {
  buildConceptCountLine,
  buildConceptListQuery,
  buildInfrastructureConceptDescription,
} from './kubernetes/concepts';

const HOST_DATASET_CONDITION =
  '(STARTS_WITH(data_stream.dataset, "system.") OR data_stream.dataset == "hostmetricsreceiver.otel")';
const HOST_DATASET_FILTER: Condition = {
  or: [
    { field: 'data_stream.dataset', startsWith: 'system.' },
    { field: 'data_stream.dataset', eq: 'hostmetricsreceiver.otel' },
  ],
};
const HOST_BREAKDOWN = ['host.name'];

export const buildHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND ${HOST_DATASET_CONDITION}
    AND host.name IS NOT NULL
| STATS docs = COUNT(*), last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider)
  BY host.name
| STATS member_count = COUNT(*), activity = SUM(docs), last_seen = MAX(last_seen),
        os = VALUES(os), cloud_provider = VALUES(cloud_provider)
| WHERE member_count > 0
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldHostRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const row = rows[0];
  const id = `hosts:${sourceId}`;
  const title = 'Hosts';
  if (!row || id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
    droppedRows.idTooLong += row ? 1 : 0;
    return {
      features: [],
      droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
      droppedRows,
    };
  }
  const memberCount = typeof row.member_count === 'number' ? row.member_count : 0;
  const features: FeatureUpsert[] = [
    {
      type: 'infrastructure',
      subtype: 'host',
      id,
      title,
      description: buildInfrastructureConceptDescription({
        concept: 'hosts',
        memberCount,
        breakdownFields: HOST_BREAKDOWN,
      }),
      evidence: [buildConceptCountLine({ concept: 'hosts', memberCount })],
      filter: buildTypeFilter(HOST_DATASET_FILTER, { field: 'host.name', exists: true }),
      properties: {
        breakdown: HOST_BREAKDOWN,
        entity_store_type: 'host',
        member_count: memberCount,
        list_query: buildConceptListQuery({
          sourceQuery,
          datasetCondition: `${HOST_DATASET_CONDITION} AND host.name IS NOT NULL`,
          breakdownFields: HOST_BREAKDOWN,
        }),
        host_summary: {
          os: stringsOf(row.os),
          cloud_provider: stringsOf(row.cloud_provider),
        },
        origin: 'metrics',
        key_row: 'metrics.hosts',
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
