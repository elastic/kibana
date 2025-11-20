/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { maxBy, get } from 'lodash';
import type { ToolResult, OtherResult } from '@kbn/onechat-common';
import { isOtherResult } from '@kbn/onechat-common/tools';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { OBSERVABILITY_AGENT_ID } from '@kbn/observability-agent-plugin/server/agent/register_observability_agent';
import {
  type KnowledgeBaseEntry,
  OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID,
} from '@kbn/observability-agent-plugin/server/tools';
import {
  LLM_PROXY_HANDOVER_INTERCEPTOR,
  LLM_PROXY_FINAL_MESSAGE,
} from '../utils/llm_proxy/constants';
import type { AgentBuilderApiClient } from '../utils/agent_builder_client';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import { setupToolCallThenAnswer } from '../utils/llm_proxy/scenarios';
import { restoreIndexAssets } from '../utils/knowledge_base/index_assets';
import {
  addSampleDocsToInternalKb,
  clearKnowledgeBase,
} from '../utils/knowledge_base/knowledge_base_management';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/knowledge_base/model_and_inference';

const LLM_EXPOSED_TOOL_NAME_FOR_SEARCH_KB = 'observability_search_knowledge_base';
const USER_PROMPT = 'Which alerts should be resolved first?';

const sampleDocsForInternalKb = [
  {
    id: 'favourite_color',
    title: 'Favorite Color',
    text: 'My favourite color is blue.',
    public: true,
  },
  {
    id: 'alert_instructions',
    title: 'Alert Handling Guide',
    text: 'All alerts should be considered high priority. Every alert is monitored every day. Threshold alerts should be resolved first. Consider this when analyzing alerts.',
    public: true,
  },
  {
    id: 'miscellaneous',
    title: 'Miscellaneous Note',
    text: 'hello again',
    public: true,
  },
];

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;
    let agentBuilderApiClient: AgentBuilderApiClient;
    let toolResponseContent: { results: ToolResult[] };
    let otherResult!: OtherResult;

    describe('POST /api/agent_builder/converse', () => {
      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        agentBuilderApiClient = createAgentBuilderApiClient(scoped);

        // KB setup
        await restoreIndexAssets(getService);
        await deployTinyElserAndSetupKb(getService);
        await addSampleDocsToInternalKb(getService, sampleDocsForInternalKb);

        setupToolCallThenAnswer({
          llmProxy,
          toolName: LLM_EXPOSED_TOOL_NAME_FOR_SEARCH_KB,
          toolArg: { query: USER_PROMPT },
        });

        const body = await agentBuilderApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
          agent_id: OBSERVABILITY_AGENT_ID,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect(body.response.message).to.be(LLM_PROXY_FINAL_MESSAGE);

        const handoverRequest = llmProxy.interceptedRequests.find(
          (r) => r.matchingInterceptorName === LLM_PROXY_HANDOVER_INTERCEPTOR
        )!.requestBody;

        const toolResponseMessage = handoverRequest.messages[handoverRequest.messages.length - 1]!;
        toolResponseContent = JSON.parse(toolResponseMessage.content as string) as {
          results: ToolResult[];
        };

        const firstResult = toolResponseContent.results[0];
        if (!isOtherResult(firstResult)) {
          throw new Error('Unexpected tool result type');
        }
        otherResult = firstResult;
      });

      after(async () => {
        llmProxy.close();

        await deleteActionConnector(getService, { actionId: connectorId });
        await teardownTinyElserModelAndInferenceEndpoint(getService);
        await clearKnowledgeBase(getService);
      });

      it('returns the correct tool results structure', () => {
        expect(toolResponseContent).to.have.property('results');
        expect(Array.isArray(toolResponseContent.results)).to.be(true);
        expect(toolResponseContent.results.length).to.be.greaterThan(0);

        const toolResult = toolResponseContent.results[0];
        expect(isOtherResult(toolResult)).to.be(true);
      });

      it('returns KB entries for the query', () => {
        const total = get(otherResult, ['data', 'total']);
        const entries = get(otherResult, ['data', 'entries']) as KnowledgeBaseEntry[];

        expect(total).to.be(3);
        expect(Array.isArray(entries)).to.be(true);
        expect(total).to.be(entries.length);
      });

      it('ranks the most relevant entry highest by score', () => {
        const entries = get(otherResult, ['data', 'entries']) as KnowledgeBaseEntry[];
        const topEntry = maxBy(entries, 'esScore');

        expect(topEntry?.text).to.be(sampleDocsForInternalKb[1].text);
      });
    });
  });
}
