/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { AlertHeaderTitle } from './alert_header_title';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { TestProviders } from '../../../../common/mock';
import {
  ASSIGNEES_EMPTY_TEST_ID,
  ASSIGNEES_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
  RISK_SCORE_TITLE_TEST_ID,
  RISK_SCORE_VALUE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
  STATUS_BUTTON_TEST_ID,
  STATUS_TITLE_TEST_ID,
  TITLE_TEST_ID,
} from '../../../../flyout_v2/document/components/test_ids';
import {
  ALERT_SUMMARY_PANEL_TEST_ID,
  NOTES_TITLE_TEST_ID,
} from '../../../../flyout_v2/shared/components/test_ids';
import { useRefetchByScope } from '../../../../flyout_v2/document/hooks/use_refetch_by_scope';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../flyout_v2/document/hooks/use_refetch_by_scope');
jest.mock('../../../../flyout_v2/document/components/status', () => ({
  Status: ({ onAlertUpdated }: { onAlertUpdated?: () => void }) => (
    <>
      <div data-test-subj="securitySolutionFlyoutHeaderStatusTitle">{'Status'}</div>
      <button data-test-subj="rule-status-badge" onClick={onAlertUpdated} type="button" />
    </>
  ),
}));

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const createSearchHit = (fields: Record<string, unknown[]>) => ({
  ...mockSearchHit,
  fields: {
    ...mockSearchHit.fields,
    ...fields,
  },
});

const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
  searchHit: createSearchHit({
    'event.kind': ['signal'],
    'kibana.alert.risk_score': [0],
    'kibana.alert.rule.name': ['rule-name'],
    'kibana.alert.severity': ['low'],
  }),
} as unknown as DocumentDetailsContext;
const HEADER_TEXT_TEST_ID = `${TITLE_TEST_ID}Text`;

const renderHeader = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AlertHeaderTitle />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<AlertHeaderTitle />', () => {
  const refetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
    jest.mocked(useRefetchByScope).mockReturnValue({ refetch: refetchMock });
  });

  it('should render component', () => {
    const { getByTestId, getByText, queryByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(HEADER_TEXT_TEST_ID)).toHaveTextContent('rule-name');
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByText('Jan 1, 2020 @ 00:00:00.000')).toBeInTheDocument();
    expect(getByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(STATUS_TITLE_TEST_ID)).toHaveTextContent('Status');
    expect(getByTestId(RISK_SCORE_TITLE_TEST_ID)).toHaveTextContent('Risk score');
    expect(getByTestId(ASSIGNEES_TITLE_TEST_ID)).toHaveTextContent('Assignees');
    expect(getByTestId(NOTES_TITLE_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(STATUS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render title correctly if flyout is in preview', () => {
    const { queryByTestId, getByTestId } = renderHeader({
      ...mockContextValue,
      isRulePreview: true,
    });
    expect(getByTestId(HEADER_TEXT_TEST_ID)).toHaveTextContent('rule-name');

    expect(getByTestId(RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(STATUS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_EMPTY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_TEST_ID)).not.toBeInTheDocument();
  });

  it('refetches both table and flyout data when the alert status changes', () => {
    const refetchFlyoutData = jest.fn();
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      refetchFlyoutData,
    });

    getByTestId(STATUS_BUTTON_TEST_ID).click();

    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(refetchFlyoutData).toHaveBeenCalledTimes(1);
  });
});
