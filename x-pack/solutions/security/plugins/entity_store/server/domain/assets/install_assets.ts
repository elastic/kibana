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
  deleteIndexTemplate,
  deleteComponentTemplate,
} from '../../infra/elasticsearch';
import type { ManagedEntityDefinition } from '../definitions/entity_schema';
import {
  getLatestEntityIndexTemplateConfig,
  getLatestIndexTemplateId,
} from './latest_index_template';
import { getLatestEntitiesIndexName, getResetEntitiesIndexName } from './latest_index';
import {
  getComponentTemplateName,
  getEntityDefinitionComponentTemplate,
  getResetComponentTemplateName,
  getResetEntityDefinitionComponentTemplate,
} from './component_templates';
import { getResetEntityIndexTemplateConfig, getResetIndexTemplateId } from './reset_index_template';

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
    await putComponentTemplate(esClient, getEntityDefinitionComponentTemplate(definition));
    logger.debug(`installed latest component template for: ${type}`);

    await putComponentTemplate(esClient, getResetEntityDefinitionComponentTemplate(definition));
    logger.debug(`installed reset component template for: ${type}`);

    await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(definition));
    logger.debug(`installed latest index template for: ${type}`);

    await putIndexTemplate(esClient, getResetEntityIndexTemplateConfig(definition));
    logger.debug(`installed reset index template for: ${type}`);

    await createIndex(esClient, getLatestEntitiesIndexName(definition.type, namespace));
    logger.debug(`created latest entity index for: ${type}`);

    await createIndex(esClient, getResetEntitiesIndexName(definition.type, namespace));
    logger.debug(`created reset entity index for: ${type}`);
  } catch (error) {
    logger.error(`error installing assets for ${type}: ${error}`);

    // TODO: We need to uninstall everything, as currently we are in a partial state
    throw error;
  }
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
    await deleteIndex(esClient, getLatestEntitiesIndexName(definition.type, namespace));
    logger.debug(`deleted entity index: ${type}`);

    await deleteIndex(esClient, getResetEntitiesIndexName(definition.type, namespace));
    logger.debug(`deleted entity reset index: ${type}`);

    await deleteIndexTemplate(esClient, getLatestIndexTemplateId(definition));
    logger.debug(`deleted entity index template: ${type}`);

    await deleteIndexTemplate(esClient, getResetIndexTemplateId(definition));
    logger.debug(`deleted entity reset index template: ${type}`);

    await deleteComponentTemplate(esClient, getComponentTemplateName(definition.id));
    logger.debug(`deleted entity index component template: ${type}`);

    await deleteComponentTemplate(esClient, getResetComponentTemplateName(definition.id));
    logger.debug(`deleted entity index reset component template: ${type}`);
  } catch (error) {
    logger.error(`error uninstalling assets for ${type}: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}
