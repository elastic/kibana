/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/common';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export const contextFunctionHandler: {
  name: string;
  definition: ToolDefinition;
  handler: ({
    args,
    toolHandlerContext,
  }: {
    args: any;
    toolHandlerContext: ToolHandlerContext;
  }) => Promise<any>;
} = {
  name: CONTEXT_FUNCTION_NAME,
  definition: {
    description:
      'This function provides context as to what the user is looking at on their screen, and recalled documents from the knowledge base that matches their query',
  },
  handler: async () => {
    return Promise.resolve({
      content: 'Context function response',
    });
  },
};
