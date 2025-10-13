/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { USER_PREVIEW_BANNER, UserEntityOverview } from './user_entity_overview';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import {
  ENTITIES_USER_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID,
  ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_USER_OVERVIEW_LINK_TEST_ID,
  ENTITIES_USER_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_USER_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID,
} from './test_ids';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';

const userName = 'user';
const domain = 'n54bg2lfc7';
const lastSeen = '2022-04-08T18:35:45.064Z';
const lastSeenText = 'Apr 8, 2022 @ 18:35:45.064';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const userData = { user: { domain: [domain] } };
const riskLevel = [{ user: { risk: { calculated_level: 'Medium' } } }];

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

jest.mock('@kbn/expandable-flyout');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock(
  '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status'
);
const mockAlertData = {
  open: {
    total: 2,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
    ],
  },
};

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as jest.Mock;
jest.mock('../../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../../common/containers/use_first_last_seen');

const renderUserEntityOverview = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <UserEntityOverview userName={userName} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<UserEntityOverview />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: false, items: {} });
  });

  describe('license is valid', () => {
    it('should render user domain and user risk level', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = renderUserEntityOverview();

      expect(getByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).toHaveTextContent(domain);
      expect(getByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Medium');
    });

    it('should render correctly if returned data is null', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId } = renderUserEntityOverview();

      expect(getByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('—');
    });
  });

  describe('license is not valid', () => {
    it('should render domain and last seen', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen }]);

      const { getByTestId, queryByTestId } = renderUserEntityOverview();

      expect(getByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).toHaveTextContent(domain);
      expect(getByTestId(ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent(lastSeenText);
      expect(queryByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);

      const { getByTestId } = renderUserEntityOverview();

      expect(getByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent('—');
    });

    it('should render loading if user details returns loading as true', () => {
      mockUseUserDetails.mockReturnValue([true, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
      expect(getByTestId(ENTITIES_USER_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render loading if risk score returns loading as true', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true, loading: true });

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
      expect(getByTestId(ENTITIES_USER_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID)).not.toBeInTheDocument();
    });

    it('should open user preview', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );

      getByTestId(ENTITIES_USER_OVERVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: UserPreviewPanelKey,
        params: {
          userName,
          scopeId: mockContextValue.scopeId,
          banner: USER_PREVIEW_BANNER,
        },
      });
    });
  });

  describe('distribution bar insights', () => {
    beforeEach(() => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });
    });

    it('should not render if no data is available', () => {
      const { queryByTestId } = renderUserEntityOverview();
      expect(
        queryByTestId(ENTITIES_USER_OVERVIEW_MISCONFIGURATIONS_TEST_ID)
      ).not.toBeInTheDocument();
      expect(queryByTestId(ENTITIES_USER_OVERVIEW_ALERT_COUNT_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render alert count when data is available', () => {
      (useAlertsByStatus as jest.Mock).mockReturnValue({
        isLoading: false,
        items: mockAlertData,
      });

      const { getByTestId } = renderUserEntityOverview();
      expect(getByTestId(ENTITIES_USER_OVERVIEW_ALERT_COUNT_TEST_ID)).toBeInTheDocument();
    });

    it('should render misconfiguration when data is available', () => {
      (useMisconfigurationPreview as jest.Mock).mockReturnValue({
        data: { count: { passed: 1, failed: 2 } },
      });

      const { getByTestId } = renderUserEntityOverview();
      expect(getByTestId(ENTITIES_USER_OVERVIEW_MISCONFIGURATIONS_TEST_ID)).toBeInTheDocument();
    });
  });
});
