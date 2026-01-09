/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EmptyResultsContainer,
  EMPTY_RESULTS_CONTAINER_DATA_TEST_ID,
  EMPTY_RESULTS_MESSAGE_DATA_TEST_ID,
  EMPTY_RESULTS_FOOTER_DATA_TEST_ID,
} from './container';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('EmptyResultsContainer', () => {
  const openSchedulesFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    const { getByTestId } = renderWithIntl(
      <EmptyResultsContainer openSchedulesFlyout={openSchedulesFlyout} />
    );

    expect(getByTestId(EMPTY_RESULTS_CONTAINER_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(EMPTY_RESULTS_MESSAGE_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(EMPTY_RESULTS_FOOTER_DATA_TEST_ID)).toBeInTheDocument();
  });
});
