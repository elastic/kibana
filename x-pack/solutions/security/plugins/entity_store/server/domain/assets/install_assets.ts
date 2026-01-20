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
import { getLatestEntitiesIndexName } from './latest_index';
import {
  getComponentTemplateName,
  getEntityDefinitionComponentTemplate,
} from './component_templates';

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
    logger.debug(`installed component template for: ${type}`);

    await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(definition));
    logger.debug(`installed index template for: ${type}`);

    await createIndex(esClient, getLatestEntitiesIndexName(definition.type, namespace));
    logger.debug(`created latest entity index for: ${type}`);
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

    await deleteIndexTemplate(esClient, getLatestIndexTemplateId(definition));
    logger.debug(`deleted entity index template: ${type}`);

    await deleteComponentTemplate(esClient, getComponentTemplateName(definition.id));
    logger.debug(`deleted entity index component template: ${type}`);
  } catch (error) {
    logger.error(`error uninstalling assets for ${type}: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}
