/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  ENTITY_METADATA,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
  type RelationshipKind,
} from '@kbn/entity-store/common';
import { RELATIONSHIP_OBSERVED_ACTION } from '@kbn/entity-store/common/domain/entity_metadata/relationship_metadata';

export interface SeedRelationshipObservationOptions {
  readonly sourceEuid: string;
  readonly targetEuid: string;
  readonly kind: RelationshipKind;
  readonly observedAt: string;
}

export const seedRelationshipObservation = async ({
  esClient,
  namespace = 'default',
  sourceEuid,
  targetEuid,
  kind,
  observedAt,
}: SeedRelationshipObservationOptions & {
  esClient: Client;
  namespace?: string;
}): Promise<void> => {
  // Data stream name, not the `entities-metadata-*` read alias (no write index).
  await esClient.index({
    index: getEntityIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V2,
      dataset: ENTITY_METADATA,
      namespace,
    }),
    op_type: 'create',
    require_data_stream: true,
    refresh: 'wait_for',
    document: {
      '@timestamp': observedAt,
      'event.kind': 'event',
      'event.action': RELATIONSHIP_OBSERVED_ACTION,
      'entity.id': sourceEuid,
      'entity.source': 'eval-seed',
      [`entity.relationships.${kind}.target`]: targetEuid,
      Maintainer: {
        kind: 'eval-seed',
        scan_id: 'eval-seed',
        lookback_window: '90d',
      },
    },
  });
};
