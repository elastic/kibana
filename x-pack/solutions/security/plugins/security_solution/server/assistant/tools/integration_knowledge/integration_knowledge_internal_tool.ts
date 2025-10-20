/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Schema for the integration knowledge tool parameters
const integrationKnowledgeToolSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe(
      'Key terms to retrieve Fleet-installed integration knowledge for, like specific integration names, configuration questions, or data ingestion topics.'
    ),
});

const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';

export const INTEGRATION_KNOWLEDGE_INTERNAL_TOOL_ID = 'core.security.integration_knowledge';
export const INTEGRATION_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION =
  'Call this for knowledge from Fleet-installed integrations, which contains information on how to configure and use integrations for data ingestion.';

/**
 * Returns a tool for querying integration knowledge using the InternalToolDefinition pattern.
 */
export const integrationKnowledgeInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof integrationKnowledgeToolSchema> => {
  return {
    id: INTEGRATION_KNOWLEDGE_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: INTEGRATION_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION,
    schema: integrationKnowledgeToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'],
        promptId: 'IntegrationKnowledgeTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ question }, context) => {
      try {
        // Check if the .integration_knowledge index exists before proceeding
        // This has to be done with `.search` since `.exists` and `.get` can't be performed
        // with the internal system user (lack of permissions)
        try {
          await context.esClient.asCurrentUser.search({
            index: INTEGRATION_KNOWLEDGE_INDEX,
            size: 0,
          });
        } catch (error) {
          // If there's an error checking the index, assume it doesn't exist
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  error:
                    'Integration knowledge base is not available. The .integration_knowledge index does not exist.',
                },
              },
            ],
          };
        }

        // Search the .integration_knowledge index using semantic search on the content field
        const response = await context.esClient.asCurrentUser.search({
          index: INTEGRATION_KNOWLEDGE_INDEX,
          size: 10,
          query: {
            semantic: {
              field: 'content',
              query: question,
            },
          },
          _source: ['package_name', 'filename', 'content', 'version'],
        });

        const citedDocs = response.hits.hits.map((hit) => {
          const source = hit._source as {
            package_name: string;
            filename: string;
            content: string;
            version?: string;
          };

          return {
            id: hit._id,
            package_name: source.package_name,
            package_version: source.version,
            filename: source.filename,
            content: source.content,
          };
        });

        // Limit the result size to prevent token overflow
        const result = JSON.stringify(citedDocs).substring(0, 20000);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                documents: JSON.parse(result),
                question,
                totalHits: response.hits.total,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error('Error in integration knowledge tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error querying integration knowledge: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }. The integration knowledge base may not be available.`,
              },
            },
          ],
        };
      }
    },
    tags: ['integration', 'knowledge-base', 'fleet'],
  };
};
