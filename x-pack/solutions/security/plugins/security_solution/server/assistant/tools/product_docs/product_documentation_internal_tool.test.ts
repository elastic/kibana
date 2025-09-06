/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { productDocumentationInternalTool } from './product_documentation_internal_tool';

describe('productDocumentationInternalTool', () => {
  it('should return a valid BuiltinToolDefinition', () => {
    const tool = productDocumentationInternalTool();

    expect(tool).toMatchObject({
      id: '.product-documentation-internal-tool',
      description: expect.stringContaining('Use this tool to retrieve documentation'),
      tags: ['product-documentation', 'documentation', 'elastic'],
    });

    expect(tool.schema).toBeInstanceOf(z.ZodObject);
  });

  it('should have correct schema structure', () => {
    const tool = productDocumentationInternalTool();
    const schema = tool.schema as z.ZodObject<any>;

    expect(schema.shape).toHaveProperty('query');
    expect(schema.shape.query).toBeInstanceOf(z.ZodString);
    expect(schema.shape).toHaveProperty('product');
    expect(schema.shape.product).toBeInstanceOf(z.ZodEnum);
    expect(schema.shape).toHaveProperty('connectorId');
    expect(schema.shape.connectorId).toBeInstanceOf(z.ZodString);
  });

  it('should have a handler function', () => {
    const tool = productDocumentationInternalTool();
    expect(typeof tool.handler).toBe('function');
  });

  it('should have correct tool ID format (starts with dot)', () => {
    const tool = productDocumentationInternalTool();
    expect(tool.id).toMatch(/^\.[a-z-]+$/);
  });

  it('should have correct product enum values', () => {
    const tool = productDocumentationInternalTool();
    const schema = tool.schema as z.ZodObject<any>;
    const productEnum = schema.shape.product as z.ZodEnum<[string, ...string[]]>;
    
    expect(productEnum._def.values).toEqual(['kibana', 'elasticsearch', 'observability', 'security']);
  });
});
