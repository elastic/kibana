/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Converts a Zod object schema to the parameters format used by observability function registration
 */
export function zodToParameters(schema: z.ZodObject<any>): {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
} {
  const shape = schema.shape;
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const property = convertZodTypeToProperty(value);
    properties[key] = property;

    // Check if the field is required (not optional)
    if (!(value instanceof z.ZodOptional)) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  } as const;
}

/**
 * Converts a Zod type to a property definition
 */
function convertZodTypeToProperty(zodType: z.ZodTypeAny): any {
  // Handle optional types
  if (zodType instanceof z.ZodOptional) {
    return convertZodTypeToProperty(zodType.unwrap());
  }

  // Handle nullable types
  if (zodType instanceof z.ZodNullable) {
    return convertZodTypeToProperty(zodType.unwrap());
  }

  // Handle union types (like enums)
  if (zodType instanceof z.ZodUnion) {
    const options = zodType.options;
    if (options.every(option => option instanceof z.ZodLiteral)) {
      return {
        type: 'string',
        enum: options.map(option => (option as z.ZodLiteral<any>).value),
      };
    }
  }

  // Handle enum types
  if (zodType instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: zodType._def.values,
    };
  }

  // Handle string types
  if (zodType instanceof z.ZodString) {
    const property: any = {
      type: 'string' as const,
    };

    // Add description if available
    if (zodType.description) {
      property.description = zodType.description;
    }

    return property;
  }

  // Handle number types
  if (zodType instanceof z.ZodNumber) {
    const property: any = {
      type: 'number' as const,
    };

    if (zodType.description) {
      property.description = zodType.description;
    }

    return property;
  }

  // Handle boolean types
  if (zodType instanceof z.ZodBoolean) {
    const property: any = {
      type: 'boolean' as const,
    };

    if (zodType.description) {
      property.description = zodType.description;
    }

    return property;
  }

  // Handle array types
  if (zodType instanceof z.ZodArray) {
    const property: any = {
      type: 'array' as const,
      items: convertZodTypeToProperty(zodType.element),
    };

    if (zodType.description) {
      property.description = zodType.description;
    }

    return property;
  }

  // Handle object types (nested objects)
  if (zodType instanceof z.ZodObject) {
    return zodToParameters(zodType);
  }

  // Handle literal types
  if (zodType instanceof z.ZodLiteral) {
    const value = zodType.value;
    if (typeof value === 'string') {
      return {
        type: 'string' as const,
        enum: [value],
      };
    }
    if (typeof value === 'number') {
      return {
        type: 'number' as const,
        enum: [value],
      };
    }
    if (typeof value === 'boolean') {
      return {
        type: 'boolean' as const,
        enum: [value],
      };
    }
  }

  // Default fallback for unknown types
  return {
    type: 'string' as const,
  };
}

/**
 * Helper function to create a complete function registration object from a Zod schema
 */
export function createFunctionFromSchema<T extends z.ZodObject<any>>(options: {
  name: string;
  description: string;
  schema: T;
  isInternal?: boolean;
  handler: (args: { arguments: z.infer<T>; connectorId?: string; simulateFunctionCalling?: boolean }) => Promise<any>;
}) {
  const { name, description, schema, isInternal = false, handler } = options;

  return {
    name,
    isInternal,
    description,
    parameters: zodToParameters(schema),
    handler,
  } as const;
}

/**
 * Example usage:
 *
 * const mySchema = z.object({
 *   query: z.string().describe('The search query'),
 *   product: z.enum(['kibana', 'elasticsearch']).optional().describe('The product to search'),
 *   limit: z.number().optional().describe('Maximum number of results'),
 * });
 *
 * const parameters = zodToParameters(mySchema);
 * // Result:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     query: { type: 'string', description: 'The search query' },
 * //     product: { type: 'string', enum: ['kibana', 'elasticsearch'], description: 'The product to search' },
 * //     limit: { type: 'number', description: 'Maximum number of results' }
 * //   },
 * //   required: ['query']
 * // }
 */
