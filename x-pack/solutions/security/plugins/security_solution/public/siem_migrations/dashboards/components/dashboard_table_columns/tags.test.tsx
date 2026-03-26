/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTagsColumn } from './tags';

describe('createTagsColumn', () => {
  it('returns the correct column definition', () => {
    const column = createTagsColumn();

    expect(column).toEqual({
      align: 'left',
      field: 'original_dashboard.splunk_properties',
      name: expect.anything(),
      render: expect.any(Function),
      sortable: false,
      truncateText: true,
      width: '20%',
    });
  });
});
