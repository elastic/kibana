/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';

import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import type { ContentReference } from '@kbn/elastic-assistant-common';
import { contentReferenceString } from '@kbn/elastic-assistant-common';
import yaml from 'js-yaml';
import {
  hrefReference,
  knowledgeBaseReference,
} from '@kbn/elastic-assistant-common/impl/content_references/references';
import { Document } from 'langchain/document';
import { APP_UI_ID } from '../../../../common';

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description:
    'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.',
  id: 'security-labs-knowledge-base-tool',
  name: 'SecurityLabsKnowledgeBaseTool',
};

const SECURITY_LABS_BASE_URL = 'https://www.elastic.co/security-labs/';

export const SECURITY_LABS_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    const { kbDataClient, isEnabledKnowledgeBase } = params;
    return isEnabledKnowledgeBase && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient, contentReferencesStore } = params as AssistantToolParams;
    if (kbDataClient == null) return null;

    return tool(
      async (input) => {
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          kbResource: SECURITY_LABS_RESOURCE,
          query: input.question,
        });

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

            reference = contentReferencesStore.add((p) =>
              hrefReference(p.id, `${SECURITY_LABS_BASE_URL}${slug}`, `Security Labs: ${title}`)
            );
          } catch (_error) {
            reference = contentReferencesStore.add((p) =>
              knowledgeBaseReference(p.id, 'Elastic Security Labs content', 'securityLabsId')
            );
          }
          return new Document({
            id: doc.id,
            pageContent: `${contentReferenceString(reference)}\n${doc.pageContent}`,
            metadata: doc.metadata,
          });
        });

        // TODO: Token pruning
        const result = JSON.stringify(citedDocs).substring(0, 20000);

        return result;
      },
      {
        name: toolDetails.name,
        description: params.description || toolDetails.description,
        schema: z.object({
          question: z
            .string()
            .describe(
              `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
            ),
        }),
        tags: ['security-labs', 'knowledge-base'],
      }
    );
  },
};
