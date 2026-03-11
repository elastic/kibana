/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionsColumn } from './actions';

const mockInstallDashboard = jest.fn();

describe('createActionsColumn', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the correct column definition', () => {
    const column = createActionsColumn({
      installDashboard: mockInstallDashboard,
    });

    expect(column).toEqual({
      width: '10%',
      align: 'left',
      field: 'elastic_dashboard',
      name: expect.anything(),
      render: expect.any(Function),
    });
  });
});
