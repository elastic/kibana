/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { RequiredDefined } from '@kbn/elastic-assistant-plugin/server/types';
import { APP_UI_ID } from '../../../../common';
import { getMemoizedKibanaClientTool, KibanaClientTool } from './kibana_client_open_api';

export type KibanaClientToolParams = AssistantToolParams &
  RequiredDefined<Pick<AssistantToolParams, 'createLlmInstance' | 'assistantContext'>>;

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description:
    'Call this tool to use the Kibana client. It can be used to interact with the Kibana API and perform various GET/POST/PUT/DELETE operations.',
  id: 'kibana-client-tool',
  name: 'KibanaClientTool',
};
export const KIBANA_CLIENT_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is KibanaClientToolParams => {
    const { createLlmInstance, assistantContext } = params;

    return (
      createLlmInstance != null &&
      assistantContext != null &&
      assistantContext.getRegisteredFeatures('securitySolutionUI').kibanaClientToolEnabled
    );
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const kibanaClientToolParams = params as KibanaClientToolParams;
    const { buildFlavor } = kibanaClientToolParams.assistantContext;
    const flavoredApiSpecPath = KibanaClientTool.getKibanaOpenApiSpec(buildFlavor);

    if (!flavoredApiSpecPath) {
      return null;
    }

    const kibanaClientTool = await getMemoizedKibanaClientTool({
      options: {
        apiSpecPath: flavoredApiSpecPath,
        llmType: kibanaClientToolParams.llmType,
      },
    });

    return kibanaClientTool.getTool({
      assistantToolParams: kibanaClientToolParams,
    });
  },
};
