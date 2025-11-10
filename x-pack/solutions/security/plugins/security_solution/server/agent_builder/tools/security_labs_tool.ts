/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';

// TODO: Update to follow same pattern as Product Documentation Tool (use llmTasks.retrieveDocumentation instead of kbDataClient)
// TODO: Investigate how to access kbDataClient from ToolHandlerContext.request
// For now, this tool will need to be updated once we determine how to access the knowledge base client
// or convert to use llmTasks.retrieveDocumentation pattern

const securityLabsSchema = z.object({
  question: z
    .string()
    .describe(
      `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
    ),
});

export const securityLabsTool = (): BuiltinToolDefinition<typeof securityLabsSchema> => {
  return {
    id: 'core.security.security_labs',
    type: ToolType.builtin,
    description: `Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.

Use this tool to retrieve detailed information about:
- Malware families and their behaviors
- Attack techniques and tactics
- Security research and analysis
- Threat intelligence

Examples:
- "Tell me about Emotet malware"
- "What are the latest attack techniques?"
- "Information about ransomware attacks"
    `,
    schema: securityLabsSchema,
    handler: async ({ question }, { request, logger }) => {
      logger.debug(`security labs tool called with question: ${question}`);

      // TODO: Access kbDataClient from request context
      // This requires investigation into how to get the knowledge base data client
      // from the ToolHandlerContext.request object
      // For now, return an error indicating the feature needs to be implemented
      return {
        results: [
          createErrorResult({
            message:
              'Security Labs tool is not yet fully implemented. TODO: Access kbDataClient from request context or convert to use llmTasks.retrieveDocumentation pattern.',
            metadata: {
              question,
              note: 'This tool needs to be updated to access kbDataClient or use llmTasks.retrieveDocumentation',
            },
          }),
        ],
      };

      // Future implementation will:
      // 1. Get kbDataClient from request context
      // 2. Call kbDataClient.getKnowledgeBaseDocumentEntries with SECURITY_LABS_RESOURCE
      // 3. Parse YAML frontmatter to extract slug and title
      // 4. Create content references
      // 5. Return results in ToolResultType format
    },
    tags: ['security-labs', 'knowledge-base'],
  };
};

