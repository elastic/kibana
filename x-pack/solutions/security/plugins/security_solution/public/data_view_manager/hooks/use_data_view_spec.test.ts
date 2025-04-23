/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { type DataView } from '@kbn/data-views-plugin/public';

import { DataViewManagerScopeName } from '../constants';
import { useDataViewSpec } from './use_data_view_spec';
import { useDataView } from './use_data_view';

jest.mock('./use_data_view');

describe('useDataViewSpec', () => {
  beforeEach(() => {
    jest.mocked(useDataView).mockReturnValue({
      dataView: {
        id: 'test',
        title: 'test',
        toSpec: jest.fn().mockReturnValue({ id: 'test', title: 'test' }),
      } as unknown as DataView,
      status: 'ready',
    });
  });

  it('should return correct dataView from the store, based on the provided scope', () => {
    const wrapper = renderHook((scope) => useDataViewSpec(scope), {
      initialProps: DataViewManagerScopeName.default,
    });

    expect(jest.mocked(useDataView)).toHaveBeenCalledWith(DataViewManagerScopeName.default);

    expect(wrapper.result.current).toMatchObject({
      status: expect.any(String),
      dataViewSpec: expect.objectContaining({ id: expect.any(String) }),
    });

    wrapper.rerender(DataViewManagerScopeName.timeline);
    expect(jest.mocked(useDataView)).toHaveBeenCalledWith(DataViewManagerScopeName.timeline);

    expect(wrapper.result.current).toMatchObject({
      status: expect.any(String),
      dataViewSpec: expect.objectContaining({ id: expect.any(String) }),
    });
  });
});
