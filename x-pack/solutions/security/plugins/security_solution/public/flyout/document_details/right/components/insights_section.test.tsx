/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { DocumentDetailsContext } from '../../shared/context';
import { INSIGHTS_CONTENT_TEST_ID, INSIGHTS_HEADER_TEST_ID } from './test_ids';
import {
  CORRELATIONS_TEST_ID,
  INSIGHTS_ENTITIES_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  PREVALENCE_TEST_ID,
} from '../../../../flyout_v2/document/main/components/test_ids';
import { TestProviders } from '../../../../common/mock';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFetchThreatIntelligence } from '../../../../flyout_v2/document/tools/threat_intelligence/hooks/use_fetch_threat_intelligence';
import { usePrevalence } from '../../../../flyout_v2/document/tools/prevalence/hooks/use_prevalence';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { InsightsSection } from './insights_section';
import { useAlertPrevalence } from '../../../../flyout_v2/document/main/hooks/use_alert_prevalence';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useShowRelatedAlertsByAncestry } from '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_session';
import { useShowRelatedCases } from '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from '../../../../flyout_v2/document/tools/correlations/hooks/use_show_suppressed_alerts';

vi.mock('../../../../flyout_v2/document/main/hooks/use_alert_prevalence');
vi.mock('../../shared/hooks/use_event_details', () => {
  const mocked = {
    useEventDetails: vi.fn(() => ({ dataAsNestedObject: null, loading: false })),
  };
  return { ...mocked, default: mocked };
});

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: () => ({ pathname: '/overview' }),
  };
});
(useAlertPrevalence as Mock).mockReturnValue({
  loading: false,
  error: false,
  count: 0,
  alertIds: [],
});

vi.mock('../../../../data_view_manager/hooks/use_security_default_patterns');
vi.mock('../../../../common/hooks/use_experimental_features');

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';
const mockSearchHit = {
  _id: 'some-id',
  _index: 'alerts-index',
  _source: {
    '@timestamp': '2022-04-05T12:00:00.000Z',
  },
} as EsHitRecord;

vi.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => {
  const mocked = {
    useExpandSection: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseGlobalTime = vi.fn().mockReturnValue({ from, to });
vi.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as Mock;
vi.mock('../../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as Mock;
vi.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as Mock;
vi.mock('../../../../common/containers/use_first_last_seen');

const mockUseHostDetails = useHostDetails as Mock;
vi.mock('../../../../explore/hosts/containers/hosts/details');

vi.mock(
  '../../../../flyout_v2/document/tools/threat_intelligence/hooks/use_fetch_threat_intelligence'
);
vi.mock('../../../../flyout_v2/document/tools/prevalence/hooks/use_prevalence');
vi.mock(
  '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_ancestry'
);
vi.mock(
  '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_same_source_event'
);
vi.mock(
  '../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_alerts_by_session'
);
vi.mock('../../../../flyout_v2/document/tools/correlations/hooks/use_show_related_cases');
vi.mock('../../../../flyout_v2/document/tools/correlations/hooks/use_show_suppressed_alerts');

const renderInsightsSection = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <InsightsSection />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<InsightsSection />', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
    (useSecurityDefaultPatterns as Mock).mockReturnValue({
      indexPatterns: ['index'],
    });
    mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
    mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
    mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);
    (useFetchThreatIntelligence as Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });
    (usePrevalence as Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
    (useShowRelatedAlertsByAncestry as Mock).mockReturnValue({
      show: false,
      ancestryDocumentId: 'event-id',
    });
    (useShowRelatedAlertsBySameSourceEvent as Mock).mockReturnValue({
      show: false,
      originalEventId: 'originalEventId',
    });
    (useShowRelatedAlertsBySession as Mock).mockReturnValue({ show: false });
    (useShowRelatedCases as Mock).mockReturnValue(false);
    (useShowSuppressedAlerts as Mock).mockReturnValue({
      show: false,
      alertSuppressionCount: 0,
    });
  });

  it('should render insights component', async () => {
    const contextValue = {
      ...mockContextValue,
      eventId: 'some_Id',
      getFieldsData: mockGetFieldsData,
      searchHit: mockSearchHit,
    } as unknown as DocumentDetailsContext;

    const wrapper = renderInsightsSection(contextValue);

    await act(async () => {
      expect(wrapper.getByTestId(INSIGHTS_HEADER_TEST_ID)).toHaveTextContent('Insights');
      expect(wrapper.getByTestId(INSIGHTS_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the component collapsed if value is false in local storage', () => {
    mockUseExpandSection.mockReturnValue(false);

    const contextValue = {
      ...mockContextValue,
      eventId: 'some_Id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: mockGetFieldsData,
      searchHit: mockSearchHit,
    } as unknown as DocumentDetailsContext;

    const wrapper = renderInsightsSection(contextValue);

    expect(wrapper.getByTestId(INSIGHTS_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', async () => {
    const contextValue = {
      ...mockContextValue,
      eventId: 'some_Id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: mockGetFieldsData,
      searchHit: mockSearchHit,
    } as unknown as DocumentDetailsContext;

    const wrapper = renderInsightsSection(contextValue);

    await act(async () => {
      expect(wrapper.getByTestId(INSIGHTS_CONTENT_TEST_ID)).toBeVisible();
    });
  });

  it('should render all children when event kind is signal', async () => {
    const getFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'signal';
      }
    };
    const contextValue = {
      ...mockContextValue,
      eventId: 'some_Id',
      getFieldsData,
      documentIsSignal: true,
      searchHit: mockSearchHit,
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = renderInsightsSection(contextValue);

    await act(async () => {
      expect(getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}LeftSection`)).toBeInTheDocument();
      expect(getByTestId(`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}LeftSection`)).toBeInTheDocument();
      expect(getByTestId(`${CORRELATIONS_TEST_ID}LeftSection`)).toBeInTheDocument();
      expect(getByTestId(`${PREVALENCE_TEST_ID}LeftSection`)).toBeInTheDocument();
    });
  });

  it('should not render threat intel and correlations insights component when document is not signal', async () => {
    const getFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'metric';
      }
    };
    const contextValue = {
      ...mockContextValue,
      eventId: 'some_Id',
      getFieldsData,
      documentIsSignal: false,
      searchHit: mockSearchHit,
    } as unknown as DocumentDetailsContext;

    const { getByTestId, queryByTestId } = renderInsightsSection(contextValue);

    await act(async () => {
      expect(getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}LeftSection`)).toBeInTheDocument();
      expect(
        queryByTestId(`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}LeftSection`)
      ).not.toBeInTheDocument();
      expect(getByTestId(`${CORRELATIONS_TEST_ID}LeftSection`)).toBeInTheDocument();
      expect(getByTestId(`${PREVALENCE_TEST_ID}LeftSection`)).toBeInTheDocument();
    });
  });
});
