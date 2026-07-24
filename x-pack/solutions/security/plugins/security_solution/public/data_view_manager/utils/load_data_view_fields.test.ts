/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import { loadDataViewFields } from './load_data_view_fields';

describe('loadDataViewFields', () => {
  let mockDataViews: Partial<DataViewsServicePublic>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataViews = {
      get: jest.fn(),
      refreshFields: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('refreshes and returns the data view when it has no fields', async () => {
    const dataView = { id: 'explore-dv', fields: [] as unknown[] };
    jest.mocked(mockDataViews.get!).mockResolvedValue(dataView as never);

    const result = await loadDataViewFields(mockDataViews as DataViewsServicePublic, 'explore-dv');

    expect(mockDataViews.get).toHaveBeenCalledWith('explore-dv', false);
    expect(mockDataViews.refreshFields).toHaveBeenCalledWith(dataView, false);
    expect(result).toBe(dataView);
  });

  it('returns null without refreshing when the data view already has fields', async () => {
    const dataView = { id: 'explore-dv', fields: [{ name: '@timestamp' }] };
    jest.mocked(mockDataViews.get!).mockResolvedValue(dataView as never);

    const result = await loadDataViewFields(mockDataViews as DataViewsServicePublic, 'explore-dv');

    expect(mockDataViews.get).toHaveBeenCalledWith('explore-dv', false);
    expect(mockDataViews.refreshFields).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('propagates errors from the underlying data views service', async () => {
    jest.mocked(mockDataViews.get!).mockRejectedValue(new Error('field caps too large'));

    await expect(
      loadDataViewFields(mockDataViews as DataViewsServicePublic, 'explore-dv')
    ).rejects.toThrow('field caps too large');
  });
});
