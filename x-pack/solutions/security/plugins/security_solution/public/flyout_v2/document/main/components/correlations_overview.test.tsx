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
import { TestProviders } from '../../../../common/mock';
import type { CorrelationsOverviewProps } from './correlations_overview';
import { CorrelationsOverview } from './correlations_overview';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID,
  CORRELATIONS_RELATED_CASES_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
  SUMMARY_ROW_TEXT_TEST_ID,
} from './test_ids';
import { useShowRelatedAlertsByAncestry } from '../../tools/correlations/hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../../tools/correlations/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../tools/correlations/hooks/use_show_related_alerts_by_session';
import { useShowRelatedCases } from '../../tools/correlations/hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from '../../tools/correlations/hooks/use_show_suppressed_alerts';
import { useFetchRelatedAlertsByAncestry } from '../hooks/use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsBySameSourceEvent } from '../hooks/use_fetch_related_alerts_by_same_source_event';
import { useFetchRelatedAlertsBySession } from '../hooks/use_fetch_related_alerts_by_session';
import { useFetchRelatedCases } from '../hooks/use_fetch_related_cases';
import { useNavigateToLeftPanel } from '../../../../flyout/document_details/shared/hooks/use_navigate_to_left_panel';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

vi.mock('../../tools/correlations/hooks/use_show_related_alerts_by_ancestry');
vi.mock('../../tools/correlations/hooks/use_show_related_alerts_by_same_source_event');
vi.mock('../../tools/correlations/hooks/use_show_related_alerts_by_session');
vi.mock('../../tools/correlations/hooks/use_show_related_cases');
vi.mock('../../tools/correlations/hooks/use_show_suppressed_alerts');
vi.mock('../hooks/use_fetch_related_alerts_by_session');
vi.mock('../hooks/use_fetch_related_alerts_by_ancestry');
vi.mock('../hooks/use_fetch_related_alerts_by_same_source_event');
vi.mock('../hooks/use_fetch_related_cases');
vi.mock('../../../../flyout/document_details/shared/hooks/use_navigate_to_left_panel');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(CORRELATIONS_TEST_ID);

const SUPPRESSED_ALERTS_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID
);
const SUPPRESSED_ALERTS_VALUE_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID
);
const RELATED_ALERTS_BY_ANCESTRY_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID
);
const RELATED_ALERTS_BY_ANCESTRY_VALUE_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID
);
const RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);
const RELATED_ALERTS_BY_SAME_SOURCE_EVENT_VALUE_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);
const RELATED_ALERTS_BY_SESSION_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID
);
const RELATED_ALERTS_BY_SESSION_VALUE_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID
);
const RELATED_CASES_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);
const RELATED_CASES_VALUE_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);

const mockHit: DataTableRecord = {
  id: 'event id',
  raw: {},
  flattened: {},
  isAnchor: false,
} as unknown as DataTableRecord;

const defaultProps: CorrelationsOverviewProps = {
  hit: mockHit,
  scopeId: 'scopeId',
  showIcon: true,
  onShowCorrelationsDetails: vi.fn(),
};

const renderCorrelationsOverview = (props: Partial<CorrelationsOverviewProps> = {}) => (
  <TestProviders>
    <CorrelationsOverview {...defaultProps} {...props} />
  </TestProviders>
);

const NO_DATA_MESSAGE = 'No correlations data available.';

vi.mock('../../../../data_view_manager/hooks/use_security_default_patterns');

const originalEventId = 'originalEventId';
const mockNavigateToLeftPanel = vi.fn();

describe('<CorrelationsOverview />', () => {
  beforeEach(() => {
    vi
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: false, ancestryDocumentId: 'event-id' });
    vi
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: false, originalEventId });
    vi.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: false });
    vi.mocked(useShowRelatedCases).mockReturnValue(false);
    vi.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });
    (useSecurityDefaultPatterns as Mock).mockReturnValue({
      indexPatterns: ['index'],
    });
    (useNavigateToLeftPanel as Mock).mockReturnValue(mockNavigateToLeftPanel);
  });

  it('should render wrapper component', () => {
    const { getByTestId, queryByTestId } = render(renderCorrelationsOverview());
    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render link without icon if showIcon is false', () => {
    const { getByTestId, queryByTestId } = render(renderCorrelationsOverview({ showIcon: false }));
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show component with all rows in expandable panel', () => {
    vi
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: true, ancestryDocumentId: 'event-id' });
    vi
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: true, originalEventId: 'originalEventId' });
    vi
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: true, entityId: 'entityId' });
    vi.mocked(useShowRelatedCases).mockReturnValue(true);
    vi.mocked(useShowSuppressedAlerts).mockReturnValue({ show: true, alertSuppressionCount: 1 });

    (useFetchRelatedAlertsByAncestry as Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySameSourceEvent as Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySession as Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedCases as Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId, queryByText } = render(renderCorrelationsOverview());
    expect(getByTestId(RELATED_ALERTS_BY_ANCESTRY_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_ANCESTRY_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SESSION_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SESSION_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_CASES_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_CASES_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_VALUE_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should hide rows and show error message if show values are false', () => {
    vi
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: false, ancestryDocumentId: 'event-id' });
    vi
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: false, originalEventId: 'originalEventId' });
    vi
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: false, entityId: 'entityId' });
    vi.mocked(useShowRelatedCases).mockReturnValue(false);
    vi.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });

    const { getByText, queryByTestId } = render(renderCorrelationsOverview());
    expect(queryByTestId(RELATED_ALERTS_BY_ANCESTRY_TEXT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_ANCESTRY_VALUE_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEXT_TEST_ID)).not.toBeInTheDocument();
    expect(
      queryByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_VALUE_TEST_ID)
    ).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SESSION_TEXT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SESSION_VALUE_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_CASES_TEXT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_CASES_VALUE_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(SUPPRESSED_ALERTS_TEXT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(SUPPRESSED_ALERTS_VALUE_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should navigate to the left section Insights tab when clicking on button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CorrelationsOverview
          hit={mockHit}
          scopeId="scopeId"
          showIcon={true}
          onShowCorrelationsDetails={mockNavigateToLeftPanel}
        />
      </TestProviders>
    );

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });
});
