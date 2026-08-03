/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkRuleSelectorSchema } from './bulk_action_schemas';

describe('bulkRuleSelectorSchema', () => {
  it('should validate a selection by ids', () => {
    const input = { ids: ['9b90200e-0314-4dc4-8799-387c78f218d4'] };
    expect(bulkRuleSelectorSchema.parse(input)).toEqual(input);
  });

  it('should validate a selection by query', () => {
    const input = { query: 'alert.attributes.tags: "noisy"' };
    expect(bulkRuleSelectorSchema.parse(input)).toEqual(input);
  });

  it('should reject providing both ids and query', () => {
    const result = bulkRuleSelectorSchema.safeParse({ ids: ['rule-1'], query: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Provide exactly one of `ids` or `query`');
  });

  it('should reject providing neither ids nor query', () => {
    const result = bulkRuleSelectorSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Provide exactly one of `ids` or `query`');
  });

  it('should reject an empty query, which would select every rule', () => {
    const result = bulkRuleSelectorSchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('query cannot be an empty string');
  });

  it('should reject an empty ids array', () => {
    const result = bulkRuleSelectorSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });
});
