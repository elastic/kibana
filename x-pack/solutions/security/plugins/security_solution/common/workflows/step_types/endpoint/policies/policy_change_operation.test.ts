/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assessPolicyChangeParamsSchema,
  policyChangeOperationSchema,
} from './policy_change_operation';

describe('policy change operation schema', () => {
  it('forwards raw set_field values including non-boolean JSON types', () => {
    for (const value of [0, null]) {
      expect(
        policyChangeOperationSchema.parse({
          op: 'set_field',
          path: 'linux.events.session_data',
          value,
        })
      ).toEqual({
        op: 'set_field',
        path: 'linux.events.session_data',
        value,
      });
    }
  });

  it('rejects unknown ops, extra keys, and unbounded identifiers', () => {
    expect(() =>
      policyChangeOperationSchema.parse({
        op: 'apply_change',
        path: 'windows.malware.mode',
        value: true,
      })
    ).toThrow();
    expect(() =>
      policyChangeOperationSchema.parse({
        op: 'set_field',
        path: 'windows.malware.mode',
        value: true,
        extra: true,
      })
    ).toThrow();
    expect(() =>
      assessPolicyChangeParamsSchema.parse({
        idOrName: '',
        changes: [{ op: 'set_field', path: 'windows.malware.mode', value: true }],
      })
    ).toThrow();
    expect(() =>
      assessPolicyChangeParamsSchema.parse({
        idOrName: 'p',
        changes: [],
      })
    ).toThrow();
    expect(() =>
      assessPolicyChangeParamsSchema.parse({
        idOrName: 'p',
        changes: Array.from({ length: 51 }, () => ({
          op: 'set_field',
          path: 'windows.malware.mode',
          value: true,
        })),
      })
    ).toThrow();
  });
});
