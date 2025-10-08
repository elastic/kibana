/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdatedColumn } from './updated';

describe('createUpdatedColumn', () => {
  it('returns the correct column definition', () => {
    const column = createUpdatedColumn();
    expect(column).toEqual({
      field: 'updated_at',
      name: 'Updated',
      sortable: true,
      truncateText: true,
      width: '10%',
      align: 'center',
      render: expect.any(Function),
    });
  });
});
