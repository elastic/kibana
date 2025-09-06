/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { alertCountsInternalTool } from './alert_counts_internal_tool';

describe('alertCountsInternalTool', () => {
  it('should return a valid BuiltinToolDefinition', () => {
    const tool = alertCountsInternalTool();

    expect(tool).toMatchObject({
      id: '.alert-counts-internal-tool',
      description: expect.stringContaining('Call this for the counts of last 24 hours'),
      tags: ['alerts', 'alerts-count', 'security'],
    });

    expect(tool.schema).toBeInstanceOf(z.ZodObject);
  });

  it('should have correct schema structure', () => {
    const tool = alertCountsInternalTool();
    const schema = tool.schema as z.ZodObject<any>;

    expect(schema.shape).toHaveProperty('alertsIndexPattern');
    expect(schema.shape.alertsIndexPattern).toBeInstanceOf(z.ZodString);
  });

  it('should have a handler function', () => {
    const tool = alertCountsInternalTool();
    expect(typeof tool.handler).toBe('function');
  });

  it('should have correct tool ID format (starts with dot)', () => {
    const tool = alertCountsInternalTool();
    expect(tool.id).toMatch(/^\.[a-z-]+$/);
  });
});
