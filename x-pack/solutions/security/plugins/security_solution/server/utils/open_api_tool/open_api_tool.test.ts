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

class TestableOpenApiTool extends OpenApiTool<{}> {
  protected getToolForOperation(args: { operation: Operation }): Promise<StructuredToolInterface> {
    throw new Error('Method not implemented.');
  }
  protected getInternalNode(args: {
    tools: Promise<StructuredToolInterface[]>;
    name: string;
    description: string;
  }): Promise<StructuredToolInterface> {
    throw new Error('Method not implemented.');
  }

  callGetParametersAsZodSchema(...args: Parameters<typeof this.getParametersAsZodSchema>) {
    return this.getParametersAsZodSchema(...args);
  }

  static async createTestableOpenApiTool() {
    const yamlOpenApiSpec = await fs.promises.readFile(
      path.join(__dirname, 'sample_open_api_spec.yml'),
      'utf8'
    );
    const jsonOpenApiSpec = await parse(yamlOpenApiSpec);
    const fixedJsonOpenApiSpec = super.fixOpenApiSpecIteratively(jsonOpenApiSpec);
    const dereferencedOas = new Oas(fixedJsonOpenApiSpec);
    await dereferencedOas.dereference();
    return new this({ dereferencedOas });
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
    {
      type: 'header',
      label: 'headers',
      schema: {
        type: 'object',
        properties: {
          auth: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'A test query param',
          },
        },
        required: ['auth'],
      },
    },
    {
      type: 'cookie',
      label: 'cookie',
      schema: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'A test query param',
          },
        },
        required: ['foo'],
      },
    },
    {
      type: 'formData',
      label: 'formData',
      schema: {
        type: 'object',
        properties: {
          bar: {
            type: 'string',
            $schema: 'http://json-schema.org/draft-04/schema#',
            description: 'A test query param',
          },
        },
        required: ['bar'],
      },
    },
  ],
} as unknown as Operation;

describe('OpenApiTool', () => {
  it('getParametersAsZodSchema', async () => {
    const openApiTool = await TestableOpenApiTool.createTestableOpenApiTool();
    const result = openApiTool.callGetParametersAsZodSchema({ operation: mockPostOperation });
    expect(zodToJsonSchema(result)).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      additionalProperties: false,
      properties: {
        body: {
          additionalProperties: false,
          properties: {
            test: {
              description: 'A test query param',
              type: 'string',
            },
          },
          required: ['test'],
          type: 'object',
        },
        cookie: {
          additionalProperties: false,
          properties: {
            foo: {
              description: 'A test query param',
              type: 'string',
            },
          },
          required: ['foo'],
          type: 'object',
        },
        formData: {
          additionalProperties: false,
          properties: {
            bar: {
              description: 'A test query param',
              type: 'string',
            },
          },
          required: ['bar'],
          type: 'object',
        },
        header: {
          additionalProperties: false,
          properties: {
            auth: {
              description: 'A test query param',
              type: 'string',
            },
          },
          required: ['auth'],
          type: 'object',
        },
        path: {
          additionalProperties: false,
          properties: {
            id: {
              description: 'An identifier for the connector.',
              type: 'string',
            },
          },
          required: ['id'],
          type: 'object',
        },
        query: {
          additionalProperties: false,
          properties: {
            'test-query-param': {
              description: 'A test query param',
              type: 'string',
            },
          },
          required: ['test-query-param'],
          type: 'object',
        },
      },
      required: ['formData', 'cookie', 'header', 'body', 'query', 'path'],
      type: 'object',
    });
  });
});
