/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';

describe('useDataView', () => {
  it('should return correct dataView from the store, based on the provided scope', () => {
    const wrapper = renderHook((scope) => useDataView(scope), {
      wrapper: TestProviders,
      initialProps: DataViewManagerScopeName.default,
    });

    expect(wrapper.result.current.status).toEqual('ready');
    expect(wrapper.result.current.dataView).toMatchObject({
      id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
    });

    wrapper.rerender(DataViewManagerScopeName.timeline);

    expect(wrapper.result.current.status).toEqual('ready');
    expect(wrapper.result.current.dataView).toMatchObject({
      id: 'mock-timeline-data-view',
    });
  });
});
