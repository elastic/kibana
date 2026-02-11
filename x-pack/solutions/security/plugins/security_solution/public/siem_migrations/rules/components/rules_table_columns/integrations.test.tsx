/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIntegrationsColumn } from './integrations';

describe('createIntegrationsColumn', () => {
  it('returns the correct column definition', () => {
    const column = createIntegrationsColumn({
      getMigrationRuleData: jest.fn(),
    });

    expect(column).toEqual({
      width: '143px',
      align: 'center',
      field: 'elastic_rule.integration_ids',
      name: expect.anything(),
      render: expect.any(Function),
      truncateText: true,
    });
  });
});
