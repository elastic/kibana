/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';

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
  readonly schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
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

const convertOpenApiSchema = (schema: OpenAPIV3.SchemaObject): z.ZodTypeAny => {
  const desc = schema.description ?? '';

  if (schema.allOf) {
    const merged: OpenAPIV3.SchemaObject = { type: 'object' };
    for (const sub of schema.allOf) {
      const subSchema = sub as OpenAPIV3.SchemaObject;
      if (subSchema.properties) {
        merged.properties = { ...merged.properties, ...subSchema.properties };
      }
    }
    if (merged.properties) {
      return convertOpenApiSchema({ ...merged, description: schema.description });
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
      return convertOpenApiSchema({ ...merged, description: schema.description });
    }
    return z.any().describe(desc);
  }

  if (schema.type === 'array') {
    return z.array(z.any()).describe(desc);
  }

  if (schema.type === 'object' || schema.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const prop = value as OpenAPIV3.SchemaObject;
        shape[key] = convertOpenApiSchema(prop).optional();
      }
    }
    return z.object(shape).passthrough().describe(desc);
  }

  return z.any().describe(desc);
};

const paramToZod = (
  schema: OpenAPIV3.SchemaObject,
  description: string,
  isRequired: boolean
): z.ZodTypeAny => {
  const withOptional = (s: z.ZodTypeAny) => (isRequired ? s : s.optional());

  if (schema.enum) {
    const values = schema.enum;
    return withOptional(z.enum(values).describe(description));
  }

  switch (schema.type) {
    case 'number':
    case 'integer':
      return withOptional(z.coerce.number().describe(description));
    case 'boolean':
      return withOptional(z.coerce.boolean().describe(description));
    case 'array':
      return withOptional(z.array(z.any()).describe(description));
    case 'object':
      return withOptional(z.record(z.string(), z.any()).describe(description));
    default:
      return withOptional(z.string().describe(description));
  }
};

const buildSchema = (operation: OperationObject): z.ZodObject<Record<string, z.ZodTypeAny>> => {
  const shape: Record<string, z.ZodTypeAny> = {};
  const requiredFields = new Set<string>();
  const parameters = operation.parameters as OpenAPIV3.ParameterObject[];

  for (const param of parameters) {
    const schema = param.schema as OpenAPIV3.SchemaObject;
    const isRequired = !!param.required;
    shape[param.name] = paramToZod(schema, param.description ?? '', isRequired);
    if (isRequired) requiredFields.add(param.name);
  }

  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  const bodyContent = requestBody?.content?.['application/json'];
  if (bodyContent?.schema) {
    const bodySchema = bodyContent.schema as OpenAPIV3.SchemaObject;
    const bodyZodSchema = convertOpenApiSchema(bodySchema);
    if (bodyZodSchema instanceof z.ZodObject) {
      const bodyKeys = new Set(Object.keys(bodyZodSchema.shape));
      for (const param of parameters) {
        if (param.in === 'query' && bodyKeys.has(param.name)) {
          delete shape[param.name];
          requiredFields.delete(param.name);
        }
      }
      shape.body = bodyZodSchema
        .optional()
        .describe(requestBody?.description || bodySchema.description || 'The request body');
    }
  }

  return z.object(shape);
};

const buildHttpRequest = (
  operation: OperationObject,
  args: Record<string, unknown>
): {
  path: string;
  method: string;
  query: Record<string, string>;
  body?: Record<string, unknown>;
} => {
  let path = operation.path;
  const parameters = operation.parameters as OpenAPIV3.ParameterObject[];
  const pathParams = parameters.filter((p) => p.in === 'path');
  for (const p of pathParams) {
    if (!args[p.name] && p.required) {
      throw new Error(`Missing required path param: ${p.name}`);
    }
    const value = String(args[p.name]);
    path = path.replace(`{${p.name}}`, value);
  }

  const queryParams = parameters.filter((p) => p.in === 'query');
  const query: Record<string, string> = {};
  for (const p of queryParams) {
    if (args[p.name] != null) query[p.name] = String(args[p.name]);
  }
  return { path, method: operation.method, query, body: args.body as Record<string, unknown> };
};

const buildConsoleRequest = (
  operation: OperationObject,
  args: Record<string, unknown>
): ConsoleRequest => {
  const { body, path, method, query } = buildHttpRequest(operation, args);
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
    const { path, method, query, body } = buildHttpRequest(operation, args);
    const consoleRequest = buildConsoleRequest(operation, args);
    try {
      const response = await esClient.asCurrentUser.transport.request({
        method,
        path,
        querystring: Object.keys(query).length ? query : undefined,
        body,
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
