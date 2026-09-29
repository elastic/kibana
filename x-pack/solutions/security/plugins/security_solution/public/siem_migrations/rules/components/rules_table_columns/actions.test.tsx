/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { createActionsColumn } from './actions';

const mockInstallRule = vi.fn();
const mockOpenRuleDetails = vi.fn();

describe('createActionsColumn', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the correct column definition', () => {
    const column = createActionsColumn({
      installMigrationRule: mockInstallRule,
      openMigrationRuleDetails: mockOpenRuleDetails,
      disableActions: false,
    });

    expect(column).toEqual({
      field: 'elastic_rule',
      name: expect.anything(),
      render: expect.any(Function),
      align: 'center',
      width: '10%',
    });
  });
});
