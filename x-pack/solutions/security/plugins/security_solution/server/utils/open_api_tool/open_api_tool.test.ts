/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredToolInterface } from '@langchain/core/tools';
import { OpenApiTool } from './open_api_tool';
import type { Operation } from './utils';
import zodToJsonSchema from 'zod-to-json-schema';
import fs from 'node:fs';
import { parse } from 'yaml';
import Oas from 'oas';
import path from 'node:path';
import type { LlmType } from '@kbn/elastic-assistant-plugin/server/types';

class MockOpenApiTool extends OpenApiTool<{}> {
  protected getRootToolDetails(args: {}): { name: string; description: string } {
    return {
      name: 'root name',
      description: 'root tool description',
    };
  }
  protected getToolForOperation(args: { operation: Operation }): Promise<StructuredToolInterface> {
    return Promise.resolve({
      operationId: args.operation.getOperationId(),
    }) as unknown as Promise<StructuredToolInterface>;
  }
  protected getInternalNode(args: {
    tools: Promise<StructuredToolInterface[]>;
    name: string;
    description: string;
  }): Promise<StructuredToolInterface> {
    return Promise.resolve({
      name: args.name,
      description: args.description,
      tools: args.tools,
    }) as unknown as Promise<StructuredToolInterface>;
  }

  callGetParametersAsZodSchema(...args: Parameters<typeof this.getParametersAsZodSchema>) {
    return this.getParametersAsZodSchema(...args);
  }

  callGetOperations() {
    return this.getOperations();
  }

  static async createTestableOpenApiTool({ llmType }: { llmType?: LlmType }) {
    const yamlOpenApiSpec = await fs.promises.readFile(
      path.join(__dirname, 'sample_open_api_spec.yml'),
      'utf8'
    );
    const jsonOpenApiSpec = await parse(yamlOpenApiSpec);
    const dereferencedOas = new Oas(jsonOpenApiSpec);
    await dereferencedOas.dereference();
    return new this({ dereferencedOas, llmType });
  }
}

const mockPostOperation = {
  getOperationId: () => 'testOperationId',
  getParametersAsJSONSchema: () => [
    {
      type: 'path',
      label: 'Path Params',
      schema: {
        type: 'object',
        properties: {
          enumIds: {
            type: 'integer',
            enum: [1, 2, 3],
            description: 'An identifier for the connector.',
          },
          exclusiveNumber: {
            type: 'integer',
            exclusiveMinimum: 0,
            exclusiveMaximum: 100,
          },
          oneOf: {
            type: ['string', 'number'],
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
          anyOf: {
            type: ['string', 'number'],
            anyOf: [{ type: 'string' }, { type: 'number' }],
            default: 'defaultValue',
          },
          arrayType: {
            type: ['string', 'number'],
          },
          emptyArray: {
            type: 'array',
            items: {},
          },
          email: {
            type: 'string',
            format: 'email',
          },
          emptyArrayWithDescription: {
            type: 'array',
            items: {
              description: 'An array of strings',
            },
          },
          singleEnum: {
            type: 'string',
            enum: ['active'],
          },
        },
        required: ['id'],
      },
    },
  ],
} as unknown as Operation;

describe('OpenApiTool', () => {
  it('get operations', async () => {
    const openApiTool = await MockOpenApiTool.createTestableOpenApiTool({
      llmType: 'openai',
    });

    const operations = openApiTool.callGetOperations();

    expect(operations.length).toEqual(3);
    expect(operations.map((operation) => operation.getOperationId())).toEqual([
      'listPets',
      'createPets',
      'showPetById',
    ]);
  });

  it('returns tool agents grouped by tags', async () => {
    const openApiTool = await MockOpenApiTool.createTestableOpenApiTool({
      llmType: 'openai',
    });

    const rootTool = (await openApiTool.getTool({})) as any;

    expect(rootTool).toEqual({
      name: 'root name',
      description: 'root tool description',
      tools: expect.any(Promise),
    });

    const tools = await rootTool.tools;

    expect(tools).toEqual([
      {
        name: 'debug_agent',
        description: 'listPets',
        tools: expect.any(Promise),
      },
      {
        name: 'pets_agent',
        description: 'createPets\nshowPetById',
        tools: expect.any(Promise),
      },
    ]);

    const [debugAgent, petsAgent] = tools;

    const [debugAgentTools, petsAgentTools] = await Promise.all([
      debugAgent.tools,
      petsAgent.tools,
    ]);

    expect(debugAgentTools).toEqual([
      {
        operationId: 'listPets',
      },
    ]);

    expect(petsAgentTools).toEqual([
      expect.objectContaining({
        operationId: 'createPets',
      }),
      expect.objectContaining({
        operationId: 'showPetById',
      }),
    ]);
  });

  describe('parses schema correctly', () => {
    it('openai', async () => {
      const openApiTool = await MockOpenApiTool.createTestableOpenApiTool({
        llmType: 'openai',
      });

      const result = openApiTool.callGetParametersAsZodSchema({ operation: mockPostOperation });
      expect(zodToJsonSchema(result)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: false,
        properties: {
          path: {
            additionalProperties: false,
            properties: {
              anyOf: {
                type: ['string', 'number'],
              },
              arrayType: {
                type: ['string', 'number'],
              },
              emptyArray: {
                anyOf: [
                  {
                    items: {
                      type: 'string',
                    },
                    type: 'array',
                  },
                  {
                    items: {
                      type: 'number',
                    },
                    type: 'array',
                  },
                  {
                    items: {
                      type: 'boolean',
                    },
                    type: 'array',
                  },
                ],
              },
              email: {
                type: 'string',
              },
              emptyArrayWithDescription: {
                items: {
                  description: 'An array of strings',
                  type: 'string',
                },
                type: 'array',
              },
              enumIds: {
                description: 'An identifier for the connector.',
                enum: [1, 2, 3],
                type: 'number',
              },
              exclusiveNumber: {
                exclusiveMaximum: 100,
                exclusiveMinimum: 0,
                type: 'integer',
              },
              oneOf: {},
              singleEnum: {
                enum: ['active'],
                type: 'string',
              },
            },
            type: 'object',
          },
        },
        required: ['path'],
        type: 'object',
      });
    });

    it('gemini', async () => {
      const openApiTool = await MockOpenApiTool.createTestableOpenApiTool({
        llmType: 'gemini',
      });

      const result = openApiTool.callGetParametersAsZodSchema({ operation: mockPostOperation });
      expect(zodToJsonSchema(result)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        additionalProperties: false,
        properties: {
          path: {
            additionalProperties: false,
            properties: {
              anyOf: {
                type: 'string',
              },
              arrayType: {
                type: 'string',
              },
              emptyArray: {
                anyOf: [
                  {
                    items: {
                      type: 'string',
                    },
                    type: 'array',
                  },
                  {
                    items: {
                      type: 'number',
                    },
                    type: 'array',
                  },
                  {
                    items: {
                      type: 'boolean',
                    },
                    type: 'array',
                  },
                ],
              },
              email: {
                type: 'string',
              },
              emptyArrayWithDescription: {
                items: {
                  description: 'An array of strings',
                  type: 'string',
                },
                type: 'array',
              },
              enumIds: {
                enum: ['1', '2', '3'],
                type: 'string',
              },
              exclusiveNumber: {
                type: 'integer',
              },
              oneOf: {},
              singleEnum: {
                enum: ['active'],
                type: 'string',
              },
            },
            type: 'object',
          },
        },
        required: ['path'],
        type: 'object',
      });
    });
  });
});
