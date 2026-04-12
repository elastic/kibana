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

interface SharedElasticsearchAssetOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

/**
 * Installs all shared Elasticsearch assets that must exist before any index is created:
 * ingest pipeline, component templates (for ALL entity types), and index templates.
 */
export async function installSharedElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    await installLatestIndexIngestPipeline(esClient, namespace, logger);
    await installAllComponentTemplates(esClient, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error installing shared assets in ${namespace}: ${error}`);
    throw error;
  }
}

/**
 * Ensures `entities-latest-<namespace>` is a read alias on the versioned latest index.
 *
 * `indices.create` already requests this alias, but:
 * - If the concrete latest index already existed (`throwIfExists: false`), create is a no-op and the alias may never be attached.
 * - If a stray *index* was created with the same name as the intended alias, the alias cannot be added until that index is removed.
 */
export async function ensureLatestEntitiesReadAlias(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> {
  const concreteIndex = getLatestEntitiesIndexName(namespace);
  const aliasName = getEntitiesAlias(ENTITY_LATEST, namespace);

  const nameResolution = await esClient.indices
    .get({ index: aliasName }, { ignore: [404] })
    .catch(() => undefined);

  if (nameResolution && nameResolution[aliasName]) {
    throw new Error(
      `Entity Store: "${aliasName}" exists as a concrete Elasticsearch index. It must be an alias ` +
        `for "${concreteIndex}". Remove or rename that index (after confirming it has no required data), then reinstall the entity store.`
    );
  }

  const concreteExists = await esClient.indices.exists({ index: concreteIndex });
  if (!concreteExists) {
    logger.debug(
      `Skipping latest read-alias reconciliation: concrete index "${concreteIndex}" does not exist yet.`
    );
    return;
  }

  const aliasDefinition = await esClient.indices
    .getAlias({ name: aliasName }, { ignore: [404] })
    .catch(() => undefined);

  const aliasAlreadyPointsHere = Boolean(
    aliasDefinition && aliasDefinition[concreteIndex]?.aliases?.[aliasName]
  );

  if (aliasAlreadyPointsHere) {
    logger.debug(`Latest read alias "${aliasName}" already points to "${concreteIndex}".`);
    return;
  }

  if (aliasDefinition && Object.keys(aliasDefinition).length > 0) {
    const otherIndices = Object.keys(aliasDefinition).filter((idx) => idx !== concreteIndex);
    if (otherIndices.length > 0) {
      throw new Error(
        `Entity Store: read alias "${aliasName}" already exists on unexpected index(s): ${otherIndices.join(
          ', '
        )}. Remove conflicting alias assignments before reinstalling.`
      );
    }
  }

  logger.info(`Ensuring read alias "${aliasName}" -> "${concreteIndex}" (write index).`);
  await esClient.indices.updateAliases({
    actions: [{ add: { index: concreteIndex, alias: aliasName, is_write_index: true } }],
  });
}

/**
 * Creates the latest index and updates data stream.
 * Must be called AFTER installSharedElasticsearchAssets to avoid partial mappings.
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
      await ensureLatestEntitiesReadAlias(esClient, namespace, logger);
    })(),

    (async () => {
      await createDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace), {
        throwIfExists: false,
      });
      logger.debug(`created updates entity data stream in ${namespace}`);
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
  ]);
}

async function installAllComponentTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const definitions = ALL_ENTITY_TYPES.map((type) => getEntityDefinition(type, namespace));
  await Promise.all(
    definitions.flatMap((definition) => [
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
    ])
  );
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
  ]);
}
