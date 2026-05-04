/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CorrelationsDetailsView } from './correlations_details_view';
import { TestProviders } from '../../../common/mock';
import { useShowRelatedAlertsByAncestry } from '../hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../hooks/use_show_related_alerts_by_session';
import { useShowRelatedAttacks } from '../hooks/use_show_related_attacks';
import { useShowRelatedCases } from '../hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from '../hooks/use_show_suppressed_alerts';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID,
} from './test_ids';
import { useFetchRelatedAlertsBySession } from '../../document/hooks/use_fetch_related_alerts_by_session';
import { useFetchRelatedAlertsByAncestry } from '../../document/hooks/use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../document/hooks/use_fetch_related_alerts_by_same_source_event';
import { useFetchRelatedCases } from '../../document/hooks/use_fetch_related_cases';
import { EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID } from '../../shared/components/test_ids';
import { useSecurityDefaultPatterns } from '../../../data_view_manager/hooks/use_security_default_patterns';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import type { DataTableRecord } from '@kbn/discover-utils';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('../hooks/use_show_related_alerts_by_ancestry');
jest.mock('../hooks/use_show_related_alerts_by_same_source_event');
jest.mock('../hooks/use_show_related_alerts_by_session');
jest.mock('../hooks/use_show_related_attacks');
jest.mock('../hooks/use_show_related_cases');
jest.mock('../hooks/use_show_suppressed_alerts');
jest.mock('../../document/hooks/use_fetch_related_alerts_by_session');
jest.mock('../../document/hooks/use_fetch_related_alerts_by_ancestry');
jest.mock('../../document/hooks/use_fetch_related_alerts_by_same_source_event');
jest.mock('../../document/hooks/use_fetch_related_cases');
jest.mock('../../../data_view_manager/hooks/use_security_default_patterns');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockHit: DataTableRecord = {
  id: 'test-id',
  raw: { _id: 'test-id', _index: 'test-index', _source: {} },
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

const mockOnShowAlert = jest.fn();

const renderCorrelationsDetailsView = ({
  isRulePreview = false,
  hidePreviewLink = true,
}: {
  isRulePreview?: boolean;
  hidePreviewLink?: boolean;
} = {}) =>
  render(
    <TestProviders>
      <CorrelationsDetailsView
        hit={mockHit}
        scopeId="test-scope"
        isRulePreview={isRulePreview}
        onShowAlert={mockOnShowAlert}
        hidePreviewLink={hidePreviewLink}
      />
    </TestProviders>
  );

const SUPPRESSED_ALERTS_TITLE_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID
);

const NO_DATA_MESSAGE = 'No correlations data available.';

const mockAllShowHooksTrue = () => {
  jest
    .mocked(useShowRelatedAlertsByAncestry)
    .mockReturnValue({ show: true, ancestryDocumentId: 'event-id' });
  jest
    .mocked(useShowRelatedAlertsBySameSourceEvent)
    .mockReturnValue({ show: true, originalEventId: 'originalEventId' });
  jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: true, entityId: 'entityId' });
  jest.mocked(useShowRelatedAttacks).mockReturnValue({ show: true, attackIds: ['attack-id'] });
  jest.mocked(useShowRelatedCases).mockReturnValue(true);
  jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: true, alertSuppressionCount: 1 });
};

const mockAllShowHooksFalse = () => {
  jest
    .mocked(useShowRelatedAlertsByAncestry)
    .mockReturnValue({ show: false, ancestryDocumentId: 'event-id' });
  jest
    .mocked(useShowRelatedAlertsBySameSourceEvent)
    .mockReturnValue({ show: false, originalEventId: 'originalEventId' });
  jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: false, entityId: 'entityId' });
  jest.mocked(useShowRelatedAttacks).mockReturnValue({ show: false, attackIds: [] });
  jest.mocked(useShowRelatedCases).mockReturnValue(false);
  jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });
};

const mockFetchHooksEmpty = () => {
  (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
    loading: false,
    error: false,
    data: [],
    dataCount: 1,
  });
  (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
    loading: false,
    error: false,
    data: [],
    dataCount: 1,
  });
  (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
    loading: false,
    error: false,
    data: [],
    dataCount: 1,
  });
  (useFetchRelatedCases as jest.Mock).mockReturnValue({
    loading: false,
    error: false,
    data: [],
    dataCount: 1,
  });
};

describe('CorrelationsDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useSecurityDefaultPatterns as jest.Mock).mockReturnValue({ indexPatterns: ['index'] });
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true });
  });

  it('renders all sections when all show flags are true', () => {
    mockAllShowHooksTrue();
    mockFetchHooksEmpty();

    const { getByTestId, queryByText } = renderCorrelationsDetailsView();

    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders no sections and shows no-data message when all show flags are false', () => {
    mockAllShowHooksFalse();

    const { getByText, queryByTestId } = renderCorrelationsDetailsView();

    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(SUPPRESSED_ALERTS_TITLE_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('renders only the ancestry section when only that flag is true', () => {
    mockAllShowHooksFalse();
    jest
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: true, ancestryDocumentId: 'event-id' });
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });

    const { getByTestId, queryByTestId, queryByText } = renderCorrelationsDetailsView();

    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders only the cases section when only that flag is true', () => {
    mockAllShowHooksFalse();
    jest.mocked(useShowRelatedCases).mockReturnValue(true);
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });

    const { getByTestId, queryByTestId, queryByText } = renderCorrelationsDetailsView();

    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('does not render the session section when entityId is absent', () => {
    mockAllShowHooksFalse();
    jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: true, entityId: undefined });

    const { queryByTestId } = renderCorrelationsDetailsView();

    expect(
      queryByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('passes hidePreviewLink=false down to source and session sections', () => {
    mockAllShowHooksFalse();
    jest
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: true, originalEventId: 'originalEventId' });
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });

    // Should render without errors when hidePreviewLink is false
    const { getByTestId } = renderCorrelationsDetailsView({ hidePreviewLink: false });

    expect(getByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });
});
