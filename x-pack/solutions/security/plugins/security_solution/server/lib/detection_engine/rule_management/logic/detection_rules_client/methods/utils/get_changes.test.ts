/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getChanges } from './get_changes';

describe('getChanges', () => {
  it('returns empty when only runtime fields differ', () => {
    const before = getRulesSchemaMock();
    const after = {
      ...before,
      id: 'other-id',
      updated_at: '2099-01-01T00:00:00.000Z',
    };

    expect(getChanges(before, after)).toEqual([]);
  });

  it('returns enabled when enabled differs', () => {
    const before = getRulesSchemaMock();
    const after = { ...before, enabled: !before.enabled };

    expect(getChanges(before, after)).toEqual(['enabled']);
  });

  it('returns the definition fields that differ', () => {
    const before = getRulesSchemaMock();
    const after = { ...before, name: 'other name', description: 'other description' };

    expect(getChanges(before, after)).toEqual(expect.arrayContaining(['name', 'description']));
    expect(getChanges(before, after)).toHaveLength(2);
  });

  it('returns revision when revision differs', () => {
    const before = getRulesSchemaMock();
    const after = { ...before, revision: before.revision + 1 };

    expect(getChanges(before, after)).toEqual(['revision']);
  });

  it('returns empty when the only differing field is in addIgnoreFields', () => {
    const before = getRulesSchemaMock();
    const after = { ...before, enabled: !before.enabled };

    expect(getChanges(before, after, ['enabled'])).toEqual([]);
  });
});
