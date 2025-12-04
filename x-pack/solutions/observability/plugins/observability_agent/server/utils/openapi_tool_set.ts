/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import type { OpenAPIV3 } from 'openapi-types';
import type {
  ToolDefinitions,
  ToolDefinition,
} from '@kbn/inference-common/src/chat_complete/tools';
import type { ToolSchema } from '@kbn/inference-common/src/chat_complete/tool_schema';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export type OperationObject = OpenAPIV3.OperationObject<{
  path: string;
  method: OpenAPIV3.HttpMethods;
  endpoint: string;
}>;

type ToolHandler = (
  args: any,
  toolHandlerContext: ToolHandlerContext
) => Promise<{ response?: any; console_command: string; error?: string }>;

class RestApiTool {
  private readonly operation: OperationObject;
  private readonly name: string;
  private readonly description: string;
  private readonly schema: ToolSchema;
  private readonly handler: ToolHandler;
  constructor(operation: OperationObject) {
    this.operation = operation;
    this.name = this.getOperationName(operation);
    this.description = this.getOperationDescription(operation);
    this.schema = this.getOperationSchema(operation);
    this.handler = this.getOperationHandler(operation);
  }
  getOperationHandler(operation: OperationObject): ToolHandler {
    return async (args, toolHandlerContext) => {
      const { esClient } = toolHandlerContext;

      let path = operation.path;
      const parameters = operation.parameters as OpenAPIV3.ParameterObject[];
      const pathParams = parameters.filter((p) => p.in === 'path');
      for (const p of pathParams) {
        if (!args[p.name] && p.required) {
          throw new Error(`Missing required path param: ${p.name}`);
        }
        path = path.replace(`{${p.name}}`, encodeURIComponent(args[p.name]));
      }

      const queryParams = parameters.filter((p) => p.in === 'query');
      const query: Record<string, string> = {};
      for (const p of queryParams) {
        if (args[p.name] != null) query[p.name] = args[p.name];
      }

      // equivalent command for debugging
      const consoleCommand = `${operation.method.toUpperCase()} ${path}${
        Object.keys(query).length
          ? '?' +
            Object.entries(query)
              .map(([k, v]) => `${k}=${v}`)
              .join('&')
          : ''
      }`;

      try {
        const response = await esClient.asCurrentUser.transport.request({
          method: operation.method,
          path,
          querystring: Object.keys(query).length ? query : undefined,
        });

        return {
          response,
          console_command: consoleCommand,
        };
      } catch (error) {
        return { error: error.message, console_command: consoleCommand };
      }
    };
  }

  getOperationName(operation: OperationObject): string {
    if (operation.operationId) {
      return operation.operationId;
    }
    return `${operation.method.toLowerCase()}_${operation.path}`;
  }
  getOperationDescription(operation: OperationObject): string {
    return `${operation.method.toUpperCase()} ${operation.path} - ${operation.description} - ${
      operation.summary
    }`;
  }
  getOperationSchema(operation: OperationObject): ToolSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    const parameters = operation.parameters as OpenAPIV3.ParameterObject[];
    for (const param of parameters) {
      const schema = param.schema as OpenAPIV3.SchemaObject;
      if (schema.type === 'array') {
        properties[param.name] = {
          type: 'array',
          items: {
            type: 'string',
          },
        };
      } else {
        properties[param.name] = {
          type: schema.type,
          description: param.description,
        };
      }
      if (param.required) required.push(param.name);
    }
    const schema: ToolSchema = {
      type: 'object',
      properties,
      required,
    };
    return schema;
  }

  getToolDefinition(): ToolDefinition {
    return {
      description: this.description,
      schema: this.schema,
    };
  }

  getOperation(): OperationObject {
    return this.operation;
  }

  getName(): string {
    return this.name;
  }
  getHandler(): ToolHandler {
    return this.handler;
  }
  getTool() {
    return {
      handler: this.handler,
      name: this.name,
      description: this.description,
      schema: this.schema,
    };
  }
}

export class OpenAPIToolSet {
  private readonly operations: OperationObject[];
  private readonly tools: RestApiTool[];
  constructor({ operations }: { operations: OperationObject[] }) {
    this.operations = operations;
    this.tools = this.parse(operations);
  }

  private parse(operations: OperationObject[]): RestApiTool[] {
    const tools: RestApiTool[] = [];
    for (const operation of operations) {
      tools.push(new RestApiTool(operation));
    }
    return tools;
  }

  getTools() {
    return this.tools.map((tool) => tool.getTool());
  }

  getToolDefinitions(): ToolDefinitions {
    return this.tools.reduce<ToolDefinitions>((acc: ToolDefinitions, tool: RestApiTool) => {
      acc[tool.getName()] = tool.getToolDefinition();
      return acc;
    }, {});
  }

  getTool(operationId: string): RestApiTool | undefined {
    return this.tools.find((tool) => tool.getName() === operationId);
  }

  getToolHandler(operationId: string): ToolHandler | undefined {
    return this.tools.find((tool) => tool.getName() === operationId)?.getHandler();
  }

  getToolOperation(operationId: string): OperationObject | undefined {
    return this.tools.find((tool) => tool.getName() === operationId)?.getOperation();
  }

  getToolName(operationId: string): string | undefined {
    return this.tools.find((tool) => tool.getName() === operationId)?.getName();
  }
}
