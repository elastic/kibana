/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RelationshipMetadataDoc } from '@kbn/entity-store/common';

import type { EntityRelationshipRecord } from './types';

interface WriteRelationshipMetadataContext {
  scanId: string;
  lookbackWindow: string;
  entitySource: string;
  observedAt: string;
}

const HOST_EUID_PREFIX = 'host:';
const USER_EUID_PREFIX = 'user:';

function parseUsername(entityId: string): string | undefined {
  if (!entityId.startsWith(USER_EUID_PREFIX)) return undefined;
  const remainder = entityId.slice(USER_EUID_PREFIX.length);
  const atIndex = remainder.indexOf('@');
  return atIndex === -1 ? remainder : remainder.slice(0, atIndex);
}

function parseHostName(targetEuid: string): string | undefined {
  if (!targetEuid.startsWith(HOST_EUID_PREFIX)) return undefined;
  return targetEuid.slice(HOST_EUID_PREFIX.length);
}

function buildRelationshipMetadata(
  record: EntityRelationshipRecord & { entityId: string },
  relType: string,
  target: string,
  context: WriteRelationshipMetadataContext
): RelationshipMetadataDoc {
  const doc: RelationshipMetadataDoc = {
    '@timestamp': context.observedAt,
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': record.entityId,
    'entity.source': context.entitySource,
    Maintainer: {
      kind: relType,
      scan_id: context.scanId,
      lookback_window: context.lookbackWindow,
    },
  };
  // Cast to satisfy the dynamic-keyed mapped portion of RelationshipMetadataDoc.
  (doc as Record<string, unknown>)[`entity.relationships.${relType}.target`] = target;

  const username = parseUsername(record.entityId);
  if (username) {
    doc['related.user'] = [username];
  }
  const hostName = parseHostName(target);
  if (hostName) {
    doc['related.hosts'] = [hostName];
  }
  return doc;
}

export interface WriteRelationshipMetadatasResult {
  docsAttempted: number;
  docsApplied: number;
}

export const writeRelationshipMetadatas = async (
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: EntityRelationshipRecord[],
  context: WriteRelationshipMetadataContext
): Promise<WriteRelationshipMetadatasResult> => {
  if (records.length === 0) return { docsAttempted: 0, docsApplied: 0 };

  const validRecords = records.filter(
    (r): r is EntityRelationshipRecord & { entityId: string } => r.entityId !== null
  );
  const docs: RelationshipMetadataDoc[] = [];
  for (const record of validRecords) {
    for (const [relType, targets] of Object.entries(record.relationships)) {
      for (const target of targets) {
        docs.push(buildRelationshipMetadata(record, relType, target, context));
      }
    }
  }

  if (docs.length === 0) return { docsAttempted: 0, docsApplied: 0 };

  const failures = await crudClient.bulkAppendRelationshipMetadata(docs);
  const docsApplied = docs.length - failures.length;

  if (failures.length > 0) {
    logger.error(
      `Failed to append ${failures.length} of ${
        docs.length
      } relationship metadata: ${JSON.stringify(failures)}`
    );
  } else {
    logger.info(`Appended ${docs.length} relationship metadata to metadata datastream`);
  }

  return { docsAttempted: docs.length, docsApplied };
};
