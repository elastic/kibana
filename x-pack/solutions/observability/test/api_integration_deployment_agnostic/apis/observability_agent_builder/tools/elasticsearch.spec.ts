/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import {
  createToolCallMessage,
  createMultiToolCallMessage,
} from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { OBSERVABILITY_ELASTICSEARCH_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import { openApiSpecIndexPattern } from '@kbn/product-doc-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { setupLlmProxy, teardownLlmProxy } from '../utils/llm_proxy/llm_test_helpers';
import {
  installOpenApiSpecDocs,
  uninstallOpenApiSpecDocs,
  waitForOpenApiSpecDocReady,
} from '../utils/product_doc_base';
import {
  TINY_ELSER_INFERENCE_ID,
  setupTinyElserModelAndInferenceEndpoint,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
  const supertest = getService('supertest');
  const es = getService('es');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const log = getService('log');

  describe(`tool: ${OBSERVABILITY_ELASTICSEARCH_TOOL_ID}`, function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
    });

    describe('POST kbn://api/agent_builder/tools/_execute', () => {
      describe('when OpenAPI spec documentation is not installed', () => {
        let llmProxy: LlmProxy;
        let connectorId: string;

        before(async () => {
          ({ llmProxy, connectorId } = await setupLlmProxy(getService));
        });

        after(async () => {
          await teardownLlmProxy(getService, { llmProxy, connectorId });
        });

        it('returns an error indicating OpenAPI documentation is not installed', async () => {
          const results = await agentBuilderApiClient.executeTool({
            id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
            params: { nlQuery: 'get cluster health' },
          });

          expect(results).to.have.length(1);
          expect(results[0].type).to.be('error');
          const errorData = results[0].data as {
            message: string;
            metadata?: { settingsUrl: string };
          };
          expect(errorData.message).to.contain('OpenAPI spec documentation is not installed');
          expect(errorData.metadata).to.have.property('settingsUrl');
          expect(errorData.metadata!.settingsUrl).to.be('/app/management/ai/genAiSettings');
        });
      });

      describe('when OpenAPI spec documentation is installed', function () {
        let llmProxy: LlmProxy;
        let connectorId: string;

        before(async () => {
          await setupTinyElserModelAndInferenceEndpoint(getService);

          await installOpenApiSpecDocs(supertest, TINY_ELSER_INFERENCE_ID, log);
          await waitForOpenApiSpecDocReady(getService, TINY_ELSER_INFERENCE_ID);

          // Refresh openapi spec doc index to ensure documents are immediately searchable
          // This prevents flakiness caused by ES not having refreshed the index yet
          await es.indices.refresh({ index: openApiSpecIndexPattern });

          ({ llmProxy, connectorId } = await setupLlmProxy(getService));
        });

        after(async () => {
          await teardownLlmProxy(getService, { llmProxy, connectorId });
          await uninstallOpenApiSpecDocs(supertest, TINY_ELSER_INFERENCE_ID, log);
          await teardownTinyElserModelAndInferenceEndpoint(getService);
        });

        describe('executes a GET Elasticsearch API and returns the response', () => {
          const TEST_INDEX = 'test-elasticsearch-tool';
          const TEST_DOC_ID = '1';
          const TEST_DOC = { test_field: 'hello from elasticsearch tool test' };

          before(async () => {
            await es.index({
              index: TEST_INDEX,
              id: TEST_DOC_ID,
              document: TEST_DOC,
              refresh: true,
            });
          });

          after(async () => {
            await es.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
          });

          it('returns the document matching the given index and id', async () => {
            // Intercept the first LLM call: refine the user query into an API-focused search term.
            void llmProxy
              .intercept({
                name: 'rewrite-query',
                when: (body) => {
                  const systemMessage = body.messages.find((m) => m.role === 'system');
                  return String(systemMessage?.content ?? '').includes('query rewriter');
                },
                responseMock: 'get document by id from index',
              })
              .completeAfterIntercept();

            // Intercept the second LLM call: tool selection.
            void llmProxy
              .intercept({
                name: 'tool-selection',
                when: (body) => {
                  const systemMessage = body.messages.find((m) => m.role === 'system');
                  return String(systemMessage?.content ?? '').includes(
                    'expert Elasticsearch tool caller'
                  );
                },
                responseMock: (body) => {
                  const tools = body.tools ?? [];
                  // Find the GET /{index}/_doc/{id} tool by matching its description prefix.
                  const getDocTool = tools.find((t) => {
                    const desc: string = t.function?.description ?? '';
                    return desc.startsWith('GET /{index}/_doc/{id}');
                  });
                  if (!getDocTool) {
                    return {
                      role: 'assistant' as const,
                      content: '',
                      tool_calls: [],
                    };
                  }
                  return createToolCallMessage(getDocTool.function.name, {
                    index: TEST_INDEX,
                    id: TEST_DOC_ID,
                  });
                },
              })
              .completeAfterIntercept();

            const results = await agentBuilderApiClient.executeTool({
              id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
              params: { nlQuery: 'get document with id 1 from index test-elasticsearch-tool' },
            });

            await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

            expect(results).to.have.length(1);
            expect(results[0].type).to.be('other');
            const data = results[0].data as { response?: Record<string, unknown> };
            expect(data.response).not.to.be(undefined);
            expect(data.response!._source).to.eql(TEST_DOC);
          });
        });

        it('triggers a HITL confirmation prompt for dangerous POST/PUT/DELETE operations', async () => {
          void llmProxy
            .intercept({
              name: 'rewrite-query',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes('query rewriter');
              },
              responseMock: 'create index',
            })
            .completeAfterIntercept();

          // Select a PUT tool to trigger the dangerous-operation check.
          void llmProxy
            .intercept({
              name: 'tool-selection',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'expert Elasticsearch tool caller'
                );
              },
              responseMock: (body) => {
                const tools = body.tools ?? [];
                // Find the PUT /{index} tool by matching its description prefix.
                const putIndexTool = tools.find((t) => {
                  const desc: string = t.function?.description ?? '';
                  return desc.startsWith('PUT /{index}');
                });
                if (!putIndexTool) {
                  return {
                    role: 'assistant' as const,
                    content: '',
                    tool_calls: [],
                  };
                }
                return createToolCallMessage(putIndexTool.function.name, {
                  index: 'test-index',
                });
              },
            })
            .completeAfterIntercept();

          const results = await agentBuilderApiClient.executeTool({
            id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
            params: { nlQuery: 'create an index named test-index' },
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // No execution results — the tool was paused waiting for user confirmation.
          expect(results).to.be(undefined);
        });

        it('returns an error when the LLM selects no matching Elasticsearch APIs', async () => {
          void llmProxy
            .intercept({
              name: 'rewrite-query',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes('query rewriter');
              },
              responseMock: 'get cluster health status',
            })
            .completeAfterIntercept();

          // Return an assistant message with no tool_calls and empty content
          void llmProxy
            .intercept({
              name: 'tool-selection',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'expert Elasticsearch tool caller'
                );
              },
              responseMock: {
                role: 'assistant' as const,
                content: '',
                tool_calls: [],
              },
            })
            .completeAfterIntercept();

          const results = await agentBuilderApiClient.executeTool({
            id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
            params: { nlQuery: 'get cluster health' },
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(results).to.have.length(1);
          expect(results[0].type).to.be('error');
          const errorData = results[0].data as { message: string };
          expect(errorData.message).to.contain('No tools were selected');
        });

        describe('supports parallel tool calls and returns a result for each invocation', () => {
          const TEST_INDEX_A = 'test-elasticsearch-tool-parallel-a';
          const TEST_INDEX_B = 'test-elasticsearch-tool-parallel-b';
          const TEST_DOC_ID = '1';
          const TEST_DOC_A = { test_field: 'document from index a' };
          const TEST_DOC_B = { test_field: 'document from index b' };

          before(async () => {
            await Promise.all([
              es.index({
                index: TEST_INDEX_A,
                id: TEST_DOC_ID,
                document: TEST_DOC_A,
                refresh: true,
              }),
              es.index({
                index: TEST_INDEX_B,
                id: TEST_DOC_ID,
                document: TEST_DOC_B,
                refresh: true,
              }),
            ]);
          });

          after(async () => {
            await Promise.all([
              es.indices.delete({ index: TEST_INDEX_A, ignore_unavailable: true }),
              es.indices.delete({ index: TEST_INDEX_B, ignore_unavailable: true }),
            ]);
          });

          it('executes both tool calls in parallel and returns a result for each', async () => {
            void llmProxy
              .intercept({
                name: 'rewrite-query',
                when: (body) => {
                  const systemMessage = body.messages.find((m) => m.role === 'system');
                  return String(systemMessage?.content ?? '').includes('query rewriter');
                },
                responseMock: 'get document by id from index',
              })
              .completeAfterIntercept();

            // Return two simultaneous GET /{index}/_doc/{id} calls
            void llmProxy
              .intercept({
                name: 'tool-selection',
                when: (body) => {
                  const systemMessage = body.messages.find((m) => m.role === 'system');
                  return String(systemMessage?.content ?? '').includes(
                    'expert Elasticsearch tool caller'
                  );
                },
                responseMock: (body) => {
                  const tools = body.tools ?? [];
                  const getDocTool = tools.find((t) => {
                    const desc: string = t.function?.description ?? '';
                    return desc.startsWith('GET /{index}/_doc/{id}');
                  });
                  if (!getDocTool) {
                    return {
                      role: 'assistant' as const,
                      content: '',
                      tool_calls: [],
                    };
                  }
                  return createMultiToolCallMessage([
                    {
                      name: getDocTool.function.name,
                      args: { index: TEST_INDEX_A, id: TEST_DOC_ID },
                    },
                    {
                      name: getDocTool.function.name,
                      args: { index: TEST_INDEX_B, id: TEST_DOC_ID },
                    },
                  ]);
                },
              })
              .completeAfterIntercept();

            const results = await agentBuilderApiClient.executeTool({
              id: OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
              params: {
                nlQuery: `get document with id 1 from index ${TEST_INDEX_A} and from index ${TEST_INDEX_B}`,
              },
            });

            await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
            expect(results).to.have.length(2);
          });
        });
      });
    });

    describe('POST kbn://api/agent_builder/converse', () => {
      let llmProxy: LlmProxy;
      let connectorId: string;

      before(async () => {
        await setupTinyElserModelAndInferenceEndpoint(getService);

        await installOpenApiSpecDocs(supertest, TINY_ELSER_INFERENCE_ID, log);
        await waitForOpenApiSpecDocReady(getService, TINY_ELSER_INFERENCE_ID);

        await es.indices.refresh({ index: openApiSpecIndexPattern });

        ({ llmProxy, connectorId } = await setupLlmProxy(getService));
      });

      after(async () => {
        await teardownLlmProxy(getService, { llmProxy, connectorId });
        await uninstallOpenApiSpecDocs(supertest, TINY_ELSER_INFERENCE_ID, log);
        await teardownTinyElserModelAndInferenceEndpoint(getService);
      });

      describe('HITL confirmation for dangerous operations', () => {
        // Cleaned up after the accept test which actually creates the index in ES.
        const HITL_TEST_INDEX = 'test-hitl-converse-index';
        const setupHitlFirstCallIntercepts = () => {
          void llmProxy
            .intercept({
              name: 'set-title',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'You are a title-generation utility'
                );
              },
              responseMock: createToolCallMessage('set_title', {
                title: 'Create Elasticsearch Index',
              }),
            })
            .completeAfterIntercept();

          // Main agent decides to invoke the Elasticsearch tool.
          void llmProxy
            .intercept({
              name: 'choose-elasticsearch-tool',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                const systemText = String(systemMessage?.content ?? '');
                return systemText.includes(
                  'You are an expert enterprise AI assistant from Elastic, the company behind Elasticsearch'
                );
              },
              responseMock: createToolCallMessage('observability_elasticsearch', {
                nlQuery: `create an index named ${HITL_TEST_INDEX}`,
              }),
            })
            .completeAfterIntercept();

          void llmProxy
            .intercept({
              name: 'rewrite-query',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes('query rewriter');
              },
              responseMock: 'create index',
            })
            .completeAfterIntercept();

          void llmProxy
            .intercept({
              name: 'tool-selection',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'expert Elasticsearch tool caller'
                );
              },
              responseMock: (body) => {
                const tools = body.tools ?? [];
                const putIndexTool = tools.find((t) => {
                  const desc: string = t.function?.description ?? '';
                  return desc.startsWith('PUT /{index}');
                });
                if (!putIndexTool) {
                  return { role: 'assistant' as const, content: '', tool_calls: [] };
                }
                return createToolCallMessage(putIndexTool.function.name, {
                  index: HITL_TEST_INDEX,
                });
              },
            })
            .completeAfterIntercept();
        };
        after(async () => {
          await es.indices.delete({ index: HITL_TEST_INDEX, ignore_unavailable: true });
        });

        it('pauses execution and returns a confirmation prompt', async () => {
          setupHitlFirstCallIntercepts();

          const response = await agentBuilderApiClient.converse({
            agent_id: 'observability.agent',
            input: `Create an Elasticsearch index named ${HITL_TEST_INDEX}`,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(response.response.prompt).not.to.be(undefined);
          expect(response.response.prompt!.type).to.be('confirmation');
        });

        it('resumes and executes the tool when the user accepts', async () => {
          setupHitlFirstCallIntercepts();

          const firstResponse = await agentBuilderApiClient.converse({
            agent_id: 'observability.agent',
            input: `Create an Elasticsearch index named ${HITL_TEST_INDEX}`,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const { conversation_id: conversationId, response: firstResponseBody } = firstResponse;
          expect(firstResponseBody.prompt).not.to.be(undefined);

          // Set up intercepts for the resumed execution after the user accepts.
          void llmProxy
            .intercept({
              name: 'continue-conversation',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'You are an expert enterprise AI assistant from Elastic, the company behind Elasticsearch'
                );
              },
              responseMock: 'Index was created.',
            })
            .completeAfterIntercept();

          void llmProxy
            .intercept({
              name: 'final-assistant-response',
              when: () => true,
              responseMock: `The index ${HITL_TEST_INDEX} was created successfully.`,
            })
            .completeAfterIntercept();

          const resumeResponse = await agentBuilderApiClient.converse({
            conversation_id: conversationId,
            agent_id: 'observability.agent',
            prompts: { [firstResponseBody.prompt!.id]: { allow: true } },
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(resumeResponse.response.message).to.be(
            `The index ${HITL_TEST_INDEX} was created successfully.`
          );
        });

        it('returns a final response when the user rejects', async () => {
          setupHitlFirstCallIntercepts();
          const firstResponse = await agentBuilderApiClient.converse({
            agent_id: 'observability.agent',
            input: `Create an Elasticsearch index named ${HITL_TEST_INDEX}`,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const { conversation_id: conversationId, response: firstResponseBody } = firstResponse;
          expect(firstResponseBody.prompt).not.to.be(undefined);

          // Set up intercepts for the resumed execution after the user rejects.
          void llmProxy
            .intercept({
              name: 'continue-conversation',
              when: (body) => {
                const systemMessage = body.messages.find((m) => m.role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'This response will serve as a handover note for the answering agent'
                );
              },
              responseMock: 'Action was denied by the user.',
            })
            .completeAfterIntercept();

          void llmProxy
            .intercept({
              name: 'final-assistant-response',
              when: () => true,
              responseMock: 'The action was cancelled.',
            })
            .completeAfterIntercept();

          const resumeResponse = await agentBuilderApiClient.converse({
            conversation_id: conversationId,
            prompts: { [firstResponseBody.prompt!.id]: { allow: false } },
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(resumeResponse.response.message).to.be('The action was cancelled.');
        });
      });
    });
  });
}
