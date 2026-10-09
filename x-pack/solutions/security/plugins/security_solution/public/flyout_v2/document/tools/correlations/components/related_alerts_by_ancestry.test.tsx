/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { DocumentDetailsContext } from '../../../../../flyout/document_details/shared/context';
import { mockContextValue } from '../../../../../flyout/document_details/shared/mocks/mock_context';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_DATE_PICKER_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_ERROR_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
} from './test_ids';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from '../../../main/hooks/use_fetch_related_alerts_by_ancestry';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../../shared/components/test_ids';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../../data_view_manager/hooks/use_security_default_patterns';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';
import { useAlertsPrivileges } from '../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useKibana } from '../../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../../main/constants/local_storage';

jest.mock('../../../main/hooks/use_fetch_related_alerts_by_ancestry');
jest.mock('../hooks/use_paginated_alerts');
jest.mock('../../../../../common/hooks/use_experimental_features');
jest.mock('../../../../../data_view_manager/hooks/use_security_default_patterns');
jest.mock('../../../../../common/hooks/is_in_security_app');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../../common/lib/kibana');

const useAlertsPrivilegesMock = useAlertsPrivileges as jest.Mock;
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();

const documentId = 'documentId';
const scopeId = 'scopeId';
const mockOnShowAlert = jest.fn();

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID
);

const renderRelatedAlertsByAncestry = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <RelatedAlertsByAncestry
          documentId={documentId}
          scopeId={scopeId}
          onShowAlert={mockOnShowAlert}
          useLegacyExpandableFlyout={false}
        />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<RelatedAlertsByAncestry />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAlertsPrivilegesMock.mockReturnValue({
      hasAlertsRead: true,
    });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useSecurityDefaultPatterns as jest.Mock).mockReturnValue({ indexPatterns: ['index1'] });
    jest.mocked(useIsInSecurityApp).mockReturnValue(true);
    mockStorageGet.mockReturnValue(undefined);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: mockStorageGet,
          set: mockStorageSet,
        },
      },
    });
  });

  it('should render many related alerts correctly', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: ['1', '2'],
      dataCount: 2,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-01'],
            'kibana.alert.rule.name': ['Rule1'],
            'kibana.alert.reason': ['Reason1'],
            'kibana.alert.severity': ['Severity1'],
          },
        },
        {
          _id: '2',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-02'],
            'kibana.alert.rule.name': ['Rule2'],
            'kibana.alert.reason': ['Reason2'],
            'kibana.alert.severity': ['Severity2'],
          },
        },
      ],
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    expect(getByTestId(TOGGLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toBeInTheDocument();
    expect(
      getByTestId(`${CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}InvestigateInTimeline`)
    ).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render an inline error and keep the date picker mounted when the query errors', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { getByTestId, queryByTestId } = renderRelatedAlertsByAncestry();
    expect(
      getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_DATE_PICKER_TEST_ID)
    ).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_ERROR_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('should render no data message', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByText } = renderRelatedAlertsByAncestry();
    expect(getByText('No alerts related by ancestry.')).toBeInTheDocument();
  });

  it('should render the date picker above the table', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    expect(
      getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_DATE_PICKER_TEST_ID)
    ).toBeInTheDocument();
  });

  it('should use the default time range when nothing is persisted in local storage', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    renderRelatedAlertsByAncestry();

    expect(useFetchRelatedAlertsByAncestry).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: { from: 'now-1d', to: 'now' },
      })
    );
  });

  it('should use the time range persisted in local storage', () => {
    mockStorageGet.mockReturnValue({ start: 'now-7d', end: 'now-3d' });
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    renderRelatedAlertsByAncestry();

    expect(useFetchRelatedAlertsByAncestry).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: { from: 'now-7d', to: 'now-3d' },
      })
    );
  });

  it('should persist the selected time range to local storage when changed', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    renderRelatedAlertsByAncestry();

    // reveal the individual start/end date popover buttons, open the start date popover
    // (defaults to the "Relative" tab since the default start value is "now-1d"), and change
    // the relative count from 1 to 7 to simulate the user picking a new range.
    fireEvent.click(screen.getByTestId('superDatePickerShowDatesButton'));
    fireEvent.click(screen.getByTestId('superDatePickerstartDatePopoverButton'));
    fireEvent.change(screen.getByTestId('superDatePickerRelativeDateInputNumber'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(mockStorageSet).toHaveBeenCalledWith(FLYOUT_STORAGE_KEYS.ANCESTRY_ALERTS_TIME_RANGE, {
      start: 'now-7d',
      end: 'now',
    });
  });

  it('should call refetch when the refresh button is clicked without changing the range', () => {
    const refetchMock = jest.fn();
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 0,
      refetch: refetchMock,
    });
    (usePaginatedAlerts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    renderRelatedAlertsByAncestry();

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
  });
});
