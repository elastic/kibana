/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import { lastSeenOf, stringsOf } from './entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldResult,
  type EsqlRow,
} from './entity_rows/types';

// Finds one service pet KI from APM service-summary and generic OTel datasets.
export const buildServiceQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN ("apm.service_summary.1m",
                                "apm.service_summary.1m.otel",
                                "generic.otel")
    AND service.name IS NOT NULL
| STATS last_seen = MAX(@timestamp), environments = VALUES(service.environment),
        docs = COUNT(*)
  BY service.name
| SORT docs DESC, service.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldServiceRows = (rows: EsqlRow[]): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const name = row['service.name'];
    if (typeof name !== 'string') {
      return [];
    }
    const id = `service:${name}`;
    if (id.length > MAX_ID_LENGTH || name.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    return [
      {
        type: 'entity',
        subtype: 'service',
        id,
        title: name,
        description: `Service ${name}.`,
        filter: { field: 'service.name', eq: name },
        properties: {
          name,
          identity: { 'service.name': name },
          environments: stringsOf(row.environments),
          entity_store_type: 'service',
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: 'apm.service',
        },
        confidence: 100,
      },
    ];
  });
  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
    unknownClusterRows: 0,
  };
};
