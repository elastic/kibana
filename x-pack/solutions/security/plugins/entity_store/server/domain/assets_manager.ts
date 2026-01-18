/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  createIndex,
  deleteIndex,
  putComponentTemplate,
  deleteComponentTemplate,
  createIndexTemplate,
  deleteIndexTemplate,
} from '../infra/elasticsearch';
import type { EntityType } from './definitions/registry';
import { getEntityDefinition } from './definitions/registry';
import {
  entitiesEntityComponentTemplateConfig,
  entitiesEventComponentTemplateConfig,
  entitiesLatestBaseComponentTemplateConfig,
} from './assets/component_templates';
import {
  generateEntitiesLatestIndexTemplateConfig,
  generateLatestIndexTemplateId,
} from './assets/entities_latest_index_template';
import {
  generateIndexMappings,
  getLatestEntitiesIndexName,
} from './assets/indices/entities_latest';
import type { EntityDefinition, ManagedEntity } from './definitions/entity_schema';

export class AssetsManager {
  constructor(private logger: Logger, private esClient: ElasticsearchClient) {
    this.logger = logger.get('client');
  }

  public async install(type: EntityType): Promise<EntityDefinition> {
    const definition = getEntityDefinition({ type });

    await this.installElasticsearchAssets(definition, 'default');
    this.logger.debug(`Installed definition: ${type}`);

    // startTasks(type);

    return definition; // TODO: persist with saved objects
  }

  public async uninstall(type: EntityType) {
    const definition = getEntityDefinition({ type });

    await this.uninstallElasticsearchAssets(definition, 'default');
    this.logger.debug(`Uninstalled definition: ${type}`);

    // removeTasks(type);
  }

  private async installElasticsearchAssets(definition: ManagedEntity, namespace: string) {
    const { type } = definition;
    try {
      // TODO: create ILM policies

      await createIndexTemplate({
        esClient: this.esClient,
        template: generateEntitiesLatestIndexTemplateConfig(definition),
      });
      this.logger.debug(`installed index template for: ${type}`);

      await putComponentTemplate({
        esClient: this.esClient,
        request: {
          name: getComponentTemplateName(definition.id),
          template: { settings: { hidden: true }, mappings: generateIndexMappings(definition) },
        },
      });
      this.logger.debug(`installed component template for: ${type}`);

      await createIndex({
        esClient: this.esClient,
        index: getLatestEntitiesIndexName(definition.type, namespace),
      });
      this.logger.debug(`created entity index for: ${type}`);
    } catch (error) {
      this.logger.error(`Error installing Elasticsearch assets for ${type}: ${error}`);

      // TODO: uninstall
      throw error;
    }
  }

  // TODO: add retry
  private async uninstallElasticsearchAssets(definition: ManagedEntity, namespace: string) {
    const { type } = definition;
    try {
      await deleteIndex({
        esClient: this.esClient,
        index: getLatestEntitiesIndexName(definition.type, namespace),
      });
      this.logger.debug(`Deleted entity index: ${type}`);

      await deleteComponentTemplate({
        esClient: this.esClient,
        name: getComponentTemplateName(definition.id),
      });
      this.logger.debug(`Deleted entity index component template: ${type}`);

      await deleteIndexTemplate({
        esClient: this.esClient,
        name: generateLatestIndexTemplateId(definition),
      });
      this.logger.debug(`Deleted entity index template: ${type}`);
    } catch (error) {
      this.logger.error(`Error uninstalling Elasticsearch assets for ${type}: ${error}`);
      // TODO: degrade status?
      throw error;
    }
  }
}

export const getComponentTemplateName = (definitionId: string) => `${definitionId}-latest@platform`;

export const installComponentTemplates = async ({ esClient }: { esClient: ElasticsearchClient }) =>
  Promise.all([
    // TODO: removeIlmInServerless
    putComponentTemplate({
      esClient,
      request: entitiesLatestBaseComponentTemplateConfig,
    }),
    putComponentTemplate({
      esClient,
      request: entitiesEventComponentTemplateConfig,
    }),
    putComponentTemplate({
      esClient,
      request: entitiesEntityComponentTemplateConfig,
    }),
  ]);
