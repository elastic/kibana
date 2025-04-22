/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';
import { ActionsClientChatBedrockConverse, ActionsClientChatVertexAI, ActionsClientChatOpenAI } from '@kbn/langchain/server';
import { KibanaClientTool } from './kibana_client_open_api';

export interface KibanaClientToolParams extends AssistantToolParams {
    createLlmInstance: () =>
        | ActionsClientChatBedrockConverse
        | ActionsClientChatVertexAI
        | ActionsClientChatOpenAI;
}

const toolDetails = {
    // note: this description is overwritten when `getTool` is called
    // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
    // local definitions can be overwritten by security-ai-prompt integration definitions
    description:
        "Call this tool to use the Kibana client",
    id: 'kibana-client-tool',
    name: 'KibanaClientTool',
};
export const KIBANA_CLIENT_TOOL: AssistantTool = {
    ...toolDetails,
    sourceRegister: APP_UI_ID,
    isSupported: (params: AssistantToolParams): params is KibanaClientToolParams => {
        const { createLlmInstance } = params;
        return createLlmInstance != null;
    },
    async getTool(params: AssistantToolParams) {
        if (!this.isSupported(params)) return null;

        const kibanaClientToolParams = params as KibanaClientToolParams;

        const kibanaClientTool = new KibanaClientTool({
            assistantToolParams: kibanaClientToolParams,
        })

        return kibanaClientTool.getTool();
    },
};
