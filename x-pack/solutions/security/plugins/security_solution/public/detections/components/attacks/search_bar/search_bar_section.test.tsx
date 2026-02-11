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

import { TestProviders } from '../../../../common/mock';
import { SEARCH_BAR_TEST_ID, SearchBarSection } from './search_bar_section';

jest.mock('../../../../common/components/filters_global', () => ({
  FiltersGlobal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'attacks-page-search-bar'} />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('<SearchBarSection />', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarSection dataView={dataView} />
      </TestProviders>
    );

    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
  });
});
