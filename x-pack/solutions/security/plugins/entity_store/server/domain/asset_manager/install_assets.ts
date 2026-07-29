/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  putComponentTemplate,
  putIndexTemplate,
  createIndex,
  deleteIndex,
  createDataStream,
  deleteDataStream,
} from '../../infra/elasticsearch';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';
import {
  getLatestEntitiesIndexName,
  getEntitiesAlias,
  ENTITY_LATEST,
} from '../../../common/domain/entity_index';
import {
  getEntityDefinitionComponentTemplate,
  getUpdatesEntityDefinitionComponentTemplate,
} from './component_templates';
import { getHistorySnapshotIndexTemplateConfig } from './history_snapshot_index_template';
import { getUpdatesEntityIndexTemplateConfig } from './updates_index_template';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { installLatestIndexIngestPipeline } from './latest_index_ingest_pipeline';
import { getMetadataComponentTemplate } from './metadata_component_templates';
import { getMetadataEntityIndexTemplateConfig } from './metadata_index_template';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';
import { installMetadataIndexIngestPipeline } from './metadata_index_ingest_pipeline';

interface SharedElasticsearchAssetOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

/**
 * Installs all shared Elasticsearch assets and storage that must exist before per-entity
 * initialization begins: ingest pipeline, component templates (for ALL entity types),
 * index templates, the latest index, and the updates data stream.
 */
export async function installSharedElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    await installLatestIndexIngestPipeline(esClient, namespace, logger);
    await installMetadataIndexIngestPipeline(esClient, namespace, logger);
    await installAllComponentTemplates(esClient, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);
    await installIndicesAndDataStreams(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error installing shared assets in ${namespace}: ${error}`);
    throw error;
  }
}

/**
 * Creates the latest index and updates data stream after the required templates are installed.
 */
export async function installIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await createIndex(esClient, getLatestEntitiesIndexName(namespace), {
        throwIfExists: false,
        aliases: { [getEntitiesAlias(ENTITY_LATEST, namespace)]: {} },
      });
      logger.debug(`created latest entity index in ${namespace}`);
    })(),

    (async () => {
      await createDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace), {
        throwIfExists: false,
      });
      logger.debug(`created updates entity data stream in ${namespace}`);
    })(),

    (async () => {
      await createDataStream(esClient, getMetadataEntitiesDataStreamName(namespace), {
        throwIfExists: false,
      });
      logger.debug(`created metadata entity data stream in ${namespace}`);
    })(),
  ]);
}

async function installIndexTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(namespace));
      logger.debug(`installed latest index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getUpdatesEntityIndexTemplateConfig(namespace));
      logger.debug(`installed updates index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getHistorySnapshotIndexTemplateConfig(namespace));
      logger.debug(`installed history snapshot index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getMetadataEntityIndexTemplateConfig(namespace));
      logger.debug(`installed metadata index template in ${namespace}`);
    })(),
  ]);
}

async function installAllComponentTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const definitions = ALL_ENTITY_TYPES.map((type) => getEntityDefinition(type, namespace));
  await Promise.all([
    ...definitions.flatMap((definition) => [
      (async () => {
        await putComponentTemplate(
          esClient,
          getEntityDefinitionComponentTemplate(definition, namespace)
        );
        logger.debug(`installed latest component template for: ${definition.type} in ${namespace}`);
      })(),
      (async () => {
        await putComponentTemplate(
          esClient,
          getUpdatesEntityDefinitionComponentTemplate(definition, namespace)
        );
        logger.debug(
          `installed updates component template for: ${definition.type} in ${namespace}`
        );
      })(),
    ]),
    (async () => {
      await putComponentTemplate(esClient, getMetadataComponentTemplate(namespace));
      logger.debug(`installed metadata component template in ${namespace}`);
    })(),
  ]);
}

// TODO: add retry
export async function uninstallElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    // Only delete indices and data streams.
    // Component templates, index templates, and ingest pipeline are kept intentionally
    // so they are always available for future installs, avoiding mapping race conditions.
    await uninstallIndicesAndDataStreams(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error uninstalling assets: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}

async function uninstallIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await deleteIndex(esClient, getLatestEntitiesIndexName(namespace));
      logger.debug(`deleted entity index`);
    })(),
    (async () => {
      await deleteDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace));
      logger.debug(`deleted entity updates data stream`);
    })(),
    (async () => {
      await deleteDataStream(esClient, getMetadataEntitiesDataStreamName(namespace));
      logger.debug(`deleted entity metadata data stream`);
    })(),
  ]);
}

const INDEX_NOT_FOUND_ERR_TYPE = 'index_not_found_exception';
const VERIFICATION_EXCEPTION_ERR_TYPE = 'verification_exception';

interface EsErrorCause {
  type?: string;
  reason?: string;
}

interface EsErrorLike {
  message?: string;
  meta?: { body?: { error?: { type?: string; root_cause?: EsErrorCause[] } } };
}

/**
 * Returns true when the error is about a missing index. Handles two cases:
 * - Direct ES errors: top-level or root_cause type is `index_not_found_exception`.
 * - ESQL errors: `verification_exception` with "Unknown index" in the root_cause reason
 *   (how ESQL reports a missing index referenced in a query).
 */
export const isIndexNotFoundError = (error: unknown): boolean => {
  const esError = (error as EsErrorLike)?.meta?.body?.error;
  if (esError?.type === INDEX_NOT_FOUND_ERR_TYPE) {
    return true;
  }
  if (
    esError?.root_cause?.some(
      (cause) =>
        cause?.type === INDEX_NOT_FOUND_ERR_TYPE ||
        (cause?.type === VERIFICATION_EXCEPTION_ERR_TYPE &&
          cause?.reason?.includes('Unknown index'))
    )
  ) {
    return true;
  }
  const message = (error as EsErrorLike)?.message;
  return message?.includes(INDEX_NOT_FOUND_ERR_TYPE) ?? false;
};

const dataStreamExists = async (esClient: ElasticsearchClient, name: string): Promise<boolean> => {
  try {
    const response = await esClient.indices.getDataStream({ name });
    return (response.data_streams?.length ?? 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Checks whether the shared index and data streams exist and recreates any that are missing.
 * Returns true if anything was recreated, false if all were already present.
 *
 * Callers use the return value to distinguish a missing entity store index (heal + retry) from a
 * missing source log index (let the error propagate). Safe to call from parallel extraction tasks —
 * the underlying creates use `throwIfExists: false`.
 */
export async function reinstallSharedElasticsearchAssetsIfMissing({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<boolean> {
  const latestIndex = getLatestEntitiesIndexName(namespace);
  const updatesDataStream = getUpdatesEntitiesDataStreamName(namespace);
  const metadataDataStream = getMetadataEntitiesDataStreamName(namespace);

  const [latestExists, updatesExists, metadataExists] = await Promise.all([
    esClient.indices.exists({ index: latestIndex }),
    dataStreamExists(esClient, updatesDataStream),
    dataStreamExists(esClient, metadataDataStream),
  ]);

  if (latestExists && updatesExists && metadataExists) {
    return false;
  }

  const missing = [
    !latestExists && latestIndex,
    !updatesExists && updatesDataStream,
    !metadataExists && metadataDataStream,
  ].filter(Boolean);
  logger.warn(`Recreating missing entity store assets in ${namespace}: ${missing.join(', ')}`);

  await installSharedElasticsearchAssets({ esClient, logger, namespace });
  return true;
}
