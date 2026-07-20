/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  putComponentTemplate,
  putDataStreamMapping,
  rolloverDataStream,
} from '../../infra/elasticsearch';
import {
  getMetadataComponentTemplate,
  getMetadataIndexMappings,
} from './metadata_component_templates';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';

// Minimal shape of the errors surfaced by the ES client. Mirrors the detection
// style used elsewhere in infra/elasticsearch (e.g. createIndex/createDataStream).
interface EsErrorLike {
  statusCode?: number;
  meta?: {
    statusCode?: number;
    body?: { error?: { type?: string } };
  };
}

const errorType = (error: unknown): string | undefined =>
  (error as EsErrorLike)?.meta?.body?.error?.type;

const isIndexNotFound = (error: unknown): boolean => {
  const err = error as EsErrorLike;
  return (
    errorType(error) === 'index_not_found_exception' ||
    err?.meta?.statusCode === 404 ||
    err?.statusCode === 404
  );
};

// Elasticsearch reports an in-place mapping change that conflicts with an existing
// (often dynamically inferred) field type as an illegal_argument_exception.
const isMappingConflict = (error: unknown): boolean =>
  errorType(error) === 'illegal_argument_exception';

/**
 * Brings an already-installed metadata data stream up to date with the current
 * component-template mappings.
 *
 * Why this exists: the shared ES assets are installed only during a fresh
 * `AssetManagerClient.init()` (the install flow short-circuits when the store is
 * already installed, and nothing re-runs it on plugin start). Updating a
 * component template only affects FUTURE backing indices, so on upgrade of an
 * existing deployment the new fields never reach the current write index. This
 * closes that gap for the metadata data stream.
 *
 * Strategy (additive fields):
 *  - Re-PUT the component template (idempotent) so future rollovers use the
 *    correct types.
 *  - PUT the mappings in place on the existing data stream — no rollover needed
 *    in the common case. `getMetadataIndexMappings()` includes `dynamic_templates`;
 *    PUT `_mapping` replaces that list wholesale, but it is the identical list, so
 *    this is a no-op for dynamic templates.
 *  - If the in-place update conflicts (a field was dynamically mapped with a
 *    different type during the pre-sync window), roll the data stream over so the
 *    NEW backing index picks up the correct types. The OLD backing index keeps the
 *    field with its mistyped (not missing) mapping — accepted, since it only
 *    affects docs written in that narrow window.
 */
export const ensureMetadataDataStreamMappings = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  await putComponentTemplate(esClient, getMetadataComponentTemplate(namespace));

  const dataStream = getMetadataEntitiesDataStreamName(namespace);

  try {
    await putDataStreamMapping(esClient, dataStream, getMetadataIndexMappings());
    logger.debug(`Synced metadata data stream mappings for namespace ${namespace}`);
  } catch (error) {
    if (isIndexNotFound(error)) {
      // Fresh-install path creates the data stream from the template already.
      logger.debug(`Metadata data stream absent in ${namespace}; nothing to sync in place`);
      return;
    }
    if (isMappingConflict(error)) {
      logger.info(
        `In-place metadata mapping update conflicted for ${dataStream}; rolling over so a new backing index applies the current mappings`
      );
      await rolloverDataStream(esClient, dataStream);
      return;
    }
    throw error;
  }
};

// Process-wide guard so the sync runs at most once per namespace per Kibana
// process. The metadata client is constructed per request, so this cannot live
// on the client instance.
const ensuredNamespaces = new Set<string>();

/**
 * Runs {@link ensureMetadataDataStreamMappings} at most once per namespace per
 * process. Best-effort: a failure is logged but never thrown, because a metadata
 * write must not fail on account of a mapping sync (writes still succeed via
 * dynamic mapping). A failed attempt is not cached, so the next write retries.
 */
export const ensureMetadataDataStreamMappingsOnce = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  if (ensuredNamespaces.has(namespace)) {
    return;
  }
  try {
    await ensureMetadataDataStreamMappings(esClient, namespace, logger);
    ensuredNamespaces.add(namespace);
  } catch (error) {
    logger.warn(
      `Failed to sync metadata data stream mappings for namespace ${namespace}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// Test-only: clears the process-wide guard so cases start from a clean slate.
export const resetEnsuredMetadataNamespaces = (): void => {
  ensuredNamespaces.clear();
};
