/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exceptionEntrySchema, exceptionItemBaseSchema } from './exception_item_schemas';

describe('exceptionItemBaseSchema entries', () => {
  const item = (entries: unknown[]) => ({ name: 'Item', description: '', entries });

  it('rejects an item without a description (required by the API)', () => {
    expect(
      exceptionItemBaseSchema.safeParse({
        name: 'Item',
        entries: [{ field: 'host.name', operator: 'is', value: 'a' }],
      }).success
    ).toBe(false);
  });

  it('accepts a lone value-list entry', () => {
    const single = item([
      { field: 'source.ip', operator: 'is_in_list', list: { id: 'ips', type: 'ip' } },
    ]);

    expect(exceptionItemBaseSchema.safeParse(single).success).toBe(true);
  });

  it('accepts multiple value-list entries', () => {
    const multiple = item([
      { field: 'source.ip', operator: 'is_in_list', list: { id: 'ips', type: 'ip' } },
      { field: 'destination.ip', operator: 'is_not_in_list', list: { id: 'ips', type: 'ip' } },
    ]);

    expect(exceptionItemBaseSchema.safeParse(multiple).success).toBe(true);
  });

  it('rejects mixing a value-list entry with other condition types (API constraint)', () => {
    const mixed = item([
      { field: 'user.name', operator: 'is', value: 'svc-scanner' },
      { field: 'source.ip', operator: 'is_in_list', list: { id: 'ips', type: 'ip' } },
    ]);

    expect(exceptionItemBaseSchema.safeParse(mixed).success).toBe(false);
  });
});

describe('exceptionEntrySchema', () => {
  it.each([
    ['is', { field: 'host.name', operator: 'is', value: 'my-host' }],
    ['is_not', { field: 'user.name', operator: 'is_not', value: 'root' }],
    ['matches', { field: 'file.path', operator: 'matches', value: 'C:\\temp\\*' }],
    ['does_not_match', { field: 'file.path', operator: 'does_not_match', value: '*.tmp' }],
    ['is_one_of', { field: 'user.name', operator: 'is_one_of', values: ['svc-a', 'svc-b'] }],
    ['is_not_one_of', { field: 'user.name', operator: 'is_not_one_of', values: ['a'] }],
    ['exists', { field: 'agent.id', operator: 'exists' }],
    ['does_not_exist', { field: 'agent.id', operator: 'does_not_exist' }],
    ['is_in_list', { field: 'source.ip', operator: 'is_in_list', list: { id: 'ips', type: 'ip' } }],
    [
      'is_not_in_list',
      { field: 'source.ip', operator: 'is_not_in_list', list: { id: 'ips', type: 'ip' } },
    ],
  ])('accepts a valid %s entry', (_, entry) => {
    expect(exceptionEntrySchema.safeParse(entry).success).toBe(true);
  });

  it.each([
    ['is without value', { field: 'host.name', operator: 'is' }],
    ['matches without value', { field: 'file.path', operator: 'matches' }],
    ['is_one_of without values', { field: 'user.name', operator: 'is_one_of' }],
    ['is_in_list without list', { field: 'source.ip', operator: 'is_in_list' }],
    ['is with values', { field: 'host.name', operator: 'is', value: 'a', values: ['b'] }],
    ['is_one_of with value', { field: 'user.name', operator: 'is_one_of', value: 'a' }],
    ['exists with value', { field: 'agent.id', operator: 'exists', value: 'a' }],
    [
      'is_in_list with value',
      { field: 'source.ip', operator: 'is_in_list', value: 'a', list: { id: 'ips', type: 'ip' } },
    ],
    ['missing operator', { field: 'host.name', value: 'a' }],
    ['unknown operator', { field: 'host.name', operator: 'equals', value: 'a' }],
    ['API-style entry type', { type: 'match', field: 'host.name', value: 'a' }],
    [
      'unknown value list type',
      { field: 'a', operator: 'is_in_list', list: { id: 'ips', type: 'nope' } },
    ],
    // nested entries are intentionally unsupported; see exceptionEntrySchema
    [
      'nested entry',
      {
        field: 'process.Ext.code_signature',
        operator: 'nested',
        entries: [{ field: 'subject_name', operator: 'is', value: 'Microsoft Windows' }],
      },
    ],
  ])('rejects %s', (_, entry) => {
    expect(exceptionEntrySchema.safeParse(entry).success).toBe(false);
  });
});
