/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../mock';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { InputsModelId } from '../../store/inputs/constants';
import { PageScope } from '../../../data_view_manager/constants';
import {
  DATA_VIEW_PICKER_TEST_ID,
  SearchBarWithDataViewPicker,
} from './search_bar_with_data_view_picker';

const SEARCH_BAR_TEST_ID = 'search-bar-with-data-view-picker-search-bar';

jest.mock('.', () => ({
  SiemSearchBar: ({ dataTestSubj }: { dataTestSubj?: string }) => (
    <div data-test-subj={dataTestSubj} />
  ),
}));
jest.mock('../../../data_view_manager/components/data_view_picker', () => ({
  DataViewPicker: () => <div data-test-subj="data-view-picker" />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('SearchBarWithDataViewPicker', () => {
  it('renders the data view picker next to the search bar', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarWithDataViewPicker
          dataView={dataView}
          scope={PageScope.alerts}
          id={InputsModelId.global}
          dataTestSubj={SEARCH_BAR_TEST_ID}
        />
      </TestProviders>
    );

    expect(getByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
  });
});
