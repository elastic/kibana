/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAuthorColumn } from './author';

describe('createAuthorColumn', () => {
  it('returns the correct column definition', () => {
    const column = createAuthorColumn();

    expect(column).toEqual({
      width: '10%',
      field: 'elastic_rule.prebuilt_rule_id',
      name: expect.anything(),
      render: expect.any(Function),
      sortable: true,
      truncateText: true,
    });
  });
});
