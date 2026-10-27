/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createFlagRequestSchema, flagSchema, ruleSchema } from './flags';
import { createEnvironmentRequestSchema } from './environments';
import { observedAttributesQuerySchema } from './observed_contexts';

describe('feature flags schemas', () => {
  it('parses recursive rules', () => {
    const result = createFlagRequestSchema.safeParse({
      key: 'my.flag',
      value_type: 'boolean',
      variations: [true, false],
      apps: ['kibana'],
      team_owner: '@elastic/kibana-core',
      created_by: { username: 'someone' },
      environments: {
        production: {
          default: false,
          rules: [
            {
              type: 'match',
              attribute: 'org',
              operator: 'in',
              values: ['elastic'],
              rules: [{ type: 'percentage', per_attribute: 'key', percentages: { true: 100 } }],
            },
          ],
        },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.tags).toEqual([]);
    expect(result.data).not.toHaveProperty('team_owner');
    expect(result.data).not.toHaveProperty('created_by');
  });

  it('rejects keys that are not URL-safe', () => {
    expect(createEnvironmentRequestSchema.safeParse({ key: 'Prod:1', name: 'x' }).success).toBe(
      false
    );
  });

  it('does not accept server-owned fields on create', () => {
    const result = createEnvironmentRequestSchema.safeParse({
      key: 'production',
      name: 'Production',
      created_at: '2000-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('created_at');
  });

  it('accepts one app or several for attribute suggestions', () => {
    expect(
      observedAttributesQuerySchema.safeParse({ app: 'kibana', environment: 'production' }).success
    ).toBe(true);
    const combined = observedAttributesQuerySchema.safeParse({
      app: ['kibana', 'security'],
      environment: 'production',
    });
    expect(combined.success).toBe(true);
    expect(combined.data?.app).toEqual(['kibana', 'security']);
  });

  it('converts to JSON schema with a named recursive rule component', () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(flagSchema, { io: 'output' }));
    expect(jsonSchema).toContain('FeatureFlagsRule');
    expect(() => z.toJSONSchema(ruleSchema)).not.toThrow();
  });
});
