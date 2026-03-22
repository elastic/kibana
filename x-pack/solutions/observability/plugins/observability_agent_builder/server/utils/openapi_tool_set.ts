/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { ToolSchema, ToolSchemaType } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';

export type OperationObject = OpenAPIV3.OperationObject & {
  path: string;
  method: OpenAPIV3.HttpMethods;
  endpoint: string;
  components: OpenAPIV3.ComponentsObject;
};

export type ConsoleRequest = string | { command: string; body: unknown };

type ToolHandler = (
  args: Record<string, unknown>,
  esClient: IScopedClusterClient
) => Promise<{ response?: unknown; consoleRequest: ConsoleRequest; error?: string }>;

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

/**
 * Resolves $refs in an OpenAPI operation object by replacing references with their resolved content.
 * Uses the operation's `components` to resolve `#/components/...` references.
 */
function resolveOperationRefs(
  operation: OperationObject,
  excludeKeys: string[] = []
): OperationObject {
  const resolvedCache = new Map<string, unknown>();
  const inFlightRefs = new Set<string>();
  const excludeKeySet = new Set(excludeKeys);
  const root: Record<string, unknown> = { components: operation.components };

  function resolveRef(ref: string): unknown {
    if (!ref.startsWith('#/')) {
      return null;
    }

    const segments = ref.slice(2).split('/');
    let current: unknown = root;

    for (const segment of segments) {
      if (typeof current !== 'object' || current === null) {
        return null;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (typeof current !== 'object' || current === null) {
      return null;
    }

    return current;
  }

  function recursiveResolve(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => recursiveResolve(item));
    }

    const objRecord = obj as Record<string, unknown>;

    if ('$ref' in objRecord && typeof objRecord.$ref === 'string') {
      const ref = objRecord.$ref;

      if (resolvedCache.has(ref)) {
        return resolvedCache.get(ref);
      }

      if (inFlightRefs.has(ref)) {
        return { description: `(circular ref: ${ref})` };
      }

      const resolved = resolveRef(ref);
      if (resolved) {
        inFlightRefs.add(ref);
        const finalResolved = recursiveResolve(resolved);
        inFlightRefs.delete(ref);
        resolvedCache.set(ref, finalResolved);
        return finalResolved;
      }
      return objRecord;
    }

    let hasChanges = false;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(objRecord)) {
      const resolvedValue = excludeKeySet.has(key) ? value : recursiveResolve(value);
      result[key] = resolvedValue;

      if (resolvedValue !== value) {
        hasChanges = true;
      }
    }

    return hasChanges ? result : objRecord;
  }

  return recursiveResolve(operation) as OperationObject;
}

type NonArrayToolSchemaType = Exclude<ToolSchemaType, { type: 'array' }>;

const convertOpenApiSchema = (schema: OpenAPIV3.SchemaObject): ToolSchemaType => {
  if (schema.allOf) {
    const merged: OpenAPIV3.SchemaObject = { type: 'object' };
    for (const sub of schema.allOf) {
      const subSchema = sub as OpenAPIV3.SchemaObject;
      if (subSchema.properties) {
        merged.properties = { ...merged.properties, ...subSchema.properties };
      }
    }
    if (merged.properties) {
      return convertOpenApiSchema(merged);
    }
  }

  if (schema.oneOf || schema.anyOf) {
    const options = (schema.oneOf || schema.anyOf) as OpenAPIV3.SchemaObject[];
    const merged: OpenAPIV3.SchemaObject = { type: 'object' };
    for (const option of options) {
      if (option.properties) {
        merged.properties = { ...merged.properties, ...option.properties };
      }
    }
    if (merged.properties) {
      return convertOpenApiSchema(merged);
    }

    const arrayVariant = options.find((o) => o.type === 'array');
    if (arrayVariant) {
      return convertOpenApiSchema(arrayVariant);
    }
    const objectVariant = options.find((o) => o.type === 'object');
    if (objectVariant) {
      return convertOpenApiSchema(objectVariant);
    }
    const firstTyped = options.find((o) => o.type);
    if (firstTyped) {
      return convertOpenApiSchema(firstTyped);
    }
  }

  if (schema.type === 'array') {
    const itemSchema = schema.items as OpenAPIV3.SchemaObject | undefined;
    let items: NonArrayToolSchemaType | undefined;
    if (itemSchema) {
      const converted = convertOpenApiSchema(itemSchema);
      items = converted.type !== 'array' ? (converted as NonArrayToolSchemaType) : undefined;
    }
    return {
      type: 'array',
      items,
      description: schema.description,
    };
  }

  if (schema.type === 'object' || schema.properties) {
    const properties: Record<string, ToolSchemaType> = {};
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        properties[key] = convertOpenApiSchema(value as OpenAPIV3.SchemaObject);
      }
    }
    return {
      type: 'object',
      properties,
      description: schema.description,
    };
  }

  return {
    type: (schema.type as 'string') ?? 'string',
    description: schema.description,
  };
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
        description: param.description,
      };
    } else {
      properties[param.name] = {
        type: (schema.type as 'string') ?? 'string',
        description: param.description,
      };
    }
    if (param.required) required.push(param.name);
  }

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  const bodyContent = requestBody?.content?.['application/json'];
  if (bodyContent?.schema) {
    const bodySchema = bodyContent.schema as OpenAPIV3.SchemaObject;
    const bodyToolSchema = convertOpenApiSchema(bodySchema);
    if (bodyToolSchema.type === 'object') {
      properties.body = {
        ...bodyToolSchema,
        description: requestBody?.description || bodySchema.description || 'The request body',
      };

      if (bodyToolSchema.properties) {
        const bodyKeys = new Set(Object.keys(bodyToolSchema.properties));
        for (const param of parameters) {
          if (param.in === 'query' && bodyKeys.has(param.name)) {
            delete properties[param.name];
            const idx = required.indexOf(param.name);
            if (idx !== -1) required.splice(idx, 1);
          }
        }
      }
    }
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

const buildConsoleRequest = (
  operation: OperationObject,
  args: Record<string, unknown>
): ConsoleRequest => {
  const { body, ...restArgs } = args;
  const { path, method, query } = buildHttpRequest(operation, restArgs);
  const queryString = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const command = `${method.toUpperCase()} ${path}${queryString ? `?${queryString}` : ''}`;
  if (body && typeof body === 'object' && Object.keys(body as object).length > 0) {
    return { command, body };
  }
  return command;
};

const buildHandler = (operation: OperationObject): ToolHandler => {
  return async (args, esClient) => {
    const { body, ...restArgs } = args;
    const { path, method, query } = buildHttpRequest(operation, restArgs);
    const consoleRequest = buildConsoleRequest(operation, args);

    try {
      const response = await esClient.asCurrentUser.transport.request({
        method,
        path,
        querystring: Object.keys(query).length ? query : undefined,
        body: body ?? undefined,
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
      const resolvedOperation = resolveOperationRefs(operation, ['responses', 'components']);
      const tool = createTool(resolvedOperation);
      this.toolsByName.set(tool.name, tool);
      this.operationsByName.set(tool.name, resolvedOperation);
    }
  }

  getTools(): Tool[] {
    return [...this.toolsByName.values()];
  }

  getToolOperation(operationId: string): OperationObject | undefined {
    return this.operationsByName.get(operationId);
  }

  formatConsoleRequest(operationId: string, args: Record<string, unknown>): ConsoleRequest {
    const operation = this.operationsByName.get(operationId);
    if (!operation) {
      throw new Error(`No tool found for operationId: ${operationId}`);
    }
    return buildConsoleRequest(operation, args);
  }
}
