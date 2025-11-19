/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRiskScoreColumn } from './risk_score';

describe('createRiskScoreColumn', () => {
  it('returns the correct column definition', () => {
    const column = createRiskScoreColumn();

    expect(column).toEqual({
      field: 'elastic_rule.risk_score',
      name: 'Risk score',
      sortable: true,
      truncateText: true,
      width: '10%',
      render: expect.any(Function),
    });
  });
});
