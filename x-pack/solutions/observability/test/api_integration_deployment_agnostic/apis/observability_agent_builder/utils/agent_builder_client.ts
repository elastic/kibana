/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatRequestBodyPayload,
  ChatResponse,
} from '@kbn/agent-builder-plugin/common/http_api/chat';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { SupertestWithRoleScopeType } from '../../../services';

export function createAgentBuilderApiClient(supertest: SupertestWithRoleScopeType) {
  return {
    async converse(payload: ChatRequestBodyPayload): Promise<ChatResponse> {
      const res = await supertest
        .post('/api/agent_builder/converse')
        .set('kbn-xsrf', 'true')
        .send(payload);
      return res.body;
    },

    async getConversation(conversationId: string): Promise<Conversation> {
      const res = await supertest
        .get(`/api/agent_builder/conversations/${conversationId}`)
        .set('kbn-xsrf', 'true');
      return res.body;
    },

    async executeTool<ResultType extends Omit<ToolResult, 'tool_result_id'>>({
      id,
      params,
    }: {
      id: string;
      params: Record<string, any>;
    }): Promise<ResultType[]> {
      const res = await supertest
        .post('/api/agent_builder/tools/_execute')
        .set('kbn-xsrf', 'true')
        .send({ tool_id: id, tool_params: params });
      return res.body.results;
    },
  };
}

export type AgentBuilderApiClient = ReturnType<typeof createAgentBuilderApiClient>;
