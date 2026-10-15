/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsClient, ScoutLogger } from '@kbn/scout-security';
import { tags } from '@kbn/scout-security';
import { ALERT_ENTITY_ID } from '../../../../../../common/field_maps/field_names';
import {
  pollBackfill,
  resolveTargetIndices,
  type BackfillProgress,
  type TargetIndices,
} from '../../../../../../server/lib/entity_analytics/migrations/backfill_alert_entity_id/backfill_client';

export const BACKFILL_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

export const ALERTS_INDEX = '.alerts-security.alerts-default';

/** A purpose-built alias, so tests control the mapping, document count and write blocks. */
export const ALIAS = 'backfill-client-test';
export const MAPPED_INDEX = `${ALIAS}-000001`;
export const UNMAPPED_INDEX = `${ALIAS}-000002`;
export const WRONG_TYPE_INDEX = `${ALIAS}-000003`;

/** Wide enough that every seeded alert falls inside it. */
export const WINDOW = { start: '2020-01-01T00:00:00.000Z', end: '2030-01-01T00:00:00.000Z' };

export const SIGNAL = new AbortController().signal;

/** Identity fields only, so a host EUID can be derived and the field can be stamped. */
export const TEST_INDEX_PROPERTIES = {
  '@timestamp': { type: 'date' as const },
  'host.name': { type: 'keyword' as const },
  [ALERT_ENTITY_ID]: { type: 'keyword' as const },
};

/**
 * The backfill client takes a Kibana `Logger`; Scout provides a `ToolingLog`. Only the four level
 * methods are ever called, so the rest satisfy the type.
 */
export const asKibanaLogger = (log: ScoutLogger): Logger =>
  ({
    debug: (message: string) => log.debug(message),
    info: (message: string) => log.info(message),
    warn: (message: string) => log.warning(message),
    error: (message: string) => log.error(message),
    trace: () => {},
    fatal: () => {},
    log: () => {},
    get: () => asKibanaLogger(log),
    isLevelEnabled: () => true,
  } as unknown as Logger);

export const createTestIndices = async (esClient: EsClient) => {
  await esClient.indices.create({
    index: MAPPED_INDEX,
    mappings: { dynamic: false, properties: TEST_INDEX_PROPERTIES },
    aliases: { [ALIAS]: {} },
  });
  // Same shape without the stamped field. Alerts indices are `dynamic: false`, so a write here
  // would succeed and then be invisible to scoring — the task has to exclude it.
  await esClient.indices.create({
    index: UNMAPPED_INDEX,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': TEST_INDEX_PROPERTIES['@timestamp'],
        'host.name': TEST_INDEX_PROPERTIES['host.name'],
      },
    },
    aliases: { [ALIAS]: {} },
  });
};

/**
 * An index that maps the field, but as a `long`, so every write to it fails.
 */
export const createWrongTypeIndex = async (esClient: EsClient) => {
  await esClient.indices.create({
    index: WRONG_TYPE_INDEX,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': TEST_INDEX_PROPERTIES['@timestamp'],
        'host.name': TEST_INDEX_PROPERTIES['host.name'],
        [ALERT_ENTITY_ID]: { type: 'long' },
      },
    },
    aliases: { [ALIAS]: {} },
  });
};

export const deleteTestIndices = async (esClient: EsClient) => {
  // Named rather than a wildcard: clusters run with `action.destructive_requires_name`.
  // `ignore_unavailable` because only some tests create the wrong-type index, and without it one
  // missing member makes Elasticsearch reject the whole request and delete nothing.
  await esClient.indices.delete({
    index: [MAPPED_INDEX, UNMAPPED_INDEX, WRONG_TYPE_INDEX],
    ignore_unavailable: true,
  });
};

export const seedDocuments = async (
  esClient: EsClient,
  index: string,
  documents: Array<Record<string, unknown>>
) => {
  await esClient.bulk({
    index,
    refresh: true,
    operations: documents.flatMap((document) => [
      { create: {} },
      { '@timestamp': new Date().toISOString(), ...document },
    ]),
  });
};

export const seedHosts = (esClient: EsClient, index: string, count: number) =>
  seedDocuments(
    esClient,
    index,
    Array.from({ length: count }, (_, i) => ({ 'host.name': `host-${i}` }))
  );

/** Indices the backfill can write, with the suite abort signal already applied. */
export const getBackfillTargets = (
  esClient: EsClient,
  logger: Logger,
  alertsIndex: string
): Promise<TargetIndices> =>
  resolveTargetIndices({ esClient, logger, alertsIndex, signal: SIGNAL });

/** One read of an update-by-query task, including a task id that no longer exists. */
export const readBackfillProgress = (
  esClient: EsClient,
  logger: Logger,
  esTaskId: string
): Promise<BackfillProgress> => pollBackfill({ esClient, logger, esTaskId, signal: SIGNAL });

/** Polls until the request finishes, so assertions see a settled task rather than a racing one. */
export const pollUntilComplete = async (
  esClient: EsClient,
  logger: Logger,
  esTaskId: string,
  attempts = 60
) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const progress = await readBackfillProgress(esClient, logger, esTaskId);
    if (progress.completed || progress.vanished) {
      return progress;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Update-by-query ${esTaskId} did not finish in time`);
};
