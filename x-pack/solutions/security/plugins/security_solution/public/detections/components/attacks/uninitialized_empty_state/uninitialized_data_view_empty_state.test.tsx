/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID,
  UninitializedDataViewEmptyState,
} from './uninitialized_data_view_empty_state';
import * as i18n from './translations';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('UninitializedDataViewEmptyState', () => {
  const mockDataView = {
    title: 'my-pattern-*',
    name: 'My Data View',
    getName: () => 'My Data View',
    getIndexPattern: () => 'my-pattern-*',
  } as unknown as DataView;

  it('renders correctly with title and test id', () => {
    const { getByRole, getByTestId } = renderWithIntl(
      <UninitializedDataViewEmptyState dataView={mockDataView} />
    );
    expect(getByRole('heading', { level: 2 })).toHaveTextContent(
      i18n.UNINITIALIZED_DATA_VIEW_TITLE
    );
    expect(getByTestId(UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID)).toBeInTheDocument();
  });

  it('renders data view name and pattern in body', () => {
    const { getByText } = renderWithIntl(
      <UninitializedDataViewEmptyState dataView={mockDataView} />
    );
    expect(getByText(/My Data View/)).toBeInTheDocument();
    expect(getByText(/my-pattern-\*/)).toBeInTheDocument();
  });
});
