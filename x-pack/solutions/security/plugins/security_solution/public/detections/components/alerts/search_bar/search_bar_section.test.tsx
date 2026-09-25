/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { SEARCH_BAR_TEST_ID, SearchBarSection } from './search_bar_section';
import { DATA_VIEW_PICKER_TEST_ID } from '../../../../common/components/search_bar/search_bar_with_data_view_picker';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'alerts-page-search-bar'} />,
}));
jest.mock('../../../../data_view_manager/components/data_view_picker', () => ({
  DataViewPicker: () => <div data-test-subj={'data-view-picker'} />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('SearchBarSection', () => {
  it('renders the data view picker next to the search bar', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarSection dataView={dataView} />
      </TestProviders>
    );

    expect(getByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
  });
});
