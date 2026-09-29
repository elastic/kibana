/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { CorrelationsDetails } from '.';
import { TestProviders } from '../../../../common/mock';
import { useShowRelatedAlertsByAncestry } from './hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from './hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from './hooks/use_show_related_alerts_by_session';
import { useShowRelatedAttacks } from './hooks/use_show_related_attacks';
import { useShowRelatedCases } from './hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from './hooks/use_show_suppressed_alerts';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID,
} from './components/test_ids';
import { useFetchRelatedAlertsBySession } from '../../main/hooks/use_fetch_related_alerts_by_session';
import { useFetchRelatedAlertsByAncestry } from '../../main/hooks/use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../main/hooks/use_fetch_related_alerts_by_same_source_event';
import { useFetchRelatedCases } from '../../main/hooks/use_fetch_related_cases';
import { EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID } from '../../../shared/components/test_ids';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import type { DataTableRecord } from '@kbn/discover-utils';

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return { ...actual, useLocation: vi.fn().mockReturnValue({ pathname: '' }) };
});
vi.mock('./hooks/use_show_related_alerts_by_ancestry');
vi.mock('./hooks/use_show_related_alerts_by_same_source_event');
vi.mock('./hooks/use_show_related_alerts_by_session');
vi.mock('./hooks/use_show_related_attacks');
vi.mock('./hooks/use_show_related_cases');
vi.mock('./hooks/use_show_suppressed_alerts');
vi.mock('../../main/hooks/use_fetch_related_alerts_by_session');
vi.mock('../../main/hooks/use_fetch_related_alerts_by_ancestry');
vi.mock('../../main/hooks/use_fetch_related_alerts_by_same_source_event');
vi.mock('../../main/hooks/use_fetch_related_cases');
vi.mock('../../../../data_view_manager/hooks/use_security_default_patterns');
vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockHit: DataTableRecord = {
  id: 'test-id',
  raw: { _id: 'test-id', _index: 'test-index', _source: {} },
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

const mockOnShowAlert = vi.fn();

const renderCorrelationsDetails = () =>
  render(
    <TestProviders>
      <CorrelationsDetails hit={mockHit} scopeId="test-scope" onShowAlert={mockOnShowAlert} />
    </TestProviders>
  );

const CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_TITLE_TEST_ID =
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
    CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID
  );

const NO_DATA_MESSAGE = 'No correlations data available.';

describe('CorrelationsDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(true);
    (useSecurityDefaultPatterns as Mock).mockReturnValue({
      indexPatterns: ['index'],
    });
    (useAlertsPrivileges as Mock).mockReturnValue({
      hasAlertsRead: true,
    });
  });

  it('renders all sections when all show flags are true', () => {
    vi.mocked(useShowRelatedAlertsByAncestry).mockReturnValue({
      show: true,
      ancestryDocumentId: 'event-id',
    });
    vi.mocked(useShowRelatedAlertsBySameSourceEvent).mockReturnValue({
      show: true,
      originalEventId: 'originalEventId',
    });
    vi.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: true, entityId: 'entityId' });
    vi.mocked(useShowRelatedAttacks).mockReturnValue({ show: true, attackIds: ['attack-id'] });
    vi.mocked(useShowRelatedCases).mockReturnValue(true);
    vi.mocked(useShowSuppressedAlerts).mockReturnValue({ show: true, alertSuppressionCount: 1 });

    (useFetchRelatedAlertsByAncestry as Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySameSourceEvent as Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySession as Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedCases as Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });

    const { getByTestId, queryByText } = renderCorrelationsDetails();

    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_DETAILS_RELATED_ATTACKS_SECTION_TABLE_TEST_ID)
    ).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders no sections and shows no-data message when all show flags are false', () => {
    vi.mocked(useShowRelatedAlertsByAncestry).mockReturnValue({
      show: false,
      ancestryDocumentId: 'event-id',
    });
    vi.mocked(useShowRelatedAlertsBySameSourceEvent).mockReturnValue({
      show: false,
      originalEventId: 'originalEventId',
    });
    vi.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: false, entityId: 'entityId' });
    vi.mocked(useShowRelatedAttacks).mockReturnValue({ show: false, attackIds: [] });
    vi.mocked(useShowRelatedCases).mockReturnValue(false);
    vi.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });

    const { getByText, queryByTestId } = renderCorrelationsDetails();

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
    expect(
      queryByTestId(CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_TITLE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
