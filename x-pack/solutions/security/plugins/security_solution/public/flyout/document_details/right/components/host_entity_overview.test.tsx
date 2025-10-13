/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { TestProviders } from '../../../../common/mock';
import { HOST_PREVIEW_BANNER, HostEntityOverview } from './host_entity_overview';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import {
  ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID,
} from './test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';

const hostName = 'host';
const osFamily = 'Windows';
const lastSeen = '2022-04-08T18:35:45.064Z';
const lastSeenText = 'Apr 8, 2022 @ 18:35:45.064';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const hostData = { host: { os: { family: [osFamily] } } };
const riskLevel = [{ host: { risk: { calculated_level: 'Medium' } } }];

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

jest.mock('@kbn/expandable-flyout');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

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

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../../explore/hosts/containers/hosts/details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../../common/containers/use_first_last_seen');

const renderHostEntityContent = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <HostEntityOverview hostName={hostName} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<HostEntityContent />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({});
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: false, items: {} });
  });

  describe('license is valid', () => {
    it('should render os family and host risk level', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent(osFamily);
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Medium');
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('—');
    });
  });

  it('should render loading if loading for host details is true', () => {
    mockUseHostDetails.mockReturnValue([true, { hostDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HostEntityOverview hostName={hostName} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading if loading for risk score is true', () => {
    mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true, loading: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HostEntityOverview hostName={hostName} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  describe('license is not valid', () => {
    it('should render os family and last seen', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen }]);

      const { getByTestId, queryByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent(osFamily);
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent(lastSeenText);
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent('—');
    });

    it('should open host preview when clicking on title', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      getByTestId(ENTITIES_HOST_OVERVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: HostPreviewPanelKey,
        params: {
          hostName,
          scopeId: mockContextValue.scopeId,
          banner: HOST_PREVIEW_BANNER,
        },
      });
    });
  });

  describe('distribution bar insights', () => {
    beforeEach(() => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });
    });

    it('should not render if no data is available', () => {
      const { queryByTestId } = renderHostEntityContent();
      expect(
        queryByTestId(ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID)
      ).not.toBeInTheDocument();
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render alert count when data is available', () => {
      (useAlertsByStatus as jest.Mock).mockReturnValue({
        isLoading: false,
        items: mockAlertData,
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID)).toBeInTheDocument();
    });

    it('should render misconfiguration when data is available', () => {
      (useMisconfigurationPreview as jest.Mock).mockReturnValue({
        data: { count: { passed: 1, failed: 2 } },
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID)).toBeInTheDocument();
    });

    it('should render vulnerabilities when data is available', () => {
      (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
        data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID)).toBeInTheDocument();
    });
  });
});
