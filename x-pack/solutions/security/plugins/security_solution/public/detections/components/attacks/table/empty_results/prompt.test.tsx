/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EmptyResultsPrompt,
  EMPTY_RESULTS_PROMPT_TITLE_TEST_ID,
  EMPTY_RESULTS_PROMPT_BODY_TEST_ID,
  EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID,
} from './prompt';
import * as i18n from './translations';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('EmptyResultsPrompt', () => {
  const openSchedulesFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    const { getByTestId, getByText } = renderWithIntl(
      <EmptyResultsPrompt openSchedulesFlyout={openSchedulesFlyout} />
    );

    expect(getByTestId(EMPTY_RESULTS_PROMPT_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByText(i18n.NO_RESULTS_MATCH_YOUR_SEARCH)).toBeInTheDocument();

    expect(getByTestId(EMPTY_RESULTS_PROMPT_BODY_TEST_ID)).toBeInTheDocument();
    expect(getByText(i18n.HERE_ARE_SOME_THINGS_TO_TRY)).toBeInTheDocument();
    expect(getByText(i18n.EXPAND_THE_TIME_RANGE)).toBeInTheDocument();
    expect(getByText(i18n.CHECK_FILTERS_CONTROLS_SEARCH_BAR)).toBeInTheDocument();

    expect(getByTestId(EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID)).toBeInTheDocument();
  });

  test('calls openSchedulesFlyout when the schedule link is clicked', () => {
    const { getByTestId } = renderWithIntl(
      <EmptyResultsPrompt openSchedulesFlyout={openSchedulesFlyout} />
    );

    fireEvent.click(getByTestId(EMPTY_RESULTS_PROMPT_SCHEDULES_LINK_TEST_ID));
    expect(openSchedulesFlyout).toHaveBeenCalledTimes(1);
  });
});
