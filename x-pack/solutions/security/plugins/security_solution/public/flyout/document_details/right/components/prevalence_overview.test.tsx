/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import {
  PREVALENCE_TEST_ID,
  SUMMARY_ROW_TEXT_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
} from './test_ids';
import React from 'react';
import { PrevalenceOverview } from './prevalence_overview';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

jest.mock('../../shared/hooks/use_prevalence');

const mockNavigateToLeftPanel = jest.fn();
jest.mock('../../shared/hooks/use_navigate_to_left_panel');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(PREVALENCE_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(PREVALENCE_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(PREVALENCE_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(PREVALENCE_TEST_ID);

const NO_DATA_MESSAGE = 'No prevalence data available.';

const renderPrevalenceOverview = (contextValue: DocumentDetailsContext = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <PrevalenceOverview />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<PrevalenceOverview />', () => {
  beforeEach(() => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue(mockNavigateToLeftPanel);
  });

  it('should render wrapper component', () => {
    const { getByTestId, queryByTestId } = renderPrevalenceOverview();
    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Prevalence');
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render link without icon if isPreviewMode is true', () => {
    const { getByTestId, queryByTestId } = renderPrevalenceOverview({
      ...mockContextValue,
      isPreviewMode: true,
    });
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      data: [],
    });

    const { getByTestId, queryByText } = renderPrevalenceOverview();

    expect(getByTestId(EXPANDABLE_PANEL_LOADING_TEST_ID(PREVALENCE_TEST_ID))).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should render no-data message', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByText } = renderPrevalenceOverview();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should render only data with prevalence less than 10%', () => {
    const field1 = 'field1';
    const field2 = 'field2';
    const field3 = 'field3';
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          values: ['value2', 'value22'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.06,
          userPrevalence: 0.2,
        },
        {
          field: field3,
          values: ['value3'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });

    const { queryByTestId, getByTestId, queryByText } = renderPrevalenceOverview();

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Prevalence');

    const textDataTestSubj1 = SUMMARY_ROW_TEXT_TEST_ID(`${PREVALENCE_TEST_ID}${field1}`);
    const valueDataTestSubj1 = SUMMARY_ROW_VALUE_TEST_ID(`${PREVALENCE_TEST_ID}${field1}`);
    expect(getByTestId(textDataTestSubj1)).toHaveTextContent('field1, value1');
    expect(getByTestId(valueDataTestSubj1)).toHaveTextContent('Uncommon');

    const textDataTestSubj2 = SUMMARY_ROW_TEXT_TEST_ID(`${PREVALENCE_TEST_ID}${field2}`);
    const valueDataTestSubj2 = SUMMARY_ROW_VALUE_TEST_ID(`${PREVALENCE_TEST_ID}${field2}`);
    expect(getByTestId(textDataTestSubj2)).toHaveTextContent('field2, value2');
    expect(getByTestId(valueDataTestSubj2)).toHaveTextContent('Uncommon');

    const textDataTestSubj3 = SUMMARY_ROW_TEXT_TEST_ID(`${PREVALENCE_TEST_ID}${field3}`);
    const valueDataTestSubj3 = SUMMARY_ROW_VALUE_TEST_ID(`${PREVALENCE_TEST_ID}${field3}`);
    expect(queryByTestId(textDataTestSubj3)).not.toBeInTheDocument();
    expect(queryByTestId(valueDataTestSubj3)).not.toBeInTheDocument();

    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId } = renderPrevalenceOverview();

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });
});
