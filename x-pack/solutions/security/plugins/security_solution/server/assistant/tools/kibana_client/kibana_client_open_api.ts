/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { memoize, pickBy } from 'lodash';
import { StdUriTemplate } from '@std-uritemplate/std-uritemplate';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import path from 'path';
import Oas from 'oas';
import { parse } from 'yaml';
import type { BuildFlavor } from '@kbn/config';
import axios from 'axios';
import type { LlmType } from '@kbn/elastic-assistant-plugin/server/types';
import { Command, END } from '@langchain/langgraph';
import type { JsonSchema, JsonSchemaObject, Refs } from '@n8n/json-schema-to-zod';
import { OpenApiTool } from '../../../utils/open_api_tool/open_api_tool';
import type { KibanaClientToolParams } from './kibana_client_tool';
import { formatToolName, type Operation } from '../../../utils/open_api_tool/utils';
import { REPO_ROOT } from '@kbn/repo-info';

export const kibanaServerlessOpenApiSpec = path.resolve(
  REPO_ROOT,
  './oas_docs/output/kibana.serverless.yaml'
);
export const kibanaOpenApiSpec = path.resolve(
  REPO_ROOT,
  './oas_docs/output/kibana.yaml'
);

const defaultOptions: Options = {
  apiSpecPath: kibanaOpenApiSpec,
  llmType: undefined,
};

interface Options {
  apiSpecPath: string;
  llmType: LlmType | undefined;
}

interface RuntimeOptions {
  assistantToolParams: KibanaClientToolParams;
}
export class KibanaClientTool extends OpenApiTool<RuntimeOptions> {
  private copiedHeaderNames = [
    'accept-encoding',
    'accept-language',
    'accept',
    'content-type',
    'cookie',
    'kbn-build-number',
    'kbn-version',
    'origin',
    'referer',
    'user-agent',
    'x-elastic-internal-origin',
    'x-elastic-product-origin',
    'x-kbn-context',
  ];
  protected options: Options;

  protected constructor({
    options = defaultOptions,
    dereferencedOas,
  }: {
    options: Options;
    dereferencedOas: Oas;
  }) {
    super({
      dereferencedOas,
      llmType: options.llmType,
    });

    this.options = options;
  }

  static getKibanaOpenApiSpec(buildFlavor: BuildFlavor) {
    if (buildFlavor === 'serverless') {
      return kibanaServerlessOpenApiSpec;
    }
    if (buildFlavor === 'traditional') {
      return kibanaOpenApiSpec;
    }
    return undefined;
  }

  static async create(args?: { options?: Partial<Options> }) {
    const options = {
      ...defaultOptions,
      ...(args?.options ?? {}),
    };
    const yamlOpenApiSpec = await fs.promises.readFile(options.apiSpecPath, 'utf8');
    const jsonOpenApiSpec = await parse(yamlOpenApiSpec);
    const dereferencedOas = new Oas(jsonOpenApiSpec);
    await dereferencedOas.dereference();
    return new this({
      options,
      dereferencedOas,
    });
  }

  protected getRootToolDetails(args: RuntimeOptions): { name: string; description: string } {
    return {
      name: 'kibana_client',
      description:
        'This function interacts with the Kibana API. It takes a natural language request,' +
        ' finds out the correct endpoint to call and returns the result of the API call. This function ' +
        'should be used when the user requests information, configurations or changes in Kibana.',
    };
  }

  protected async getToolForOperation({
    operation,
    assistantToolParams,
  }: RuntimeOptions & { operation: Operation }) {
    return tool(
      async (input, config) => {
        const { request, assistantContext } = assistantToolParams;
        const { origin } = request.rewrittenUrl || request.url;

        const pathname = StdUriTemplate.expand(operation.path, input.path);

        const pathnameWithBasePath = path.posix.join(
          assistantContext.getServerBasePath(),
          pathname
        );

        const serializedQuery = Object.entries(input.query ?? {}).map(([key, value]) => {
          const shouldStringify = typeof value === 'object' && value !== null;
          return [key, shouldStringify ? JSON.stringify(value) : value] as [string, string];
        });

        const params = new URLSearchParams(serializedQuery);
        const url = new URL(pathnameWithBasePath, origin);
        url.search = params.toString();

        const headers = pickBy(request.headers, (value, key) => {
          return (
            this.copiedHeaderNames.includes(key.toLowerCase()) ||
            key.toLowerCase().startsWith('sec-')
          );
        });

        try {
          const result = await axios({
            method: operation.method.toUpperCase(),
            headers: { ...input.header, ...headers, 'kbn-xsrf': 'mock-kbn-xsrf' },
            url: url.toString(),
            data: input.body ? JSON.stringify(input.body) : undefined,
          });

          return new Command({
            goto: END, // This is not working, potential bug in langchain
            update: {
              messages: [
                new ToolMessage({
                  content: JSON.stringify(result.data),
                  tool_call_id: config.toolCall.id,
                }),
              ],
            },
          });
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status && status >= 400 && status < 500) {
              return new Command({
                goto: 'agent',
                update: {
                  messages: [
                    new ToolMessage({
                      content: `Client error: ${status} - ${
                        error.response?.data?.message || error.message
                      }`,
                      tool_call_id: config.toolCall.id,
                    }),
                  ],
                },
              });
            }
          }
          throw error;
        }
      },
      {
        name: formatToolName(operation.getOperationId()),
        description:
          [
            operation.getDescription(),
            ...operation
              .getTags()
              .map((tag) => tag.description)
              .filter((tag) => !!tag),
          ].join('\n') || operation.getOperationId(),
        tags: operation.getTags().map((tag) => tag.name),
        verboseParsingErrors: true,
        schema: this.getParametersAsZodSchema({
          operation,
        }),
      }
    );
  }

  protected async getInternalNode(
    args: RuntimeOptions & {
      tools: Promise<StructuredToolInterface[]>;
      name: string;
      description: string;
    }
  ): Promise<StructuredToolInterface> {
    const { tools, name, description, assistantToolParams } = args;
    return tool(
      async ({ input }) => {
        const agent = createReactAgent({
          llm: assistantToolParams.createLlmInstance(),
          tools: await tools,
        });
        const inputs = {
          messages: [
            new SystemMessage({
              content:
                'You are Kibana API Client agent. You are an expert in using functions that call' +
                ' the Kibana APIs. Use the functions at your disposal to action requested by the user. ' +
                'You do not need to confirm with the user before using a function. If the tool' +
                ' input did not match expected schema, try to fix it and call the tool again.' +
                ' In your response include all the information from the function result. Try fixing any ' +
                'malformed function calls.',
            }),
            new HumanMessage({ content: input }),
          ],
        };
        const result = await agent.invoke(inputs);
        const lastMessage = result.messages[result.messages.length - 1];

        return lastMessage;
      },
      {
        name,
        description,
        verboseParsingErrors: true,
        schema: z.object({
          input: z
            .string()
            .describe(
              'The action that should be performed and any relevant information provided in the conversation. Include as much detail as possible.'
            ),
        }),
      }
    );
  }

  protected getParserOverride(
    schema: JsonSchemaObject,
    refs: Refs,
    jsonSchemaToZodWithParserOverride: (schema: JsonSchema) => z.ZodTypeAny
  ) {
    if (
      schema.properties &&
      schema.properties['kbn-xsrf'] &&
      Array.isArray(schema.required) &&
      schema.required.includes('kbn-xsrf')
    ) {
      // Remove kbn-xsrf from required properties, it will be added to headers manually
      schema.required = schema.required.filter((item) => item !== 'kbn-xsrf');
      return jsonSchemaToZodWithParserOverride(schema);
    }
    return super.getParserOverride(schema, refs, jsonSchemaToZodWithParserOverride);
  }
}

export const getMemoizedKibanaClientTool = memoize(
  (...args: Parameters<typeof KibanaClientTool.create>) => KibanaClientTool.create(...args),
  (...[args]) => {
    return `${args?.options?.apiSpecPath}:${args?.options?.llmType}`;
  }
);
