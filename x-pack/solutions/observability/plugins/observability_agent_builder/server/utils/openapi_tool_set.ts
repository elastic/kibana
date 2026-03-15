/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type {
  ToolSchema,
  ToolSchemaType,
} from '@kbn/inference-common/src/chat_complete/tool_schema';
import type { IScopedClusterClient } from '@kbn/core/server';

export type OperationObject = OpenAPIV3.OperationObject & {
  path: string;
  method: OpenAPIV3.HttpMethods;
  endpoint: string;
};

type ToolHandler = (
  args: Record<string, unknown>,
  esClient: IScopedClusterClient
) => Promise<{ response?: unknown; consoleRequest: string; error?: string }>;

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly schema: ToolSchema;
  readonly handler: ToolHandler;
}

const buildName = (operation: OperationObject): string => {
  if (operation.operationId) {
    return operation.operationId;
  }
  return `${operation.method.toLowerCase()}_${operation.path}`;
};

const buildDescription = (operation: OperationObject): string => {
  return `${operation.method.toUpperCase()} ${operation.path} - ${operation.description} - ${
    operation.summary
  }`;
};

const buildSchema = (operation: OperationObject): ToolSchema => {
  const properties: Record<string, ToolSchemaType> = {};
  const required: string[] = [];
  const parameters = operation.parameters as OpenAPIV3.ParameterObject[];
  for (const param of parameters) {
    const schema = param.schema as OpenAPIV3.SchemaObject;
    if (schema.type === 'array') {
      properties[param.name] = {
        type: 'array',
        items: { type: 'string' },
      };
    } else {
      properties[param.name] = {
        type: schema.type as 'string',
        description: param.description,
      };
    }
    if (param.required) required.push(param.name);
  }
  return { type: 'object', properties, required };
};

const buildHttpRequest = (
  operation: OperationObject,
  args: Record<string, unknown>
): { path: string; method: string; query: Record<string, string> } => {
  let path = operation.path;
  const parameters = operation.parameters as OpenAPIV3.ParameterObject[];
  const pathParams = parameters.filter((p) => p.in === 'path');
  for (const p of pathParams) {
    if (!args[p.name] && p.required) {
      throw new Error(`Missing required path param: ${p.name}`);
    }
    path = path.replace(`{${p.name}}`, encodeURIComponent(String(args[p.name])));
  }

  const queryParams = parameters.filter((p) => p.in === 'query');
  const query: Record<string, string> = {};
  for (const p of queryParams) {
    if (args[p.name] != null) query[p.name] = String(args[p.name]);
  }
  return { path, method: operation.method, query };
};

const formatConsoleRequest = (
  operation: OperationObject,
  args: Record<string, unknown>
): string => {
  const { path, method, query } = buildHttpRequest(operation, args);
  const queryString = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${method.toUpperCase()} ${path}${queryString ? `?${queryString}` : ''}`;
};

const buildHandler = (operation: OperationObject): ToolHandler => {
  return async (args, esClient) => {
    const { path, method, query } = buildHttpRequest(operation, args);
    const consoleRequest = formatConsoleRequest(operation, args);

    try {
      const response = await esClient.asCurrentUser.transport.request({
        method,
        path,
        querystring: Object.keys(query).length ? query : undefined,
      });

      return { response, consoleRequest };
    } catch (error) {
      const statusCode = error.statusCode ?? error.meta?.statusCode;
      return { error: error.message, statusCode, consoleRequest };
    }
  };
};

const createTool = (operation: OperationObject): Tool => ({
  name: buildName(operation),
  description: buildDescription(operation),
  schema: buildSchema(operation),
  handler: buildHandler(operation),
});

export class OpenAPIToolSet {
  private readonly toolsByName: Map<string, Tool>;
  private readonly operationsByName: Map<string, OperationObject>;

  constructor(operations: OperationObject[]) {
    this.toolsByName = new Map();
    this.operationsByName = new Map();
    for (const operation of operations) {
      const tool = createTool(operation);
      this.toolsByName.set(tool.name, tool);
      this.operationsByName.set(tool.name, operation);
    }
  }

  getTools(): Tool[] {
    return [...this.toolsByName.values()];
  }

  getToolOperation(operationId: string): OperationObject | undefined {
    return this.operationsByName.get(operationId);
  }

  formatConsoleRequest(operationId: string, args: Record<string, unknown>): string {
    const operation = this.operationsByName.get(operationId);
    if (!operation) {
      throw new Error(`No tool found for operationId: ${operationId}`);
    }
    return formatConsoleRequest(operation, args);
  }
}
