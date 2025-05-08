/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaClientTool,
  kibanaOpenApiSpec,
  kibanaServerlessOpenApiSpec,
} from './kibana_client_open_api';
import type { KibanaClientToolParams } from './kibana_client_tool';
import type { Operation } from '../../../utils/open_api_tool/utils';
import type { AxiosResponse } from 'axios';
import axios, { AxiosError } from 'axios';
import { Command } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import zodToJsonSchema from 'zod-to-json-schema';

const assistantToolParams = {
  createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
  connectorId: 'fake-connector',
  request: {
    rewrittenUrl: {
      origin: 'http://localhost:5601',
      pathname: 'basepath/internal/elastic_assistant/actions/connector/1234/_execute',
    },
    headers: {
      origin: 'http://localhost:5601',
      'kbn-version': '8.0.0',
    },
  },
  assistantContext: {
    getServerBasePath: jest.fn().mockReturnValue('basepath'),
  },
} as unknown as KibanaClientToolParams;

jest.mock('axios', () => {
  return {
    ...jest.requireActual('axios'),
    __esModule: true,
    default: jest.fn().mockImplementation(() => 'mocked default'),
  };
});
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const mockPostOperation = {
  path: '/api/actions/connector/{id}',
  method: 'post',
  getOperationId: () => 'get-actions-connector-id',
  getDescription: () => 'Get connector by id',
  getTags: () => [
    {
      name: 'connectors',
      description:
        'Connectors provide a central place to store connection information for services and integrations with Elastic or third party systems. Alerting rules can use connectors to run actions when rule conditions are met.\n',
      externalDocs: {
        description: 'Connector documentation',
        url: 'https://www.elastic.co/docs/reference/kibana/connectors-kibana',
      },
      'x-displayName': 'Connectors',
    },
  ],
  getParametersAsJSONSchema: () => [
    {
      type: 'headers',
      label: 'headers',
      schema: {
        type: 'object',
        properties: {
          'kbn-xsrf': {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'kbn-xsrf header',
          },
        },
        required: ['kbn-xsrf'],
      },
    },
    {
      type: 'path',
      label: 'Path Params',
      schema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'An identifier for the connector.',
          },
        },
        required: ['id'],
      },
    },
    {
      type: 'query',
      label: 'query Params',
      schema: {
        type: 'object',
        properties: {
          'test-query-param': {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'A test query param',
          },
        },
        required: ['test-query-param'],
      },
    },
    {
      type: 'body',
      label: 'Body Params',
      schema: {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'A test query param',
          },
        },
        required: ['test'],
      },
    },
  ],
} as unknown as Operation;

class TestableKibanaClientTool extends KibanaClientTool {
  public callGetToolForOperation(...args: Parameters<typeof this.getToolForOperation>) {
    return this.getToolForOperation(...args);
  }
}

describe('kibana_client_open_api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize step', () => {
    it('can initialize KibanaClientTool default', async () => {
      const kibanaClientTool = await KibanaClientTool.create();

      await expect(kibanaClientTool.getTool({ assistantToolParams })).resolves.toBeDefined();
    });

    it('can initialize KibanaClientTool traditional', async () => {
      const kibanaClientTool = await KibanaClientTool.create({
        options: {
          apiSpecPath: kibanaOpenApiSpec,
          llmType: undefined,
        },
      });

      await expect(kibanaClientTool.getTool({ assistantToolParams })).resolves.toBeDefined();
    });

    it('can initialize KibanaClientTool serverless', async () => {
      const kibanaClientTool = await KibanaClientTool.create({
        options: {
          apiSpecPath: kibanaServerlessOpenApiSpec,
          llmType: undefined,
        },
      });

      await expect(
        kibanaClientTool.getTool({
          assistantToolParams,
        })
      ).resolves.toBeDefined();
    });

    it('can not initialize KibanaClientTool if yaml file does not exist', async () => {
      const promise = new Promise(async (resolve, reject) => {
        try {
          const kibanaClientTool = await KibanaClientTool.create({
            options: {
              apiSpecPath: 'fake-path',
              llmType: undefined,
            },
          });

          await kibanaClientTool.getTool({
            assistantToolParams,
          });
          resolve(kibanaClientTool);
        } catch (error) {
          reject(error);
        }
      });

      await expect(promise).rejects.toThrow();
    });
  });

  describe('getToolForOperation constructs tool correctly ', () => {
    it('generates correct schema', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: mockPostOperation,
      });

      expect(zodToJsonSchema(toolForOperation.schema)).toEqual({
        type: 'object',
        properties: {
          body: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
                description: 'A test query param',
              },
            },
            required: ['test'],
            additionalProperties: false,
          },
          query: {
            type: 'object',
            properties: {
              'test-query-param': {
                type: 'string',
                description: 'A test query param',
              },
            },
            required: ['test-query-param'],
            additionalProperties: false,
          },
          path: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'An identifier for the connector.',
              },
            },
            required: ['id'],
            additionalProperties: false,
          },
          headers: {
            type: 'object',
            properties: {
              'kbn-xsrf': {
                type: 'string',
                description: 'kbn-xsrf header',
              },
            },
            additionalProperties: false,
            // since the kbn-xsrf header is made optional in the tool, we don't need to include it in the required list
          },
        },
        required: [
          'body',
          'query',
          'path',
          // since there are no required headers in the operation, we don't need to include it in the required list
        ],
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
      });
    });

    it('generates correct required header properties when only kbn-xsrf exists', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: {
          ...mockPostOperation,
          getParametersAsJSONSchema: () => [
            {
              type: 'headers',
              label: 'headers',
              schema: {
                type: 'object',
                properties: {
                  'kbn-xsrf': {
                    type: 'string',
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    description: 'kbn-xsrf header',
                  },
                },
                required: ['kbn-xsrf'],
              },
            },
          ],
        } as unknown as Operation,
      });

      expect(zodToJsonSchema(toolForOperation.schema)).toEqual({
        type: 'object',
        properties: {
          headers: {
            type: 'object',
            properties: {
              'kbn-xsrf': {
                type: 'string',
                description: 'kbn-xsrf header',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
      });
    });

    it('generates correct required header properties when required headers exist', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: {
          ...mockPostOperation,
          getParametersAsJSONSchema: () => [
            {
              type: 'headers',
              label: 'headers',
              schema: {
                type: 'object',
                properties: {
                  'kbn-xsrf': {
                    type: 'string',
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    description: 'kbn-xsrf header',
                  },
                  other: {
                    type: 'string',
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    description: 'other header',
                  },
                },
                required: ['kbn-xsrf', 'other'],
              },
            },
          ],
        } as unknown as Operation,
      });

      expect(zodToJsonSchema(toolForOperation.schema)).toEqual({
        type: 'object',
        properties: {
          headers: {
            type: 'object',
            properties: {
              'kbn-xsrf': {
                type: 'string',
                description: 'kbn-xsrf header',
              },
              other: {
                type: 'string',
                description: 'other header',
              },
            },
            required: ['other'],
            additionalProperties: false,
          },
        },
        required: ['headers'],
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
      });
    });

    it('generates correct required header properties when optional headers exist', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: {
          ...mockPostOperation,
          getParametersAsJSONSchema: () => [
            {
              type: 'headers',
              label: 'headers',
              schema: {
                type: 'object',
                properties: {
                  'kbn-xsrf': {
                    type: 'string',
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    description: 'kbn-xsrf header',
                  },
                  other: {
                    type: 'string',
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    description: 'other header',
                  },
                },
                required: ['kbn-xsrf'],
              },
            },
          ],
        } as unknown as Operation,
      });

      expect(zodToJsonSchema(toolForOperation.schema)).toEqual({
        type: 'object',
        properties: {
          headers: {
            type: 'object',
            properties: {
              'kbn-xsrf': {
                type: 'string',
                description: 'kbn-xsrf header',
              },
              other: {
                type: 'string',
                description: 'other header',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
      });
    });

    it('calls the correct endpoints and returns success message', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();
      mockedAxios.mockResolvedValue({ data: 'mockResult' });

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: mockPostOperation,
      });

      const result = await toolForOperation.invoke({
        type: 'tool_call',
        id: '123',
        name: 'get_actions_connector_id',
        args: {
          path: {
            id: '123',
          },
          query: {
            'test-query-param': 'test',
          },
          body: {
            test: 'test',
          },
        },
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:5601/basepath/api/actions/connector/123?test-query-param=test',
          headers: expect.objectContaining({
            'kbn-version': '8.0.0',
            'kbn-xsrf': 'mock-kbn-xsrf',
          }),
          data: JSON.stringify({
            test: 'test',
          }),
        })
      );

      expect(result).toEqual(
        new Command({
          update: {
            messages: [
              new ToolMessage({
                content: '"mockResult"',
                tool_call_id: '123',
              }),
            ],
          },
        })
      );
    });

    it('calls the correct endpoints and returns error message', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();
      mockedAxios.mockRejectedValue(
        new AxiosError('mock error', '400', undefined, undefined, { status: 400 } as AxiosResponse)
      );

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: mockPostOperation,
      });

      const result = await toolForOperation.invoke({
        type: 'tool_call',
        id: '123',
        name: 'get_actions_connector_id',
        args: {
          path: {
            id: '123',
          },
          query: {
            'test-query-param': 'test',
          },
          body: {
            test: 'test',
          },
        },
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:5601/basepath/api/actions/connector/123?test-query-param=test',
          headers: expect.objectContaining({
            'kbn-version': '8.0.0',
            'kbn-xsrf': 'mock-kbn-xsrf',
          }),
          data: JSON.stringify({
            test: 'test',
          }),
        })
      );

      expect(result).toEqual(
        new Command({
          update: {
            messages: [
              new ToolMessage({
                content: 'Client error: 400 - mock error',
                tool_call_id: '123',
              }),
            ],
          },
        })
      );
    });

    it('can not invoke tool with invalid input schema (missing body)', async () => {
      const kibanaClientTool = await TestableKibanaClientTool.create();
      mockedAxios.mockResolvedValue({ data: 'ok' });

      if (!(kibanaClientTool instanceof TestableKibanaClientTool)) {
        throw new Error('kibanaClientTool is not an instance of TestableKibanaClientTool');
      }

      const toolForOperation = await kibanaClientTool.callGetToolForOperation({
        assistantToolParams,
        operation: mockPostOperation,
      });

      await expect(
        toolForOperation.invoke({
          path: {
            id: '123',
          },
          query: {
            'test-query-param': 'test',
          },
        })
      ).rejects.toThrow();
    });
  });
});
