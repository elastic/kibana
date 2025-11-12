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
import { securityTool } from '../constants';

// TODO: Update to follow same pattern as Product Documentation Tool (use llmTasks.retrieveDocumentation)
// TODO: Investigate how to install Security Labs documents using the same installation/retrieval pattern as product documentation
// This requires determining how Security Labs content should be installed and made available via llmTasks.retrieveDocumentation

const securityLabsSchema = z.object({
  question: z
    .string()
    .describe(
      `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
    ),
});
export const SECURITY_LABS_TOOL_ID = securityTool('security_labs');

export const securityLabsTool = (): BuiltinToolDefinition<typeof securityLabsSchema> => {
  return {
    id: SECURITY_LABS_TOOL_ID,
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
      // TODO: Follow the same pattern as Product Documentation Tool
      // Need to determine how to install Security Labs documents using the same installation/retrieval pattern
      // as product documentation, then use llmTasks.retrieveDocumentation to retrieve them
      // This requires investigation into how Security Labs content should be installed and accessed
      return {
        results: [
          createErrorResult({
            message:
              'Security Labs tool is not yet fully implemented. TODO: Install Security Labs documents using the same pattern as product documentation, then use llmTasks.retrieveDocumentation to retrieve them.',
            metadata: {
              question,
              note: 'This tool needs to be updated to use llmTasks.retrieveDocumentation pattern, following the same installation/retrieval approach as product documentation',
            },
          }),
        ],
      };
    },
    tags: ['security', 'security-labs'],
  };
};
