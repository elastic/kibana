/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSeverityColumn } from './severity';

describe('createSeverityColumn', () => {
  it('returns the correct column definition', () => {
    const column = createSeverityColumn();

    expect(column).toEqual({
      field: 'elastic_rule.severity',
      name: expect.anything(),
      sortable: true,
      truncateText: true,
      width: '12%',
      render: expect.any(Function),
    });
  });
});
