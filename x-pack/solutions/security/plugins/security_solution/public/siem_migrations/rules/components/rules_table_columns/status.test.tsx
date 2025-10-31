/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatusColumn } from './status';

describe('createStatusColumn', () => {
  it('returns the correct column definition', () => {
    const column = createStatusColumn();
    expect(column).toEqual({
      field: 'translation_result',
      name: expect.anything(),
      sortable: true,
      truncateText: true,
      width: '15%',
      render: expect.any(Function),
    });
  });
});
