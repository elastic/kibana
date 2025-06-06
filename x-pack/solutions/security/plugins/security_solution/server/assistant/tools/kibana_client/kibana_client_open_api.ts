/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { castArray, first, memoize, pick, pickBy } from 'lodash';
import { StdUriTemplate } from '@std-uritemplate/std-uritemplate';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import path from 'path';
import Oas from 'oas';
import { parse as yamlParse } from 'yaml';
import type { BuildFlavor } from '@kbn/config';
import axios, { isAxiosError } from 'axios';
import type { LlmType } from '@kbn/elastic-assistant-plugin/server/types';
import { Command } from '@langchain/langgraph';
import type { JsonSchema, JsonSchemaObject, Refs } from '@n8n/json-schema-to-zod';
import { REPO_ROOT } from '@kbn/repo-info';
import { format, URL } from 'url';
import { OpenApiTool } from '../../../utils/open_api_tool/open_api_tool';
import type { KibanaClientToolParams } from './kibana_client_tool';
import { formatToolName, type Operation } from '../../../utils/open_api_tool/utils';

export const kibanaServerlessOpenApiSpec = path.resolve(
  REPO_ROOT,
  './oas_docs/output/kibana.serverless.yaml'
);
export const kibanaOpenApiSpec = path.resolve(REPO_ROOT, './oas_docs/output/kibana.yaml');

const routeRegex = /\/internal\/elastic_assistant\/actions\/connector\/[^/]+\/_execute/;

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
    const jsonOpenApiSpec = await yamlParse(yamlOpenApiSpec);
    const dereferencedOas = new Oas(jsonOpenApiSpec);
    await dereferencedOas.dereference();
    return new this({
      options,
      dereferencedOas,
    });
  }

  protected getRootToolDetails(): { name: string; description: string } {
    return {
      name: 'kibana_client',
      description:
        'This function interacts with the Kibana API. It takes a natural language input, \
finds out the correct endpoints to call and returns the result of the API call. This function \
should be used when the USER requests information, configurations or changes in Kibana. Provide \
as much information as possible in the input.\n\
1. This function should not be called in parallel.\
2. As input you can provide a task that involves multiple steps e.g. do X and then do Y. The function able \
to split the task into multiple steps and call the API for each step.\
',
    };
  }

  protected async getToolForOperation({
    operation,
    assistantToolParams,
  }: RuntimeOptions & { operation: Operation }) {
    const { request } = assistantToolParams;
    const { protocol, host, pathname: pathnameFromRequest } = request.rewrittenUrl || request.url;

    if (pathnameFromRequest.match(routeRegex) === null) {
      throw new Error(
        `The Kibana client tool is not supported for this request. The request URL does not match the expected pattern.`
      );
    }

    return tool(
      async (input, config) => {
        const origin = first(castArray(request.headers.origin));

        const pathname = StdUriTemplate.expand(operation.path, input.path);

        const nextUrl = {
          host,
          protocol,
          ...(origin ? pick(new URL(origin), 'host', 'protocol') : {}),
          pathname: pathnameFromRequest.replace(routeRegex, pathname),
          query: input.query ? (input.query as Record<string, string>) : undefined,
        };

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
            url: format(nextUrl),
            data: input.body ? JSON.stringify(input.body) : undefined,
          });

          return new Command({
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
          if (isAxiosError(error)) {
            const status = error.response?.status;
            if (status && status >= 400 && status < 500) {
              return new Command({
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
      async ({ input }, config) => {
        const agent = createReactAgent({
          llm: assistantToolParams.createLlmInstance(),
          tools: await tools,
        });
        const inputs = {
          messages: [
            new SystemMessage({
              content:
                'You are a powerful Kibana agent who is an expert in using the Kibana API. Kibana is the open-source data visualization and management tool for Elasticsearch.\
You are assisting a security analyst helping them complete various tasks. Act within the context of being a security analyst.\n\n\
<tool_calling> You have functions at your disposal that you can use. The functions map to the public Kibana REST endpoints.\n\
1. ALWAYS follow the schema specified by the function and infer parameters from the conversation context.\n\
2. If your function input is malformed or there is a client error, fix your mistake and try again. Try to fix the error 5 times.\n\
3. When possible split the task into separate steps and call the functions to complete each step one at a time. For example, create a case and add a comment, has 2 steps (first the case needs to be created, then the comment needs to be added to the case).\n\
4. You do not need to ask the user for confirmation before completing the step.\n\
5. Once a step has been completed without any errors, do not repeat that step.\n\
6. Once all the steps have been completed, include all of the important values from the function responses in your final response (such as ids, dates, content, description, etc...). \n\
7. If there is no suitable function for the task or step, state in your response that you were unable to complete the task with a one line description of that task.\n\
8. NEVER refer to tool names when speaking to the USER. Explain what you did in a human readable way.\n\
9. In your response, summarize the function results.\n\
</tool_calling>\n',
            }),
            new HumanMessage({ content: input }),
          ],
        };

        const result = await agent.invoke(inputs);
        const lastMessage = result.messages[result.messages.length - 1];

        return lastMessage.content;
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
