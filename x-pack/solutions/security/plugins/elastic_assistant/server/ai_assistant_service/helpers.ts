/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { DeleteByQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import type { Logger } from '@kbn/logging';
import { getResourceName } from '.';
import { GetElser } from '../types';

/**
 * Creates a function that returns the ELSER model ID
 *
 * @param ml
 */
export const createGetElserId =
  (trainedModelsProvider: MlPluginSetup['trainedModelsProvider']): GetElser =>
  async () =>
    // Force check to happen as internal user
    (await trainedModelsProvider({} as KibanaRequest, {} as SavedObjectsClientContract).getELSER())
      .model_id;

export const removeLegacyQuickPrompt = async (esClient: ElasticsearchClient) => {
  try {
    const deleteQuery: DeleteByQueryRequest = {
      index: `${getResourceName('prompts')}-*`,
      query: {
        bool: {
          must: [
            {
              term: {
                name: ESQL_QUERY_GENERATION_TITLE,
              },
            },
            {
              term: {
                prompt_type: 'quick',
              },
            },
            {
              term: {
                is_default: true,
              },
            },
          ],
        },
      },
    };
    return esClient.deleteByQuery(deleteQuery);
  } catch (e) {
    // swallow any errors
    return {
      total: 0,
    };
  }
};

const ESQL_QUERY_GENERATION_TITLE = i18n.translate(
  'xpack.elasticAssistantPlugin.assistant.quickPrompts.esqlQueryGenerationTitle',
  {
    defaultMessage: 'ES|QL Query Generation',
  }
);

export const ensureProductDocumentationInstalled = async (
  productDocManager: ProductDocBaseStartContract['management'],
  logger: Logger
) => {
  try {
    const { status } = await productDocManager.getStatus();
    if (status !== 'installed') {
      logger.debug(`Installing product documentation for AIAssistantService`);
      try {
        await productDocManager.install();
        logger.debug(`Successfully installed product documentation for AIAssistantService`);
      } catch (e) {
        logger.warn(`Failed to install product documentation for AIAssistantService: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn(
      `Failed to get status of product documentation installation for AIAssistantService: ${e.message}`
    );
  }
};
