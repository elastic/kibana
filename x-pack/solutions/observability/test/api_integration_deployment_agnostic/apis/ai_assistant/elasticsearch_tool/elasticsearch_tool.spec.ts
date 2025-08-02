import expect from '@kbn/expect';
import { MessageRole, type Message } from '@kbn/observability-ai-assistant-plugin/common';
import { ELASTICSEARCH_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/elasticsearch';
import { createLlmProxy, LlmProxy } from '../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const SYSTEM_MESSAGE = `You are an AI assistant that can help with Elasticsearch operations. You have access to the ${ELASTICSEARCH_FUNCTION_NAME} tool.`;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: 'Test message',
      },
    },
  ];

  describe('/internal/observability_ai_assistant/chat - Elasticsearch Tool Restrictions', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
    let proxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: proxy.getPort(),
      });
    });

    after(async () => {
      proxy.close();
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
    });

    describe('Allowed Operations', () => {
      it('should allow GET requests to any endpoint', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'GET',
            path: '/_cluster/health',
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_get_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Get cluster health',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should allow POST requests to _search endpoint', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'POST',
            path: '/_search',
            body: { query: { match_all: {} } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_post_search_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Search for all documents',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should allow POST requests to nested _search endpoints', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'POST',
            path: '/my-index/_search',
            body: { query: { match_all: {} } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_post_nested_search_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Search in my-index',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });
    });

    describe('Disallowed Operations', () => {
      it('should reject PUT requests', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'PUT',
            path: '/my-index',
            body: { mappings: { properties: {} } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_put_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Create an index',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should reject DELETE requests', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'DELETE',
            path: '/my-index',
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_delete_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Delete an index',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should reject PATCH requests', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'PATCH',
            path: '/my-index/_doc/1',
            body: { doc: { field: 'value' } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_patch_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Update a document',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should reject POST requests to non-search endpoints', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'POST',
            path: '/my-index/_doc',
            body: { field: 'value' },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_post_non_search_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Index a document',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should reject POST requests to endpoints ending with _search but not being _search', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'POST',
            path: '/my-index/custom_search',
            body: { query: { match_all: {} } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_post_custom_search_request',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Search with custom endpoint',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });
    });

    describe('Edge Cases', () => {
      it('should handle paths with query parameters correctly', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'GET',
            path: '/_cluster/health?pretty=true',
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_get_request_with_query_params',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Get cluster health with pretty format',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });

      it('should handle POST _search with query parameters', async () => {
        const simulatorPromise = proxy.interceptWithFunctionRequest({
          name: ELASTICSEARCH_FUNCTION_NAME,
          arguments: () => JSON.stringify({
            method: 'POST',
            path: '/_search?scroll=1m',
            body: { query: { match_all: {} } },
          }),
        });

        await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/chat',
          params: {
            body: {
              name: 'test_post_search_with_query_params',
              systemMessage: SYSTEM_MESSAGE,
              messages: [
                {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content: 'Search with scroll parameter',
                  },
                },
              ],
              connectorId,
              functions: [ELASTICSEARCH_FUNCTION_NAME],
              scopes: ['all'],
            },
          },
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
        const simulator = await simulatorPromise;
        const requestBody = simulator.requestBody;
        expect(requestBody.messages[0].content).to.eql(SYSTEM_MESSAGE);
      });
    });
  });
}
