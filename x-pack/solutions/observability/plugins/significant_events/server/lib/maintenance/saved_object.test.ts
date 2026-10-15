/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { backfillDisabledRules } from './saved_object';

describe('backfillDisabledRules', () => {
  it('maps legacy rule ids to the default space', () => {
    expect(backfillDisabledRules({ disabledRuleIds: ['rule-a', 'rule-b'] })).toEqual({
      attributes: {
        disabledRules: [
          { id: 'rule-a', spaceId: 'default' },
          { id: 'rule-b', spaceId: 'default' },
        ],
      },
    });
  });

  it('keeps rules that already carry a space', () => {
    expect(backfillDisabledRules({ disabledRules: [{ id: 'rule-a', spaceId: 'other' }] })).toEqual({
      attributes: { disabledRules: [{ id: 'rule-a', spaceId: 'other' }] },
    });
  });

  it('returns an empty inventory when neither field is present', () => {
    expect(backfillDisabledRules({})).toEqual({ attributes: { disabledRules: [] } });
  });
});
