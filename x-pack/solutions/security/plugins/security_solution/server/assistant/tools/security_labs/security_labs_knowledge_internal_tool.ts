/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import {
  hrefReference,
  knowledgeBaseReference,
  contentReferenceString,
} from '@kbn/elastic-assistant-common';
import type { ContentReference } from '@kbn/elastic-assistant-common';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { getIsKnowledgeBaseInstalled } from '@kbn/elastic-assistant-plugin/server/routes/helpers';
import { Document } from 'langchain/document';
import yaml from 'js-yaml';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

const securityLabsKnowledgeToolSchema = z.object({
  question: z
    .string()
    .describe(
      `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
    ),
});

const SECURITY_LABS_BASE_URL = 'https://www.elastic.co/security-labs/';

export const SECURITY_LABS_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION =
  'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.';

/**
 * Returns a tool for retrieving Security Labs knowledge base content using the InternalToolDefinition pattern.
 */
export const securityLabsKnowledgeInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof securityLabsKnowledgeToolSchema> => {
  return {
    id: 'security-labs-knowledge-internal-tool',
    description: SECURITY_LABS_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION,
    schema: securityLabsKnowledgeToolSchema,
    handler: async ({ question }, context) => {
      try {
        // Get access to the elastic-assistant plugin through start services
        const [, pluginsStart] = await getStartServices();

        // Get the knowledge base data client
        const kbDataClient = await pluginsStart.elasticAssistant.getKnowledgeBaseDataClient(
          context.request
        );

        if (!kbDataClient) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: 'Knowledge base is not available or not enabled',
                  question,
                },
              },
            ],
          };
        }

        // Get knowledge base document entries using the same logic as the original tool
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          kbResource: SECURITY_LABS_RESOURCE,
          query: question,
        });

        if (docs.length === 0) {
          const isKnowledgeBaseInstalled = await getIsKnowledgeBaseInstalled(kbDataClient);
          if (!isKnowledgeBaseInstalled) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message:
                      'The "AI Assistant knowledge base" needs to be installed, containing the Security Labs content. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                    question,
                  },
                },
              ],
            };
          }
        }

        // Enrich documents with content references using the same logic as the original tool
        const citedDocs = docs.map((doc) => {
          let reference: ContentReference | undefined;
          try {
            const yamlString = doc.pageContent.split('---')[1];
            const parsed = yaml.load(yamlString) as {
              slug: string | undefined;
              title: string | undefined;
            };
            const slug = parsed.slug;
            const title = parsed.title;

            if (!slug || !title) {
              throw new Error('Slug or title not found in YAML');
            }

            reference = context.contentReferencesStore.add((p) =>
              hrefReference(p.id, `${SECURITY_LABS_BASE_URL}${slug}`, `Security Labs: ${title}`)
            );
          } catch (_error) {
            reference = context.contentReferencesStore.add((p) =>
              knowledgeBaseReference(p.id, 'Elastic Security Labs content', 'securityLabsId')
            );
          }
          return new Document({
            id: doc.id,
            pageContent: `${contentReferenceString(reference)}\n${doc.pageContent}`,
            metadata: doc.metadata,
          });
        });

        // TODO: Token pruning - same as original tool
        const result = JSON.stringify(citedDocs).substring(0, 20000);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                content: result,
                documents: citedDocs,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: 'Failed to retrieve Security Labs knowledge base data',
                message: error instanceof Error ? error.message : 'Unknown error',
                question,
              },
            },
          ],
        };
      }
    },
    tags: ['security-labs', 'knowledge-base'],
  };
};
