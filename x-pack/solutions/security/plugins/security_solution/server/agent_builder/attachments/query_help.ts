/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import type { Attachment } from '@kbn/onechat-common/attachments';
import { platformCoreTools } from '@kbn/onechat-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

export const queryHelpAttachmentDataSchema = z.object({
  query: z.string(),
  queryLanguage: z.string(),
});

export type QueryHelpAttachmentData = z.infer<typeof queryHelpAttachmentDataSchema>;

const isQueryHelpAttachmentData = (data: unknown): data is QueryHelpAttachmentData => {
  return queryHelpAttachmentDataSchema.safeParse(data).success;
};

export const createQueryHelpAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.query_help,
    validate: (input) => {
      const parseResult = queryHelpAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Necessary because we cannot currently use the AttachmentType type as agent is not
      // registered with enum AttachmentType in onechat attachment_types.ts
      if (!isQueryHelpAttachmentData(data)) {
        throw new Error(`Invalid query help attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatQueryHelpData(data) };
        },
      };
    },
    getTools: () => {
      const tools: string[] = [
        // TODO use real tool once product_documentation tool is merged, same in description below
        'platformCoreTools.productDocumentation',
      ];
      // Note: generateEsql is conditionally available based on queryLanguage
      // We include it in the tools list, but the agent should only use it when queryLanguage is 'esql'
      tools.push(platformCoreTools.generateEsql);
      return tools;
    },
    getAgentDescription: () => {
      const description = `The following is a broken query: {query}. Generate a new working query using the generateEsql tool (only if queryLanguage is 'esql') and productDocumentationTool when appropriate.

QUERY HELP DATA:
{queryHelpData}

---
MANDATORY WORKFLOW:

1. Check the queryLanguage from the query help data above.

2. If queryLanguage is 'esql', use the generateEsql tool to generate a new working ESQL query:
   Tool: ${sanitizeToolId(platformCoreTools.generateEsql)}
   Parameters: { query: "Write ESQL query to [describe what the broken query was trying to do]" }

3. Query PRODUCT DOCUMENTATION for relevant documentation when needed:
   // TODO use real tool once product_documentation tool is merged
   Tool: ${sanitizeToolId('platformCoreTools.productDocumentation')}
   Parameters: {
     query: "[query about ESQL syntax, query language, or related documentation]",
     product: "[optional: 'kibana' | 'elasticsearch' | 'observability' | 'security']",
     max: 3
   }

CRITICAL: Only use the generateEsql tool if queryLanguage is 'esql'. Otherwise, use productDocumentationTool to find relevant documentation to help fix the query.`;
      return description;
    },
  };
};

/**
 * Formats query help data for display.
 *
 * @param data - The query help attachment data containing the query and queryLanguage
 * @returns Formatted string representation of the query help data
 */
const formatQueryHelpData = (data: QueryHelpAttachmentData): string => {
  return `Query: ${data.query}\nQuery Language: ${data.queryLanguage}`;
};
