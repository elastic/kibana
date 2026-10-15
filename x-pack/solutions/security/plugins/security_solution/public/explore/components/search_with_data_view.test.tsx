/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../common/mock';
import { PageScope } from '../../data_view_manager/constants';
import { SearchWithDataView } from './search_with_data_view';

const mockDataViewPicker = jest.fn();

jest.mock('../../data_view_manager/components/data_view_picker', () => ({
  DataViewPicker: ({ scope }: { scope: string }) => {
    mockDataViewPicker(scope);
    return <div data-test-subj="mockDataViewPicker" />;
  },
}));

jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => <div data-test-subj="mockSiemSearchBar" />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('SearchWithDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the data view picker with the explore scope by default', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchWithDataView dataView={dataView} />
      </TestProviders>
    );

    expect(getByTestId('mockDataViewPicker')).toBeInTheDocument();
    expect(getByTestId('mockSiemSearchBar')).toBeInTheDocument();
    expect(mockDataViewPicker).toHaveBeenCalledWith(PageScope.explore);
  });

  it('renders the data view picker with the scope passed by the caller', () => {
    render(
      <TestProviders>
        <SearchWithDataView dataView={dataView} scope={PageScope.default} />
      </TestProviders>
    );

    expect(mockDataViewPicker).toHaveBeenCalledWith(PageScope.default);
    expect(mockDataViewPicker).not.toHaveBeenCalledWith(PageScope.explore);
  });
});
