/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { type DataView } from '@kbn/data-views-plugin/public';

import { DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { useFullDataView } from './use_full_data_view';

jest.mock('./use_full_data_view');

describe('useDataView', () => {
  beforeEach(() => {
    jest.mocked(useFullDataView).mockReturnValue({
      dataView: {
        id: 'test',
        title: 'test',
        toSpec: jest.fn().mockReturnValue({ id: 'test', title: 'test' }),
      } as unknown as DataView,
      status: 'ready',
    });
  });

  it('should return correct dataView from the store, based on the provided scope', () => {
    const wrapper = renderHook((scope) => useDataView(scope), {
      initialProps: DataViewManagerScopeName.default,
    });

    expect(jest.mocked(useFullDataView)).toHaveBeenCalledWith(DataViewManagerScopeName.default);

    expect(wrapper.result.current).toMatchObject({
      status: expect.any(String),
      dataView: expect.objectContaining({ id: expect.any(String) }),
    });

    wrapper.rerender(DataViewManagerScopeName.timeline);
    expect(jest.mocked(useFullDataView)).toHaveBeenCalledWith(DataViewManagerScopeName.timeline);

    expect(wrapper.result.current).toMatchObject({
      status: expect.any(String),
      dataView: expect.objectContaining({ id: expect.any(String) }),
    });
  });
});
