/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNameColumn } from './name';

describe('createNameColumn', () => {
  it('returns the correct column definition', () => {
    const column = createNameColumn({
      openMigrationRuleDetails: jest.fn(),
    });

    expect(column).toEqual({
      field: 'elastic_rule.title',
      name: expect.anything(),
      render: expect.any(Function),
      sortable: true,
      truncateText: true,
      width: '40%',
      align: 'left',
    });
  });
});
