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
  deleteIndexTemplate,
  deleteComponentTemplate,
} from '../../infra/elasticsearch';
import type {
  EntityDefinition,
  ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import {
  getLatestEntityIndexTemplateConfig,
  getLatestIndexTemplateId,
} from './latest_index_template';
import { getLatestEntitiesIndexName } from './latest_index';
import {
  getComponentTemplateName,
  getEntityDefinitionComponentTemplate,
  getUpdatesComponentTemplateName,
  getUpdatesEntityDefinitionComponentTemplate,
} from './component_templates';
import {
  getUpdatesEntityIndexTemplateConfig,
  getUpdatesIndexTemplateId,
} from './updates_index_template';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';

interface ElasticsearchAssetOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  definition: ManagedEntityDefinition;
  namespace: string;
}

export async function installElasticsearchAssets({
  esClient,
  logger,
  definition,
  namespace,
}: ElasticsearchAssetOptions): Promise<void> {
  try {
    await installComponentTemplates(esClient, definition, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);
    await installIndicesAndDataStreams(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error installing assets for ${definition.type} in ${namespace}: ${error}`);

    // TODO: We need toninstall everything, as currently we are in a partial state
    throw error;
  }
}

async function installIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await createIndex(esClient, getLatestEntitiesIndexName(namespace), { throwIfExists: false });
      logger.debug(`created latest entity index in ${namespace}`);
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
  ]);
}

async function installComponentTemplates(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
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
      logger.debug(`installed updates component template for: ${definition.type} in ${namespace}`);
    })(),
  ]);
}

// TODO: add retry
export async function uninstallElasticsearchAssets({
  esClient,
  logger,
  definition,
  namespace,
}: ElasticsearchAssetOptions): Promise<void> {
  try {
    await uninstallIndicesAndDataStreams(esClient, namespace, logger);
    await uninstallIndexTemplates(esClient, namespace, logger);
    await uninstallComponentTemplates(esClient, definition, namespace, logger);
  } catch (error) {
    logger.error(`error uninstalling assets: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}

async function uninstallComponentTemplates(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await deleteComponentTemplate(esClient, getComponentTemplateName(definition.type, namespace));
      logger.debug(`deleted entity index component template`);
    })(),
    (async () => {
      await deleteComponentTemplate(
        esClient,
        getUpdatesComponentTemplateName(definition.type, namespace)
      );
      logger.debug(`deleted entity index updates component template`);
    })(),
  ]);
}

async function uninstallIndexTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await deleteIndexTemplate(esClient, getLatestIndexTemplateId(namespace));
      logger.debug(`deleted entity index template`);
    })(),
    (async () => {
      await deleteIndexTemplate(esClient, getUpdatesIndexTemplateId(namespace));
      logger.debug(`deleted entity updates index template`);
    })(),
  ]);
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
