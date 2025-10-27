/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNameColumn } from './name';

describe('createNameColumn', () => {
  it('returns the correct column definition', () => {
    const column = createNameColumn({ openDashboardDetailsFlyout: () => {} });

    expect(column).toEqual({
      align: 'left',
      field: 'original_dashboard.title',
      name: 'Name',
      render: expect.any(Function),
      sortable: true,
      truncateText: true,
      width: '50%',
    });
  });
});
