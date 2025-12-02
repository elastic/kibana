/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
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
        platformCoreTools.generateEsql,
        platformCoreTools.productDocumentation,
      ];
      return tools;
    },
    getAgentDescription: () => {
      const description = `The following is a broken query: {query}. Generate a new working query using the generateEsql tool (only if queryLanguage is 'esql') and productDocumentationTool when appropriate.

QUERY HELP DATA:
{queryHelpData}

---

1. Check the queryLanguage from the query attachment provided.
2. Use the appropriate tools to provide a corrected query.`;
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
