/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';

import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { ContentReference } from '@kbn/elastic-assistant-common';
import { contentReferenceString } from '@kbn/elastic-assistant-common';
import {
  hrefReference,
  knowledgeBaseReference,
} from '@kbn/elastic-assistant-common/impl/content_references/references';
import { Document } from 'langchain/document';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { APP_UI_ID } from '../../../../common';

export type IntegrationKnowledgeToolParams = Require<AssistantToolParams, 'assistantContext'>;

const INTEGRATIONS_BASE_PATH = '/app/integrations/detail';

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description:
    'Call this for knowledge from Fleet-installed integrations, which contains information on how to configure and use integrations for data ingestion.',
  id: 'integration-knowledge-tool',
  name: 'IntegrationKnowledgeTool',
};

const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';

export const INTEGRATION_KNOWLEDGE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is IntegrationKnowledgeToolParams => {
    const { assistantContext } = params;
    return assistantContext != null;
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { assistantContext, contentReferencesStore } = params as IntegrationKnowledgeToolParams;

    // Check if the .integration_knowledge index exists before registering the tool
    // This has to be done with `.search` since `.exists` and `.get` can't be performed
    // with the internal system user (lack of permissions)
    try {
      const indexExists = await assistantContext.core.elasticsearch.client.asInternalUser.search({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        size: 0,
      });
      if (!indexExists) {
        return null;
      }
    } catch (error) {
      // If there's an error checking the index, assume it doesn't exist and don't register the tool
      return null;
    }

    return tool(
      async (input) => {
        try {
          // Search the .integration_knowledge index using semantic search on the content field
          const response = await assistantContext.core.elasticsearch.client.asInternalUser.search({
            index: INTEGRATION_KNOWLEDGE_INDEX,
            size: 10,
            query: {
              semantic: {
                field: 'content',
                query: input.question,
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

            let reference: ContentReference | undefined;
            try {
              // Create a reference to the integration details page
              const packageUrl = `${assistantContext.getServerBasePath()}${INTEGRATIONS_BASE_PATH}/${
                source.package_name
              }`;
              const title = `${source.package_name} integration (${source.filename})`;

              reference = contentReferencesStore.add((p) => hrefReference(p.id, packageUrl, title));
            } catch (_error) {
              reference = contentReferencesStore.add((p) =>
                knowledgeBaseReference(
                  p.id,
                  `Integration knowledge for ${source.package_name}`,
                  'integrationKnowledge'
                )
              );
            }

            return new Document({
              id: hit._id,
              pageContent: `${contentReferenceString(reference)}\n\nPackage: ${
                source.package_name
              }${source.version ? ` (v${source.version})` : ''}\nFile: ${source.filename}\n${
                source.content
              }`,
              metadata: {
                package_name: source.package_name,
                package_version: source.version,
                filename: source.filename,
              },
            });
          });

          // TODO: Token pruning
          const result = JSON.stringify(citedDocs).substring(0, 20000);

          return result;
        } catch (error) {
          return `Error querying integration knowledge: ${error.message}. The integration knowledge base may not be available.`;
        }
      },
      {
        name: toolDetails.name,
        description: params.description || toolDetails.description,
        schema: z.object({
          question: z
            .string()
            .describe(
              'Key terms to retrieve Fleet-installed integration knowledge for, like specific integration names, configuration questions, or data ingestion topics.'
            ),
        }),
        tags: ['integration', 'knowledge-base', 'fleet'],
      }
    );
  },
};
