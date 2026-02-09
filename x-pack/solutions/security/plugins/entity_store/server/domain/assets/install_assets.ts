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
import type { ManagedEntityDefinition } from '../definitions/entity_schema';
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
  const { type } = definition;
  try {
    await installComponentTemplates(esClient, definition, logger, type);
    await installIndexTemplates(esClient, definition, logger, type);
    await installIndicesAndDataStreams(esClient, definition, namespace, logger, type);
  } catch (error) {
    logger.error(`error installing assets for ${type}: ${error}`);

    // TODO: We need to uninstall everything, as currently we are in a partial state
    throw error;
  }
}

async function installIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  namespace: string,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await createIndex(esClient, getLatestEntitiesIndexName(definition.type, namespace));
      logger.debug(`created latest entity index for: ${type}`);
    })(),

    (async () => {
      await createDataStream(
        esClient,
        getUpdatesEntitiesDataStreamName(definition.type, namespace)
      );
      logger.debug(`created updates entity data stream for: ${type}`);
    })(),
  ]);
}

async function installIndexTemplates(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(definition));
      logger.debug(`installed latest index template for: ${type}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getUpdatesEntityIndexTemplateConfig(definition));
      logger.debug(`installed updates index template for: ${type}`);
    })(),
  ]);
}

async function installComponentTemplates(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await putComponentTemplate(esClient, getEntityDefinitionComponentTemplate(definition));
      logger.debug(`installed latest component template for: ${type}`);
    })(),

    (async () => {
      await putComponentTemplate(esClient, getUpdatesEntityDefinitionComponentTemplate(definition));
      logger.debug(`installed updates component template for: ${type}`);
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
  const { type } = definition;
  try {
    await uninstallIndicesAndDataStreams(esClient, definition, namespace, logger, type);
    await uninstallIndexTemplates(esClient, definition, logger, type);
    await uninstallComponentTemplates(esClient, definition, logger, type);
  } catch (error) {
    logger.error(`error uninstalling assets for ${type}: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}

async function uninstallComponentTemplates(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await deleteComponentTemplate(esClient, getComponentTemplateName(definition.id));
      logger.debug(`deleted entity index component template: ${type}`);
    })(),
    (async () => {
      await deleteComponentTemplate(esClient, getUpdatesComponentTemplateName(definition.id));
      logger.debug(`deleted entity index updates component template: ${type}`);
    })(),
  ]);
}

async function uninstallIndexTemplates(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await deleteIndexTemplate(esClient, getLatestIndexTemplateId(definition));
      logger.debug(`deleted entity index template: ${type}`);
    })(),
    (async () => {
      await deleteIndexTemplate(esClient, getUpdatesIndexTemplateId(definition));
      logger.debug(`deleted entity updates index template: ${type}`);
    })(),
  ]);
}

async function uninstallIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  definition: ManagedEntityDefinition,
  namespace: string,
  logger: Logger,
  type: string
) {
  await Promise.all([
    (async () => {
      await deleteIndex(esClient, getLatestEntitiesIndexName(definition.type, namespace));
      logger.debug(`deleted entity index: ${type}`);
    })(),
    (async () => {
      await deleteDataStream(
        esClient,
        getUpdatesEntitiesDataStreamName(definition.type, namespace)
      );
      logger.debug(`deleted entity updates data stream: ${type}`);
    })(),
  ]);
}
