/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  editablePolicy,
  emptyPolicy,
  parseToolNames,
  previewPolicyMatch,
  validatePolicy,
} from './policy_form';

const input = { ...emptyPolicy(), name: 'Protected file', inputContains: 'private.csv' };

describe('AI policy form', () => {
  it('requires a source and at least one condition, without accepting whitespace as a condition', () => {
    expect(validatePolicy({ ...input, providers: [], inputContains: ' ' })).toHaveLength(2);
    expect(validatePolicy(input)).toEqual([]);
    expect(validatePolicy({ ...input, toolNames: ['read_file'], inputContains: '' })).toEqual([]);
  });

  it('requires both exact tool and literal case-insensitive input conditions on the selected provider', () => {
    const policy = { ...input, toolNames: ['read_file'] };
    expect(previewPolicyMatch(policy, 'cursor', 'read_file', '{"path":"PRIVATE.csv"}')).toBe(true);
    expect(previewPolicyMatch(policy, 'cursor', 'read_file', 'public.csv')).toBe(false);
    expect(previewPolicyMatch(policy, 'cursor', 'read_file_extra', 'private.csv')).toBe(false);
    expect(previewPolicyMatch(policy, 'codex', 'read_file', 'private.csv')).toBe(false);
    expect(
      previewPolicyMatch({ ...input, inputContains: '.*' }, 'cursor', 'read_file', 'private.csv')
    ).toBe(false);
  });

  it('allows a disabled policy to preview its conditions without implying it will detect', () => {
    expect(
      previewPolicyMatch({ ...input, enabled: false }, 'cursor', 'read_file', 'private.csv')
    ).toBe(true);
  });

  it('normalizes comma-delimited tool names and enforces API bounds', () => {
    expect(parseToolNames('read_file, read_file , exec_command, ')).toEqual([
      'read_file',
      'exec_command',
    ]);
    expect(
      validatePolicy({
        ...input,
        toolNames: Array.from({ length: 21 }, (_, index) => `tool-${index}`),
      })
    ).toHaveLength(1);
    expect(validatePolicy({ ...input, toolNames: ['a'.repeat(201)] })).toHaveLength(1);
  });

  it('does not send server-owned revision or identity fields back as editable policy data', () => {
    expect(
      editablePolicy({
        ...input,
        id: 'policy-1',
        version: 4,
        createdAt: 'created',
        updatedAt: 'updated',
        effectiveFrom: 'effective',
        createdBy: 'James',
        updatedBy: 'James',
      })
    ).toEqual(input);
  });
});
